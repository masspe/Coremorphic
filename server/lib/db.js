import DatabaseSql from "better-sqlite3";
import fs from "fs";
import crypto from "crypto";

export class Database {
  constructor(path = "./data.sqlite") {
    const shouldInit = !fs.existsSync(path);
    this.db = new DatabaseSql(path);
    if (shouldInit) this._init();
  }

  _init() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, path)
      );
      CREATE TABLE memory (
        project_id TEXT PRIMARY KEY,
        content TEXT NOT NULL
      );
    `);
  }

  createProject(name) {
    const id = this._randomId();
    const created_at = new Date().toISOString();
    this.db
      .prepare(`INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)`)
      .run(id, name, created_at);
    return { id, name, created_at };
  }

  listProjects() {
    return this.db
      .prepare(`SELECT * FROM projects ORDER BY created_at DESC`)
      .all();
  }

  getProject(projectId) {
    return this.db
      .prepare(`SELECT id, name, created_at FROM projects WHERE id = ?`)
      .get(projectId);
  }

  addMessage(projectId, role, content) {
    this.db
      .prepare(
        `INSERT INTO messages (project_id, role, content, created_at) VALUES (?, ?, ?, ?)`
      )
      .run(projectId, role, content, new Date().toISOString());
  }

  getMessages(projectId) {
    return this.db
      .prepare(
        `SELECT role, content, created_at FROM messages WHERE project_id = ? ORDER BY id ASC`
      )
      .all(projectId);
  }

  listFiles(projectId) {
    return this.db
      .prepare(
        `SELECT path, content, updated_at FROM files WHERE project_id = ? ORDER BY path ASC`
      )
      .all(projectId);
  }

  upsertFile(projectId, path, content) {
    const now = new Date().toISOString();
    this.db
      .prepare(`
      INSERT INTO files (project_id, path, content, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, path) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
    `)
      .run(projectId, path, String(content ?? ""), now);
  }

  getMemory(projectId) {
    return (
      this.db
        .prepare(
          `SELECT project_id, content FROM memory WHERE project_id = ?`
        )
        .get(projectId) || { project_id: projectId, content: "" }
    );
  }

  setMemory(projectId, content) {
    this.db
      .prepare(`
      INSERT INTO memory (project_id, content) VALUES (?, ?)
      ON CONFLICT(project_id) DO UPDATE SET content = excluded.content
    `)
      .run(projectId, content);
  }

  _randomId() {
    return crypto.randomBytes(12).toString("base64url");
  }
}
