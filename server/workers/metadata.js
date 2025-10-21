import { D1MetadataStore } from "../lib/db.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const parseJson = async (request) => {
  try {
    if (!request.body) return {};
    return await request.json();
  } catch (error) {
    throw new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};

let storeCache = null;
let schemaInitialised = false;

const getStore = (env) => {
  if (!env || (!env.COREMORPHIC_D1 && !env.DB && !env.METADATA_DB)) {
    throw new Error("D1 binding (COREMORPHIC_D1) is required for metadata worker");
  }

  if (!storeCache) {
    const binding = env.COREMORPHIC_D1 || env.DB || env.METADATA_DB;
    storeCache = new D1MetadataStore(binding);
  }

  return storeCache;
};

const ensureSchema = async (store) => {
  if (!schemaInitialised) {
    await store.ensureSchema();
    schemaInitialised = true;
  }
};

const notFound = () => json({ error: "Not found" }, 404);

const handleAppPreview = async (request, appId, store) => {
  const pathname = new URL(request.url).pathname;

  if (!pathname.endsWith("/preview")) {
    return notFound();
  }

  if (request.method === "GET") {
    const preview = await store.getAppPreview(appId);
    return json({ preview });
  }

  if (request.method === "POST") {
    const payload = await parseJson(request);
    if (typeof payload.code !== "string") {
      return json({ error: "code must be a string" }, 400);
    }
    const preview = await store.setAppPreview(appId, payload.code);
    return json({ preview });
  }

  return json({ error: "Method not allowed" }, 405);
};

const handleProject = async (request, projectId, store) => {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith("/messages")) {
    if (request.method === "GET") {
      const messages = await store.getMessages(projectId);
      return json({ messages });
    }

    if (request.method === "POST") {
      const payload = await parseJson(request);
      const role = typeof payload.role === "string" ? payload.role.trim() : "";
      const content = typeof payload.content === "string" ? payload.content : "";
      if (!role || !content) {
        return json({ error: "role and content are required" }, 400);
      }
      await store.addMessage(projectId, role, content);
      return json({ ok: true }, 201);
    }

    return json({ error: "Method not allowed" }, 405);
  }

  if (pathname.endsWith("/memory")) {
    if (request.method === "GET") {
      const memory = await store.getMemory(projectId);
      return json({ memory });
    }

    if (request.method === "PUT") {
      const payload = await parseJson(request);
      const content = typeof payload.content === "string" ? payload.content : "";
      const memory = await store.setMemory(projectId, content);
      return json({ memory });
    }

    return json({ error: "Method not allowed" }, 405);
  }

  if (request.method === "GET") {
    const project = await store.getProject(projectId);
    if (!project) return json({ error: "Project not found" }, 404);
    return json({ project });
  }

  return json({ error: "Method not allowed" }, 405);
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const store = getStore(env);
      await ensureSchema(store);

      if (request.method === "POST" && url.pathname === "/internal/bootstrap") {
        await store.ensureSchema();
        return json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/projects") {
        const projects = await store.listProjects();
        return json({ projects });
      }

      if (request.method === "POST" && url.pathname === "/projects") {
        const payload = await parseJson(request);
        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const project = await store.createProject(name || "New Project");
        return json({ project }, 201);
      }

      const appMatch = url.pathname.match(/^\/apps\/([^/]+)(?:\/(.*))?$/);
      if (appMatch) {
        const [, appId, remainder = ""] = appMatch;
        const scopedRequest = new Request(new URL(`/apps/${appId}/${remainder}`, request.url), request);
        return handleAppPreview(scopedRequest, appId, store);
      }

      const projectMatch = url.pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
      if (!projectMatch) {
        return notFound();
      }

      const [, projectId, remainder = ""] = projectMatch;
      const scopedRequest = new Request(new URL(`/projects/${projectId}/${remainder}`, request.url), request);

      if (remainder.startsWith("messages")) {
        return handleProject(scopedRequest, projectId, store);
      }

      if (remainder.startsWith("memory")) {
        return handleProject(scopedRequest, projectId, store);
      }

      if (!remainder) {
        return handleProject(scopedRequest, projectId, store);
      }

      return notFound();
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      console.error("Metadata worker failure", error);
      return json({ error: "Internal error" }, 500);
    }
  }
};
