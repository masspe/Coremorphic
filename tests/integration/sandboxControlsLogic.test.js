import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSandboxStatus,
  canRunSandboxPreview,
  runSandboxPreviewSafely,
  __TEST_ONLY__
} from '../../src/pages/sandboxControlsLogic.js';

test('getSandboxStatus returns a default fallback when sandpack is missing', () => {
  assert.equal(getSandboxStatus(undefined), __TEST_ONLY__.DEFAULT_SANDBOX_STATUS);
  assert.equal(getSandboxStatus(null), __TEST_ONLY__.DEFAULT_SANDBOX_STATUS);
});

test('getSandboxStatus returns the provided sandpack status when available', () => {
  const sandpack = { status: 'running' };
  assert.equal(getSandboxStatus(sandpack), 'running');
});

test('canRunSandboxPreview only requires a runnable function', () => {
  assert.equal(canRunSandboxPreview('idle', undefined), false);
  assert.equal(canRunSandboxPreview('idle', () => {}), true);
  assert.equal(canRunSandboxPreview('running', () => {}), true);
});

test('runSandboxPreviewSafely invokes the provided function', async () => {
  let called = 0;
  const run = () => {
    called += 1;
    return Promise.resolve('ran');
  };

  const result = await runSandboxPreviewSafely(run);
  assert.equal(result, 'ran');
  assert.equal(called, 1);
});

test('runSandboxPreviewSafely returns undefined when run function is missing', async () => {
  const result = await runSandboxPreviewSafely(undefined);
  assert.equal(result, undefined);
});
