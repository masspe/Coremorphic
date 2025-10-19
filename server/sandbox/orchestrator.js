import { EventEmitter } from "events";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const DEFAULT_IDLE_TIMEOUT_MS = 1000 * 60 * 5;
const DEFAULT_PREVIEW_PORT = 4173;

const sanitizeProjectId = (projectId) =>
  projectId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "project";

const normaliseFilePath = (filePath) => {
  const trimmed = String(filePath || "").replace(/^\.\/+/, "");
  const normalised = path.posix.normalize(trimmed);
  if (normalised.startsWith("..")) {
    throw new Error(`Invalid project file path: ${filePath}`);
  }
  return normalised;
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

class SandboxTerminal extends EventEmitter {
  constructor(handle) {
    super();
    this.handle = handle;
    this.closed = false;

    const { process } = handle;
    if (process?.stdout) {
      process.stdout.setEncoding("utf8");
      process.stdout.on("data", (chunk) => {
        this.emit("data", chunk.toString());
      });
    }

    if (process?.stderr) {
      process.stderr.setEncoding("utf8");
      process.stderr.on("data", (chunk) => {
        this.emit("data", chunk.toString());
      });
    }

    process?.once("exit", (code, signal) => {
      this.closed = true;
      this.emit("exit", { code, signal });
    });

    process?.once("error", (error) => {
      this.emit("error", error);
    });
  }

  write(chunk) {
    if (this.closed) return;
    const data = typeof chunk === "string" || chunk instanceof Buffer ? chunk : String(chunk ?? "");
    this.handle.process?.stdin?.write(data);
  }

  resize(size) {
    if (typeof this.handle.resize === "function") {
      this.handle.resize(size);
    }
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    if (typeof this.handle.dispose === "function") {
      this.handle.dispose();
    } else if (this.handle.process && !this.handle.process.killed) {
      this.handle.process.kill("SIGTERM");
    }
  }
}

class LocalSandboxAdapter {
  constructor(projectId, options = {}) {
    this.projectId = projectId;
    this.rootDir = options.rootDir || path.join(os.tmpdir(), "coremorphic-sandboxes", sanitizeProjectId(projectId));
    this.shells = new Set();
    this.defaultPreviewPort = options.defaultPreviewPort || DEFAULT_PREVIEW_PORT;
  }

  async init() {
    await ensureDir(this.rootDir);
  }

  async syncProject(files) {
    await fs.rm(this.rootDir, { recursive: true, force: true }).catch(() => {});
    await ensureDir(this.rootDir);

    await Promise.all(
      files.map(async (file) => {
        const relative = normaliseFilePath(file.path);
        const absolute = path.join(this.rootDir, relative);
        await ensureDir(path.dirname(absolute));
        await fs.writeFile(absolute, file.content ?? "");
      })
    );
  }

  spawnShell() {
    const shellCommand = process.env.SANDBOX_SHELL || process.env.SHELL || "/bin/bash";
    const child = spawn(shellCommand, [], {
      cwd: this.rootDir,
      env: {
        ...process.env,
        SANDBOX_PROJECT_ID: this.projectId,
        SANDBOX_ROOT: this.rootDir
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    child.stdin?.setDefaultEncoding("utf8");

    const handle = {
      process: child,
      dispose: () => {
        if (!child.killed) {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 1000).unref?.();
        }
      }
    };

    this.shells.add(handle);
    const cleanup = () => {
      this.shells.delete(handle);
    };
    child.once("exit", cleanup);
    child.once("error", cleanup);

    return handle;
  }

  async openPortForward(port) {
    const numericPort = Number(port) || this.defaultPreviewPort;
    return {
      remotePort: numericPort,
      localPort: numericPort,
      url: `http://127.0.0.1:${numericPort}`,
      async close() {
        return undefined;
      }
    };
  }

  async closePortForward(_handle) {
    return undefined;
  }

  async dispose() {
    for (const handle of Array.from(this.shells)) {
      if (typeof handle.dispose === "function") {
        handle.dispose();
      }
    }
    this.shells.clear();
    await fs.rm(this.rootDir, { recursive: true, force: true }).catch(() => {});
  }
}

const loadE2BSdk = async () => {
  try {
    const mod = await import("@e2b/sdk");
    return mod;
  } catch (error) {
    if (process.env.E2B_API_KEY) {
      console.warn("E2B SDK is not available; falling back to local sandboxes.", error);
    }
    return null;
  }
};

class E2BSandboxAdapter {
  constructor(sandbox, options = {}) {
    this.sandbox = sandbox;
    this.workspaceDir = options.workspaceDir || "/workspace";
    this.defaultPreviewPort = options.defaultPreviewPort || DEFAULT_PREVIEW_PORT;
  }

  static async create(projectId, options = {}) {
    const sdk = await loadE2BSdk();
    if (!sdk?.Sandbox) {
      throw new Error("@e2b/sdk is not installed");
    }

    const sandbox = await sdk.Sandbox.create({
      template: options.template || process.env.E2B_TEMPLATE || "nodejs", // best-effort
      apiKey: process.env.E2B_API_KEY,
      metadata: { projectId }
    });

    return new E2BSandboxAdapter(sandbox, options);
  }

  async init() {
    // No-op for E2B sandboxes (workspace provided by service)
  }

  async syncProject(files) {
    const ops = files.map((file) => ({
      path: path.posix.join(this.workspaceDir, normaliseFilePath(file.path)),
      content: file.content ?? ""
    }));

    for (const op of ops) {
      await this.sandbox.files.write(op.path, op.content);
    }
  }

  spawnShell() {
    if (!this.sandbox?.process) {
      throw new Error("Sandbox process API unavailable");
    }

    const shell = this.sandbox.process.spawn({
      cmd: [process.env.SANDBOX_SHELL || "/bin/bash"],
      cwd: this.workspaceDir
    });

    return {
      process: shell,
      dispose: () => {
        try {
          shell.kill();
        } catch (error) {
          console.warn("Failed to terminate sandbox shell", error);
        }
      },
      resize: (size) => {
        if (typeof shell.resize === "function") {
          shell.resize(size.columns, size.rows);
        }
      }
    };
  }

  async openPortForward(port) {
    if (!this.sandbox?.portForward) {
      throw new Error("Sandbox port forwarding API unavailable");
    }

    const forward = await this.sandbox.portForward(Number(port) || this.defaultPreviewPort);
    return {
      remotePort: forward.remotePort,
      localPort: forward.localPort,
      url: forward.url,
      close: async () => {
        if (typeof forward.close === "function") {
          await forward.close();
        }
      }
    };
  }

  async closePortForward(handle) {
    if (handle?.close) {
      await handle.close();
    }
  }

  async dispose() {
    if (typeof this.sandbox?.close === "function") {
      await this.sandbox.close();
    }
  }
}

class SandboxSession {
  constructor(projectId, adapter, options = {}) {
    this.projectId = projectId;
    this.adapter = adapter;
    this.terminals = new Set();
    this.portForwards = new Map();
    this.connectionCount = 0;
    this.lastUsed = Date.now();
    this.options = options;
  }

  touch() {
    this.lastUsed = Date.now();
  }

  acquireConnection() {
    this.connectionCount += 1;
    this.touch();
    return () => {
      this.connectionCount = Math.max(0, this.connectionCount - 1);
      this.touch();
    };
  }

  async syncProject(files) {
    await this.adapter.syncProject(files);
    this.touch();
  }

  async createTerminal() {
    const handle = this.adapter.spawnShell();
    const terminal = new SandboxTerminal(handle);
    this.terminals.add(terminal);
    terminal.once("exit", () => {
      this.terminals.delete(terminal);
    });
    terminal.once("error", () => {
      this.terminals.delete(terminal);
    });
    this.touch();
    return terminal;
  }

  async acquirePort(remotePort) {
    const portNumber = Number(remotePort);
    if (!Number.isInteger(portNumber)) {
      throw new Error(`Invalid port: ${remotePort}`);
    }

    let existing = this.portForwards.get(portNumber);
    if (!existing) {
      const handle = await this.adapter.openPortForward(portNumber);
      existing = {
        handle,
        refCount: 0
      };
      this.portForwards.set(portNumber, existing);
    }

    existing.refCount += 1;
    this.touch();

    return {
      remotePort: portNumber,
      localPort: existing.handle.localPort ?? portNumber,
      url: existing.handle.url,
      release: async () => {
        existing.refCount = Math.max(0, existing.refCount - 1);
        if (existing.refCount === 0) {
          await this.adapter.closePortForward(existing.handle);
          this.portForwards.delete(portNumber);
        }
      }
    };
  }

  isIdle(idleTimeoutMs) {
    return this.connectionCount === 0 && Date.now() - this.lastUsed > idleTimeoutMs;
  }

  async dispose() {
    for (const terminal of Array.from(this.terminals)) {
      terminal.dispose();
    }
    this.terminals.clear();

    for (const entry of Array.from(this.portForwards.values())) {
      await this.adapter.closePortForward(entry.handle);
    }
    this.portForwards.clear();

    await this.adapter.dispose();
  }
}

export class SandboxManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.idleTimeoutMs = options.idleTimeoutMs || DEFAULT_IDLE_TIMEOUT_MS;
    this.defaultPreviewPort = options.defaultPreviewPort || DEFAULT_PREVIEW_PORT;

    const sweepInterval = options.sweepIntervalMs || this.idleTimeoutMs;
    this.sweeper = setInterval(() => {
      void this.sweep();
    }, sweepInterval);
    if (typeof this.sweeper.unref === "function") {
      this.sweeper.unref();
    }
  }

  async getSession(projectId) {
    let session = this.sessions.get(projectId);
    if (session) {
      return session;
    }

    const adapter = await this.createAdapter(projectId);
    await adapter.init?.();

    session = new SandboxSession(projectId, adapter, {
      defaultPreviewPort: this.defaultPreviewPort
    });
    this.sessions.set(projectId, session);
    return session;
  }

  async createAdapter(projectId) {
    if (process.env.E2B_API_KEY) {
      try {
        return await E2BSandboxAdapter.create(projectId, {
          defaultPreviewPort: this.defaultPreviewPort
        });
      } catch (error) {
        console.warn("Falling back to local sandbox adapter", error);
      }
    }

    return new LocalSandboxAdapter(projectId, {
      defaultPreviewPort: this.defaultPreviewPort
    });
  }

  async ensureSession(projectId) {
    const session = await this.getSession(projectId);
    session.touch();
    return session;
  }

  async release(projectId) {
    const session = this.sessions.get(projectId);
    if (!session) return;
    await session.dispose();
    this.sessions.delete(projectId);
  }

  async sweep() {
    for (const [projectId, session] of this.sessions.entries()) {
      if (session.isIdle(this.idleTimeoutMs)) {
        await session.dispose();
        this.sessions.delete(projectId);
      }
    }
  }

  async shutdown() {
    clearInterval(this.sweeper);
    for (const [projectId] of this.sessions.entries()) {
      await this.release(projectId);
    }
  }
}

export const __TEST_ONLY__ = {
  sanitizeProjectId,
  normaliseFilePath
};
