import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { z } from "zod";
import path from "path";
import esbuild from "esbuild";
import crypto from "crypto";
import { Database } from "./lib/db.js";
import { OpenAIClient } from "./lib/openai.js";
import JSZip from "jszip";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

const port = process.env.PORT || 8787;
const db = new Database(process.env.SQLITE_PATH || "./data.sqlite");
const openai = new OpenAIClient({});

const PREVIEW_ENTRY_CANDIDATES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/main.js",
  "src/App.tsx",
  "src/App.jsx"
];

const normaliseStoredPath = (value) => value.replace(/^\.\//, "").replace(/^\//, "");

const sanitizeFilename = (value, fallback = "project") => {
  if (!value) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;

  const normalized = trimmed
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  return normalized || fallback;
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

  const fileMap = new Map();
  storedFiles.forEach((file) => {
    fileMap.set(normaliseStoredPath(file.path), file.content ?? "");
  });

  const entryPath = PREVIEW_ENTRY_CANDIDATES.find((candidate) => fileMap.has(candidate));
  if (!entryPath) {
    throw new Error("Preview requires src/main.tsx (or src/App.tsx) to exist in the project files.");
  }

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

app.get("/api/projects/:projectId/export", async (req, res) => {
  try {
    const project = db.getProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const files = db.listFiles(project.id);
    if (!files.length) {
      return res.status(400).json({ error: "Project has no files to export" });
    }

    const zip = new JSZip();
    files.forEach((file) => {
      const normalizedPath = normaliseStoredPath(file.path);
      zip.file(normalizedPath, file.content ?? "");
    });

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    const baseName = sanitizeFilename(project.name || project.id, "project");
    const filename = `${baseName}-source.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Failed to export project", error);
    res.status(500).json({ error: error.message || "Failed to export project" });
  }
});

app.post("/api/projects/:projectId/files", (req, res) => {
  const { path, content } = req.body ?? {};
  if (!path) return res.status(400).json({ error: "path required" });
  db.upsertFile(req.params.projectId, path, String(content ?? ""));
  res.json({ ok: true });
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
  const fileSummary = projectFiles
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

app.listen(port, () => {
  console.log(`AI generator server listening on http://localhost:${port}`);
});
