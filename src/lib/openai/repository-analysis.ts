import { prisma } from "@/lib/db/client";
import { getRepositoryForReport } from "@/lib/db/repositories";
import { countOpenAiAnalysesToday, getCachedOpenAiOutputByHashes, saveOpenAiOutput } from "@/lib/db/openai-cache";
import { getConfig } from "@/lib/config";
import { clamp, safeJsonParse } from "@/lib/utils";
import { parseStoredStringArray, sanitizeStoredStringArray } from "@/lib/stored-json";
import { repoReportPath } from "@/lib/reports/paths";
import {
  buildIdeaPrompt,
  buildRepoReportPrompt,
  buildRepositoryContext,
  buildSummaryPrompt,
  formatMarketResearchForPrompt
} from "./prompts";
import { generateOpenAiText } from "./client";
import {
  buildLegacyOpenAiCacheInputHash,
  buildOpenAiCacheInputHash,
  buildRepositoryCacheFingerprint
} from "./cache-keys";
import { applyOpenAiActionBudget, getOpenAiActionOptions } from "./token-budgets";
import { formatOpenAiBudgetWarning, getRequiredOpenAiCallsForAction } from "./budget-status";
import {
  attachResearchRunsToIdea,
  attachResearchRunsToReport,
  getMarketResearchForRepository
} from "@/lib/market-research/service";
import { buildOpportunityFallback, calculateOpportunityScoreWithBreakdown } from "@/lib/market-research/opportunity";
import type { MarketResearchMode } from "@/lib/market-research/types";
import { ACTIVE_IDEA_STATUSES, IDEA_STATUS, isActiveIdeaStatus } from "@/types/idea-status";

function topicsFromJson(value: string) {
  return parseStoredStringArray(value);
}

async function ensureOpenAiBudget(requiredCalls = 1) {
  const config = getConfig();
  const usedToday = await countOpenAiAnalysesToday();
  if (usedToday + requiredCalls > config.openAiDailyAnalysisLimit) {
    throw new Error(
      formatOpenAiBudgetWarning({
        label: "OpenAI",
        requiredCalls,
        dailyLimit: config.openAiDailyAnalysisLimit,
        usedToday
      })
    );
  }
}

function inputHashes(kind: string, context: string, repository: Awaited<ReturnType<typeof getRepositoryForReport>>) {
  const repositoryFingerprint = buildRepositoryCacheFingerprint(repository);
  const current = buildOpenAiCacheInputHash({ kind, context, repositoryFingerprint });
  const legacy = buildLegacyOpenAiCacheInputHash(kind, context);

  return {
    current,
    lookup: current === legacy ? [current] : [current, legacy]
  };
}

function buildResearchContext(
  kind: "repo-report" | "idea" | "opportunity-candidate",
  repository: Awaited<ReturnType<typeof getRepositoryForReport>>,
  context: string,
  mode: MarketResearchMode
) {
  return {
    kind,
    mode,
    repoId: repository.id,
    fullName: repository.fullName,
    url: repository.url,
    description: repository.description,
    primaryLanguage: repository.primaryLanguage,
    topics: topicsFromJson(repository.topicsJson),
    starsCurrent: repository.starsCurrent,
    forksCurrent: repository.forksCurrent,
    openIssues: repository.openIssues,
    trendScore: repository.trendScore,
    relevanceScore: repository.relevanceScore,
    readmeHash: repository.readmeHash,
    readmeExcerpt: repository.readmeExcerpt,
    repositoryContext: context
  };
}

export async function generateShortSummaryForRepository(repoId: string, force = false) {
  const repository = await getRepositoryForReport(repoId);
  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const hashes = inputHashes("summary", context, repository);

  if (!force) {
    const cached = await getCachedOpenAiOutputByHashes("summary", repoId, hashes.lookup, config.openAiModel);
    if (cached) {
      await prisma.repository.update({
        where: { id: repoId },
        data: { shortSummaryPl: cached.content, lastAnalyzedAt: new Date() }
      });
      return cached.content;
    }
  }

  await ensureOpenAiBudget();
  const content = await generateOpenAiText(
    buildSummaryPrompt(),
    applyOpenAiActionBudget(context, "summary"),
    getOpenAiActionOptions("summary")
  );
  await saveOpenAiOutput("summary", repoId, hashes.current, config.openAiModel, content);
  await prisma.repository.update({
    where: { id: repoId },
    data: {
      shortSummaryPl: content,
      lastAnalyzedAt: new Date()
    }
  });

  return content;
}

export async function generateFullReportForRepository(repoId: string, force = false) {
  const repository = await getRepositoryForReport(repoId);
  const existing = repository.reports[0];

  if (existing && !force) {
    return existing;
  }

  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const hashes = inputHashes("repo-report", context, repository);

  if (!force) {
    const cached = await getCachedOpenAiOutputByHashes("repo-report", repoId, hashes.lookup, config.openAiModel);
    if (cached) {
      const { writeMarkdownReport } = await import("@/lib/reports/writer");
      const markdownPath = await writeMarkdownReport(repoReportPath(repository.owner, repository.name), cached.content);
      const report = await prisma.report.create({
        data: {
          type: "repo",
          repoId,
          title: `Raport repo: ${repository.fullName}`,
          markdownPath,
          contentMarkdown: cached.content,
          summary: repository.shortSummaryPl,
          repoCount: 1,
          topRepoIdsJson: JSON.stringify([repoId]),
          inputHash: hashes.current
        }
      });
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: "ANALYZED", lastAnalyzedAt: new Date() }
      });
      return report;
    }
  }

  await ensureOpenAiBudget(getRequiredOpenAiCallsForAction("repo-report"));
  const research = await getMarketResearchForRepository(buildResearchContext("repo-report", repository, context, "full"));
  const reportContext = applyOpenAiActionBudget(
    [context, "Market research:", formatMarketResearchForPrompt(research)].join("\n\n"),
    "repo-report"
  );
  await ensureOpenAiBudget();

  const content = await generateOpenAiText(buildRepoReportPrompt(), reportContext, getOpenAiActionOptions("repo-report"));
  await saveOpenAiOutput("repo-report", repoId, hashes.current, config.openAiModel, content);
  const { writeMarkdownReport } = await import("@/lib/reports/writer");
  const markdownPath = await writeMarkdownReport(repoReportPath(repository.owner, repository.name), content);

  const report = await prisma.report.create({
    data: {
      type: "repo",
      repoId,
      title: `Raport repo: ${repository.fullName}`,
      markdownPath,
      contentMarkdown: content,
      summary: repository.shortSummaryPl,
      repoCount: 1,
      topRepoIdsJson: JSON.stringify([repoId]),
      inputHash: hashes.current
    }
  });
  await attachResearchRunsToReport(research.runIds ?? (research.runId ? [research.runId] : []), report.id);

  await prisma.repository.update({
    where: { id: repoId },
    data: {
      status: "ANALYZED",
      lastAnalyzedAt: new Date()
    }
  });

  return report;
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return "{}";
}

function mergeEvidenceIds(existingJson: string | null | undefined, nextIds: string[] | undefined) {
  const existing = parseStoredStringArray(existingJson);
  const next = sanitizeStoredStringArray(nextIds ?? []);
  return [...new Set([...existing, ...next])];
}

async function findActiveIdeaForRepository(repoId: string) {
  return prisma.idea.findFirst({
    where: {
      sourceRepoId: repoId,
      status: { in: ACTIVE_IDEA_STATUSES }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function generateIdeaForRepository(repoId: string, force = false) {
  if (!force) {
    const existing = await findActiveIdeaForRepository(repoId);
    if (existing && existing.status !== IDEA_STATUS.CANDIDATE) {
      return existing;
    }
    if (existing?.status === IDEA_STATUS.CANDIDATE) {
      return promoteCandidateToFullIdea(existing.id);
    }
  }

  const repository = await getRepositoryForReport(repoId);
  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const hashes = inputHashes("idea", context, repository);
  const ideaCacheKind = "idea:v2";
  const cached = await getCachedOpenAiOutputByHashes(ideaCacheKind, repoId, hashes.lookup, config.openAiModel);
  const research = cached
    ? null
    : await (async () => {
        await ensureOpenAiBudget(getRequiredOpenAiCallsForAction("idea"));
        return getMarketResearchForRepository(buildResearchContext("idea", repository, context, "full"));
      })();
  const ideaContext = applyOpenAiActionBudget(
    research ? [context, "Market research:", formatMarketResearchForPrompt(research)].join("\n\n") : context,
    "idea"
  );
  if (!cached) {
    await ensureOpenAiBudget();
  }
  const content = cached?.content ?? (await generateOpenAiText(buildIdeaPrompt("full"), ideaContext, getOpenAiActionOptions("idea")));

  if (!cached) {
    await saveOpenAiOutput(ideaCacheKind, repoId, hashes.current, config.openAiModel, content);
  }

  const parsed = safeJsonParse<{
    title?: string;
    problem?: string;
    proposedSolution?: string;
    targetUser?: string;
    mvpScope?: string;
    monetizationPotential?: string;
    difficulty?: number;
    usefulnessScore?: number;
    riskScore?: number;
    confidenceScore?: number;
    opportunityScore?: number;
    applicationSummary?: string;
    businessRationale?: string;
    marketSummary?: string;
    suggestedStack?: string;
    firstSteps?: string[];
  }>(extractJsonObject(content), {});
  const opportunity = research
    ? calculateOpportunityScoreWithBreakdown({
        trendScore: repository.trendScore,
        relevanceScore: repository.relevanceScore,
        starsCurrent: repository.starsCurrent,
        research
      })
    : null;

  const idea = await prisma.idea.create({
    data: {
      sourceRepoId: repoId,
      title: parsed.title ?? `Pomysł na bazie ${repository.fullName}`,
      problem: parsed.problem ?? "Do uzupełnienia po ręcznej analizie.",
      proposedSolution: parsed.proposedSolution ?? content,
      targetUser: parsed.targetUser ?? "Programiści i builderzy AI.",
      mvpScope: parsed.mvpScope ?? "Małe narzędzie lokalne lub webowe do zbudowania w 1-2 tygodnie.",
      monetizationPotential: parsed.monetizationPotential ?? "Niski do średniego; wymaga walidacji.",
      difficulty: parsed.difficulty ?? 3,
      usefulnessScore: parsed.usefulnessScore ?? 3,
      riskScore: parsed.riskScore ?? 3,
      suggestedStack: parsed.suggestedStack ?? "Next.js, SQLite, OpenAI API",
      marketSummary: (parsed.marketSummary ?? research?.summary) || null,
      evidenceIdsJson: JSON.stringify(sanitizeStoredStringArray(research?.sourceIds ?? [])),
      confidenceScore: parsed.confidenceScore ?? research?.confidenceScore ?? null,
      opportunityScore:
        opportunity?.score ??
        (parsed.opportunityScore === undefined ? null : Math.round(clamp(Number(parsed.opportunityScore), 0, 100))),
      opportunityBreakdownJson: JSON.stringify(opportunity?.breakdown ?? {}),
      applicationSummary: parsed.applicationSummary ?? null,
      businessRationale: parsed.businessRationale ?? null,
      researchMode: "full",
      status: IDEA_STATUS.FULL,
      lastResearchAt: research ? new Date() : null,
      firstStepsJson: JSON.stringify(parsed.firstSteps ?? ["Zdefiniuj użytkownika", "Opisz problem", "Zrób landing/demo", "Zbuduj MVP", "Zbierz feedback"])
    }
  });
  await attachResearchRunsToIdea(research?.runIds ?? (research?.runId ? [research.runId] : []), idea.id);

  await prisma.repository.update({
    where: { id: repoId },
    data: { status: "IDEA" }
  });

  return idea;
}

function scoreToFive(score: number) {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

export async function generateOpportunityCandidateForRepository(repoId: string, force = false) {
  const repository = await getRepositoryForReport(repoId);
  const activeExisting = await findActiveIdeaForRepository(repoId);
  if (activeExisting && !force) {
    return {
      created: false,
      existing: true,
      ideaId: activeExisting.id,
      opportunityScore: activeExisting.opportunityScore,
      confidenceScore: activeExisting.confidenceScore,
      sourceCount: parseStoredStringArray(activeExisting.evidenceIdsJson).length,
      reason: "Aktywny kandydat albo pomysl juz istnieje dla tego repo."
    };
  }

  const latestExisting = await prisma.idea.findFirst({
    where: {
      sourceRepoId: repoId
    },
    orderBy: { createdAt: "desc" }
  });
  if (latestExisting?.status === IDEA_STATUS.DISMISSED && !force) {
    return {
      created: false,
      existing: true,
      ideaId: latestExisting.id,
      opportunityScore: latestExisting.opportunityScore,
      confidenceScore: latestExisting.confidenceScore,
      sourceCount: parseStoredStringArray(latestExisting.evidenceIdsJson).length,
      reason: "Kandydat zostal odrzucony. Uzyj force=true, zeby odswiezyc research."
    };
  }
  const existing = force && activeExisting && isActiveIdeaStatus(activeExisting.status) ? activeExisting : latestExisting;

  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const research = await getMarketResearchForRepository(
    buildResearchContext("opportunity-candidate", repository, context, "light")
  );
  const opportunity = calculateOpportunityScoreWithBreakdown({
    trendScore: repository.trendScore,
    relevanceScore: repository.relevanceScore,
    starsCurrent: repository.starsCurrent,
    research
  });
  const opportunityScore = opportunity.score;

  if (opportunityScore < config.opportunityCandidateMinScore || research.sources.length < 2) {
    return {
      created: false,
      opportunityScore,
      confidenceScore: research.confidenceScore,
      sourceCount: research.sources.length,
      reason: `Kandydat nie przeszedl progu jakosci (${opportunityScore}/${config.opportunityCandidateMinScore}).`
    };
  }

  const fallback = buildOpportunityFallback({ fullName: repository.fullName, research });
  const firstSteps = [
    "Sprawdz 3 rozmowy/dyskusje ze zrodel evidence.",
    "Opisz bol uzytkownika w jednym zdaniu.",
    "Zrob landing lub mock flow.",
    "Zweryfikuj gotowosc do platnosci z 5 osobami.",
    "Dopiero potem rozwin pelny pomysl."
  ];
  const data = {
    sourceRepoId: repoId,
    title: fallback.title,
    problem: research.userProblems[0] ?? research.summary ?? "Problem wymaga recznej walidacji.",
    proposedSolution: `Zweryfikuj wykorzystanie ${repository.fullName} jako elementu rozwiazania problemu: ${fallback.applicationSummary}`,
    targetUser: "Zespoly B2B/devtools/SaaS/IT albo developerzy oszczedzajacy czas w workflow.",
    mvpScope: "Kandydat light: najpierw walidacja problemu i prosty prototyp, bez pelnego scope produktu.",
    monetizationPotential: "Do walidacji; szukaj oszczednosci czasu, kosztow albo ryzyka operacyjnego.",
    difficulty: 3,
    usefulnessScore: scoreToFive(opportunityScore),
    riskScore: research.confidenceScore && research.confidenceScore >= 4 ? 2 : 3,
    suggestedStack: "Next.js, SQLite/PostgreSQL, GitHub API, OpenAI web search",
    firstStepsJson: JSON.stringify(firstSteps),
    marketSummary: research.summary || null,
    evidenceIdsJson: JSON.stringify(research.sourceIds),
    confidenceScore: research.confidenceScore,
    opportunityScore,
    opportunityBreakdownJson: JSON.stringify(opportunity.breakdown),
    applicationSummary: fallback.applicationSummary,
    businessRationale: fallback.businessRationale,
    researchMode: "light",
    status: IDEA_STATUS.CANDIDATE,
    lastResearchAt: new Date()
  };

  const idea = existing && force
    ? await prisma.idea.update({
        where: { id: existing.id },
        data
      })
    : await prisma.idea.create({
        data
      });

  await attachResearchRunsToIdea(research.runIds ?? (research.runId ? [research.runId] : []), idea.id);

  return {
    created: true,
    ideaId: idea.id,
    opportunityScore,
    confidenceScore: research.confidenceScore,
    sourceCount: research.sources.length,
    reason: "Kandydat zostal zapisany w Pomysly > Kandydaci."
  };
}

export async function promoteCandidateToFullIdea(ideaId: string, force = false) {
  const candidate = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
  if (candidate.status === IDEA_STATUS.FULL && !force) {
    return candidate;
  }
  if (candidate.status === IDEA_STATUS.DISMISSED && !force) {
    throw new Error("Odrzucony kandydat wymaga przywrocenia albo force=true przed rozwinieciem do pelnego pomyslu.");
  }
  if (!isActiveIdeaStatus(candidate.status) && !force) {
    throw new Error("Ten rekord pomyslu nie jest aktywnym kandydatem do rozwiniecia.");
  }

  const existingFull = await prisma.idea.findFirst({
    where: {
      sourceRepoId: candidate.sourceRepoId,
      status: IDEA_STATUS.FULL,
      id: { not: candidate.id }
    },
    orderBy: { createdAt: "desc" }
  });
  if (existingFull && !force) {
    return existingFull;
  }

  const repository = await getRepositoryForReport(candidate.sourceRepoId);
  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const promoteContext = [
    context,
    candidate.id,
    candidate.evidenceIdsJson,
    candidate.lastResearchAt?.toISOString() ?? ""
  ].join("\n");
  const hashes = inputHashes(
    "idea-promote",
    promoteContext,
    repository
  );
  const cached = await getCachedOpenAiOutputByHashes("idea-promote", candidate.sourceRepoId, hashes.lookup, config.openAiModel);
  const research = cached
    ? null
    : await (async () => {
        await ensureOpenAiBudget(getRequiredOpenAiCallsForAction("idea-promote"));
        return getMarketResearchForRepository(buildResearchContext("idea", repository, context, "full"));
      })();
  const ideaContext = applyOpenAiActionBudget(
    [
      context,
      "Existing candidate:",
      [
        candidate.title,
        candidate.problem,
        candidate.applicationSummary,
        candidate.businessRationale,
        candidate.marketSummary
      ]
        .filter(Boolean)
        .join("\n"),
      research ? ["Market research:", formatMarketResearchForPrompt(research)].join("\n\n") : ""
    ]
      .filter(Boolean)
      .join("\n\n"),
    "idea-promote"
  );
  if (!cached) {
    await ensureOpenAiBudget();
  }
  const content = cached?.content ?? (await generateOpenAiText(buildIdeaPrompt("full"), ideaContext, getOpenAiActionOptions("idea-promote")));
  if (!cached) {
    await saveOpenAiOutput("idea-promote", candidate.sourceRepoId, hashes.current, config.openAiModel, content);
  }

  const parsed = safeJsonParse<{
    title?: string;
    problem?: string;
    proposedSolution?: string;
    targetUser?: string;
    mvpScope?: string;
    monetizationPotential?: string;
    difficulty?: number;
    usefulnessScore?: number;
    riskScore?: number;
    confidenceScore?: number;
    opportunityScore?: number;
    applicationSummary?: string;
    businessRationale?: string;
    marketSummary?: string;
    suggestedStack?: string;
    firstSteps?: string[];
  }>(extractJsonObject(content), {});
  const opportunity = research
    ? calculateOpportunityScoreWithBreakdown({
        trendScore: repository.trendScore,
        relevanceScore: repository.relevanceScore,
        starsCurrent: repository.starsCurrent,
        research
      })
    : null;
  const evidenceIds = mergeEvidenceIds(candidate.evidenceIdsJson, research?.sourceIds);

  const idea = await prisma.idea.update({
    where: { id: candidate.id },
    data: {
      title: parsed.title ?? candidate.title,
      problem: parsed.problem ?? candidate.problem,
      proposedSolution: parsed.proposedSolution ?? candidate.proposedSolution,
      targetUser: parsed.targetUser ?? candidate.targetUser,
      mvpScope: parsed.mvpScope ?? candidate.mvpScope,
      monetizationPotential: parsed.monetizationPotential ?? candidate.monetizationPotential,
      difficulty: parsed.difficulty ?? candidate.difficulty,
      usefulnessScore: parsed.usefulnessScore ?? candidate.usefulnessScore,
      riskScore: parsed.riskScore ?? candidate.riskScore,
      suggestedStack: parsed.suggestedStack ?? candidate.suggestedStack,
      firstStepsJson: JSON.stringify(sanitizeStoredStringArray(parsed.firstSteps ?? parseStoredStringArray(candidate.firstStepsJson))),
      marketSummary: (parsed.marketSummary ?? research?.summary ?? candidate.marketSummary) || null,
      evidenceIdsJson: JSON.stringify(evidenceIds),
      confidenceScore: parsed.confidenceScore ?? research?.confidenceScore ?? candidate.confidenceScore,
      opportunityScore:
        opportunity?.score ??
        (parsed.opportunityScore === undefined
          ? candidate.opportunityScore
          : Math.round(clamp(Number(parsed.opportunityScore), 0, 100))),
      opportunityBreakdownJson: JSON.stringify(
        opportunity?.breakdown ?? safeJsonParse(candidate.opportunityBreakdownJson, {})
      ),
      applicationSummary: parsed.applicationSummary ?? candidate.applicationSummary,
      businessRationale: parsed.businessRationale ?? candidate.businessRationale,
      researchMode: "full",
      status: IDEA_STATUS.FULL,
      lastResearchAt: research ? new Date() : candidate.lastResearchAt
    }
  });
  await attachResearchRunsToIdea(research?.runIds ?? (research?.runId ? [research.runId] : []), idea.id);

  await prisma.repository.update({
    where: { id: candidate.sourceRepoId },
    data: { status: "IDEA" }
  });

  return idea;
}
