import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { getCachedOpenAiOutput, saveOpenAiOutput } from "@/lib/db/openai-cache";
import { stableHash } from "@/lib/hash";
import { sanitizeExternalText, sanitizeExternalUrl, safeJsonParse, truncateText } from "@/lib/utils";
import { emptyMarketResearch } from "./parser";
import { mcpWebResearchProvider } from "./providers/mcp-web-research";
import { openAiWebSearchProvider } from "./providers/openai-web-search";
import { redditProvider } from "./providers/reddit";
import type {
  MarketResearchContext,
  MarketResearchProvider,
  MarketResearchResult,
  MarketResearchSourceInput,
  StoredMarketResearch
} from "./types";

function queryHash(context: MarketResearchContext, provider: string) {
  return stableHash(
    [
      "market-research",
      context.kind,
      provider,
      context.fullName,
      context.readmeHash ?? "",
      context.trendScore,
      context.relevanceScore,
      context.repositoryContext
    ].join("\n")
  );
}

function cacheKind(context: MarketResearchContext, provider: string) {
  return `market-research:${context.kind}:${provider}`;
}

function providersForConfig(): MarketResearchProvider[] {
  const config = getConfig();
  const providers: MarketResearchProvider[] = [];

  if (!config.marketResearchEnabled || config.marketResearchProvider === "none") {
    return providers;
  }

  if (config.marketResearchProvider === "mcp") {
    return [mcpWebResearchProvider];
  }

  if (config.marketResearchProvider === "openai") {
    return [openAiWebSearchProvider];
  }

  if (config.marketResearchProvider === "reddit") {
    return [redditProvider];
  }

  if (config.mcpWebResearchServerUrl) {
    providers.push(mcpWebResearchProvider);
  }
  providers.push(openAiWebSearchProvider);
  if (config.enableRedditSource && config.redditClientId && config.redditClientSecret) {
    providers.push(redditProvider);
  }

  return providers;
}

async function countMarketResearchRunsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return prisma.marketResearchRun.count({
    where: {
      startedAt: { gte: start },
      status: { in: ["RUNNING", "SUCCESS"] }
    }
  });
}

function parsePublishedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceCreateData(source: MarketResearchSourceInput, runId: string, repoId: string) {
  const url = sanitizeExternalUrl(source.url);
  if (!url) {
    return null;
  }

  return {
    runId,
    repoId,
    sourceType: sanitizeExternalText(source.sourceType, 80) ?? "web",
    title: sanitizeExternalText(source.title, 300) ?? "Untitled source",
    url,
    publisher: sanitizeExternalText(source.publisher, 180),
    publishedAt: parsePublishedAt(source.publishedAt),
    snippet: sanitizeExternalText(source.snippet, 1400) ?? "",
    sentiment: sanitizeExternalText(source.sentiment, 60),
    relevanceScore: source.relevanceScore === null || source.relevanceScore === undefined ? null : source.relevanceScore
  };
}

function validSourceCreateData(sources: MarketResearchSourceInput[], runId: string, repoId: string) {
  return sources
    .map((source) => sourceCreateData(source, runId, repoId))
    .filter((source): source is NonNullable<ReturnType<typeof sourceCreateData>> => Boolean(source));
}

async function storeRun(
  context: MarketResearchContext,
  provider: string,
  hash: string,
  status: "SUCCESS" | "CACHED",
  result: MarketResearchResult
): Promise<StoredMarketResearch> {
  const run = await prisma.marketResearchRun.create({
    data: {
      repoId: context.repoId,
      provider,
      queryHash: hash,
      status,
      finishedAt: new Date(),
      sourceCount: 0
    }
  });

  const sourceData = validSourceCreateData(result.sources, run.id, context.repoId);
  const createdSources = await Promise.all(
    sourceData.map((data) =>
      prisma.marketResearchSource.create({
        data
      })
    )
  );

  await prisma.marketResearchRun.update({
    where: { id: run.id },
    data: { sourceCount: createdSources.length }
  });

  return {
    ...result,
    runId: run.id,
    sourceIds: createdSources.map((source) => source.id),
    status
  };
}

async function tryCached(context: MarketResearchContext, provider: MarketResearchProvider, hash: string) {
  const config = getConfig();
  const cached = await getCachedOpenAiOutput(cacheKind(context, provider.name), context.repoId, hash, config.openAiModel);
  if (!cached) {
    return null;
  }

  const result = safeJsonParse<MarketResearchResult | null>(cached.content, null);
  if (!result) {
    return null;
  }

  return storeRun(context, provider.name, hash, "CACHED", result);
}

async function runProvider(context: MarketResearchContext, provider: MarketResearchProvider, hash: string) {
  const config = getConfig();
  const run = await prisma.marketResearchRun.create({
    data: {
      repoId: context.repoId,
      provider: provider.name,
      queryHash: hash,
      status: "RUNNING"
    }
  });

  try {
    const result = await provider.research(context);
    await saveOpenAiOutput(cacheKind(context, provider.name), context.repoId, hash, config.openAiModel, JSON.stringify(result));
    const sourceData = validSourceCreateData(result.sources, run.id, context.repoId);
    const createdSources = await Promise.all(
      sourceData.map((data) =>
        prisma.marketResearchSource.create({
          data
        })
      )
    );

    await prisma.marketResearchRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        sourceCount: createdSources.length
      }
    });

    return {
      ...result,
      runId: run.id,
      sourceIds: createdSources.map((source) => source.id),
      status: "SUCCESS" as const
    };
  } catch (error) {
    await prisma.marketResearchRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: truncateText(error instanceof Error ? error.message : "Unknown market research error", 1000)
      }
    });
    throw error;
  }
}

export async function getMarketResearchForRepository(context: MarketResearchContext): Promise<StoredMarketResearch> {
  const config = getConfig();
  if (!config.marketResearchEnabled || config.marketResearchProvider === "none") {
    return emptyMarketResearch("DISABLED");
  }

  const providers = providersForConfig();
  if (!providers.length) {
    return emptyMarketResearch("UNAVAILABLE", "No market research provider is configured");
  }

  let lastError: string | undefined;
  for (const provider of providers) {
    const hash = queryHash(context, provider.name);
    const cached = await tryCached(context, provider, hash);
    if (cached) {
      return cached;
    }

    const usedToday = await countMarketResearchRunsToday();
    if (usedToday >= config.marketResearchDailyLimit) {
      return emptyMarketResearch("UNAVAILABLE", `Daily market research limit reached (${config.marketResearchDailyLimit})`);
    }

    try {
      return await runProvider(context, provider, hash);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown market research error";
      if (config.marketResearchProvider !== "hybrid") {
        return emptyMarketResearch("UNAVAILABLE", lastError);
      }
    }
  }

  return emptyMarketResearch("UNAVAILABLE", lastError ?? "Market research providers failed");
}

export async function attachResearchToReport(runId: string | undefined, reportId: string) {
  if (!runId) {
    return;
  }

  await prisma.$transaction([
    prisma.marketResearchRun.updateMany({ where: { id: runId }, data: { reportId } }),
    prisma.marketResearchSource.updateMany({ where: { runId }, data: { reportId } })
  ]);
}

export async function attachResearchToIdea(runId: string | undefined, ideaId: string) {
  if (!runId) {
    return;
  }

  await prisma.$transaction([
    prisma.marketResearchRun.updateMany({ where: { id: runId }, data: { ideaId } }),
    prisma.marketResearchSource.updateMany({ where: { runId }, data: { ideaId } })
  ]);
}
