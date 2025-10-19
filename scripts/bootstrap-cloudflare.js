#!/usr/bin/env node
import { MetadataServiceClient } from "../server/lib/db.js";
import { StorageServiceClient } from "../server/lib/storage.js";

const run = async () => {
  const metadataUrl = process.env.METADATA_SERVICE_URL;
  const storageUrl = process.env.STORAGE_SERVICE_URL;
  const serviceToken =
    process.env.SERVICE_AUTH_TOKEN || process.env.CLOUDFLARE_SERVICE_TOKEN || "";

  if (!metadataUrl) {
    throw new Error("METADATA_SERVICE_URL must be provided to bootstrap D1 tables");
  }

  if (!storageUrl) {
    throw new Error("STORAGE_SERVICE_URL must be provided to bootstrap R2 buckets");
  }

  const metadata = new MetadataServiceClient({
    baseUrl: metadataUrl,
    token: serviceToken || undefined
  });

  const storage = new StorageServiceClient({
    baseUrl: storageUrl,
    token: serviceToken || undefined
  });

  await metadata.bootstrap();
  await storage.bootstrap();

  console.log("Cloudflare metadata and storage bootstrap complete");
};

run().catch((error) => {
  console.error("Failed to bootstrap Cloudflare resources", error);
  process.exitCode = 1;
});
