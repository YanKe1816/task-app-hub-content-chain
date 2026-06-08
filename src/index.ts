export interface Env {
  OPENAI_APPS_CHALLENGE?: string;
}

type ErrorCode = "missing_field" | "invalid_value" | "out_of_scope" | "internal_error";

type ToolError = {
  code: ErrorCode;
  message: string;
};

type ContentBriefOutput = {
  status: "success" | "error";
  topic: string | null;
  target_audience: string | null;
  channel: string | null;
  deadline: string | null;
  missing_fields: string[];
  source_text: string;
  errors: ToolError[];
};

type CampaignRequirementOutput = {
  status: "success" | "error";
  campaign_name: string | null;
  objective: string | null;
  channel: string | null;
  budget: string | null;
  deadline: string | null;
  missing_fields: string[];
  source_text: string;
  errors: ToolError[];
};

type ToolOutput = ContentBriefOutput | CampaignRequirementOutput;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type JsonSchema = Record<string, unknown>;

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  annotations: {
    readOnlyHint: true;
    openWorldHint: false;
    destructiveHint: false;
    idempotentHint?: true;
  };
};

type AppDefinition = {
  slug: string;
  name: string;
  tool: ToolDefinition;
  call: (input: unknown) => ToolOutput;
  renderHome: (app: AppDefinition) => string;
  renderPrivacy: (app: AppDefinition) => string;
  renderTerms: (app: AppDefinition) => string;
  renderSupport: (app: AppDefinition) => string;
};

const SUPPORT_EMAIL = "sidcraigau@gmail.com";
const SUPPORT_LINK = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;

const DEFAULT_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false
} as const;

const CAMPAIGN_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["code", "message"],
  properties: {
    code: {
      type: "string",
      enum: ["missing_field", "invalid_value", "out_of_scope", "internal_error"]
    },
    message: { type: "string" }
  }
};

const CONTENT_BRIEF_TOOL: ToolDefinition = {
  name: "content_brief_extractor",
  title: "Content Brief Extractor",
  description:
    "Use this tool when the user provides a content request or content brief text and needs structured content brief fields. The tool returns topic, target audience, channel, deadline, missing fields, source text, and errors. Do not use this tool to write content, create marketing strategy, generate campaign ideas, judge content quality, recommend channels, or publish content. This tool is useful when deterministic structured extraction is needed.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["brief_text"],
    properties: {
      brief_text: {
        type: "string",
        description: "Raw content request or content brief text provided by the user."
      }
    }
  },
  outputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["status", "topic", "target_audience", "channel", "deadline", "missing_fields", "source_text", "errors"],
    properties: {
      status: { type: "string", enum: ["success", "error"] },
      topic: { type: ["string", "null"] },
      target_audience: { type: ["string", "null"] },
      channel: { type: ["string", "null"] },
      deadline: { type: ["string", "null"] },
      missing_fields: { type: "array", items: { type: "string" } },
      source_text: { type: "string" },
      errors: { type: "array", items: ERROR_SCHEMA }
    }
  },
  annotations: DEFAULT_ANNOTATIONS
};

const CAMPAIGN_REQUIREMENT_TOOL: ToolDefinition = {
  name: "campaign_requirement_extractor",
  title: "Campaign Requirement Extractor",
  description:
    "Use this tool when the user provides campaign requirement text and needs structured campaign requirement fields. The tool returns campaign name, objective, channel, budget, deadline, missing fields, source text, and errors. Do not use this tool to design a campaign strategy, judge whether a budget is reasonable, write marketing copy, recommend channels, publish campaigns, schedule campaigns, send messages, update systems, or take operational actions. This tool is useful when deterministic structured extraction is needed.",
  inputSchema: {
    type: "object",
    properties: {
      campaign_text: {
        type: "string",
        description: "Raw campaign requirement text containing explicitly stated campaign details."
      }
    },
    required: ["campaign_text"],
    additionalProperties: false
  },
  outputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["success", "error"]
      },
      campaign_name: {
        type: ["string", "null"],
        description: "Explicit campaign name if present."
      },
      objective: {
        type: ["string", "null"],
        description: "Explicit campaign objective if present."
      },
      channel: {
        type: ["string", "null"],
        description: "Explicit campaign channel if present."
      },
      budget: {
        type: ["string", "null"],
        description: "Explicit campaign budget if present."
      },
      deadline: {
        type: ["string", "null"],
        description: "Explicit campaign deadline if present."
      },
      missing_fields: {
        type: "array",
        items: {
          type: "string"
        }
      },
      source_text: {
        type: "string"
      },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: {
              type: "string"
            },
            message: {
              type: "string"
            }
          },
          required: ["code", "message"],
          additionalProperties: false
        }
      }
    },
    required: [
      "status",
      "campaign_name",
      "objective",
      "channel",
      "budget",
      "deadline",
      "missing_fields",
      "source_text",
      "errors"
    ],
    additionalProperties: false
  },
  annotations: CAMPAIGN_ANNOTATIONS
};

const APPS: AppDefinition[] = [
  {
    slug: "content-brief-extractor",
    name: "Content Brief Extractor",
    tool: CONTENT_BRIEF_TOOL,
    call: extractContentBrief,
    renderHome: renderContentBriefHome,
    renderPrivacy: renderContentBriefPrivacyPage,
    renderTerms: renderContentBriefTermsPage,
    renderSupport: renderContentBriefSupportPage
  },
  {
    slug: "campaign-requirement-extractor",
    name: "Campaign Requirement Extractor",
    tool: CAMPAIGN_REQUIREMENT_TOOL,
    call: extractCampaignRequirement,
    renderHome: renderCampaignRequirementHome,
    renderPrivacy: renderCampaignRequirementPrivacyPage,
    renderTerms: renderCampaignRequirementTermsPage,
    renderSupport: renderCampaignRequirementSupportPage
  }
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (request.method === "GET" && path === "/") {
      return htmlResponse(renderHubHome());
    }

    if (request.method === "GET" && path === "/health") {
      return jsonResponse({ status: "ok", service: "task-app-workers-hub" });
    }

    if (request.method === "GET" && path === "/.well-known/openai-apps-challenge") {
      return textResponse(env.OPENAI_APPS_CHALLENGE ?? "");
    }

    const app = APPS.find((candidate) => path === `/${candidate.slug}` || path.startsWith(`/${candidate.slug}/`));
    if (!app) {
      return textResponse("Not found", 404);
    }

    if (request.method === "GET" && path === `/${app.slug}`) {
      return htmlResponse(app.renderHome(app));
    }

    if (request.method === "GET" && path === `/${app.slug}/privacy`) {
      return htmlResponse(app.renderPrivacy(app));
    }

    if (request.method === "GET" && path === `/${app.slug}/terms`) {
      return htmlResponse(app.renderTerms(app));
    }

    if (request.method === "GET" && path === `/${app.slug}/support`) {
      return htmlResponse(app.renderSupport(app));
    }

    if (request.method === "POST" && path === `/${app.slug}/mcp`) {
      return handleMcp(request, app);
    }

    return textResponse("Not found", 404);
  }
};

async function handleMcp(request: Request, app: AppDefinition): Promise<Response> {
  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonResponse(jsonRpcError(null, -32700, "Parse error"));
  }

  const id = body.id ?? null;
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonResponse(jsonRpcError(id, -32600, "Invalid Request"));
  }

  if (body.method === "initialize") {
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: `${app.slug}-mcp`,
          version: "0.1.0"
        }
      }
    });
  }

  if (body.method === "tools/list") {
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [app.tool]
      }
    });
  }

  if (body.method === "tools/call") {
    const params = isRecord(body.params) ? body.params : {};
    const name = typeof params.name === "string" ? params.name : "";
    if (name !== app.tool.name) {
      return jsonResponse(jsonRpcError(id, -32602, `Unknown tool: ${name || "(missing)"}`));
    }

    try {
      const result = app.call(isRecord(params.arguments) ? params.arguments : {});
      return jsonResponse({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ],
          structuredContent: result,
          isError: result.status === "error"
        }
      });
    } catch {
      const result =
        app.tool.name === "campaign_requirement_extractor"
          ? campaignErrorOutput(
              "internal_error",
              "An internal error occurred while processing the campaign requirement text.",
              ""
            )
          : errorOutput("internal_error", "An unexpected error occurred.", "", []);
      return jsonResponse({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
          isError: true
        }
      });
    }
  }

  return jsonResponse(jsonRpcError(id, -32601, "Method not found"));
}

function extractContentBrief(input: unknown): ContentBriefOutput {
  if (!isRecord(input) || !Object.prototype.hasOwnProperty.call(input, "brief_text")) {
    return errorOutput("missing_field", "brief_text is required.", "", ["brief_text"]);
  }

  if (typeof input.brief_text !== "string" || input.brief_text.trim() === "") {
    const sourceText = typeof input.brief_text === "string" ? input.brief_text : "";
    return errorOutput("invalid_value", "brief_text must be a non-empty string.", sourceText, ["brief_text"]);
  }

  const sourceText = input.brief_text.trim();
  if (isOutOfScope(sourceText)) {
    return errorOutput(
      "out_of_scope",
      "This tool only extracts explicitly stated content brief fields and cannot write content, create strategy, recommend channels, publish, schedule, or take operational actions.",
      sourceText,
      []
    );
  }

  const topic = cleanValue(firstMatch(sourceText, [
    /\b(?:about|on)\s+(.+?)(?=\.\s+|\n|$)/i,
    /\btopic\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bsubject\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i
  ]));
  const targetAudience = cleanValue(firstMatch(sourceText, [
    /\btarget audience\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\baudience\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bfor\s+(.+?)\s+audience\b/i
  ]));
  const channel = cleanValue(firstMatch(sourceText, [
    /\bchannel\s*(?::|is)\s*(?:the\s+)?(.+?)(?=\.\s+|\n|$)/i,
    /\bplatform\s*(?::|is)\s*(?:the\s+)?(.+?)(?=\.\s+|\n|$)/i
  ]));
  const deadline = cleanValue(firstMatch(sourceText, [
    /\bdeadline\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bdue\s*(?::|on|by|is)\s*(.+?)(?=\.\s+|\n|$)/i
  ]));

  const missingFields = [
    ["topic", topic],
    ["target_audience", targetAudience],
    ["channel", channel],
    ["deadline", deadline]
  ]
    .filter(([, value]) => value === null)
    .map(([field]) => field as string);

  return {
    status: "success",
    topic,
    target_audience: targetAudience,
    channel,
    deadline,
    missing_fields: missingFields,
    source_text: sourceText,
    errors: []
  };
}

function extractCampaignRequirement(input: unknown): CampaignRequirementOutput {
  if (!isRecord(input) || !Object.prototype.hasOwnProperty.call(input, "campaign_text")) {
    return campaignErrorOutput("missing_field", "campaign_text is required.", "");
  }

  const originalSourceText = typeof input.campaign_text === "string" ? input.campaign_text : "";
  if (typeof input.campaign_text !== "string" || input.campaign_text.trim() === "") {
    return campaignErrorOutput("invalid_value", "campaign_text must be a non-empty string.", originalSourceText);
  }

  const sourceText = input.campaign_text.trim();
  if (isCampaignOutOfScope(sourceText)) {
    return campaignErrorOutput(
      "out_of_scope",
      "This tool only extracts explicitly stated campaign requirement fields and cannot design campaign strategy, judge budget reasonableness, write marketing copy, recommend channels, publish, schedule, send messages, update systems, or take operational actions.",
      originalSourceText
    );
  }

  const campaignName = cleanValue(firstMatch(sourceText, [
    /\bcampaign\s+name\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bcampaign\s*:\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bcampaign\s+is\s+called\s+(.+?)(?=\.\s+|\n|$)/i,
    /\bcampaign\s+named\s+(.+?)(?=\.\s+|\n|$)/i,
    /\bcalled\s+(.+?)(?=\.\s+|\n|$)/i,
    /\bneed\s+(?:an?\s+)?(.+?\bcampaign)\b/i
  ]));
  const objective = cleanValue(firstMatch(sourceText, [
    /\bobjective\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bgoal\s*(?::|is)\s*(?:to\s+)?(.+?)(?=\.\s+|\n|$)/i
  ]));
  const channel = cleanValue(firstMatch(sourceText, [
    /\bchannel\s*(?::|is)\s*(?:the\s+)?(.+?)(?=\.\s+|\n|$)/i,
    /\brun\s+it\s+on\s+(.+?)(?=\.\s+|\n|$)/i,
    /\bon\s+(LinkedIn|Instagram(?:\s+and\s+TikTok)?|TikTok|Facebook|Google Ads|email|the company blog)\b/i
  ]));
  const budget = cleanValue(firstMatch(sourceText, [
    /\bbudget\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i
  ]));
  const deadline = cleanValue(firstMatch(sourceText, [
    /\bdeadline\s*(?::|is)\s*(.+?)(?=\.\s+|\n|$)/i,
    /\bdue\s*(?::|on|by|is)\s*(.+?)(?=\.\s+|\n|$)/i
  ]));

  const missingFields = [
    ["campaign_name", campaignName],
    ["objective", objective],
    ["channel", channel],
    ["budget", budget],
    ["deadline", deadline]
  ]
    .filter(([, value]) => value === null)
    .map(([field]) => field as string);

  return {
    status: "success",
    campaign_name: campaignName,
    objective,
    channel,
    budget,
    deadline,
    missing_fields: missingFields,
    source_text: originalSourceText,
    errors: []
  };
}

function isOutOfScope(sourceText: string): boolean {
  const lowered = sourceText.toLowerCase();
  const outOfScopePatterns = [
    /\b(write|draft|compose|generate|create)\s+(?!a\s+content\s+brief\b|the\s+content\s+brief\b).*(article|blog post|post|copy|caption|email|script|content)\b/,
    /\b(create|develop|build|make)\s+.*\b(strategy|campaign idea|campaign ideas|marketing plan)\b/,
    /\b(recommend|suggest|choose)\s+.*\b(channel|platform|strategy|topic|audience)\b/,
    /\b(publish|schedule|send|update)\b/,
    /\b(judge|score|evaluate|rate|review)\s+.*\b(quality|content|brief)\b/
  ];
  return outOfScopePatterns.some((pattern) => pattern.test(lowered));
}

function isCampaignOutOfScope(sourceText: string): boolean {
  const lowered = sourceText.toLowerCase();
  const outOfScopePatterns = [
    /\bdesign\s+.*\b(campaign\s+)?strategy\b/,
    /\b(create|develop|build|make)\s+.*\b(strategy|campaign idea|campaign ideas|marketing plan)\b/,
    /\b(is|are)\s+.*\b(enough|reasonable|sufficient)\b.*\bbudget\b/,
    /\bbudget\b.*\b(enough|reasonable|sufficient)\b/,
    /\bshould\s+we\s+.*\bbudget\b/,
    /\b(recommend|suggest|choose)\s+.*\b(channel|platform|strategy|budget|objective)\b/,
    /\b(write|draft|compose|generate)\s+.*\b(copy|ad copy|caption|email|script|marketing copy)\b/,
    /\b(publish|schedule|send|update)\b/,
    /\btake\s+operational\s+actions?\b/
  ];
  return outOfScopePatterns.some((pattern) => pattern.test(lowered));
}

function firstMatch(sourceText: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function cleanValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.trim().replace(/\s+/g, " ").replace(/[.。]\s*$/, "");
  return cleaned || null;
}

function errorOutput(code: ErrorCode, message: string, sourceText: string, missingFields: string[]): ContentBriefOutput {
  return {
    status: "error",
    topic: null,
    target_audience: null,
    channel: null,
    deadline: null,
    missing_fields: missingFields,
    source_text: sourceText,
    errors: [{ code, message }]
  };
}

function campaignErrorOutput(code: ErrorCode, message: string, sourceText: string): CampaignRequirementOutput {
  return {
    status: "error",
    campaign_name: null,
    objective: null,
    channel: null,
    budget: null,
    deadline: null,
    missing_fields: [],
    source_text: sourceText,
    errors: [{ code, message }]
  };
}

function renderHubHome(): string {
  const links = APPS.map((app) => `<li><a href="/${app.slug}">${escapeHtml(app.name)}</a></li>`).join("");
  return page(
    "Task App Workers Hub",
    `<h1>Task App Workers Hub</h1><p>Shared Cloudflare Workers hub for independent OpenAI Task Apps.</p><ul>${links}</ul>`
  );
}

function renderContentBriefHome(app: AppDefinition): string {
  return page(
    app.name,
    `${nav(app)}<h1>${escapeHtml(app.name)}</h1>
<h2>What this app does</h2>
<p>Content Brief Extractor is a read-only task app that extracts structured content brief fields from user-provided content request text.</p>
<h2>Input</h2>
<p>The app accepts one input field: <code>brief_text</code>, which should contain the raw content request or content brief text.</p>
<h2>Structured output</h2>
<p>The app returns explicitly stated values for topic, target audience, channel, deadline, missing fields, source text, and errors.</p>
<h2>What this app does not do</h2>
<p>This app does not write content, create marketing strategy, recommend channels, judge content quality, publish content, schedule content, contact anyone, or modify external systems.</p>
<h2>Safety and data handling</h2>
<p>The app is stateless, read-only, does not require login, does not store submitted data, and does not call external APIs.</p>
<h2>MCP endpoint</h2>
<p><code>/${app.slug}/mcp</code></p>`
  );
}

function renderContentBriefPrivacyPage(app: AppDefinition): string {
  return page(
    `${app.name} Privacy`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Privacy</h1>
<h2>Data Collected</h2>
<p>Data collected: processes only <code>brief_text</code> submitted in the current request.</p>
<h2>Tool Input</h2>
<p>Tool input: <code>brief_text</code>.</p>
<h2>Tool Outputs</h2>
<p>Tool outputs: status, topic, target_audience, channel, deadline, missing_fields, source_text, and errors.</p>
<h2>Purpose of Processing</h2>
<p>Purpose: uses data only to extract structured content brief fields.</p>
<h2>Sharing and Recipients</h2>
<p>Sharing: no sale of data, no third-party sharing, and no external APIs.</p>
<h2>Retention</h2>
<p>Retention: no storage; submitted text and outputs are not retained by this app.</p>
<h2>User Controls</h2>
<p>User controls: users control what they submit. Users may remove sensitive details before submitting text. Privacy questions or deletion requests can be sent to ${SUPPORT_LINK}.</p>
<h2>Login and Accounts</h2>
<p>No login is required. There are no downstream writes, no messages, no updates, no publishing, and no operational actions.</p>
<h2>Read-Only Operation</h2>
<p>This app is read-only, stateless, and has no side effects.</p>
<h2>Contact</h2>
<p>Support contact: ${SUPPORT_LINK}.</p>`
  );
}

function renderContentBriefTermsPage(app: AppDefinition): string {
  return page(
    `${app.name} Terms`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Terms</h1>
<h2>Use of the app</h2>
<p>Content Brief Extractor is an independent single-task node for deterministic content brief field extraction.</p>
<h2>User responsibility</h2>
<p>Users should submit only text they have the right to process and should remove sensitive or unnecessary personal data before submitting text.</p>
<h2>App limitations</h2>
<p>The app extracts only explicitly stated fields. It does not infer missing values, write content, create marketing strategy, recommend channels, or judge content quality.</p>
<h2>No operational actions</h2>
<p>The app does not publish content, schedule posts, send messages, contact external parties, update records, or modify external systems.</p>
<h2>Data and external systems</h2>
<p>The app is stateless, read-only, unauthenticated, does not store submitted data, and does not call external APIs.</p>
<h2>Contact</h2>
<p>Support questions, privacy questions, or deletion requests can be sent to ${SUPPORT_LINK}.</p>`
  );
}

function renderContentBriefSupportPage(app: AppDefinition): string {
  return page(
    `${app.name} Support`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Support</h1>
<h2>Contact</h2>
<p>For support, privacy questions, or deletion requests, contact ${SUPPORT_LINK}.</p>
<h2>What to include</h2>
<p>When contacting support, include the app name, the page or endpoint involved, a brief description of the issue, and any non-sensitive example input needed to reproduce the problem.</p>
<h2>Support scope</h2>
<p>Support covers app availability, review pages, MCP endpoint behavior, schema issues, and privacy or deletion questions.</p>
<h2>App boundaries</h2>
<p>This app only extracts explicitly stated content brief fields. It does not write content, create marketing strategy, recommend channels, publish content, send messages, update records, or call external APIs.</p>
<h2>Data handling</h2>
<p>This app processes only submitted <code>brief_text</code>. It is read-only, stateless, and does not store, send, publish, update, or modify data.</p>`
  );
}

function renderCampaignRequirementHome(app: AppDefinition): string {
  const campaignSupportLink = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
  return page(
    app.name,
    `${nav(app)}<h1>${escapeHtml(app.name)}</h1>
<h2>What this app does</h2>
<p>Campaign Requirement Extractor is a read-only task app that extracts structured campaign requirement fields from user-provided campaign text.</p>
<h2>Input</h2>
<p>The app accepts one input field: <code>campaign_text</code>, containing raw campaign requirement text with explicitly stated campaign details.</p>
<h2>Structured output</h2>
<p>The app returns campaign_name, objective, channel, budget, deadline, missing_fields, source_text, and errors.</p>
<h2>What this app does not do</h2>
<p>This app does not design campaign strategy, judge budget reasonableness, write marketing copy, recommend channels, publish campaigns, schedule campaigns, send messages, update systems, or take operational actions.</p>
<h2>Safety and data handling</h2>
<p>The app is stateless, read-only, does not require login, does not store submitted data, and does not call external APIs.</p>
<h2>MCP endpoint</h2>
<p><code>/${app.slug}/mcp</code></p>
<h2>Contact</h2>
<p>Support contact: ${campaignSupportLink}.</p>`
  );
}

function renderCampaignRequirementPrivacyPage(app: AppDefinition): string {
  const campaignSupportLink = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
  return page(
    `${app.name} Privacy`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Privacy</h1>
<h2>Data Collected</h2>
<p>The app processes only campaign requirement text submitted by the user in the current request. It does not collect data from external sources, scrape websites, or fetch additional data.</p>
<h2>Tool Input</h2>
<p>Expected tool input: <code>campaign_text</code>.</p>
<h2>Tool Outputs</h2>
<p>The app may return campaign_name, objective, channel, budget, deadline, missing_fields, source_text, and errors.</p>
<h2>Purpose of Processing</h2>
<p>Purpose: uses submitted text only to extract explicitly stated campaign requirement fields.</p>
<h2>Recipients and Sharing</h2>
<p>The app does not sell user data, does not share submitted data with downstream systems, and does not call external APIs.</p>
<h2>Retention</h2>
<p>The app does not store submitted inputs or generated outputs after request processing is complete, aside from transient platform-level request handling and logs.</p>
<h2>User Controls</h2>
<p>Users control what they submit and may remove sensitive details before submitting text. Privacy questions or deletion requests can be sent to ${campaignSupportLink}.</p>
<h2>Login and Accounts</h2>
<p>No login or account is required.</p>
<h2>No Downstream Writes</h2>
<p>The app does not update campaigns, ad accounts, calendars, email systems, databases, or other external systems.</p>
<h2>Read-Only Operation</h2>
<p>The app is read-only, stateless, and has no side effects.</p>
<h2>Contact</h2>
<p>Support contact: ${campaignSupportLink}.</p>`
  );
}

function renderCampaignRequirementTermsPage(app: AppDefinition): string {
  const campaignSupportLink = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
  return page(
    `${app.name} Terms`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Terms</h1>
<h2>Permitted Use</h2>
<p>Campaign Requirement Extractor may be used to extract explicitly stated campaign requirement fields from user-provided campaign text.</p>
<h2>User Responsibility</h2>
<p>Users should submit only text they have the right to process and should remove sensitive or unnecessary personal data before submitting text.</p>
<h2>Limitations</h2>
<p>The app does not infer missing values, normalize budgets into another currency, judge whether a budget is reasonable, recommend channels, rewrite objectives, or create campaign strategy.</p>
<h2>No Operational Actions</h2>
<p>The app does not publish campaigns, schedule campaigns, send messages, update records, contact external parties, or modify external systems.</p>
<h2>Data and External Systems</h2>
<p>The app is stateless, read-only, unauthenticated, does not store submitted data, and does not call external APIs.</p>
<h2>Contact</h2>
<p>Support questions, privacy questions, or deletion requests can be sent to ${campaignSupportLink}.</p>`
  );
}

function renderCampaignRequirementSupportPage(app: AppDefinition): string {
  const campaignSupportLink = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
  return page(
    `${app.name} Support`,
    `${nav(app)}<h1>${escapeHtml(app.name)} Support</h1>
<h2>Contact</h2>
<p>For support, privacy questions, or deletion requests, contact ${campaignSupportLink}.</p>
<h2>What to Include</h2>
<p>When contacting support, include the app name, the page or endpoint involved, a brief description of the issue, and any non-sensitive example input needed to reproduce the problem.</p>
<h2>Support Scope</h2>
<p>Support covers app availability, review pages, MCP endpoint behavior, schema issues, and privacy or deletion questions.</p>
<h2>App Boundaries</h2>
<p>This app only extracts explicitly stated campaign requirement fields. It does not design campaign strategy, judge budget reasonableness, write marketing copy, recommend channels, publish, schedule, send messages, update systems, or take operational actions.</p>
<h2>Data Handling</h2>
<p>This app processes only submitted <code>campaign_text</code>. It is read-only, stateless, does not store submitted inputs or outputs, and does not call external APIs.</p>`
  );
}

function nav(app: AppDefinition): string {
  return `<nav><a href="/${app.slug}">Home</a> | <a href="/${app.slug}/privacy">Privacy</a> | <a href="/${app.slug}/terms">Terms</a> | <a href="/${app.slug}/support">Support</a></nav>`;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { color: #1f2937; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem auto; max-width: 760px; padding: 0 1rem; }
    a { color: #075985; }
    nav { margin-bottom: 1.5rem; }
    code { background: #f3f4f6; padding: 0.1rem 0.25rem; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonRpcError(id: string | number | null, code: number, message: string): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message }
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function htmlResponse(value: string, status = 200): Response {
  return new Response(value, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

function textResponse(value: string, status = 200): Response {
  return new Response(value, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
