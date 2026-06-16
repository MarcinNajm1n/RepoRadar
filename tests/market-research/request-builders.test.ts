import { afterEach, describe, expect, it } from "vitest";
import { buildOpenAiResponsesBody } from "../../src/lib/openai/client";
import { buildMcpWebResearchTool, buildWebSearchTool } from "../../src/lib/market-research/request-builders";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("market research request builders", () => {
  it("builds OpenAI web_search tool config", () => {
    expect(buildWebSearchTool(8)).toMatchObject({
      type: "web_search",
      search_context_size: "medium",
      return_token_budget: "default",
      external_web_access: true
    });
  });

  it("builds remote MCP web research tool config from env", () => {
    process.env.MCP_WEB_RESEARCH_SERVER_URL = "https://example.com/mcp";
    process.env.MCP_WEB_RESEARCH_SERVER_LABEL = "web-research";
    process.env.MCP_WEB_RESEARCH_ALLOWED_TOOLS = "search,fetch";

    expect(buildMcpWebResearchTool()).toEqual({
      type: "mcp",
      server_label: "web-research",
      server_url: "https://example.com/mcp",
      require_approval: "never",
      allowed_tools: ["search", "fetch"]
    });
  });

  it("adds tools and include fields to Responses request body", () => {
    const body = buildOpenAiResponsesBody("gpt-test", "instructions", "input", {
      tools: [buildWebSearchTool(3)],
      toolChoice: "required",
      include: ["web_search_call.action.sources"]
    });

    expect(body).toMatchObject({
      model: "gpt-test",
      instructions: "instructions",
      input: "input",
      store: false,
      tool_choice: "required",
      include: ["web_search_call.action.sources"]
    });
    expect(body.tools).toHaveLength(1);
    expect(body.tools?.[0].type).toBe("web_search");
  });
});
