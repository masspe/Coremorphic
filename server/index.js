import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

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
    const records = await prisma.entity.findMany({
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
    const record = await prisma.entity.findUnique({ where: { id } });
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
    const records = await prisma.entity.findMany({ where: { type: entityName } });
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
    const record = await prisma.entity.create({
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
    const record = await prisma.entity.update({
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
    await prisma.entity.delete({ where: { id } });
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
        res.json({ code: '// Generated app code placeholder', metadata: payload });
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
