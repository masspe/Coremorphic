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
  create: (name) => request("/projects", { method: "POST", body: { name } })
};

const memory = {
  get: (projectId) => request(`/memory/${projectId}`),
  set: (projectId, content) => request(`/memory/${projectId}`, { method: "POST", body: { content } })
};

const files = {
  list: (projectId) => request(`/projects/${projectId}/files`),
  save: (projectId, path, content) =>
    request(`/projects/${projectId}/files`, { method: "POST", body: { path, content } }),
  exportZip: async (projectId) => {
    const url = buildUrl(`/projects/${projectId}/export`);
    const response = await fetch(url);

    if (!response.ok) {
      let message = `Export request to ${url} failed with status ${response.status}`;
      try {
        const data = await response.json();
        if (data?.error) {
          message = data.error;
        }
      } catch (jsonError) {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch (textError) {
          console.warn("Failed to parse export error response", jsonError, textError);
        }
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    let filename = `project-${projectId}.zip`;

    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    if (match) {
      const encoded = match[1] || match[2];
      if (encoded) {
        try {
          filename = decodeURIComponent(encoded);
        } catch (error) {
          console.warn("Failed to decode export filename", error);
          filename = encoded;
        }
      }
    }

    return { blob, filename };
  }
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
