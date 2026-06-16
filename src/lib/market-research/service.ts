import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { getCachedOpenAiOutput, saveOpenAiOutput } from "@/lib/db/openai-cache";
import { stableHash } from "@/lib/hash";
import { sanitizeExternalText, sanitizeExternalUrl, safeJsonParse, truncateText } from "@/lib/utils";
import { emptyMarketResearch } from "./parser";
import { dedupeSources } from "./query";
import { blueskyProvider } from "./providers/bluesky";
import { hackerNewsProvider } from "./providers/hacker-news";
import { mcpWebResearchProvider } from "./providers/mcp-web-research";
import { openAiWebSearchProvider } from "./providers/openai-web-search";
import { redditProvider } from "./providers/reddit";
import { rssProvider } from "./providers/rss";
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
      context.mode ?? getConfig().marketResearchMode,
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
  return `market-research:${context.kind}:${context.mode ?? getConfig().marketResearchMode}:${provider}`;
}

function providersForConfig(context: MarketResearchContext): MarketResearchProvider[] {
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

  if (config.marketResearchProvider === "bluesky") {
    return [blueskyProvider];
  }

  if (config.enableHnSource) {
    providers.push(hackerNewsProvider);
  }
  if (config.enableRssSource) {
    providers.push(rssProvider);
  }
  if (config.enableOpenAiWebSearchSource && config.openAiApiKey) {
    providers.push(openAiWebSearchProvider);
  }
  if (context.mode === "full" && config.enableRedditSource && config.redditClientId && config.redditClientSecret) {
    providers.push(redditProvider);
  }
  if (context.mode === "full" && config.enableBlueskySource) {
    providers.push(blueskyProvider);
  }
  if (providers.length === 0 && context.mode === "full" && config.mcpWebResearchServerUrl) {
    providers.push(mcpWebResearchProvider);
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
      mode: context.mode ?? getConfig().marketResearchMode,
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
    runIds: [run.id],
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
      mode: context.mode ?? config.marketResearchMode,
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
      runIds: [run.id],
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

function combineStoredResults(results: StoredMarketResearch[], mode: string): StoredMarketResearch {
  const sources = dedupeSources(
    results.flatMap((result) => result.sources),
    getConfig().marketResearchMaxSources
  );
  const sourceIds = [...new Set(results.flatMap((result) => result.sourceIds))];
  const runIds = [...new Set(results.flatMap((result) => result.runIds ?? (result.runId ? [result.runId] : [])))];
  const confidenceScores = results
    .map((result) => result.confidenceScore)
    .filter((score): score is number => typeof score === "number");
  const avgConfidence = confidenceScores.length
    ? Math.max(1, Math.min(5, Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)))
    : null;
  const sentiments = new Set(results.map((result) => result.sentiment).filter(Boolean));
  const conflictRisk =
    sentiments.has("positive") && (sentiments.has("negative") || sentiments.has("mixed"))
      ? ["Zrodla maja mieszany sentyment; pelna walidacja powinna sprawdzic konflikt miedzy zachwytem early adopters a skargami uzytkownikow."]
      : [];

  return {
    provider: results.map((result) => result.provider).join("+") || "hybrid",
    summary: results
      .map((result) => result.summary)
      .filter(Boolean)
      .join(" "),
    signals: [...new Set(results.flatMap((result) => result.signals))].slice(0, 8),
    userProblems: [...new Set(results.flatMap((result) => result.userProblems))].slice(0, 8),
    sentiment: results.some((result) => result.sentiment === "negative" || result.sentiment === "mixed") ? "mixed" : "neutral",
    demandEvidence: [...new Set(results.flatMap((result) => result.demandEvidence))].slice(0, 8),
    validationRisks: [...new Set([...conflictRisk, ...results.flatMap((result) => result.validationRisks)])].slice(0, 8),
    confidenceScore: mode === "full" && sources.length >= 5 ? Math.max(avgConfidence ?? 3, 4) : avgConfidence,
    sources,
    runId: runIds[0],
    runIds,
    sourceIds,
    status: results.some((result) => result.status === "SUCCESS") ? "SUCCESS" : "CACHED"
  };
}

export async function getMarketResearchForRepository(context: MarketResearchContext): Promise<StoredMarketResearch> {
  const config = getConfig();
  if (!config.marketResearchEnabled || config.marketResearchProvider === "none") {
    return emptyMarketResearch("DISABLED");
  }

  const researchContext = { ...context, mode: context.mode ?? config.marketResearchMode };
  const providers = providersForConfig(researchContext);
  if (!providers.length) {
    return emptyMarketResearch("UNAVAILABLE", "No market research provider is configured");
  }

  let lastError: string | undefined;
  const results: StoredMarketResearch[] = [];
  for (const provider of providers) {
    const hash = queryHash(researchContext, provider.name);
    const cached = await tryCached(researchContext, provider, hash);
    if (cached) {
      results.push(cached);
      continue;
    }

    const usedToday = await countMarketResearchRunsToday();
    if (usedToday >= config.marketResearchDailyLimit) {
      return emptyMarketResearch("UNAVAILABLE", `Daily market research limit reached (${config.marketResearchDailyLimit})`);
    }

    try {
      results.push(await runProvider(researchContext, provider, hash));
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown market research error";
      if (config.marketResearchProvider !== "hybrid") {
        return emptyMarketResearch("UNAVAILABLE", lastError);
      }
    }
  }

  if (results.length === 1) {
    return results[0];
  }
  if (results.length > 1) {
    return combineStoredResults(results, researchContext.mode ?? config.marketResearchMode);
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

export async function attachResearchRunsToReport(runIds: string[] | undefined, reportId: string) {
  const ids = runIds?.filter(Boolean) ?? [];
  if (!ids.length) {
    return;
  }

  await prisma.$transaction([
    prisma.marketResearchRun.updateMany({ where: { id: { in: ids } }, data: { reportId } }),
    prisma.marketResearchSource.updateMany({ where: { runId: { in: ids } }, data: { reportId } })
  ]);
}

export async function attachResearchRunsToIdea(runIds: string[] | undefined, ideaId: string) {
  const ids = runIds?.filter(Boolean) ?? [];
  if (!ids.length) {
    return;
  }

  await prisma.$transaction([
    prisma.marketResearchRun.updateMany({ where: { id: { in: ids } }, data: { ideaId } }),
    prisma.marketResearchSource.updateMany({ where: { runId: { in: ids } }, data: { ideaId } })
  ]);
}
