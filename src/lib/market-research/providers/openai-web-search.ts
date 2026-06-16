import { getConfig } from "@/lib/config";
import { generateOpenAiText } from "@/lib/openai/client";
import { buildMarketResearchPrompt } from "@/lib/openai/prompts";
import { buildWebSearchTool } from "../request-builders";
import { parseMarketResearchResult } from "../parser";
import type { MarketResearchContext, MarketResearchProvider } from "../types";

export const openAiWebSearchProvider: MarketResearchProvider = {
  name: "openai-web-search",
  async research(context: MarketResearchContext) {
    const config = getConfig();
    const content = await generateOpenAiText(buildMarketResearchPrompt(config.marketResearchMaxSources), context.repositoryContext, {
      tools: [buildWebSearchTool(config.marketResearchMaxSources)],
      toolChoice: "required",
      include: ["web_search_call.action.sources"]
    });

    return parseMarketResearchResult(this.name, content, config.marketResearchMaxSources);
  }
};
