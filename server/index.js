import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mongodb://localhost:27017/coremorphic';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoClient = new MongoClient(process.env.DATABASE_URL, {
  serverSelectionTimeoutMS: 5000
});
let entityCollection = null;
let mongoInitialised = null;
const fsPromises = fs.promises;
const app = express();

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const safeJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable]';
  }
};

app.use((req, res, next) => {
  const startTime = Date.now();
  const requestSummary = {
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    params: req.params,
    body: req.body
  };

  console.log(`Incoming request: ${safeJson(requestSummary)}`);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    console.log(
      `Request completed: ${safeJson({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs
      })}`
    );
  });

  next();
});

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

const tempDataDir = path.join(os.tmpdir(), 'coremorphic');
const fileStorePath = path.join(tempDataDir, 'entities.json');
const appsRootDir = path.resolve(__dirname, '../apps');

if (!fs.existsSync(appsRootDir)) {
  fs.mkdirSync(appsRootDir, { recursive: true });
}

const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

const extractJson = (raw) => {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normaliseFile = (file) => ({
  name: typeof file?.name === 'string' ? file.name : file?.path ?? 'Untitled.jsx',
  path: typeof file?.path === 'string' ? file.path : file?.name ?? 'Untitled.jsx',
  type: typeof file?.type === 'string' ? file.type : 'file',
  content: typeof file?.content === 'string' ? file.content : '',
  language: typeof file?.language === 'string' ? file.language : 'javascript'
});

const normaliseEntity = (entity) => ({
  name: typeof entity?.name === 'string' ? entity.name : 'Entity',
  fields: ensureArray(entity?.fields ?? [])
});

const normaliseTrigger = (trigger) => ({
  name: typeof trigger?.name === 'string' ? trigger.name : 'Trigger',
  source: typeof trigger?.source === 'string' ? trigger.source : 'source',
  target: typeof trigger?.target === 'string' ? trigger.target : 'target'
});

const normaliseTask = (task) => ({
  name: typeof task?.name === 'string' ? task.name : 'Scheduled Task',
  scheduled_at: task?.scheduled_at ?? new Date().toISOString(),
  cadence: typeof task?.cadence === 'string' ? task.cadence : 'once'
});

const normaliseScript = (script) => ({
  name: typeof script?.name === 'string' ? script.name : 'Script',
  language: typeof script?.language === 'string' ? script.language : 'javascript',
  content: typeof script?.content === 'string' ? script.content : ''
});

const normaliseTest = (test) => ({
  name: typeof test?.name === 'string' ? test.name : 'Test Case',
  test_type: typeof test?.test_type === 'string' ? test.test_type : 'unit',
  steps: ensureArray(test?.steps ?? [])
});

const buildGenerationPrompt = ({ prompt, modificationMode = false, fileUrls = [] }) => {
  const basePrompt = `You are Coremorphic's AI assistant. Generate starter application scaffolding based on the user's request.
Return a JSON object with the following keys:
- summary: short sentence summarising the work you performed.
- createdFiles: array of { name, path, type, language, content } describing suggested source files.
- createdEntities: array of { name, fields } for recommended data entities.
- createdTriggers: array describing automation triggers with { name, source, target }.
- createdTasks: array of scheduled tasks with { name, scheduled_at, cadence }.
- createdScripts: array of custom scripts with { name, language, content }.
- createdTests: array of tests with { name, test_type, steps }.
Also include totalFiles, totalEntities, totalTriggers, totalTasks, totalScripts, totalTests representing the counts for each section.
If you do not have enough information, make reasonable assumptions and still return valid JSON.`;

  const context = [basePrompt, `User request: ${prompt.trim()}`];

  if (modificationMode) {
    context.push('The user may be modifying an existing application. Provide updates that can be merged into existing code.');
  }

  if (fileUrls.length > 0) {
    context.push(`Reference these files for context: ${fileUrls.join(', ')}`);
  }

  return context.join('\n\n');
};

const generateAppCodeWithOpenAI = async (payload) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY to enable AI generation.');
  }

  if (!payload?.prompt || typeof payload.prompt !== 'string' || !payload.prompt.trim()) {
    throw new Error('A prompt is required to generate app code.');
  }

  const body = {
    model: payload.model || DEFAULT_AI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are a senior full-stack engineer assisting users in scaffolding web applications. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: buildGenerationPrompt(payload)
      }
    ]
  };

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText || response.statusText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  if (!parsed) {
    throw new Error('Failed to parse response from OpenAI. Ensure the model returns JSON.');
  }

  const createdFiles = ensureArray(parsed.createdFiles).map(normaliseFile);
  const createdEntities = ensureArray(parsed.createdEntities).map(normaliseEntity);
  const createdTriggers = ensureArray(parsed.createdTriggers).map(normaliseTrigger);
  const createdTasks = ensureArray(parsed.createdTasks).map(normaliseTask);
  const createdScripts = ensureArray(parsed.createdScripts).map(normaliseScript);
  const createdTests = ensureArray(parsed.createdTests).map(normaliseTest);

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Generated starter resources for your application.',
    createdFiles,
    createdEntities,
    createdTriggers,
    createdTasks,
    createdScripts,
    createdTests,
    totalFiles: Number.isFinite(parsed.totalFiles) ? parsed.totalFiles : createdFiles.length,
    totalEntities: Number.isFinite(parsed.totalEntities) ? parsed.totalEntities : createdEntities.length,
    totalTriggers: Number.isFinite(parsed.totalTriggers) ? parsed.totalTriggers : createdTriggers.length,
    totalTasks: Number.isFinite(parsed.totalTasks) ? parsed.totalTasks : createdTasks.length,
    totalScripts: Number.isFinite(parsed.totalScripts) ? parsed.totalScripts : createdScripts.length,
    totalTests: Number.isFinite(parsed.totalTests) ? parsed.totalTests : createdTests.length
  };
};

class FileEntityStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = { entities: [] };
    this._ensureDirectory();
    this._load();
  }

  _ensureDirectory() {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entities)) {
        this.state.entities = parsed.entities;
      }
    } catch (error) {
      console.warn('Failed to read local entity store. Recreating file store.', error);
      this.state = { entities: [] };
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    }
  }

  _persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  _toEntity(record) {
    return {
      id: record.id,
      type: record.type,
      data: record.data,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt)
    };
  }

  async findMany({ where = {} } = {}) {
    const { type } = where;
    const items = typeof type === 'string' ? this.state.entities.filter((item) => item.type === type) : this.state.entities;
    return items.map((item) => this._toEntity(item));
  }

  async findUnique({ where = {} } = {}) {
    const { id } = where;
    if (!id) return null;
    const record = this.state.entities.find((item) => item.id === id);
    return record ? this._toEntity(record) : null;
  }

  async create({ data }) {
    const now = new Date();
    const record = {
      id: generateEntityId(),
      type: data.type,
      data: data.data,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    this.state.entities.push(record);
    this._persist();
    return this._toEntity(record);
  }

  async update({ where = {}, data }) {
    const { id } = where;
    if (!id) {
      throw new Error('Entity id is required for updates');
    }
    const index = this.state.entities.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Entity not found');
    }

    const existing = this.state.entities[index];
    const updatedAt = new Date();
    const updated = {
      ...existing,
      type: data.type ?? existing.type,
      data: data.data ?? existing.data,
      updatedAt: updatedAt.toISOString()
    };
    this.state.entities[index] = updated;
    this._persist();
    return this._toEntity(updated);
  }

  async delete({ where = {} } = {}) {
    const { id } = where;
    if (!id) {
      throw new Error('Entity id is required for deletion');
    }
    const index = this.state.entities.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Entity not found');
    }

    const [removed] = this.state.entities.splice(index, 1);
    this._persist();
    return removed ? this._toEntity(removed) : null;
  }
}

let mongoAvailable = true;
let mongoWarningLogged = false;

let fileStoreInstance = null;

const logFallbackWarning = (error) => {
  if (mongoWarningLogged) return;
  mongoWarningLogged = true;
  const reason = error?.message ? ` (${error.message})` : '';
  console.warn(
    `MongoDB connection unavailable${reason}. Falling back to local file storage at ${fileStorePath}`
  );
};

const disableMongo = async (error) => {
  if (!mongoAvailable && !entityCollection) return;
  mongoAvailable = false;
  entityCollection = null;
  logFallbackWarning(error);
  try {
    await mongoClient.close();
  } catch (closeError) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to close MongoDB client cleanly:', closeError.message);
    }
  }
};

const initialiseMongo = () => {
  if (!mongoInitialised) {
    mongoInitialised = (async () => {
      try {
        await mongoClient.connect();
        const database = mongoClient.db();
        entityCollection = database.collection('entities');
        await entityCollection.createIndex({ type: 1 }).catch(() => {});
        mongoAvailable = true;
      } catch (error) {
        await disableMongo(error);
        throw error;
      }
    })();
  }
  return mongoInitialised;
};

const ensureMongoCollection = async () => {
  if (!mongoAvailable) {
    return false;
  }
  if (!entityCollection) {
    try {
      await initialiseMongo();
    } catch (error) {
      await disableMongo(error);
      return false;
    }
  }
  return Boolean(entityCollection);
};

const generateEntityId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
};

const getFileStore = () => {
  if (!fileStoreInstance) {
    fileStoreInstance = new FileEntityStore(fileStorePath);
  }
  return fileStoreInstance;
};

const normaliseDate = (value) => {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
};

const toEntityFromMongo = (document) => {
  if (!document) return null;
  const idValue = document._id;
  const id = typeof idValue?.toString === 'function' ? idValue.toString() : String(idValue);
  return {
    id,
    type: document.type,
    data: document.data ?? {},
    createdAt: normaliseDate(document.createdAt),
    updatedAt: normaliseDate(document.updatedAt)
  };
};

const buildIdFilter = (id) => {
  if (!id) return null;
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
  }
  return { _id: id };
};

const entityStore = {
  async findMany({ where = {} } = {}) {
    if (await ensureMongoCollection()) {
      try {
        const filter = {};
        if (typeof where.type === 'string') {
          filter.type = where.type;
        }
        const documents = await entityCollection.find(filter).toArray();
        return documents.map(toEntityFromMongo);
      } catch (error) {
        await disableMongo(error);
        return getFileStore().findMany({ where });
      }
    }
    return getFileStore().findMany({ where });
  },
  async findUnique({ where = {} } = {}) {
    const { id } = where;
    if (await ensureMongoCollection()) {
      try {
        const filter = buildIdFilter(id);
        if (!filter) {
          return null;
        }
        const document = await entityCollection.findOne(filter);
        return toEntityFromMongo(document);
      } catch (error) {
        await disableMongo(error);
        return getFileStore().findUnique({ where });
      }
    }
    return getFileStore().findUnique({ where });
  },
  async create({ data }) {
    if (await ensureMongoCollection()) {
      try {
        const now = new Date();
        const document = {
          type: data.type,
          data: data.data ?? {},
          createdAt: now,
          updatedAt: now
        };
        if (data?.id) {
          document._id = data.id;
        }
        const result = await entityCollection.insertOne(document);
        const insertedId = result.insertedId ?? document._id;
        return toEntityFromMongo({ ...document, _id: insertedId });
      } catch (error) {
        await disableMongo(error);
        return getFileStore().create({ data });
      }
    }
    return getFileStore().create({ data });
  },
  async update({ where = {}, data }) {
    const { id } = where;
    if (!id) {
      throw new Error('Entity id is required for updates');
    }
    if (await ensureMongoCollection()) {
      try {
        const filter = buildIdFilter(id);
        if (!filter) {
          throw new Error('Entity id is required for updates');
        }
        const updateDoc = {
          $set: {
            type: data.type,
            data: data.data ?? {},
            updatedAt: new Date()
          }
        };
        const result = await entityCollection.findOneAndUpdate(filter, updateDoc, {
          returnDocument: 'after'
        });
        if (!result.value) {
          throw new Error('Entity not found');
        }
        return toEntityFromMongo(result.value);
      } catch (error) {
        if (error.message === 'Entity not found' || error.message === 'Entity id is required for updates') {
          throw error;
        }
        await disableMongo(error);
        return getFileStore().update({ where, data });
      }
    }
    return getFileStore().update({ where, data });
  },
  async delete({ where = {} } = {}) {
    const { id } = where;
    if (!id) {
      throw new Error('Entity id is required for deletion');
    }
    if (await ensureMongoCollection()) {
      try {
        const filter = buildIdFilter(id);
        const result = await entityCollection.findOneAndDelete(filter);
        if (!result.value) {
          throw new Error('Entity not found');
        }
        return toEntityFromMongo(result.value);
      } catch (error) {
        if (error.message === 'Entity not found') {
          throw error;
        }
        await disableMongo(error);
        return getFileStore().delete({ where });
      }
    }
    return getFileStore().delete({ where });
  }
};

initialiseMongo()
  .then(() => {
    console.log(`MongoDB connection established at ${DATABASE_URL}`);
  })
  .catch(() => {});

app.use('/uploads', express.static(uploadsDir));

const defaultUser = {
  id: 'demo-user',
  email: 'demo@coremorphic.local',
  name: 'Coremorphic Demo User',
  role: 'admin'
};

const buildEntityResponse = (entity) => ({
  id: entity.id,
  ...entity.data,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt
});

const getPathValue = (obj, pathValue) => {
  if (!pathValue) return undefined;
  return pathValue.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};

const applySort = (items, sort) => {
  if (!sort) return items;
  const sortKey = Array.isArray(sort) ? sort[0] : sort;
  if (!sortKey) return items;
  const direction = sortKey.startsWith('-') ? -1 : 1;
  const key = sortKey.startsWith('-') ? sortKey.slice(1) : sortKey;
  return [...items].sort((a, b) => {
    const aValue = getPathValue(a, key);
    const bValue = getPathValue(b, key);
    if (aValue === bValue) return 0;
    if (aValue == null) return 1 * direction;
    if (bValue == null) return -1 * direction;
    if (aValue > bValue) return direction;
    if (aValue < bValue) return -direction;
    return 0;
  });
};

const normaliseAppId = (value) => (typeof value === 'string' ? value.trim() : '');

const formatAppFileRecord = (entity) => {
  if (!entity) {
    return null;
  }

  const payload = entity.data ?? {};
  const resolvedAppId = normaliseAppId(payload.app_id ?? payload.appId);

  return {
    id: entity.id,
    appId: resolvedAppId,
    app_id: resolvedAppId,
    name: typeof payload.name === 'string' ? payload.name : payload.path ?? 'Untitled.jsx',
    path: typeof payload.path === 'string' ? payload.path : payload.name ?? 'Untitled.jsx',
    type: typeof payload.type === 'string' ? payload.type : 'file',
    language: typeof payload.language === 'string' ? payload.language : 'javascript',
    content: typeof payload.content === 'string' ? payload.content : '',
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
};

const listAppFileEntities = async (appId) => {
  const trimmedAppId = normaliseAppId(appId);
  if (!trimmedAppId) {
    return [];
  }

  const entities = await entityStore.findMany({ where: { type: 'AppFile' } });
  return entities
    .map(formatAppFileRecord)
    .filter((record) => record && normaliseAppId(record.appId) === trimmedAppId);
};

const findAppFileEntity = async (appId, filePath) => {
  const trimmedAppId = normaliseAppId(appId);
  const trimmedPath = typeof filePath === 'string' ? filePath.trim() : '';
  if (!trimmedAppId || !trimmedPath) {
    return null;
  }

  const entities = await entityStore.findMany({ where: { type: 'AppFile' } });
  return entities.find((entity) => {
    const payload = entity.data ?? {};
    const entityAppId = normaliseAppId(payload.app_id ?? payload.appId);
    const entityPath = typeof payload.path === 'string' ? payload.path.trim() : '';
    return entityAppId === trimmedAppId && entityPath === trimmedPath;
  });
};

const groupFilesByCategory = (files) => {
  const groups = {
    pages: [],
    components: [],
    entities: [],
    functions: [],
    agents: [],
    layout: [],
    other: []
  };

  files.forEach((file) => {
    if (!file) return;
    const { content, ...rest } = file;
    const key =
      file.type === 'page'
        ? 'pages'
        : file.type === 'component'
        ? 'components'
        : file.type === 'entity'
        ? 'entities'
        : file.type === 'function'
        ? 'functions'
        : file.type === 'agent'
        ? 'agents'
        : file.type === 'layout'
        ? 'layout'
        : 'other';

    groups[key].push(rest);
  });

  return groups;
};

const matchesFilter = (item, filter) => {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, expected]) => {
    const actual = getPathValue(item, key);
    if (expected == null) {
      return actual == null;
    }
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    if (typeof expected === 'object' && !(expected instanceof Date)) {
      return matchesFilter(actual ?? {}, expected);
    }
    return actual === expected;
  });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', databaseUrl: DATABASE_URL });
});

app.get('/api/auth/me', async (req, res) => {
  res.json(defaultUser);
});

app.post('/api/auth/logout', async (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  res.json({ ...defaultUser, email: email ?? defaultUser.email });
});

app.post('/api/apps/:appId/save', async (req, res) => {
  try {
    const { appId } = req.params;
    const { code } = req.body ?? {};

    if (!appId || typeof appId !== 'string' || !appId.trim()) {
      res.status(400).json({ error: 'A valid appId is required.' });
      return;
    }

    if (typeof code !== 'string') {
      res.status(400).json({ error: 'Code must be provided as a string.' });
      return;
    }

    const trimmedAppId = appId.trim();
    const appDirectory = path.join(appsRootDir, trimmedAppId);
    const targetFile = path.join(appDirectory, 'index.jsx');

    await fsPromises.mkdir(appDirectory, { recursive: true });
    await fsPromises.writeFile(targetFile, code, 'utf8');

    res.status(200).json({ success: true, path: targetFile });
  } catch (error) {
    console.error('Failed to persist generated app code', error);
    res.status(500).json({ error: 'Failed to persist generated code.' });
  }
});

app.get('/api/entities/:entityName', async (req, res, next) => {
  try {
    const { entityName } = req.params;
    const { sort } = req.query;
    const records = await entityStore.findMany({
      where: { type: entityName }
    });
    const formatted = records.map(buildEntityResponse);
    res.json(applySort(formatted, sort));
  } catch (error) {
    next(error);
  }
});

app.get('/api/entities/:entityName/:id', async (req, res, next) => {
  try {
    const { entityName, id } = req.params;
    const record = await entityStore.findUnique({ where: { id } });
    if (!record || record.type !== entityName) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }
    res.json(buildEntityResponse(record));
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:entityName/filter', async (req, res, next) => {
  try {
    const { entityName } = req.params;
    const { filter = {}, sort, limit, offset } = req.body ?? {};
    const records = await entityStore.findMany({ where: { type: entityName } });
    let formatted = records.map(buildEntityResponse).filter((item) => matchesFilter(item, filter));
    formatted = applySort(formatted, sort);
    if (typeof offset === 'number') {
      formatted = formatted.slice(offset);
    }
    if (typeof limit === 'number') {
      formatted = formatted.slice(0, limit);
    }
    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:entityName', async (req, res, next) => {
  try {
    const { entityName } = req.params;
    const payload = req.body ?? {};
    const record = await entityStore.create({
      data: {
        type: entityName,
        data: payload
      }
    });
    res.status(201).json(buildEntityResponse(record));
  } catch (error) {
    next(error);
  }
});

app.put('/api/entities/:entityName/:id', async (req, res, next) => {
  try {
    const { entityName, id } = req.params;
    const payload = req.body ?? {};
    const record = await entityStore.update({
      where: { id },
      data: {
        type: entityName,
        data: payload
      }
    });
    res.json(buildEntityResponse(record));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/entities/:entityName/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await entityStore.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/functions/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const payload = req.body ?? {};

    switch (name) {
      case 'generateAppCode':
        try {
          const data = await generateAppCodeWithOpenAI(payload);
          res.json({ data });
        } catch (error) {
          console.error('Failed to generate app code:', error);
          res.status(500).json({ error: error.message || 'Failed to generate app code' });
        }
        break;
      case 'listAppFiles': {
        const { appId } = payload ?? {};
        const trimmedAppId = normaliseAppId(appId);
        if (!trimmedAppId) {
          res.status(400).json({ error: 'appId is required to list files.' });
          break;
        }

        const files = await listAppFileEntities(trimmedAppId);
        res.json({ data: { files: groupFilesByCategory(files) } });
        break;
      }
      case 'getFileContent': {
        const { appId, filePath } = payload ?? {};
        const record = await findAppFileEntity(appId, filePath);
        if (!record) {
          res.status(404).json({ error: 'File not found for the provided app.' });
          break;
        }

        const formatted = formatAppFileRecord(record);
        res.json({
          data: {
            id: formatted.id,
            path: formatted.path,
            language: formatted.language,
            content: formatted.content
          }
        });
        break;
      }
      case 'updateFileContent': {
        const { appId, filePath, content } = payload ?? {};
        const existing = await findAppFileEntity(appId, filePath);
        if (!existing) {
          res.status(404).json({ error: 'File not found for the provided app.' });
          break;
        }

        const updated = await entityStore.update({
          where: { id: existing.id },
          data: {
            type: 'AppFile',
            data: {
              ...(existing.data ?? {}),
              content: typeof content === 'string' ? content : existing.data?.content ?? '',
              app_id: normaliseAppId(appId),
              appId: normaliseAppId(appId)
            }
          }
        });

        res.json({ data: formatAppFileRecord(updated) });
        break;
      }
      case 'createAppFile': {
        const {
          appId,
          name,
          path: filePath,
          type: fileType,
          language,
          content
        } = payload ?? {};

        const trimmedAppId = normaliseAppId(appId);
        if (!trimmedAppId) {
          res.status(400).json({ error: 'appId is required to create a file.' });
          break;
        }

        const resolvedPath = typeof filePath === 'string' ? filePath.trim() : '';
        if (!resolvedPath) {
          res.status(400).json({ error: 'path is required to create a file.' });
          break;
        }

        const existing = await findAppFileEntity(trimmedAppId, resolvedPath);
        const filePayload = {
          name: typeof name === 'string' ? name : resolvedPath,
          path: resolvedPath,
          type: typeof fileType === 'string' ? fileType : 'file',
          language: typeof language === 'string' ? language : 'javascript',
          content: typeof content === 'string' ? content : existing?.data?.content ?? '',
          app_id: trimmedAppId,
          appId: trimmedAppId
        };

        const record = existing
          ? await entityStore.update({
              where: { id: existing.id },
              data: { type: 'AppFile', data: { ...(existing.data ?? {}), ...filePayload } }
            })
          : await entityStore.create({
              data: {
                type: 'AppFile',
                data: filePayload
              }
            });

        res.status(existing ? 200 : 201).json({ data: formatAppFileRecord(record) });
        break;
      }
      case 'generateEntitySchema':
        res.json({ schema: { name: payload?.name ?? 'Entity', fields: [] } });
        break;
      case 'createEntity':
      case 'updateEntity':
      case 'deleteWithTriggers':
      case 'createWithTriggers':
      case 'updateWithTriggers':
      case 'executeTriggers':
      case 'processScheduledTasks':
      case 'executePowerShellScript':
      case 'executeCustomScript':
      case 'runTestCase':
      case 'generateTestCase':
      case 'runTestSuite':
      case 'runWorkflow':
      case 'exportAppToZip':
      case 'renderLivePage':
      case 'createAPIKey':
      case 'revokeAPIKey':
      case 'toggleAPIKey':
      case 'inviteUser':
        res.json({ success: true, payload });
        break;
      default:
        res.status(404).json({ error: `Function ${name} is not implemented` });
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/invoke-llm', async (req, res, next) => {
  try {
    const { prompt } = req.body ?? {};
    res.json({ response: `LLM response placeholder for prompt: ${prompt ?? 'N/A'}` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/send-email', async (req, res, next) => {
  try {
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/generate-image', async (req, res, next) => {
  try {
    res.json({ imageUrl: 'https://placehold.co/600x400?text=Generated+Image' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/extract-data', async (req, res, next) => {
  try {
    res.json({ extracted: {} });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/create-file-url', async (req, res, next) => {
  try {
    res.json({ url: 'https://files.coremorphic.local/download' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/upload-file', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }
    res.json({ file_url: `/uploads/${file.filename}` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/upload-private-file', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }
    res.json({ file_url: `/private/${file.filename}` });
  } catch (error) {
    next(error);
  }
});

const clientDistPath = path.resolve(__dirname, '../dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Coremorphic backend listening on http://localhost:${PORT}`);
  if (mongoAvailable && entityCollection) {
    console.log(`Connected to MongoDB at ${DATABASE_URL}`);
  } else {
    console.log(`MongoDB connection not available. Using local file store at ${fileStorePath}`);
  }
});

const closeMongoClient = async () => {
  try {
    await mongoClient.close();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Failed to close MongoDB client on shutdown:', error.message);
    }
  }
  mongoAvailable = false;
  entityCollection = null;
};

process.on('SIGINT', async () => {
  await closeMongoClient();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoClient();
  process.exit(0);
});
