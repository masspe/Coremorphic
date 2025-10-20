import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const METADATA_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS memory (
    project_id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`
];

const responseCache = new WeakMap();
const execFileAsync = promisify(execFile);
const SQLITE_PRAGMA = "PRAGMA foreign_keys = ON;";

const appendSemicolon = (statement) => {
  const trimmed = statement.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
};

const normaliseStatements = (statements) => {
  const parts = Array.isArray(statements) ? statements : [statements];
  return parts.map((part) => appendSemicolon(part)).filter(Boolean).join(" ");
};

const escapeSqlValue = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

const bindSqlParameters = (sql, params = []) => {
  if (!params.length) return sql;

  let positionalIndex = 0;
  return sql.replace(/\?(\d+)?/g, (match, explicitIndex) => {
    const index = explicitIndex ? Number(explicitIndex) - 1 : positionalIndex++;
    if (!Number.isInteger(index) || index < 0 || index >= params.length) {
      throw new Error(`Missing parameter for placeholder ${match}`);
    }
    return escapeSqlValue(params[index]);
  });
};

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const randomId = () => {
  try {
    if (typeof globalThis.crypto?.getRandomValues === "function") {
      const bytes = new Uint8Array(12);
      globalThis.crypto.getRandomValues(bytes);
      return toHex(bytes);
    }
  } catch (_error) {
    // Fall through to Math.random fallback below.
  }

  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 256)).map((value) => value.toString(16).padStart(2, "0")).join("");
};

const normaliseResults = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normaliseResults(entry?.results ?? entry?.rows ?? []));
  }
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.rows)) return value.rows;
  if (typeof value === "object" && value !== null) return [value];
  return [];
};

const ensureJson = async (response) => {
  if (!response) return {};
  if (responseCache.has(response)) {
    return responseCache.get(response);
  }

  const contentType = response.headers.get("content-type") || "";
  let parsed;

  if (contentType.includes("application/json")) {
    parsed = await response.json();
  } else {
    const text = await response.text();
    try {
      parsed = JSON.parse(text);
    } catch (_error) {
      parsed = { raw: text };
    }
  }

  responseCache.set(response, parsed);
  return parsed;
};

class SqliteMetadataStore {
  #dbPath;
  #initialisePromise;

  constructor(databasePath) {
    if (!databasePath) {
      throw new Error("SqliteMetadataStore requires a database path");
    }
    this.#dbPath = path.resolve(databasePath);
    this.#initialisePromise = fs.promises
      .mkdir(path.dirname(this.#dbPath), { recursive: true })
      .catch(() => {});
  }

  async #ensureReady() {
    if (this.#initialisePromise) {
      await this.#initialisePromise;
      this.#initialisePromise = null;
    }
  }

  async #run(statements, { expectResult = false } = {}) {
    await this.#ensureReady();
    const payload = normaliseStatements(statements);
    if (!payload) return expectResult ? [] : undefined;
    const query = `${SQLITE_PRAGMA} ${payload}`;
    const args = expectResult ? ["-json", this.#dbPath, query] : [this.#dbPath, query];

    try {
      const { stdout } = await execFileAsync("sqlite3", args);
      if (!expectResult) return undefined;
      const trimmed = stdout.trim();
      if (!trimmed) return [];
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        throw new Error(`Failed to parse SQLite response: ${error?.message || error}`);
      }
    } catch (error) {
      const stderr = error?.stderr?.trim?.() || error?.message || String(error);
      throw new Error(`SQLite command failed: ${stderr}`);
    }
  }

  async #execute(sql, params = []) {
    const bound = bindSqlParameters(sql, params);
    await this.#run(bound);
  }

  async #query(sql, params = []) {
    const bound = bindSqlParameters(sql, params);
    return this.#run(bound, { expectResult: true });
  }

  async ensureSchema() {
    await this.#run(METADATA_SCHEMA);
  }

  async listProjects() {
    return this.#query("SELECT id, name, created_at FROM projects ORDER BY created_at DESC");
  }

  async createProject(name) {
    const id = randomId();
    const createdAt = new Date().toISOString();
    await this.#execute("INSERT INTO projects (id, name, created_at) VALUES (?1, ?2, ?3)", [id, name, createdAt]);
    return { id, name, created_at: createdAt };
  }

  async getProject(projectId) {
    const rows = await this.#query("SELECT id, name, created_at FROM projects WHERE id = ?1", [projectId]);
    return rows?.[0] ?? null;
  }

  async addMessage(projectId, role, content) {
    await this.#execute(
      "INSERT INTO messages (project_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
      [projectId, role, content, new Date().toISOString()]
    );
  }

  async getMessages(projectId) {
    return this.#query(
      "SELECT role, content, created_at FROM messages WHERE project_id = ?1 ORDER BY id ASC",
      [projectId]
    );
  }

  async getMemory(projectId) {
    const rows = await this.#query("SELECT project_id, content FROM memory WHERE project_id = ?1", [projectId]);
    if (rows?.[0]) return rows[0];
    return { project_id: projectId, content: "" };
  }

  async setMemory(projectId, content) {
    await this.#execute(
      "INSERT INTO memory (project_id, content) VALUES (?1, ?2) ON CONFLICT(project_id) DO UPDATE SET content = excluded.content",
      [projectId, content]
    );
    return { project_id: projectId, content };
  }
}

export class D1MetadataStore {
  #d1;

  constructor(d1) {
    if (!d1) {
      throw new Error("D1MetadataStore requires a bound D1 database instance");
    }
    this.#d1 = d1;
  }

  async ensureSchema() {
    for (const statement of METADATA_SCHEMA) {
      await this.#d1.prepare(statement).run();
    }
  }

  async listProjects() {
    const { results } = await this.#d1.prepare("SELECT id, name, created_at FROM projects ORDER BY created_at DESC").all();
    return results ?? [];
  }

  async createProject(name) {
    const id = randomId();
    const createdAt = new Date().toISOString();
    await this.#d1
      .prepare("INSERT INTO projects (id, name, created_at) VALUES (?1, ?2, ?3)")
      .bind(id, name, createdAt)
      .run();
    return { id, name, created_at: createdAt };
  }

  async getProject(projectId) {
    const { results } = await this.#d1
      .prepare("SELECT id, name, created_at FROM projects WHERE id = ?1")
      .bind(projectId)
      .all();
    return results?.[0] ?? null;
  }

  async addMessage(projectId, role, content) {
    await this.#d1
      .prepare(
        "INSERT INTO messages (project_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)"
      )
      .bind(projectId, role, content, new Date().toISOString())
      .run();
  }

  async getMessages(projectId) {
    const { results } = await this.#d1
      .prepare(
        "SELECT role, content, created_at FROM messages WHERE project_id = ?1 ORDER BY id ASC"
      )
      .bind(projectId)
      .all();
    return results ?? [];
  }

  async getMemory(projectId) {
    const { results } = await this.#d1
      .prepare("SELECT project_id, content FROM memory WHERE project_id = ?1")
      .bind(projectId)
      .all();
    if (results?.[0]) {
      return results[0];
    }
    return { project_id: projectId, content: "" };
  }

  async setMemory(projectId, content) {
    await this.#d1
      .prepare(
        "INSERT INTO memory (project_id, content) VALUES (?1, ?2) ON CONFLICT(project_id) DO UPDATE SET content = excluded.content"
      )
      .bind(projectId, content)
      .run();
    return { project_id: projectId, content };
  }
}

const buildRequest = (path, init = {}, token) => {
  const headers = new Headers(init.headers || {});
  let body = init.body;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body && typeof body === "object" && !(body instanceof ArrayBuffer) && !(body instanceof Blob) && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  return new Request(path, { ...init, headers, body });
};

const applyBaseUrl = (baseUrl, path) => {
  const normalisedBase = baseUrl.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${normalisedBase}${path.startsWith("/") ? path : `/${path}`}`;
};

export class MetadataServiceClient {
  #serviceBinding;
  #baseUrl;
  #token;
  #store;
  #storeReadyPromise;

  constructor({ serviceBinding, baseUrl, token } = {}) {
    this.#serviceBinding = serviceBinding ?? null;
    this.#baseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : null;
    this.#token = token || null;

    if (!this.#serviceBinding && !this.#baseUrl) {
      const databasePath =
        process.env.METADATA_SQLITE_PATH || path.join(process.cwd(), "data", "metadata.sqlite");
      this.#store = new SqliteMetadataStore(databasePath);
      this.#storeReadyPromise = this.#store.ensureSchema();
    } else {
      this.#store = null;
      this.#storeReadyPromise = null;
    }
  }

  async #ensureLocalStoreReady() {
    if (!this.#store) return null;
    if (!this.#storeReadyPromise) {
      this.#storeReadyPromise = this.#store.ensureSchema();
    }
    await this.#storeReadyPromise;
    return this.#store;
  }

  async #fetch(path, init = {}) {
    if (this.#store) {
      throw new Error("MetadataServiceClient is configured for a local SQLite store");
    }

    const target = this.#baseUrl ? applyBaseUrl(this.#baseUrl, path) : `https://metadata.internal${path}`;
    const request = buildRequest(target, init, this.#token);
    const fetcher = this.#serviceBinding?.fetch?.bind(this.#serviceBinding);
    const response = fetcher ? await fetcher(request) : await fetch(request);

    if (!response.ok) {
      const payload = await ensureJson(response);
      const message = payload?.error || payload?.errors?.[0]?.message || response.statusText;
      throw new Error(`Metadata service request failed (${response.status}): ${message}`);
    }

    if (response.status === 204) {
      return {};
    }

    return ensureJson(response);
  }

  async bootstrap() {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      this.#storeReadyPromise = store.ensureSchema();
      await this.#storeReadyPromise;
      return;
    }
    await this.#fetch("/internal/bootstrap", { method: "POST" });
  }

  async listProjects() {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.listProjects();
    }
    const payload = await this.#fetch("/projects", { method: "GET" });
    return Array.isArray(payload?.projects) ? payload.projects : normaliseResults(payload);
  }

  async createProject(name) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.createProject(name || "New Project");
    }
    const payload = await this.#fetch("/projects", { method: "POST", body: { name } });
    return payload?.project ?? null;
  }

  async getProject(projectId) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.getProject(projectId);
    }
    const payload = await this.#fetch(`/projects/${encodeURIComponent(projectId)}`, { method: "GET" });
    return payload?.project ?? null;
  }

  async getMessages(projectId) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.getMessages(projectId);
    }
    const payload = await this.#fetch(`/projects/${encodeURIComponent(projectId)}/messages`, {
      method: "GET"
    });
    return Array.isArray(payload?.messages) ? payload.messages : normaliseResults(payload);
  }

  async addMessage(projectId, role, content) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      await store.addMessage(projectId, role, content);
      return;
    }
    await this.#fetch(`/projects/${encodeURIComponent(projectId)}/messages`, {
      method: "POST",
      body: { role, content }
    });
  }

  async getMemory(projectId) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.getMemory(projectId);
    }
    const payload = await this.#fetch(`/projects/${encodeURIComponent(projectId)}/memory`, {
      method: "GET"
    });
    if (payload?.memory) return payload.memory;
    if (payload?.project_id) return payload;
    return { project_id: projectId, content: "" };
  }

  async setMemory(projectId, content) {
    const store = await this.#ensureLocalStoreReady();
    if (store) {
      return store.setMemory(projectId, content);
    }
    const payload = await this.#fetch(`/projects/${encodeURIComponent(projectId)}/memory`, {
      method: "PUT",
      body: { content }
    });
    return payload?.memory ?? { project_id: projectId, content };
  }
}

export { METADATA_SCHEMA, SqliteMetadataStore };
