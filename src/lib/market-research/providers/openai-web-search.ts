import { getConfig } from "@/lib/config";
import { generateOpenAiText } from "@/lib/openai/client";
import { buildMarketResearchPrompt } from "@/lib/openai/prompts";
import { buildWebSearchTool } from "../request-builders";
import { parseMarketResearchResult } from "../parser";
import type { MarketResearchContext, MarketResearchProvider } from "../types";

export const openAiWebSearchProvider: MarketResearchProvider = {
  name: "openai-web-search",
  usesOpenAi: true,
  async research(context: MarketResearchContext) {
    const config = getConfig();
    const maxSources = Math.min(config.marketResearchMaxSources, context.mode === "light" ? 4 : config.marketResearchMaxSources);
    const content = await generateOpenAiText(buildMarketResearchPrompt(maxSources, context.mode ?? "full"), context.repositoryContext, {
      tools: [buildWebSearchTool(maxSources)],
      toolChoice: "required",
      include: ["web_search_call.action.sources"]
    });

    return parseMarketResearchResult(this.name, content, maxSources);
  }
};
