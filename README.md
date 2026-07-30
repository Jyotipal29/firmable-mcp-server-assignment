# Account Intelligence Platform — MCP Server

A production-shaped MCP (Model Context Protocol) server exposing 5 tools over a seeded PostgreSQL dataset of companies and contacts: search, detail lookup, contact search, enrichment, and CSV export. Built for the Firmable full-stack take-home.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the system diagram and design rationale (why Streamable HTTP over stdio, session handling, error-handling strategy, export-link trade-offs, etc.).

## Stack

- **Runtime**: Node.js + TypeScript, `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- **HTTP**: Express (auth middleware + `/exports` static-ish route sit alongside the MCP endpoint)
- **Database**: PostgreSQL via Docker Compose, Prisma ORM (`prisma` CLI + `@prisma/client` with the `@prisma/adapter-pg` driver adapter) for schema + migrations
- **Validation**: Zod (schemas double as MCP `inputSchema` JSON Schema _and_ runtime validation)
- **Logging**: `pino`, structured JSON
- **Auth**: static API key, `Authorization: Bearer <key>`

## Quickstart

Requires Node 20+, Docker Desktop running, and npm.

```bash
cp .env.example .env
npm install
npm run setup   # docker compose up, wait for Postgres, run migrations, seed 50 companies / 200 contacts
npm run dev     # starts the server on http://localhost:3001 (see PORT in .env)
```

`npm run setup` is idempotent — safe to re-run. `npm run db:seed` alone resets the two tables and reseeds deterministically (same data every run, via a fixed faker seed), so ids won't shift between runs unless you change `SEED_VALUE` in `src/seed/seed.ts`.

## NPM scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the server with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run docker:up` / `docker:down` | Start/stop the Postgres container |
| `npm run db:generate` | Regenerate the Prisma client from `prisma/schema.prisma` into `src/generated/prisma` |
| `npm run db:migrate` | Apply committed migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Seed 50 companies / 200 contacts (deterministic) |
| `npm run db:reset` | migrate + seed |
| `npm run setup` | docker:up → wait for Postgres → migrate → seed (one-shot reviewer path) |

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (matches `docker-compose.yml` defaults) |
| `PORT` | HTTP port the server listens on |
| `EXPORT_BASE_URL` | Base URL used to build `export_contacts` download links |
| `API_KEY` | Static bearer token clients must send |
| `LOG_LEVEL` | `pino` log level |

> Note: this repo's `.env` defaults to `PORT=3001` rather than `3000` — port 3000 is a very common default and worth double-checking against whatever else is already running on your machine.

## MCP tools

| Tool | Input | Output |
|---|---|---|
| `search_companies` | `query?`, `country?`, `limit` (default 20) | `{ results: [{id, name, industry, employees}] }` |
| `get_company` | `companyId` | `{id, name, website, industry, employees, country, description}` |
| `search_contacts` | `companyId?`, `jobTitle?` | `{ contacts: [{id, name, title}] }` (email/LinkedIn withheld — see below) |
| `enrich_contact` | `contactId` | `{email, linkedin, source, confidence, lastVerified}` |
| `export_contacts` | `contactIds[]` | `{downloadUrl, matchedCount, requestedCount}` |

`search_contacts` never returns `email`/`linkedin` — those are only available via `enrich_contact`, which simulates a distinct enrichment-provider lookup (small artificial latency + a synthesized `source`/`confidence` signal) rather than just re-exposing the same columns. `export_contacts` similarly excludes enrichment fields, so exporting and enriching stay two different actions.

## Connecting from Claude Desktop

Claude Desktop's built-in MCP config spawns local stdio processes; to point it at this HTTP server we bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). See `examples/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "account-intelligence": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3001/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer dev-local-api-key-change-me"
      }
    }
  }
}
```

Add this block to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS), update the `AUTH_HEADER` value to match your `.env`, make sure `npm run dev` is running, then restart Claude Desktop. The five tools should appear under the 🔨 tools menu.

## Non-functional requirements covered

The assignment asks for any 2; this implementation covers four:

- **Type safety** — TypeScript end-to-end, Prisma's generated client types flow straight into services, Zod-inferred types on every tool input.
- **Validation** — every tool input is a Zod schema, doubling as the JSON Schema advertised over MCP and as runtime validation (enforced by the SDK before handlers run).
- **Error handling** — a small domain error taxonomy (`NotFoundError`/`ValidationError`/`InternalError`) and a shared tool-handler wrapper mean no raw exception or stack trace ever reaches a client; every failure comes back as a structured MCP `isError: true` result.
- **Logging** — structured `pino` logs for every tool call (`toolName`, `durationMs`, `outcome`) and every auth failure.

Rate limiting was scoped out — see "Trade-offs" in `ARCHITECTURE.md`.

## Demo checklist

What a reviewer should be able to see working:

- [ ] **Tool discovery** — Claude Desktop's tools menu lists all 5 tools with schemas
- [ ] **Tool execution** — full chain: `search_companies` → `get_company` → `search_contacts` → `enrich_contact` → `export_contacts`, then open the returned `downloadUrl` in a browser
- [ ] **Auth flow** — a request with no/invalid `Authorization` header gets `401`; a valid key succeeds
- [ ] **Error handling** — an unknown-but-valid-UUID `companyId` returns a structured "not found" tool error (not a crash); a malformed `companyId` is rejected as a validation error before the handler even runs

## Project structure

```
prisma/
├── schema.prisma          # Company/Contact models
└── migrations/             # committed SQL migrations
prisma.config.ts           # Prisma CLI config (schema path, migrations path, datasource URL)
src/
├── index.ts              # Express app entrypoint
├── config/env.ts          # zod-validated environment config
├── db/client.ts            # Prisma client instance (@prisma/adapter-pg)
├── generated/prisma/       # generated Prisma client (gitignored, regenerated via `postinstall`)
├── seed/seed.ts            # faker-based seed script
├── middleware/auth.ts      # Bearer auth
├── mcp/
│   ├── server.ts           # McpServer + tool registration
│   ├── transport.ts        # Streamable HTTP + session management
│   ├── errors.ts            # domain error taxonomy
│   ├── toolHandler.ts       # shared error/logging wrapper for every tool
│   └── tools/                # one file per MCP tool
├── services/               # business logic
├── repositories/           # Prisma queries
├── http/exportsRoute.ts    # unauthenticated, TTL'd CSV download route
└── logging/logger.ts        # pino instance
```
