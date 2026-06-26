import { getConfig } from "@/lib/config";
import type { AppConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { sanitizeExternalText, truncateText } from "@/lib/utils";
import { buildExternalResearchCacheKey, getExternalResearchCache, setExternalResearchCache } from "./external-cache";
import { canonicalizeUrl, dedupeEvidenceSources, summarizeEvidenceQuality } from "./evidence";
import { emptyMarketResearch } from "./parser";
import { buildResearchQueries } from "./query";
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
  return buildExternalResearchCacheKey(provider, context, buildResearchQueries(context).join("\n"));
}

export function selectMarketResearchProviders(
  context: MarketResearchContext,
  config: AppConfig = getConfig()
): MarketResearchProvider[] {
  const providers: MarketResearchProvider[] = [];
  const mode = context.mode ?? config.marketResearchMode;

  if (!config.marketResearchEnabled || config.marketResearchProvider === "none") {
    return providers;
  }

  if (config.marketResearchProvider === "mcp") {
    return mode === "full" && config.mcpWebResearchServerUrl ? [mcpWebResearchProvider] : [];
  }

  if (config.marketResearchProvider === "openai") {
    return config.openAiApiKey ? [openAiWebSearchProvider] : [];
  }

  if (config.marketResearchProvider === "reddit") {
    return mode === "full" && config.enableRedditSource && config.redditClientId && config.redditClientSecret
      ? [redditProvider]
      : [];
  }

  if (config.marketResearchProvider === "bluesky") {
    return mode === "full" && config.enableBlueskySource ? [blueskyProvider] : [];
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
  if (mode === "full" && config.enableRedditSource && config.redditClientId && config.redditClientSecret) {
    providers.push(redditProvider);
  }
  if (mode === "full" && config.enableBlueskySource) {
    providers.push(blueskyProvider);
  }
  if (providers.length === 0 && mode === "full" && config.mcpWebResearchServerUrl) {
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

function cachedStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeExternalText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function cachedSourceArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((source): source is MarketResearchSourceInput => Boolean(source) && typeof source === "object");
}

function cachedNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCachedMarketResearchResult(
  cached: unknown,
  provider: string,
  queries: string[]
): MarketResearchResult | null {
  if (!cached || typeof cached !== "object" || Array.isArray(cached)) {
    return null;
  }

  const record = cached as Record<string, unknown>;
  const summary = sanitizeExternalText(record.summary, 2000);
  const sentiment = sanitizeExternalText(record.sentiment, 120);
  const sources = cachedSourceArray(record.sources);
  if (!summary || !sentiment || !sources) {
    return null;
  }

  const cachedQueries = cachedStringArray(record.queries, 12, 180);
  const cachedProviders = cachedStringArray(record.providers, 8, 80);

  return {
    provider: sanitizeExternalText(record.provider, 80) ?? provider,
    summary,
    signals: cachedStringArray(record.signals, 8, 300),
    userProblems: cachedStringArray(record.userProblems, 8, 300),
    sentiment,
    demandEvidence: cachedStringArray(record.demandEvidence, 8, 300),
    validationRisks: cachedStringArray(record.validationRisks, 8, 300),
    confidenceScore: cachedNumber(record.confidenceScore),
    sources,
    queries: cachedQueries.length ? cachedQueries : queries,
    providers: cachedProviders.length ? cachedProviders : [provider],
    independentSourceCount: cachedNumber(record.independentSourceCount) ?? undefined,
    evidenceSummary: sanitizeExternalText(record.evidenceSummary, 1200),
    conflictSummary: sanitizeExternalText(record.conflictSummary, 1200)
  };
}

function enrichMarketResearchResult(
  context: MarketResearchContext,
  provider: string,
  result: MarketResearchResult
): MarketResearchResult {
  const config = getConfig();
  const normalizedSources = dedupeEvidenceSources(result.sources, {
    maxSources: config.marketResearchMaxSources,
    maxPerProvider: config.marketResearchMaxItemsPerProvider,
    context
  });
  const quality = summarizeEvidenceQuality(normalizedSources);
  const conflictRisks = quality.conflictSummary ? [quality.conflictSummary] : [];

  return {
    ...result,
    provider: result.provider || provider,
    sources: normalizedSources,
    queries: result.queries?.length ? result.queries : buildResearchQueries(context),
    providers: result.providers?.length ? result.providers : [provider],
    independentSourceCount: quality.independentSourceCount,
    evidenceSummary: quality.evidenceSummary,
    conflictSummary: quality.conflictSummary,
    validationRisks: [...new Set([...conflictRisks, ...result.validationRisks])].slice(0, 8)
  };
}

function sourceCreateData(source: MarketResearchSourceInput, runId: string, repoId: string) {
  const url = canonicalizeUrl(source.url);
  if (!url) {
    return null;
  }
  const canonicalUrl = source.canonicalUrl ?? url;

  return {
    runId,
    repoId,
    sourceType: sanitizeExternalText(source.sourceType, 80) ?? "web",
    title: sanitizeExternalText(source.title, 300) ?? "Untitled source",
    url,
    canonicalUrl,
    sourceKey: sanitizeExternalText(source.sourceKey, 300),
    publisher: sanitizeExternalText(source.publisher, 180),
    publishedAt: parsePublishedAt(source.publishedAt),
    snippet: sanitizeExternalText(source.snippet, 1400) ?? "",
    sentiment: sanitizeExternalText(source.sentiment, 60),
    relevanceScore: source.relevanceScore === null || source.relevanceScore === undefined ? null : source.relevanceScore,
    evidenceKind: sanitizeExternalText(source.evidenceKind, 80),
    whatItProves: sanitizeExternalText(source.whatItProves, 500),
    sourceConfidence:
      source.sourceConfidence === null || source.sourceConfidence === undefined ? null : Math.round(source.sourceConfidence),
    sourceRank: source.sourceRank === null || source.sourceRank === undefined ? null : Math.round(source.sourceRank)
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
  const enriched = enrichMarketResearchResult(context, provider, result);
  const run = await prisma.marketResearchRun.create({
    data: {
      repoId: context.repoId,
      provider,
      mode: context.mode ?? getConfig().marketResearchMode,
      queryHash: hash,
      queriesJson: JSON.stringify(enriched.queries ?? []),
      providersJson: JSON.stringify(enriched.providers ?? [provider]),
      status,
      finishedAt: new Date(),
      sourceCount: 0
    }
  });

  const sourceData = validSourceCreateData(enriched.sources, run.id, context.repoId);
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
    ...enriched,
    runId: run.id,
    runIds: [run.id],
    sourceIds: createdSources.map((source) => source.id),
    status
  };
}

async function tryCached(context: MarketResearchContext, provider: MarketResearchProvider, hash: string) {
  const queries = buildResearchQueries(context);
  const cached = normalizeCachedMarketResearchResult(await getExternalResearchCache(provider.name, hash), provider.name, queries);
  if (!cached) {
    return null;
  }

  return storeRun(context, provider.name, hash, "CACHED", {
    ...cached,
    queries: cached.queries?.length ? cached.queries : queries,
    providers: cached.providers?.length ? cached.providers : [provider.name]
  });
}

async function runProvider(context: MarketResearchContext, provider: MarketResearchProvider, hash: string) {
  const config = getConfig();
  const queries = buildResearchQueries(context);
  const run = await prisma.marketResearchRun.create({
    data: {
      repoId: context.repoId,
      provider: provider.name,
      mode: context.mode ?? config.marketResearchMode,
      queryHash: hash,
      queriesJson: JSON.stringify(queries),
      providersJson: JSON.stringify([provider.name]),
      status: "RUNNING"
    }
  });

  try {
    const rawResult = await provider.research(context);
    const result = enrichMarketResearchResult(context, provider.name, {
      ...rawResult,
      queries: rawResult.queries?.length ? rawResult.queries : queries,
      providers: rawResult.providers?.length ? rawResult.providers : [provider.name]
    });
    await setExternalResearchCache(provider.name, hash, result, {
      mode: context.mode ?? config.marketResearchMode,
      query: queries.join(" | ")
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
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        sourceCount: createdSources.length,
        queriesJson: JSON.stringify(result.queries ?? queries),
        providersJson: JSON.stringify(result.providers ?? [provider.name])
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
  const config = getConfig();
  const sources = dedupeEvidenceSources(results.flatMap((result) => result.sources), {
    maxSources: config.marketResearchMaxSources,
    maxPerProvider: config.marketResearchMaxItemsPerProvider
  });
  const quality = summarizeEvidenceQuality(sources);
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
    validationRisks: [...new Set([...conflictRisk, quality.conflictSummary, ...results.flatMap((result) => result.validationRisks)].filter(Boolean) as string[])].slice(0, 8),
    confidenceScore: mode === "full" && sources.length >= 5 ? Math.max(avgConfidence ?? 3, 4) : avgConfidence,
    sources,
    queries: [...new Set(results.flatMap((result) => result.queries ?? []))],
    providers: [...new Set(results.flatMap((result) => result.providers ?? [result.provider]))],
    independentSourceCount: quality.independentSourceCount,
    evidenceSummary: quality.evidenceSummary,
    conflictSummary: quality.conflictSummary,
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
  const providers = selectMarketResearchProviders(researchContext);
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
