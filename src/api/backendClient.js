const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787/api").replace(/\/$/, "");

const buildUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${normalizedPath}`;
};

const request = async (path, { method = "GET", body, headers } = {}) => {
  const url = path.startsWith("http") ? path : buildUrl(path);
  const options = { method, headers: { ...(headers ?? {}) } };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request to ${url} failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const projects = {
  list: () => request("/projects"),
  create: (name) => request("/projects", { method: "POST", body: { name } }),
  search: (projectId, params) =>
    request(`/projects/${projectId}/search`, { method: "POST", body: params }),
  compile: (projectId) => request(`/projects/${projectId}/compile`, { method: "POST" }),
  autofix: (projectId, payload) =>
    request(`/projects/${projectId}/autofix`, { method: "POST", body: payload })
};

const memory = {
  get: (projectId) => request(`/memory/${projectId}`),
  set: (projectId, content) => request(`/memory/${projectId}`, { method: "POST", body: { content } })
};

const files = {
  list: (projectId) => request(`/projects/${projectId}/files`),
  save: (projectId, path, content) =>
    request(`/projects/${projectId}/files`, { method: "POST", body: { path, content } })
};

const generate = (payload) => request("/generate", { method: "POST", body: payload });

const auth = {
  /**
   * Retrieve the currently authenticated user if the backend exposes the endpoint.
   * Falls back to rejecting so callers can handle missing authentication gracefully.
   */
  async me() {
    return request("/auth/me");
  },

  /**
   * Attempt to log out. If the endpoint is unavailable we silently ignore the error
   * so the UI can continue to operate in local/demo environments.
   */
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      console.warn("Auth logout endpoint is unavailable:", error);
    }
  }
};

const emptyEntityClient = {
  async list() {
    return [];
  },
  async filter() {
    return [];
  },
  async create() {
    throw new Error("Entity API is not available in this environment");
  },
  async update() {
    throw new Error("Entity API is not available in this environment");
  },
  async delete() {
    throw new Error("Entity API is not available in this environment");
  },
  async get() {
    return null;
  }
};

const entities = new Proxy(
  {},
  {
    get() {
      return emptyEntityClient;
    }
  }
);

const functions = {
  async invoke(name) {
    throw new Error(`Backend function "${name}" is not available in this environment.`);
  }
};

export const backend = {
  request,
  projects,
  memory,
  files,
  generate,
  auth,
  entities,
  functions
};

export default backend;
