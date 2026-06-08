# task-app-workers-hub

Shared Cloudflare Workers TypeScript hub for independent OpenAI Task Apps.

## Project Structure

- `package.json` defines Worker commands and TypeScript/Wrangler dependencies.
- `wrangler.jsonc` defines the Cloudflare Worker entrypoint and environment variables.
- `src/index.ts` contains hub routes, app review pages, and per-app MCP endpoints.
- `AGENTS.md` defines rules for adding later apps without rebuilding the hub.

No `server.py`, `requirements.txt`, `render.yaml`, FastAPI, or Render deployment files are used.

## Apps

Current apps:

- Content Brief Extractor: `/content-brief-extractor`
- MCP endpoint: `/content-brief-extractor/mcp`
- Campaign Requirement Extractor: `/campaign-requirement-extractor`
- MCP endpoint: `/campaign-requirement-extractor/mcp`
- Social Post Metadata Extractor: `/social-post-metadata-extractor`
- MCP endpoint: `/social-post-metadata-extractor/mcp`

Each app is a stateless, deterministic, read-only single-task node. Each app has exactly one MCP endpoint and exposes exactly one tool from that endpoint.

## Local Commands

```bash
npm install
npm run typecheck
npm run dev
npm run deploy
```

`npm run dev` starts Wrangler locally on `http://127.0.0.1:8787`.

## Cloudflare Workers Deployment

1. Install dependencies with `npm install`.
2. Set `OPENAI_APPS_CHALLENGE` for the deployed Worker environment.
3. Run `npm run typecheck`.
4. Run `npm run deploy`.

## Environment Variables

- `OPENAI_APPS_CHALLENGE`: exact plain-text value returned by `GET /.well-known/openai-apps-challenge`.

For local testing, the value can be edited in `wrangler.jsonc` or supplied by Wrangler environment configuration.

Project support email for review pages: `sidcraigau@gmail.com`.

## Verification URLs

- Hub home: `http://127.0.0.1:8787/`
- Health: `http://127.0.0.1:8787/health`
- Challenge: `http://127.0.0.1:8787/.well-known/openai-apps-challenge`
- App home: `http://127.0.0.1:8787/content-brief-extractor`
- Privacy: `http://127.0.0.1:8787/content-brief-extractor/privacy`
- Terms: `http://127.0.0.1:8787/content-brief-extractor/terms`
- Support: `http://127.0.0.1:8787/content-brief-extractor/support`
- MCP: `http://127.0.0.1:8787/content-brief-extractor/mcp`
- Campaign app home: `http://127.0.0.1:8787/campaign-requirement-extractor`
- Campaign privacy: `http://127.0.0.1:8787/campaign-requirement-extractor/privacy`
- Campaign terms: `http://127.0.0.1:8787/campaign-requirement-extractor/terms`
- Campaign support: `http://127.0.0.1:8787/campaign-requirement-extractor/support`
- Campaign MCP: `http://127.0.0.1:8787/campaign-requirement-extractor/mcp`
- Social post metadata app home: `http://127.0.0.1:8787/social-post-metadata-extractor`
- Social post metadata privacy: `http://127.0.0.1:8787/social-post-metadata-extractor/privacy`
- Social post metadata terms: `http://127.0.0.1:8787/social-post-metadata-extractor/terms`
- Social post metadata support: `http://127.0.0.1:8787/social-post-metadata-extractor/support`
- Social post metadata MCP: `http://127.0.0.1:8787/social-post-metadata-extractor/mcp`

There is no generic `/mcp`, `/mcp/{app-slug}`, `/api/mcp`, `/tools`, `/sse`, `/privacy`, `/terms`, or `/support`.

## Test `/health`

```bash
curl http://127.0.0.1:8787/health
```

Expected response:

```json
{"status":"ok","service":"task-app-workers-hub"}
```

## Test Challenge Route

```bash
curl http://127.0.0.1:8787/.well-known/openai-apps-challenge
```

Expected response: the exact `OPENAI_APPS_CHALLENGE` environment variable value as plain text only.

## Test `initialize`

Content Brief Extractor:

```bash
curl -X POST http://127.0.0.1:8787/content-brief-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

Expected response includes `protocolVersion`, `capabilities.tools`, and `serverInfo`.

Campaign Requirement Extractor:

```bash
curl -X POST http://127.0.0.1:8787/campaign-requirement-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

Expected response includes `protocolVersion`, `capabilities.tools`, and `serverInfo`.

## Test `tools/list`

Content Brief Extractor:

```bash
curl -X POST http://127.0.0.1:8787/content-brief-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected response includes exactly one tool: `content_brief_extractor`, with `outputSchema` and `annotations`.

Campaign Requirement Extractor:

```bash
curl -X POST http://127.0.0.1:8787/campaign-requirement-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected response includes exactly one tool: `campaign_requirement_extractor`, with `inputSchema`, `outputSchema`, and annotations:

```json
{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}
```

Social Post Metadata Extractor:

```bash
curl -X POST http://127.0.0.1:8787/social-post-metadata-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected response includes exactly one tool: `social_post_metadata_extractor`, with `description`, `inputSchema`, `outputSchema`, and annotations:

```json
{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}
```

## Test `tools/call`

Content Brief Extractor:

```bash
curl -X POST http://127.0.0.1:8787/content-brief-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"content_brief_extractor","arguments":{"brief_text":"Please prepare a content brief for a blog post about AI workflow automation for solo founders. The target audience is indie hackers and small team builders. The channel is the company blog. Deadline: June 20, 2026."}}}'
```

Expected `structuredContent`:

```json
{
  "status": "success",
  "topic": "AI workflow automation for solo founders",
  "target_audience": "indie hackers and small team builders",
  "channel": "company blog",
  "deadline": "June 20, 2026",
  "missing_fields": [],
  "source_text": "Please prepare a content brief for a blog post about AI workflow automation for solo founders. The target audience is indie hackers and small team builders. The channel is the company blog. Deadline: June 20, 2026.",
  "errors": []
}
```

The extractor only returns explicitly stated `topic`, `target_audience`, `channel`, and `deadline` values. Missing extracted fields are returned as `null` and listed in `missing_fields`.

Campaign Requirement Extractor:

```bash
curl -X POST http://127.0.0.1:8787/campaign-requirement-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"campaign_requirement_extractor","arguments":{"campaign_text":"Campaign name: Summer Launch Push. Objective: drive signups for the new product trial. Channel: LinkedIn. Budget: $8,000. Deadline: July 15, 2026."}}}'
```

Expected `structuredContent`:

```json
{
  "status": "success",
  "campaign_name": "Summer Launch Push",
  "objective": "drive signups for the new product trial",
  "channel": "LinkedIn",
  "budget": "$8,000",
  "deadline": "July 15, 2026",
  "missing_fields": [],
  "source_text": "Campaign name: Summer Launch Push. Objective: drive signups for the new product trial. Channel: LinkedIn. Budget: $8,000. Deadline: July 15, 2026.",
  "errors": []
}
```

The extractor only returns explicitly stated `campaign_name`, `objective`, `channel`, `budget`, and `deadline` values. Missing extracted fields are returned as `null` and listed in `missing_fields`. It does not infer values, normalize budget currency, recommend channels, judge budget reasonableness, write copy, publish, schedule, send messages, update systems, or perform operational actions.

Social Post Metadata Extractor:

```bash
curl -X POST http://127.0.0.1:8787/social-post-metadata-extractor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"social_post_metadata_extractor","arguments":{"post_text":"Platform: LinkedIn. Post time: June 20, 2026 at 9 AM. Topic: AI workflow automation for solo founders. Asset requirements: product screenshot and short demo clip."}}}'
```

Expected `structuredContent`:

```json
{
  "status": "success",
  "platform": "LinkedIn",
  "post_time": "June 20, 2026 at 9 AM",
  "topic": "AI workflow automation for solo founders",
  "asset_requirements": "product screenshot and short demo clip",
  "missing_fields": [],
  "source_text": "Platform: LinkedIn. Post time: June 20, 2026 at 9 AM. Topic: AI workflow automation for solo founders. Asset requirements: product screenshot and short demo clip.",
  "errors": []
}
```

The extractor only returns explicitly stated `platform`, `post_time`, `topic`, and `asset_requirements` values. Missing extracted fields are returned as `null` and listed in `missing_fields`. It does not write posts, generate captions, recommend platforms, create assets, publish, schedule, send messages, update calendars, call social media APIs, contact external services, or perform operational actions.

## Local Regression Checks

After adding or changing an app, run:

```bash
npm install
npm run typecheck
npm run dev
```

Then confirm:

- `/`, `/health`, and `/.well-known/openai-apps-challenge` work.
- Each app home, privacy, terms, and support page returns HTML with `Home | Privacy | Terms | Support` links in that order.
- `POST /content-brief-extractor/mcp` supports `initialize`, `tools/list`, and `tools/call`; `tools/list` exposes only `content_brief_extractor`.
- `POST /campaign-requirement-extractor/mcp` supports `initialize`, `tools/list`, and `tools/call`; `tools/list` exposes only `campaign_requirement_extractor`.
- Content Brief Extractor `outputSchema` and annotations remain unchanged when new apps are added.
- `POST /social-post-metadata-extractor/mcp` supports `initialize`, `tools/list`, and `tools/call`; `tools/list` exposes only `social_post_metadata_extractor`.
- Social Post Metadata Extractor `tools/list` includes `description`, `inputSchema`, `outputSchema`, and annotations.

## Common Failures

- `GET /mcp` or `POST /mcp` returns `404`: expected, because generic MCP routes are intentionally not supported.
- `tools/list` returns more than one tool: invalid for this hub; each app endpoint must expose only its own tool.
- Challenge route returns JSON or HTML: invalid; it must return plain text only.
- Review pages share generic `/privacy`, `/terms`, or `/support`: invalid; each app must use app-scoped pages only.
- `tools/call` with an unknown tool name returns JSON-RPC `-32602`: expected.
