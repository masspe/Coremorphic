import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { z } from "zod";
import path from "path";
import esbuild from "esbuild";
import crypto from "crypto";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Database } from "./lib/db.js";
import { OpenAIClient } from "./lib/openai.js";
import { SandboxManager } from "./sandbox/orchestrator.js";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

const port = process.env.PORT || 8787;
const db = new Database(process.env.SQLITE_PATH || "./data.sqlite");
const openai = new OpenAIClient({});

const parseNumberEnv = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const sandboxManager = new SandboxManager({
  idleTimeoutMs: parseNumberEnv(process.env.SANDBOX_IDLE_TIMEOUT_MS),
  defaultPreviewPort: parseNumberEnv(process.env.SANDBOX_PREVIEW_PORT)
});

const appServer = createServer(app);
const io = new SocketIOServer(appServer, {
  cors: {
    origin: process.env.SANDBOX_SOCKET_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  const handshake = socket.handshake ?? {};
  const query = handshake.query ?? {};
  const projectIdRaw = Array.isArray(query.projectId) ? query.projectId[0] : query.projectId;
  const projectId = typeof projectIdRaw === "string" ? projectIdRaw : "";

  if (!projectId) {
    socket.emit("sandbox:error", { message: "projectId query parameter is required" });
    socket.disconnect(true);
    return;
  }

  let session;
  let terminal;
  let releaseConnection;
  const acquiredPorts = new Map();

  const releaseAllPorts = async () => {
    await Promise.all(
      Array.from(acquiredPorts.values()).map(async (handle) => {
        try {
          await handle.release?.();
        } catch (error) {
          console.warn("Failed to release port forward", error);
        }
      })
    );
    acquiredPorts.clear();
  };

  (async () => {
    try {
      session = await sandboxManager.ensureSession(projectId);
      releaseConnection = session.acquireConnection();

      const storedFiles = db.listFiles(projectId);
      await session.syncProject(
        storedFiles.map((file) => ({
          path: file.path,
          content: file.content ?? ""
        }))
      );

      terminal = await session.createTerminal();
      terminal.on("data", (data) => {
        socket.emit("terminal:data", data);
      });
      terminal.on("exit", (payload) => {
        socket.emit("terminal:exit", payload);
      });
      terminal.on("error", (error) => {
        socket.emit("terminal:error", { message: error?.message || String(error) });
      });

      socket.emit("terminal:ready");
    } catch (error) {
      console.error("Failed to initialize sandbox session", error);
      socket.emit("sandbox:error", { message: error?.message || String(error) });
    }
  })();

  socket.on("terminal:input", (chunk) => {
    try {
      terminal?.write(chunk);
      session?.touch();
    } catch (error) {
      console.error("Failed to write to sandbox terminal", error);
      socket.emit("terminal:error", { message: error?.message || String(error) });
    }
  });

  socket.on("terminal:resize", (size) => {
    try {
      terminal?.resize(size);
    } catch (error) {
      console.error("Failed to resize sandbox terminal", error);
    }
  });

  socket.on("preview:open", async (payload) => {
    if (!session) {
      socket.emit("preview:error", { message: "Sandbox session is not ready" });
      return;
    }

    try {
      const portValue = payload?.port ?? payload?.remotePort;
      const portNumber = Number(portValue);
      if (!Number.isInteger(portNumber)) {
        throw new Error("preview:open requires a valid numeric port");
      }

      const handle = await session.acquirePort(portNumber);
      acquiredPorts.set(portNumber, handle);
      socket.emit("preview:ready", {
        remotePort: handle.remotePort,
        localPort: handle.localPort,
        url: handle.url
      });
    } catch (error) {
      console.error("Failed to open preview port", error);
      socket.emit("preview:error", { message: error?.message || String(error) });
    }
  });

  socket.on("preview:close", async (payload) => {
    const portValue = payload?.port ?? payload?.remotePort;
    const portNumber = Number(portValue);
    const handle = acquiredPorts.get(portNumber);
    if (!handle) return;
    acquiredPorts.delete(portNumber);
    try {
      await handle.release?.();
      socket.emit("preview:closed", { remotePort: portNumber });
    } catch (error) {
      console.warn("Failed to close preview port", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      await releaseAllPorts();
    } finally {
      terminal?.dispose();
      terminal = null;
      if (typeof releaseConnection === "function") {
        releaseConnection();
        releaseConnection = undefined;
      }
    }
  });
});

const PREVIEW_ENTRY_CANDIDATES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/main.js",
  "src/App.tsx",
  "src/App.jsx"
];

const normaliseStoredPath = (value) => value.replace(/^\.\//, "").replace(/^\//, "");

const summariseProjectFiles = (files) =>
  files
    .map((file) => {
      const normalizedPath = normaliseStoredPath(file.path);
      const hash = crypto
        .createHash("sha256")
        .update(file.content ?? "")
        .digest("hex")
        .slice(0, 12);
      const length = (file.content ?? "").length;
      return `- ${normalizedPath} (${length} chars, sha256:${hash})`;
    })
    .join("\n");

const buildFileMap = (files) => {
  const fileMap = new Map();
  files.forEach((file) => {
    fileMap.set(normaliseStoredPath(file.path), file.content ?? "");
  });
  return fileMap;
};

const ensureEntryPoint = (fileMap) => {
  const entryPath = PREVIEW_ENTRY_CANDIDATES.find((candidate) => fileMap.has(candidate));
  if (!entryPath) {
    throw new Error("Preview requires src/main.tsx (or src/App.tsx) to exist in the project files.");
  }
  return entryPath;
};

const compileProject = async (projectId) => {
  const storedFiles = db.listFiles(projectId);
  if (!storedFiles.length) {
    return { ok: false, message: "Project has no files to compile.", errors: [] };
  }

  const fileMap = buildFileMap(storedFiles);

  let entryPath;
  try {
    entryPath = ensureEntryPoint(fileMap);
  } catch (error) {
    return { ok: false, message: error.message || String(error), errors: [] };
  }

  try {
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      write: false,
      platform: "browser",
      format: "iife",
      jsx: "automatic",
      target: ["es2018"],
      sourcemap: false,
      absWorkingDir: "/",
      plugins: [createVirtualPlugin(fileMap)],
      loader: { ".svg": "text" },
      logLevel: "silent"
    });

    return { ok: true };
  } catch (error) {
    const buildErrors = Array.isArray(error.errors)
      ? error.errors.map((item) => ({
          text: item.text,
          location: item.location
            ? {
                file: normaliseStoredPath(item.location.file || ""),
                line: item.location.line ?? null,
                column: item.location.column ?? null,
                lineText: item.location.lineText ?? ""
              }
            : null
        }))
      : [];

    return {
      ok: false,
      message: error.message || "Build failed",
      errors: buildErrors
    };
  }
};

const createVirtualPlugin = (fileMap) => ({
  name: "virtual-project-files",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      const importPath = args.path;

      const resolveFrom = args.resolveDir ? `${args.resolveDir}` : path.posix.dirname(args.importer || "");

      const tryResolve = (candidate) => {
        const cleaned = normaliseStoredPath(candidate);
        if (fileMap.has(cleaned)) {
          return {
            path: cleaned,
            namespace: "virtual",
            pluginData: { resolveDir: path.posix.dirname(cleaned) }
          };
        }
        return null;
      };

      if (importPath.startsWith(".") || importPath.startsWith("/")) {
        const base = resolveFrom ? resolveFrom : ".";
        const initial = path.posix.normalize(path.posix.join(base, importPath));
        const candidates = [
          initial,
          `${initial}.tsx`,
          `${initial}.ts`,
          `${initial}.jsx`,
          `${initial}.js`,
          path.posix.join(initial, "index.tsx"),
          path.posix.join(initial, "index.ts"),
          path.posix.join(initial, "index.jsx"),
          path.posix.join(initial, "index.js")
        ];

        for (const candidate of candidates) {
          const resolved = tryResolve(candidate);
          if (resolved) {
            return resolved;
          }
        }

        return {
          errors: [
            {
              text: `Unable to resolve import \"${importPath}\" from ${resolveFrom || "project root"}`
            }
          ]
        };
      }

      return { external: true, path: importPath };
    });

    build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
      const stored = fileMap.get(args.path);
      if (stored == null) {
        return {
          errors: [
            {
              text: `Missing project file for ${args.path}`
            }
          ]
        };
      }

      const resolveDir = args.pluginData?.resolveDir ?? path.posix.dirname(args.path);

      if (args.path.endsWith(".css")) {
        return { contents: stored, loader: "css", resolveDir };
      }

      if (args.path.endsWith(".json")) {
        return { contents: stored, loader: "json", resolveDir };
      }

      if (args.path.endsWith(".svg")) {
        return { contents: stored, loader: "text", resolveDir };
      }

      let loader = "js";
      if (args.path.endsWith(".tsx")) loader = "tsx";
      else if (args.path.endsWith(".ts")) loader = "ts";
      else if (args.path.endsWith(".jsx")) loader = "jsx";

      return { contents: stored, loader, resolveDir };
    });
  }
});

const buildPreviewHtml = async (projectId) => {
  const storedFiles = db.listFiles(projectId);
  if (!storedFiles.length) {
    throw new Error("Project has no files to preview");
  }

  const fileMap = buildFileMap(storedFiles);
  const entryPath = ensureEntryPoint(fileMap);

  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    target: ["es2018"],
    sourcemap: false,
    absWorkingDir: "/",
    plugins: [createVirtualPlugin(fileMap)],
    loader: { ".svg": "text" }
  });

  let jsBundle = "";
  let cssBundle = "";
  for (const output of result.outputFiles) {
    if (output.path.endsWith(".js")) {
      jsBundle += output.text;
    }
    if (output.path.endsWith(".css")) {
      cssBundle += output.text;
    }
  }

  const safeJs = jsBundle.replace(/<\/script>/gi, "<\\/script>");
  const safeCss = cssBundle.replace(/<\/style>/gi, "<\\/style>");

  const injectCss = (html) => {
    if (!safeCss) return html;
    const styleTag = `<style>${safeCss}</style>`;
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `${styleTag}</head>`);
    }
    return html.replace(/<body[^>]*>/i, (match) => `${match}\n${styleTag}`);
  };

  const injectScript = (html) => {
    const scriptTag = `<script>${safeJs}</script>`;
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${scriptTag}</body>`);
    }
    return `${html}\n${scriptTag}`;
  };

  const baseHtml = fileMap.get("index.html");
  if (baseHtml) {
    const sanitized = baseHtml
      .replace(/<script[^>]*src="[^"]*src\/main[^>]*><\/script>/gi, "")
      .replace(/<link[^>]*href="[^"]*src\/main[^>]*>/gi, "");
    return injectScript(injectCss(sanitized));
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    ${safeCss ? `<style>${safeCss}</style>` : ""}
  </head>
  <body>
    <div id="root"></div>
    <script>${safeJs}</script>
  </body>
</html>`;
};

const GenerateSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  instructions: z.string().optional(),
  model: z.string().optional()
});

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
  caseSensitive: z.boolean().optional()
});

const AutoFixSchema = z.object({
  errors: z
    .array(
      z.object({
        text: z.string(),
        location: z
          .object({
            file: z.string().optional(),
            line: z.number().optional(),
            column: z.number().optional(),
            lineText: z.string().optional()
          })
          .optional()
      })
    )
    .min(1),
  prompt: z.string().optional(),
  model: z.string().optional()
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/projects", (_req, res) => {
  const rows = db.listProjects();
  res.json(rows);
});

app.post("/api/projects", (req, res) => {
  const { name } = req.body ?? {};
  const project = db.createProject(name || "New Project");
  res.json(project);
});

app.get("/api/memory/:projectId", (req, res) => {
  res.json(db.getMemory(req.params.projectId));
});

app.post("/api/memory/:projectId", (req, res) => {
  const { content } = req.body ?? {};
  db.setMemory(req.params.projectId, content || "");
  res.json({ ok: true });
});

app.get("/api/projects/:projectId/files", (req, res) => {
  res.json(db.listFiles(req.params.projectId));
});

app.post("/api/projects/:projectId/files", (req, res) => {
  const { path, content } = req.body ?? {};
  if (!path) return res.status(400).json({ error: "path required" });
  db.upsertFile(req.params.projectId, path, String(content ?? ""));
  res.json({ ok: true });
});

app.post("/api/projects/:projectId/search", (req, res) => {
  const parsed = SearchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { query, limit = 20, caseSensitive = false } = parsed.data;
  const files = db.listFiles(req.params.projectId);
  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const results = [];

  outer: for (const file of files) {
    const content = file.content ?? "";
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index];
      const haystack = caseSensitive ? lineText : lineText.toLowerCase();
      const position = haystack.indexOf(normalizedQuery);
      if (position === -1) continue;

      const start = Math.max(0, index - 2);
      const end = Math.min(lines.length, index + 3);

      results.push({
        path: normaliseStoredPath(file.path),
        line: index + 1,
        column: position + 1,
        snippet: lines.slice(start, end).join("\n")
      });

      if (results.length >= limit) {
        break outer;
      }
    }
  }

  res.json({ ok: true, results });
});

app.post("/api/projects/:projectId/compile", async (req, res) => {
  try {
    const result = await compileProject(req.params.projectId);
    res.json(result);
  } catch (error) {
    console.error("Compilation check failed", error);
    res.status(500).json({ ok: false, message: error.message || String(error), errors: [] });
  }
});

app.post("/api/projects/:projectId/autofix", async (req, res) => {
  const parsed = AutoFixSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { errors, prompt, model } = parsed.data;
  const projectId = req.params.projectId;
  const projectFiles = db.listFiles(projectId);
  const memory = db.getMemory(projectId)?.content || "";

  const memorySection = memory && memory.trim() ? memory : "(empty)";
  const fileSummary = summariseProjectFiles(projectFiles);
  const filesSection = fileSummary || "- (no files yet)";

  const errorSummary = errors
    .map((error, index) => {
      const parts = [`${index + 1}. ${error.text}`];
      const location = error.location ?? {};
      if (location.file) parts.push(`File: ${normaliseStoredPath(location.file)}`);
      if (typeof location.line === "number") parts.push(`Line: ${location.line}`);
      if (typeof location.column === "number") parts.push(`Column: ${location.column}`);
      if (location.lineText) parts.push(`Source: ${location.lineText}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const relevantFiles = new Map();
  errors.forEach((error) => {
    const location = error.location;
    if (!location?.file) return;
    const normalized = normaliseStoredPath(location.file);
    if (relevantFiles.has(normalized)) return;
    const match = projectFiles.find((file) => normaliseStoredPath(file.path) === normalized);
    if (match) {
      relevantFiles.set(normalized, match.content ?? "");
    }
  });

  if (!relevantFiles.size) {
    projectFiles.slice(0, 3).forEach((file) => {
      const normalized = normaliseStoredPath(file.path);
      if (!relevantFiles.has(normalized)) {
        relevantFiles.set(normalized, file.content ?? "");
      }
    });
  }

  const relevantSection = relevantFiles.size
    ? [...relevantFiles.entries()]
        .map(([path, content]) => `Path: ${path}\n${content}`)
        .join("\n\n---\n\n")
    : "(No relevant files detected. If needed, inspect project files manually.)";

  const systemMessage = `You are a senior full-stack engineer. Given compile/test errors, output a JSON object with this exact shape:
{
  "files": { "<path>": "<string content>", "...": "..." },
  "notes": "<short rationale>",
  "startFile": "index.html" | "src/App.tsx" | "src/main.tsx"
}
Rules:
- Modify only the files necessary to fix the provided errors.
- Preserve existing project structure and conventions.
- Ensure the project compiles after applying the changes.
- Output only valid JSON. No markdown fences.`;

  const developerMessage = `Project memory/context (may include constraints or prior choices):\n${memorySection}\n\nCurrent project files:\n${filesSection}\n\nOriginal prompt (if available):\n${prompt ?? "(none)"}`;

  const userMessage = `Compilation errors to fix:\n${errorSummary}\n\nRelevant file contents:\n${relevantSection}\n\nReturn the updated files as JSON following the specified shape.`;

  try {
    const json = await openai.generateJson(
      model || process.env.OPENAI_MODEL || "gpt-4o-mini",
      systemMessage,
      developerMessage,
      userMessage
    );

    if (!json || !json.files || typeof json.files !== "object") {
      throw new Error("Model returned invalid JSON shape.");
    }

    db.addMessage(projectId, "developer", `Autofix errors provided to model:\n${errorSummary}`);
    db.addMessage(projectId, "assistant", JSON.stringify(json));

    Object.entries(json.files).forEach(([filePath, fileContent]) => {
      db.upsertFile(projectId, filePath, String(fileContent));
    });

    res.json({ ok: true, result: json });
  } catch (error) {
    console.error("Automatic fix failed", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/projects/:projectId/preview", async (req, res) => {
  try {
    const html = await buildPreviewHtml(req.params.projectId);
    res.json({ html });
  } catch (error) {
    res.status(400).json({ error: error.message || String(error) });
  }
});

app.post("/api/generate", async (req, res) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { projectId, prompt, instructions, model } = parsed.data;

  const memory = db.getMemory(projectId)?.content || "";

  const systemMessage = `You are a senior full-stack engineer. Given a user prompt, output a JSON object with this exact shape:
{
  "files": { "<path>": "<string content>", "...": "..." },
  "notes": "<short rationale>",
  "startFile": "index.html" | "src/App.tsx" | "src/main.tsx"
}
Rules:
- Target a React app (Vite + TS) unless the user explicitly requests JS.
- Always include index.html, src/main.tsx, src/App.tsx, and package.json scripts for Vite.
- Use minimal, working code. No external APIs without install instructions.
- Keep paths POSIX. Do not include node_modules or lockfiles.
- If the user wants UI libs, include install hints in notes.
Output only valid JSON. No markdown fences.`;

  const projectFiles = db.listFiles(projectId);
  const fileSummary = summariseProjectFiles(projectFiles);

  const memorySection = memory && memory.trim() ? memory : "(empty)";
  const filesSection = fileSummary || "- (no files yet)";

  const developerMessage = `Project memory/context (may include constraints or prior choices):\n${memorySection}\n\nCurrent project files:\n${filesSection}\n\nIf relevant, respect prior file structure and style.`;
  const userMessage = `Prompt:\n${prompt}\n\nAdditional instructions (optional):\n${instructions ?? ""}`;

  try {
    const json = await openai.generateJson(
      model || process.env.OPENAI_MODEL || "gpt-4o-mini",
      systemMessage,
      developerMessage,
      userMessage
    );

    if (!json || !json.files || typeof json.files !== "object") {
      throw new Error("Model returned invalid JSON shape.");
    }

    db.addMessage(projectId, "system", systemMessage);
    db.addMessage(projectId, "developer", developerMessage);
    db.addMessage(projectId, "user", userMessage);
    db.addMessage(projectId, "assistant", JSON.stringify(json));

    Object.entries(json.files).forEach(([filePath, fileContent]) => {
      db.upsertFile(projectId, filePath, String(fileContent));
    });

    res.json({ ok: true, result: json });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

const startServer = () => {
  appServer.listen(port, () => {
    console.log(`AI generator server listening on http://localhost:${port}`);
  });
};

const handleShutdownSignal = () => {
  void sandboxManager.shutdown().catch((error) => {
    console.error("Failed to shut down sandboxes", error);
  });
};

process.on("SIGINT", handleShutdownSignal);
process.on("SIGTERM", handleShutdownSignal);

startServer();
