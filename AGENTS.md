# AGENTS.md

## Hub Rules

This repository is `task-app-workers-hub`, a shared Cloudflare Workers TypeScript hub for multiple OpenAI Task Apps.

Do not create Python, FastAPI, Render, or server files. In particular, do not create:

- `server.py`
- `requirements.txt`
- `render.yaml`
- FastAPI files
- Render deployment files

## Required Files

Core files:

- `package.json`
- `wrangler.jsonc`
- `src/index.ts`
- `README.md`
- `AGENTS.md`

Additional TypeScript configuration files are allowed when needed for local type checking.

## Architecture

- Each app is an independent single-task node.
- Each app has its own MCP endpoint: `/{app-slug}/mcp`.
- Never create generic `/mcp`.
- Never create `/mcp/{app-slug}`, `/api/mcp`, `/tools`, or `/sse`.
- Each MCP endpoint exposes only one tool.
- `tools/list` must return only the current app's tool.

## Required Routes

Hub routes:

- `GET /`
- `GET /health`
- `GET /.well-known/openai-apps-challenge`

The challenge route must return the exact `OPENAI_APPS_CHALLENGE` environment variable value as plain text only.

Per-app routes:

- `GET /{app-slug}`
- `POST /{app-slug}/mcp`
- `GET /{app-slug}/privacy`
- `GET /{app-slug}/terms`
- `GET /{app-slug}/support`

Do not create generic `/privacy`, `/terms`, or `/support`.

## Review Pages

- Each app must have independent pages.
- Each page must only describe the current app.
- All app pages must show navigation in this exact order: `Home | Privacy | Terms | Support`.
- Navigation links must be:
  - Home: `/{app-slug}`
  - Privacy: `/{app-slug}/privacy`
  - Terms: `/{app-slug}/terms`
  - Support: `/{app-slug}/support`

## Tool Contract

Each tool must include:

- `name`
- `title`
- `description`
- `inputSchema`
- `outputSchema`
- `annotations`

Default annotations:

```json
{
  "readOnlyHint": true,
  "openWorldHint": false,
  "destructiveHint": false
}
```

Every tool output must include:

- `status`
- `missing_fields`
- `source_text`
- `errors`

Each error object must include:

- `code`
- `message`

Allowed error codes:

- `missing_field`
- `invalid_value`
- `out_of_scope`
- `internal_error`

## Safety Rules

Apps must be stateless, deterministic, read-only, no auth, no state, no external APIs, no database, no external writes, no messages, no publishing, no operational actions, and no open-ended advice.

## Privacy Page Requirements

Each app privacy page must disclose:

- data collected
- tool input
- tool outputs
- purpose
- sharing
- retention
- user controls
- no login
- no storage
- no sale
- no external APIs
- no downstream writes
- read-only / no side effects
- support contact
- privacy questions or deletion requests can be sent to support email

## Adding Later Apps

Before adding a later app:

1. Read this file.
2. Add only the new app definition, routes, review pages, and tool logic needed for the new app.
3. Do not rebuild the hub.
4. Do not break existing apps.
5. Run regression tests for all existing routes and MCP methods.

Do not claim completion unless all routes, MCP methods, schemas, pages, and tests pass.
