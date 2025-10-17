import { createComment, getCommentsForPost, resetComments } from './commentModel.js';

let posts = [];
let nextPostId = 1;

const seedPosts = () => {
  posts = [
    {
      id: nextPostId++,
      title: 'Welcome to the Coremorphic Blog',
      content:
        'Discover product updates, engineering insights, and community stories from the Coremorphic team. This is the perfect place to stay in the loop.',
      author: 'Coremorphic Team',
      createdAt: new Date('2024-01-10T10:00:00Z')
    },
    {
      id: nextPostId++,
      title: 'Building a Collaborative Blog with Posts and Comments',
      content:
        'Follow along as we walk through creating a full-stack blog using Express and vanilla JavaScript. We keep things simple and focused on productivity.',
      author: 'Avery Editor',
      createdAt: new Date('2024-01-12T14:15:00Z')
    }
  ];
};

seedPosts();

export const getAllPosts = () =>
  posts.map((post) => ({
    ...post,
    comments: getCommentsForPost(post.id)
  }));

export const getPostById = (id) => {
  const postId = Number(id);
  const post = posts.find((entry) => entry.id === postId);

  if (!post) {
    return null;
  }

  return {
    ...post,
    comments: getCommentsForPost(postId)
  };
};

export const createPost = ({ title, content, author }) => {
  if (!title || !content || !author) {
    throw new Error('Title, content, and author are required to create a post.');
  }

  const newPost = {
    id: nextPostId++,
    title,
    content,
    author,
    createdAt: new Date()
  };

  posts.push(newPost);
  return {
    ...newPost,
    comments: []
  };
};

export const addCommentToPost = (postId, commentData) => {
  const post = posts.find((entry) => entry.id === Number(postId));

  if (!post) {
    throw new Error('Post not found.');
  }

  return createComment(postId, commentData);
};

export const resetPosts = () => {
  posts = [];
  nextPostId = 1;
  resetComments();
  seedPosts();
};

export default {
  getAllPosts,
  getPostById,
  createPost,
  addCommentToPost,
  resetPosts
};
