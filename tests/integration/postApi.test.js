import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../../server.js';
import { resetPosts, getAllPosts } from '../../models/postModel.js';

let server;
let baseUrl;

const closeServer = () =>
  new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

beforeEach(async () => {
  resetPosts();
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await closeServer();
  server = undefined;
});

test('GET /api/posts returns seeded posts with comments', async () => {
  const response = await fetch(`${baseUrl}/api/posts`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(Array.isArray(body.posts));
  assert.equal(body.posts.length, getAllPosts().length);
  assert.ok(Array.isArray(body.posts[0].comments));
});

test('POST /api/posts creates a new post', async () => {
  const payload = {
    title: 'Testing Express APIs',
    content: 'Integration tests ensure our endpoints behave as expected.',
    author: 'QA Bot'
  };

  const response = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.post.title, payload.title);
  assert.equal(body.post.author, payload.author);
  assert.deepEqual(body.post.comments, []);
});

test('POST /api/posts/:id/comments attaches a comment', async () => {
  const [post] = getAllPosts();
  const payload = {
    author: 'Commenter',
    content: 'Great write-up!'
  };

  const response = await fetch(`${baseUrl}/api/posts/${post.id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.comment.author, payload.author);
  assert.equal(body.comment.content, payload.content);
});
