import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSandpackConfig } from '../../src/components/builder/previewSandpackUtils.js';
import { normalizePreviewDependencies } from '../../src/components/builder/normalizePreviewDependencies.js';

const createFile = (path, content) => ({ path, content });

const BASIC_ENTRY = `import React from 'react';
import ReactDOM from 'react-dom/client';

const App: React.FC = () => <h1>Preview fixture</h1>;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

test('normalizes unsupported dependency specifiers for the preview sandbox', () => {
  const files = [
    createFile('src/main.tsx', BASIC_ENTRY),
    createFile(
      'package.json',
      JSON.stringify(
        {
          name: 'preview-fixture',
          version: '0.0.0',
          dependencies: {
            react: 'workspace:^18.2.0',
            'ui-kit': 'file:../ui-kit'
          },
          devDependencies: {
            vite: 'link:../vite',
            '@vitejs/plugin-react': 'link:../plugin',
            typescript: 'link:../ts',
            '@types/react': 'link:../types-react',
            '@types/react-dom': 'link:../types-react-dom'
          }
        },
        null,
        2
      )
    )
  ];

  const warnMessages = [];
  const originalWarn = console.warn;
  console.warn = (message, ...args) => {
    warnMessages.push(String(message));
    if (args.length) {
      warnMessages.push(...args.map((arg) => String(arg)));
    }
  };

  let normalized;

  try {
    const config = buildSandpackConfig(files);
    normalized = normalizePreviewDependencies(config);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(normalized.react, '^18.2.0');
  assert.equal(normalized.vite, '5.4.0');
  assert.equal(normalized['@vitejs/plugin-react'], '4.3.4');
  assert.equal(normalized.typescript, '5.6.2');
  assert.equal(normalized['@types/react'], '18.3.3');
  assert.equal(normalized['@types/react-dom'], '18.3.3');
  assert.ok(!Object.prototype.hasOwnProperty.call(normalized, 'ui-kit'));
  assert.ok(
    warnMessages.some((msg) => msg.includes('ui-kit')),
    'expected a warning for the unsupported "file:" dependency specifier'
  );
});
