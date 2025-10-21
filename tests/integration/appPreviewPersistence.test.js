import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { MetadataServiceClient } from "../../server/lib/db.js";

test("stores and updates app previews in the local SQLite metadata store", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "coremorphic-metadata-"));
  const databasePath = path.join(tempDir, "metadata.sqlite");
  const previousPath = process.env.METADATA_SQLITE_PATH;
  process.env.METADATA_SQLITE_PATH = databasePath;

  const client = new MetadataServiceClient({});
  await client.bootstrap();

  t.after(async () => {
    if (previousPath === undefined) {
      delete process.env.METADATA_SQLITE_PATH;
    } else {
      process.env.METADATA_SQLITE_PATH = previousPath;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  const initialCode = "console.log('hello world');";
  const firstSave = await client.setAppPreview("app-123", initialCode);
  assert.equal(firstSave.app_id, "app-123");
  assert.equal(firstSave.code, initialCode);
  assert.ok(firstSave.updated_at);

  const loaded = await client.getAppPreview("app-123");
  assert.deepEqual(loaded, firstSave);

  const updatedCode = "console.log('updated');";
  const secondSave = await client.setAppPreview("app-123", updatedCode);
  assert.equal(secondSave.code, updatedCode);
  assert.ok(
    new Date(secondSave.updated_at).getTime() >= new Date(firstSave.updated_at).getTime(),
    "updated_at should move forward or stay the same on subsequent saves"
  );

  const reloaded = await client.getAppPreview("app-123");
  assert.deepEqual(reloaded, secondSave);
});
