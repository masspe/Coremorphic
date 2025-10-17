import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllPosts,
  getPostById,
  createPost,
  addCommentToPost
} from './models/postModel.js';
import { getCommentsForPost } from './models/commentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/posts', (req, res) => {
  res.json({ posts: getAllPosts() });
});

app.get('/api/posts/:id', (req, res) => {
  const post = getPostById(req.params.id);

  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }

  res.json({ post });
});

app.post('/api/posts', (req, res) => {
  try {
    const post = createPost(req.body ?? {});
    res.status(201).json({ post });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/posts/:id/comments', (req, res) => {
  const comments = getCommentsForPost(req.params.id);
  res.json({ comments });
});

app.post('/api/posts/:id/comments', (req, res) => {
  try {
    const comment = addCommentToPost(req.params.id, req.body ?? {});
    res.status(201).json({ comment });
  } catch (error) {
    const status = error.message === 'Post not found.' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const start = () =>
  app.listen(PORT, () => {
    console.log(`Blog server listening on http://localhost:${PORT}`);
  });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}

export default app;
export { start };
