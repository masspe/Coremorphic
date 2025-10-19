import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSandpackConfig,
  buildSandpackFiles
} from '../../src/components/builder/previewSandpackUtils.js';

const createFile = (path, content) => ({ path, content });

test('preview uses index.tsx entry referenced by index.html', () => {
  const files = [
    createFile(
      'src/index.tsx',
      `import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => <h1>Custom entry</h1>;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    ),
    createFile(
      'index.html',
      `<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`
    ),
    createFile(
      'package.json',
      JSON.stringify(
        {
          name: 'fixture-app',
          version: '0.0.0'
        },
        null,
        2
      )
    )
  ];

  const config = buildSandpackConfig(files);
  assert.equal(config.entry, '/src/index.tsx');

  const sandpackFiles = buildSandpackFiles(files, null, config);
  assert.match(sandpackFiles['/index.html'].code, /src\/index\.tsx/);
  assert.equal(sandpackFiles['/src/index.tsx'].code.includes('Custom entry'), true);
});
