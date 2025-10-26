# Coremorphic App

Coremorphic combines a Vite + React front-end with a Node.js backend that orchestrates project metadata, source files, and AI-assisted code generation. The backend (`server/index.js`) talks to Cloudflare services for persistence and to Workers AI for model calls, while the front-end consumes the `/api` endpoints exposed by that server.

## Repository layout

- `src/` – Front-end application built with Vite + React.
- `server/index.js` – Primary backend entry point. Provides REST APIs for projects, files, compilation, and AI workflows.
- `server/lib/` – Service clients for metadata (D1), storage (R2), and Workers AI integrations.
- `server/workers/` – Cloudflare Worker handlers that back the metadata and storage APIs.
- `scripts/bootstrap-cloudflare.js` – Helper to initialise D1 tables and R2 buckets via HTTP.
- `server.js` – Lightweight blog API used exclusively by legacy examples and automated tests.

## Backend quick start

1. **Install dependencies**
   ```bash
   npm install
   ```

1. **Create your Cloudflare account**
   - Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and register using an email address you control.
   - Confirm the verification email and sign in to the Cloudflare dashboard.
   - From the top navigation, switch to the account that will host your Workers (if you just created an account, there will be a single default account).

1. **Create a Workers project**
   - In the dashboard, open **Workers & Pages** and click **Create application** ▸ **Create Worker**.
   - Choose a descriptive name such as `coremorphic-metadata` and accept the default “HTTP handler” template.
   - Press **Deploy** to publish the Worker, then click **Continue to dashboard**.
   - Repeat for a second Worker named `coremorphic-storage` if you plan to split metadata and storage services as recommended below.

1. **Configure bindings for the Workers**
   For each Worker (`coremorphic-metadata`, `coremorphic-storage`):
   - Open the Worker in the dashboard and select the **Settings** ▸ **Bindings** tab.
   - Under **D1 Databases**, add a binding named `COREMORPHIC_D1` (or `DB` / `METADATA_DB`) pointing to an existing D1 database that will store metadata. If you do not yet have a database, create one from the D1 section of the dashboard first.
   - Under **R2 Buckets**, add a binding named `COREMORPHIC_R2` (or `STORAGE_BUCKET`) pointing to the bucket that will hold project files. Create the bucket from the R2 section before attaching it.
   - Save the bindings. The deployed Worker will now expose the required environment for the server in this repository.

2. **Prepare metadata and storage services**
   - Deploy the Cloudflare Workers in `server/workers/` (or run them locally with `wrangler dev`).
   - Ensure the metadata worker has a D1 binding named `COREMORPHIC_D1` (or `DB`/`METADATA_DB`).
   - Ensure the storage worker has an R2 binding named `COREMORPHIC_R2` (or `STORAGE_BUCKET`).
   - The workers expose `/internal/bootstrap`, `/projects`, `/files`, and related routes that the Node server expects. 【F:server/workers/metadata.js†L1-L118】【F:server/workers/storage.js†L1-L76】

   Example local setup with Wrangler (choose any free ports):
   ```bash
   wrangler dev server/workers/metadata.js --name coremorphic-metadata --port 8788 --persist-to=.wrangler/state
   wrangler dev server/workers/storage.js --name coremorphic-storage --port 8789 --persist-to=.wrangler/state
   ```

3. **Configure environment variables**
   Create a `.env` file (or export variables) with at least the required values from the tables below. Example for the local setup above:
   ```dotenv
   PORT=8787
   METADATA_SERVICE_URL=http://127.0.0.1:8788
   STORAGE_SERVICE_URL=http://127.0.0.1:8789
   VITE_API_BASE_URL=http://localhost:8787/api
   CF_ACCOUNT_ID=<your-cloudflare-account-id>
   WORKERS_AI_KEY=<token with Workers AI permissions>
   ```

4. **Bootstrap persistence (Cloudflare deployments only)**
   If you are targeting remote D1/R2 instances, seed the schema once:
   ```bash
   METADATA_SERVICE_URL=... STORAGE_SERVICE_URL=... npm run bootstrap:cloudflare
   ```
   The script invokes `/internal/bootstrap` on both services so the tables/buckets exist before the backend starts. 【F:scripts/bootstrap-cloudflare.js†L1-L33】

### Local SQLite development mode

When you omit `METADATA_SERVICE_URL` and `STORAGE_SERVICE_URL`, the backend falls back to the bundled SQLite + filesystem stores:

- Metadata is written to `data/metadata.sqlite` (override with `METADATA_SQLITE_PATH`).
- Project files are persisted under `local-storage/<projectId>/`.

Starting the server once (`npm run server`) provisions the SQLite schema automatically through the `MetadataServiceClient`. 【F:server/lib/db.js†L285-L319】

Inspect or explore the SQLite database with any SQLite browser. The repository ships with `better-sqlite3`, so you can use its CLI without installing extra tooling:

```bash
npx better-sqlite3@latest data/metadata.sqlite ".tables"
npx better-sqlite3@latest data/metadata.sqlite "SELECT id, name, created_at FROM projects ORDER BY created_at DESC;"
```

The first command lists the provisioned tables, while the second one prints the stored projects so you can verify the contents.

5. **Start the backend**
   ```bash
   npm run server
   ```
   The server listens on `PORT` (defaults to `8787`) and logs `AI generator server listening on http://localhost:<port>`. 【F:server/index.js†L70-L111】【F:server/index.js†L745-L796】

6. **Run the front-end (optional)**
   ```bash
   npm run dev
   ```
   The Vite dev server uses `VITE_API_BASE_URL` to call the backend. 【F:src/api/backendClient.js†L1-L73】

## Environment variables

| Name | Required | Description |
| ---- | -------- | ----------- |
| `PORT` | No | Port for the Node backend. Defaults to `8787`. 【F:server/index.js†L73-L75】 |
| `METADATA_SERVICE_URL` | Yes (unless using a Cloudflare service binding) | Base URL of the metadata worker that implements the project, memory, and message APIs. 【F:server/lib/db.js†L177-L214】 |
| `METADATA_SQLITE_PATH` | No | Filesystem location of the local SQLite database used when no metadata service URL is configured. Defaults to `data/metadata.sqlite`. 【F:server/lib/db.js†L285-L319】 |
| `STORAGE_SERVICE_URL` | Yes (unless using a Cloudflare service binding) | Base URL of the storage worker that persists project files. 【F:server/lib/storage.js†L117-L170】 |
| `SERVICE_AUTH_TOKEN` / `CLOUDFLARE_SERVICE_TOKEN` | No | Optional bearer token forwarded to the metadata and storage workers. 【F:server/index.js†L73-L104】 |
| `CF_ACCOUNT_ID` / `WORKERS_ACCOUNT_ID` | Yes for Workers AI over HTTPS | Cloudflare account that hosts Workers AI. Required when no `WORKERS_AI` binding is injected. 【F:server/lib/workersAi.js†L13-L55】 |
| `WORKERS_AI_KEY` / `CF_AI_KEY` / `CLOUDFLARE_API_KEY` | Yes for Workers AI over HTTPS | API token with permission to call the Workers AI endpoint. 【F:server/lib/workersAi.js†L13-L55】 |
| `WORKERS_AI_MODEL` / `CF_AI_MODEL` | No | Default model slug for AI calls. Defaults to `@cf/meta/llama-3-8b-instruct`. 【F:server/index.js†L108-L111】 |
| `OPENAI_API_KEY` / `OPENAI_API_TOKEN` | No | Optional override if integrating the `OpenAIClient`. 【F:server/lib/openai.js†L1-L34】 |
| `VITE_API_BASE_URL` | Yes for front-end | Front-end base URL for API calls (typically `http://localhost:8787/api`). 【F:src/api/backendClient.js†L1-L73】 |

## Backend APIs

### REST endpoints

| Method & Path | Description |
| ------------- | ----------- |
| `GET /api/health` | Health check used by monitoring and tests. 【F:server/index.js†L430-L431】 |
| `GET /api/projects` | List projects stored in the metadata service. 【F:server/index.js†L432-L440】 |
| `POST /api/projects` | Create a new project record. Body: `{ name?: string }`. 【F:server/index.js†L442-L451】 |
| `GET /api/memory/:projectId` | Retrieve stored long-term memory for a project. 【F:server/index.js†L453-L460】 |
| `POST /api/memory/:projectId` | Replace project memory. Body: `{ content: string }`. 【F:server/index.js†L463-L472】 |
| `GET /api/projects/:projectId/files` | List project files (path + content) from storage. 【F:server/index.js†L495-L503】 |
| `POST /api/projects/:projectId/files` | Upsert a project file. Body: `{ path: string, content: string }`. 【F:server/index.js†L505-L515】 |
| `POST /api/projects/:projectId/search` | Grep-style search across stored files. Body validated by `SearchSchema`. 【F:server/index.js†L517-L560】 |
| `POST /api/projects/:projectId/compile` | Bundles the project with esbuild to surface compile errors. 【F:server/index.js†L563-L571】【F:server/index.js†L156-L209】 |
| `POST /api/projects/:projectId/autofix` | Sends compile errors + context to Workers AI for automated fixes, then persists returned files. 【F:server/index.js†L573-L670】 |
| `GET /api/projects/:projectId/preview` | Generates HTML preview scaffolding for the stored project. 【F:server/index.js†L672-L679】 |
| `POST /api/generate` | Generates a new project from a prompt via Workers AI and stores the returned files. 【F:server/index.js†L681-L743】 |

## Testing

Run the automated tests (covers the legacy blog API) with:
```bash
npm test
```
The tests use Node’s built-in test runner. 【F:package.json†L7-L15】

## Legacy blog backend

The repository still ships a simple Express blog server (`server.js`) with in-memory posts and comments. It powers integration tests and can be started manually if needed:
```bash
node server.js
```
The models live in `models/postModel.js` and `models/commentModel.js`. 【F:server.js†L1-L72】【F:models/postModel.js†L1-L68】

## Support

If you run into issues provisioning the metadata or storage workers, verify that the service URLs are reachable from the Node process and that the required bindings (`COREMORPHIC_D1`, `COREMORPHIC_R2`) exist. For Workers AI errors, confirm the account ID, API key, and model slug are valid for your Cloudflare account. 【F:server/lib/db.js†L177-L214】【F:server/lib/storage.js†L117-L170】【F:server/lib/workersAi.js†L13-L83】
