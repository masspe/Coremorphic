const postsContainer = document.getElementById('posts');
const postForm = document.getElementById('post-form');

const formatDate = (value) => {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const createCommentElement = (comment) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'comment';
  wrapper.innerHTML = `
    <strong>${comment.author}</strong> <span style="opacity:0.75">commented on ${formatDate(
      comment.createdAt
    )}</span>
    <p>${comment.content}</p>
  `;
  return wrapper;
};

const createCommentForm = (postId) => {
  const form = document.createElement('form');
  form.innerHTML = `
    <label for="comment-author-${postId}">Name</label>
    <input id="comment-author-${postId}" name="author" placeholder="Your name" required />
    <label for="comment-content-${postId}">Comment</label>
    <textarea id="comment-content-${postId}" name="content" placeholder="Share your thoughts" required></textarea>
    <button type="submit">Add comment</button>
  `;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error ?? 'Unable to add comment.');
      return;
    }

    form.reset();
    await loadPosts();
  });

  return form;
};

const renderPosts = (posts) => {
  postsContainer.innerHTML = '';

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'post-card';

    article.innerHTML = `
      <header>
        <h3>${post.title}</h3>
        <small>By ${post.author} · ${formatDate(post.createdAt)}</small>
      </header>
      <p>${post.content}</p>
    `;

    const commentsWrapper = document.createElement('section');
    commentsWrapper.innerHTML = '<h4>Comments</h4>';

    if (!post.comments.length) {
      const emptyState = document.createElement('p');
      emptyState.style.opacity = '0.7';
      emptyState.textContent = 'No comments yet. Start the conversation!';
      commentsWrapper.appendChild(emptyState);
    } else {
      post.comments.forEach((comment) => {
        commentsWrapper.appendChild(createCommentElement(comment));
      });
    }

    commentsWrapper.appendChild(createCommentForm(post.id));

    article.appendChild(commentsWrapper);
    postsContainer.appendChild(article);
  });
};

export const loadPosts = async () => {
  const response = await fetch('/api/posts');
  const data = await response.json();
  renderPosts(data.posts ?? []);
};

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(postForm);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.error ?? 'Unable to create post.');
    return;
  }

  postForm.reset();
  await loadPosts();
});

loadPosts();
