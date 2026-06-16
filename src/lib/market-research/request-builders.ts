import { getConfig } from "@/lib/config";
import { sanitizeExternalUrl } from "@/lib/utils";
import type { OpenAiResponsesTool } from "@/lib/openai/client";

const MCP_ALLOWED_TOOLS = new Set(["search", "fetch"]);

export function buildWebSearchTool(maxSources: number): OpenAiResponsesTool {
  return {
    type: "web_search",
    search_context_size: maxSources <= 4 ? "low" : "medium",
    return_token_budget: "default",
    external_web_access: true
  };
}

export function buildMcpWebResearchTool(): OpenAiResponsesTool {
  const config = getConfig();
  if (!config.mcpWebResearchServerUrl) {
    throw new Error("MCP_WEB_RESEARCH_SERVER_URL is required for MCP market research");
  }
  const serverUrl = sanitizeExternalUrl(config.mcpWebResearchServerUrl);
  if (!serverUrl || !serverUrl.startsWith("https://")) {
    throw new Error("MCP_WEB_RESEARCH_SERVER_URL must be an https URL");
  }

  const allowedTools = config.mcpWebResearchAllowedTools.filter((tool) => MCP_ALLOWED_TOOLS.has(tool));

  return {
    type: "mcp",
    server_label: config.mcpWebResearchServerLabel,
    server_url: serverUrl,
    require_approval: "never",
    allowed_tools: allowedTools.length ? allowedTools : ["search", "fetch"]
  };
}
