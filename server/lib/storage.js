const normalisePath = (value) => value.replace(/^\.\/+/, "").replace(/^\/+/, "");

const buildKey = (projectId, path) => {
  const safeProject = projectId.trim();
  if (!safeProject) {
    throw new Error("projectId is required for storage operations");
  }
  const safePath = normalisePath(path);
  return `projects/${safeProject}/${safePath}`;
};

const ensureText = async (value) => {
  if (!value) return "";
  if (typeof value.text === "function") {
    return value.text();
  }
  if (value instanceof ArrayBuffer) {
    return new TextDecoder().decode(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new TextDecoder().decode(value.buffer);
  }
  return String(value ?? "");
};

export class R2StorageBinding {
  #bucket;

  constructor(bucket) {
    if (!bucket) {
      throw new Error("R2StorageBinding requires an R2 bucket binding");
    }
    this.#bucket = bucket;
  }

  async bootstrap() {
    const probeKey = "__bootstrap__";
    await this.#bucket.put(probeKey, new Uint8Array(0));
    await this.#bucket.delete(probeKey).catch(() => {});
  }

  async listProjectFiles(projectId) {
    const prefix = `projects/${projectId}/`;
    const { objects = [] } = await this.#bucket.list({ prefix });
    const files = [];

    for (const object of objects) {
      const relativePath = object.key.slice(prefix.length);
      if (!relativePath) continue;
      const stored = await this.#bucket.get(object.key);
      const content = await ensureText(stored?.body ?? stored);
      const updatedAt = object.uploaded instanceof Date ? object.uploaded.toISOString() : object.uploaded ?? new Date().toISOString();
      files.push({ path: relativePath, content, updated_at: updatedAt });
    }

    return files;
  }

  async upsertFile(projectId, path, content) {
    const key = buildKey(projectId, path);
    const putResult = await this.#bucket.put(key, String(content ?? ""), {
      httpMetadata: {
        contentType: "text/plain; charset=utf-8"
      }
    });
    const updatedAt = putResult?.uploaded instanceof Date ? putResult.uploaded.toISOString() : new Date().toISOString();
    return { path: normalisePath(path), updated_at: updatedAt };
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

export class StorageServiceClient {
  #serviceBinding;
  #baseUrl;
  #token;

  constructor({ serviceBinding, baseUrl, token } = {}) {
    if (!serviceBinding && !baseUrl) {
      throw new Error(
        "StorageServiceClient requires either a service binding or a STORAGE_SERVICE_URL"
      );
    }

    this.#serviceBinding = serviceBinding ?? null;
    this.#baseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : null;
    this.#token = token || null;
  }

  async #fetch(path, init = {}) {
    const target = this.#baseUrl ? applyBaseUrl(this.#baseUrl, path) : `https://storage.internal${path}`;
    const request = buildRequest(target, init, this.#token);
    const fetcher = this.#serviceBinding?.fetch?.bind(this.#serviceBinding);
    const response = fetcher ? await fetcher(request) : await fetch(request);

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Storage service request failed (${response.status}): ${message}`);
    }

    if (response.status === 204) {
      return {};
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { raw: text };
    }
  }

  async bootstrap() {
    await this.#fetch("/internal/bootstrap", { method: "POST" });
  }

  async listProjectFiles(projectId) {
    const payload = await this.#fetch("/files/list", {
      method: "POST",
      body: { projectId }
    });
    return Array.isArray(payload?.files) ? payload.files : [];
  }

  async upsertFile(projectId, path, content) {
    await this.#fetch("/files", {
      method: "PUT",
      body: { projectId, path, content }
    });
  }
}

export { normalisePath };
