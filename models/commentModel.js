let comments = [];
let nextCommentId = 1;

const seedComments = () => {
  comments = [
    {
      id: nextCommentId++,
      postId: 1,
      author: 'Jane Doe',
      content: 'Excited to read more posts on this blog!',
      createdAt: new Date('2024-01-15T09:30:00Z')
    }
  ];
};

seedComments();

export const getCommentsForPost = (postId) =>
  comments.filter((comment) => comment.postId === Number(postId));

export const createComment = (postId, { author, content }) => {
  if (!author || !content) {
    throw new Error('Author and content are required to create a comment.');
  }

  const newComment = {
    id: nextCommentId++,
    postId: Number(postId),
    author,
    content,
    createdAt: new Date()
  };

  comments.push(newComment);
  return newComment;
};

export const resetComments = () => {
  comments = [];
  nextCommentId = 1;
  seedComments();
};

export default {
  getCommentsForPost,
  createComment,
  resetComments
};
