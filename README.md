# Coremorphic App

Coremorphic combines a Vite + React front-end with a Node.js backend that orchestrates project metadata, source files, sandbox execution, and AI-assisted code generation. The backend (`server/index.js`) talks to Cloudflare services for persistence and to Workers AI for model calls, while the front-end consumes the `/api` endpoints exposed by that server.

## Repository layout

- `src/` – Front-end application built with Vite + React.
- `server/index.js` – Primary backend entry point. Provides REST + Socket.IO APIs for projects, files, compilation, and AI workflows.
- `server/sandbox/` – Sandbox orchestration utilities used by the Socket.IO gateway.
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

5. **Start the backend**
   ```bash
   npm run server
   ```
   The server listens on `PORT` (defaults to `8787`) and logs `AI generator server listening on http://localhost:<port>`. 【F:server/index.js†L46-L119】【F:server/index.js†L900-L913】

6. **Run the front-end (optional)**
   ```bash
   npm run dev
   ```
   The Vite dev server uses `VITE_API_BASE_URL` to call the backend. 【F:src/api/backendClient.js†L1-L73】

## Environment variables

| Name | Required | Description |
| ---- | -------- | ----------- |
| `PORT` | No | Port for the Node backend. Defaults to `8787`. 【F:server/index.js†L46-L47】 |
| `METADATA_SERVICE_URL` | Yes (unless using a Cloudflare service binding) | Base URL of the metadata worker that implements the project, memory, and message APIs. 【F:server/lib/db.js†L177-L214】 |
| `STORAGE_SERVICE_URL` | Yes (unless using a Cloudflare service binding) | Base URL of the storage worker that persists project files. 【F:server/lib/storage.js†L117-L170】 |
| `SERVICE_AUTH_TOKEN` / `CLOUDFLARE_SERVICE_TOKEN` | No | Optional bearer token forwarded to the metadata and storage workers. 【F:server/index.js†L48-L69】 |
| `CF_ACCOUNT_ID` / `WORKERS_ACCOUNT_ID` | Yes for Workers AI over HTTPS | Cloudflare account that hosts Workers AI. Required when no `WORKERS_AI` binding is injected. 【F:server/lib/workersAi.js†L13-L55】 |
| `WORKERS_AI_KEY` / `CF_AI_KEY` / `CLOUDFLARE_API_KEY` | Yes for Workers AI over HTTPS | API token with permission to call the Workers AI endpoint. 【F:server/lib/workersAi.js†L13-L55】 |
| `WORKERS_AI_MODEL` / `CF_AI_MODEL` | No | Default model slug for AI calls. Defaults to `@cf/meta/llama-3-8b-instruct`. 【F:server/index.js†L70-L71】 |
| `LIVEBLOCKS_SECRET_KEY` | No | Enables collaborative rooms. When absent, the server logs a warning and disables Liveblocks routes. 【F:server/index.js†L74-L95】【F:server/index.js†L548-L588】 |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | No | Enables Clerk authentication middleware required for Liveblocks auth. Without them the route returns 500. 【F:server/index.js†L19-L41】【F:server/index.js†L548-L588】 |
| `SANDBOX_IDLE_TIMEOUT_MS` | No | Milliseconds before idle sandboxes are cleaned up. 【F:server/index.js†L76-L83】 |
| `SANDBOX_PREVIEW_PORT` | No | Default preview port forwarded to the UI. 【F:server/index.js†L76-L83】 |
| `SANDBOX_SOCKET_ORIGIN` | No | CORS origin for Socket.IO connections. Defaults to `*`. 【F:server/index.js†L88-L96】 |
| `SANDBOX_SHELL` | No | Shell executable used for local sandboxes. 【F:server/sandbox/orchestrator.js†L96-L150】 |
| `E2B_API_KEY`, `E2B_TEMPLATE` | No | Enables remote sandboxes via the `@e2b/sdk`. Falls back to local sandboxes if unset. 【F:server/sandbox/orchestrator.js†L156-L226】 |
| `OPENAI_API_KEY` / `OPENAI_API_TOKEN` | No | Optional override if integrating the `OpenAIClient`. 【F:server/lib/openai.js†L1-L34】 |
| `VITE_API_BASE_URL` | Yes for front-end | Front-end base URL for API calls (typically `http://localhost:8787/api`). 【F:src/api/backendClient.js†L1-L73】 |

## Backend APIs

### REST endpoints

| Method & Path | Description |
| ------------- | ----------- |
| `GET /api/health` | Health check used by monitoring and tests. 【F:server/index.js†L520-L528】 |
| `GET /api/projects` | List projects stored in the metadata service. 【F:server/index.js†L528-L539】 |
| `POST /api/projects` | Create a new project record. Body: `{ name?: string }`. 【F:server/index.js†L537-L546】 |
| `POST /api/liveblocks/auth` | Exchanges a Clerk session for a Liveblocks session token. Requires Clerk + Liveblocks configuration. 【F:server/index.js†L548-L612】 |
| `GET /api/memory/:projectId` | Retrieve stored long-term memory for a project. 【F:server/index.js†L612-L624】 |
| `POST /api/memory/:projectId` | Replace project memory. Body: `{ content: string }`. 【F:server/index.js†L624-L639】 |
| `GET /api/projects/:projectId/files` | List project files (path + content) from storage. 【F:server/index.js†L641-L653】 |
| `POST /api/projects/:projectId/files` | Upsert a project file. Body: `{ path: string, content: string }`. 【F:server/index.js†L653-L663】 |
| `POST /api/projects/:projectId/search` | Grep-style search across stored files. Body validated by `SearchSchema`. 【F:server/index.js†L663-L714】 |
| `POST /api/projects/:projectId/compile` | Bundles the project with esbuild to surface compile errors. 【F:server/index.js†L714-L744】【F:server/index.js†L226-L320】 |
| `POST /api/projects/:projectId/autofix` | Sends compile errors + context to Workers AI for automated fixes, then persists returned files. 【F:server/index.js†L744-L826】 |
| `GET /api/projects/:projectId/preview` | Generates HTML preview scaffolding for the stored project. 【F:server/index.js†L821-L829】 |
| `POST /api/generate` | Generates a new project from a prompt via Workers AI and stores the returned files. 【F:server/index.js†L830-L900】 |

### Socket.IO channel

The backend exposes a Socket.IO server mounted on the same origin. Clients connect with a `projectId` query parameter to stream terminal data and request sandbox port forwards.

Events emitted by the server include:
- `terminal:ready`, `terminal:data`, `terminal:exit`, `terminal:error` for shell lifecycle updates. 【F:server/index.js†L96-L206】
- `sandbox:error` when initialization fails. 【F:server/index.js†L104-L152】
- `preview:ready`, `preview:error`, `preview:closed` to manage forwarded preview ports. 【F:server/index.js†L152-L206】

Clients may send:
- `terminal:input` to write to the shell.
- `terminal:resize` to adjust terminal dimensions.
- `preview:open` / `preview:close` to control preview tunnels.

### Sandbox providers

By default the server launches local sandboxes rooted in the OS temp directory. Setting `E2B_API_KEY` switches to remote sandboxes powered by the `@e2b/sdk`; the orchestrator falls back to local instances if the SDK or key is unavailable. 【F:server/sandbox/orchestrator.js†L64-L226】【F:server/sandbox/orchestrator.js†L226-L340】

## Testing

Run the automated tests (covers the legacy blog API and sandbox helpers) with:
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
