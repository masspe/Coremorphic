# Coremorphic App

This project contains the Coremorphic front-end (Vite + React) and a lightweight Express backend that uses Prisma to connect to a MongoDB database. The backend is configured to connect to a MongoDB instance running on `mongodb://localhost:27017/coremorphic` by default.

## Prerequisites

- Node.js 18+
- npm 9+
- A running MongoDB instance (defaults to `mongodb://localhost:27017/coremorphic`)

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

3. Copy the example environment file and adjust if necessary:

   ```bash
   cp .env.example .env
   ```

   The default `.env` points Prisma to `mongodb://localhost:27017/coremorphic`, runs the backend on port `4000`, and sets `VITE_API_BASE_URL` to `http://localhost:4000/api` for the front-end.

   ### Windows environment setup

   If you prefer setting the environment variables globally on Windows instead of using a `.env` file, run the provided PowerShell script (from an elevated PowerShell window if you need system-wide variables):

   ```powershell
   pwsh -ExecutionPolicy Bypass -File scripts/windows/setup-env.ps1 -EnvFile .env
   ```

   The script reads key-value pairs from the specified `.env`-style file, sets them for the current session, and persists them for the current user via `setx`. Restart open terminals or IDEs after running the script so they pick up the new values.

## Running the backend

```bash
npm run server
```

The backend exposes its API at `http://localhost:4000/api`.

> **Note:** Prisma requires MongoDB to run as a replica set to support transactions. If you are developing against a standalone
> MongoDB instance, the server automatically falls back to a lightweight JSON file store located in `data/entities.json`. This
> allows local development without additional database configuration, while production environments can continue using Prisma
> with full MongoDB support.

## Running the front-end

In a separate terminal, start the Vite dev server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for production

```bash
npm run build
```

## Project structure

- `server/` – Express API using Prisma to interact with MongoDB.
- `prisma/` – Prisma schema and database configuration.
- `src/` – React front-end that calls the backend through the new `backendClient` abstraction.

## Database

The Prisma schema stores all entities in a single `Entity` collection. Each entity document captures the entity type, JSON payload, and timestamps. You can inspect and seed data directly in MongoDB or extend the Prisma schema with more specific models as your application evolves.

## Support

If you encounter any issues with the new MongoDB + Prisma backend, please open an issue in this repository or contact your Coremorphic administrator.
