import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mongodb://localhost:27017/coremorphic';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

const dataDir = path.resolve(__dirname, '../data');
const fileStorePath = path.join(dataDir, 'entities.json');

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

let prismaAvailable = true;
let prismaWarningLogged = false;

let fileStoreInstance = null;

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

const shouldFallbackToFileStore = (error) => {
  if (!error) return false;
  if (error.code === 'P2031') {
    return true;
  }
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('replica set') ||
    message.includes('transaction numbers are only allowed on a replica set')
  );
};

const logFallbackWarning = () => {
  if (prismaWarningLogged) return;
  prismaWarningLogged = true;
  console.warn(
    'Prisma MongoDB client requires a replica set for transactions. Falling back to local file storage at',
    fileStorePath
  );
};

const disablePrisma = () => {
  if (!prismaAvailable) return;
  prismaAvailable = false;
  logFallbackWarning();
  prisma
    .$disconnect()
    .catch(() => {});
};

const entityStore = {
  async findMany(args) {
    if (prismaAvailable) {
      try {
        return await prisma.entity.findMany(args);
      } catch (error) {
        if (shouldFallbackToFileStore(error)) {
          disablePrisma();
          return getFileStore().findMany(args);
        }
        throw error;
      }
    }
    return getFileStore().findMany(args);
  },
  async findUnique(args) {
    if (prismaAvailable) {
      try {
        return await prisma.entity.findUnique(args);
      } catch (error) {
        if (shouldFallbackToFileStore(error)) {
          disablePrisma();
          return getFileStore().findUnique(args);
        }
        throw error;
      }
    }
    return getFileStore().findUnique(args);
  },
  async create(args) {
    if (prismaAvailable) {
      try {
        return await prisma.entity.create(args);
      } catch (error) {
        if (shouldFallbackToFileStore(error)) {
          disablePrisma();
          return getFileStore().create(args);
        }
        throw error;
      }
    }
    return getFileStore().create(args);
  },
  async update(args) {
    if (prismaAvailable) {
      try {
        return await prisma.entity.update(args);
      } catch (error) {
        if (shouldFallbackToFileStore(error)) {
          disablePrisma();
          return getFileStore().update(args);
        }
        throw error;
      }
    }
    return getFileStore().update(args);
  },
  async delete(args) {
    if (prismaAvailable) {
      try {
        return await prisma.entity.delete(args);
      } catch (error) {
        if (shouldFallbackToFileStore(error)) {
          disablePrisma();
          return getFileStore().delete(args);
        }
        throw error;
      }
    }
    return getFileStore().delete(args);
  }
};

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
      case 'listAppFiles':
      case 'getFileContent':
      case 'updateFileContent':
      case 'createAppFile':
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
  console.log(`Connected to database at ${DATABASE_URL}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
