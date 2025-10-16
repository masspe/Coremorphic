const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const buildUrl = (path, params) => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${API_BASE_URL}/`);
  if (params) {
    Object.entries(params)
      .filter(([, value]) => value != null)
      .forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
  }
  return url.toString();
};

const request = async (path, { method = 'GET', body, headers, isFormData = false } = {}) => {
  const url = path.startsWith('http') ? path : buildUrl(path, undefined);
  const options = { method, headers: headers ?? {} };

  if (body != null) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

const listEntities = async (entityName, sort) => {
  const query = sort ? `?sort=${encodeURIComponent(sort)}` : '';
  return request(`/entities/${entityName}${query}`);
};

const entityClientFactory = (entityName) => ({
  list: (sort) => listEntities(entityName, sort),
  filter: (filter = {}, sort, limit, offset) =>
    request(`/entities/${entityName}/filter`, { method: 'POST', body: { filter, sort, limit, offset } }),
  create: (data) => request(`/entities/${entityName}`, { method: 'POST', body: data }),
  update: (id, data) => request(`/entities/${entityName}/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/entities/${entityName}/${id}`, { method: 'DELETE' }),
  get: (id) => request(`/entities/${entityName}/${id}`)
});

const toFormData = (payload = {}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item));
    } else if (value != null) {
      formData.append(key, value);
    }
  });
  return formData;
};

const createEntityRegistry = () =>
  new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop !== 'string') {
          return undefined;
        }
        if (!target[prop]) {
          target[prop] = entityClientFactory(prop);
        }
        return target[prop];
      }
    }
  );

export const backend = {
  auth: {
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials })
  },
  entities: createEntityRegistry(),
  functions: {
    invoke: (name, payload) => request(`/functions/${name}`, { method: 'POST', body: payload })
  },
  integrations: {
    Core: {
      InvokeLLM: (payload) => request('/integrations/core/invoke-llm', { method: 'POST', body: payload }),
      SendEmail: (payload) => request('/integrations/core/send-email', { method: 'POST', body: payload }),
      GenerateImage: (payload) => request('/integrations/core/generate-image', { method: 'POST', body: payload }),
      ExtractDataFromUploadedFile: (payload) => request('/integrations/core/extract-data', { method: 'POST', body: payload }),
      CreateFileSignedUrl: (payload) => request('/integrations/core/create-file-url', { method: 'POST', body: payload }),
      UploadFile: ({ file, ...rest }) => {
        const formData = toFormData({ file, ...rest });
        return request('/integrations/core/upload-file', { method: 'POST', body: formData, isFormData: true });
      },
      UploadPrivateFile: ({ file, ...rest }) => {
        const formData = toFormData({ file, ...rest });
        return request('/integrations/core/upload-private-file', { method: 'POST', body: formData, isFormData: true });
      }
    }
  }
};

export default backend;
