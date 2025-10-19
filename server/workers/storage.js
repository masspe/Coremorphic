import { R2StorageBinding } from "../lib/storage.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const parseJson = async (request) => {
  try {
    if (!request.body) return {};
    return await request.json();
  } catch (_error) {
    throw new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};

let storageCache = null;

const getStorage = (env) => {
  if (!env || (!env.COREMORPHIC_R2 && !env.STORAGE_BUCKET)) {
    throw new Error("R2 binding (COREMORPHIC_R2) is required for storage worker");
  }

  if (!storageCache) {
    const binding = env.COREMORPHIC_R2 || env.STORAGE_BUCKET;
    storageCache = new R2StorageBinding(binding);
  }

  return storageCache;
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const storage = getStorage(env);

      if (request.method === "POST" && url.pathname === "/internal/bootstrap") {
        await storage.bootstrap();
        return json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/files/list") {
        const payload = await parseJson(request);
        const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
        if (!projectId) {
          return json({ error: "projectId is required" }, 400);
        }
        const files = await storage.listProjectFiles(projectId);
        return json({ files });
      }

      if (request.method === "PUT" && url.pathname === "/files") {
        const payload = await parseJson(request);
        const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
        const path = typeof payload.path === "string" ? payload.path : "";
        const content = typeof payload.content === "string" ? payload.content : "";
        if (!projectId || !path) {
          return json({ error: "projectId and path are required" }, 400);
        }
        await storage.upsertFile(projectId, path, content);
        return json({ ok: true }, 201);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      console.error("Storage worker failure", error);
      return json({ error: "Internal error" }, 500);
    }
  }
};
