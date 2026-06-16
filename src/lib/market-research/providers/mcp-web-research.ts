import { getConfig } from "@/lib/config";
import { generateOpenAiText } from "@/lib/openai/client";
import { buildMarketResearchPrompt } from "@/lib/openai/prompts";
import { buildMcpWebResearchTool } from "../request-builders";
import { parseMarketResearchResult } from "../parser";
import type { MarketResearchContext, MarketResearchProvider } from "../types";

export const mcpWebResearchProvider: MarketResearchProvider = {
  name: "mcp-web-research",
  usesOpenAi: true,
  async research(context: MarketResearchContext) {
    const config = getConfig();
    const content = await generateOpenAiText(buildMarketResearchPrompt(config.marketResearchMaxSources, context.mode ?? "full"), context.repositoryContext, {
      tools: [buildMcpWebResearchTool()],
      toolChoice: "required"
    });

    return parseMarketResearchResult(this.name, content, config.marketResearchMaxSources);
  }
};
