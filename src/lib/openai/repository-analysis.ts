import { prisma } from "@/lib/db/client";
import { getRepositoryForReport } from "@/lib/db/repositories";
import { countOpenAiAnalysesToday, getCachedOpenAiOutput, saveOpenAiOutput } from "@/lib/db/openai-cache";
import { getConfig } from "@/lib/config";
import { stableHash } from "@/lib/hash";
import { clamp, safeJsonParse } from "@/lib/utils";
import { repoReportPath, writeMarkdownReport } from "@/lib/reports/writer";
import {
  buildIdeaPrompt,
  buildRepoReportPrompt,
  buildRepositoryContext,
  buildSummaryPrompt,
  formatMarketResearchForPrompt
} from "./prompts";
import { generateOpenAiText } from "./client";
import {
  attachResearchRunsToIdea,
  attachResearchRunsToReport,
  getMarketResearchForRepository
} from "@/lib/market-research/service";
import { buildOpportunityFallback, calculateOpportunityScore } from "@/lib/market-research/opportunity";
import type { MarketResearchMode } from "@/lib/market-research/types";

function topicsFromJson(value: string) {
  return safeJsonParse<string[]>(value, []);
}

async function ensureOpenAiBudget(requiredCalls = 1) {
  const config = getConfig();
  const usedToday = await countOpenAiAnalysesToday();
  if (usedToday + requiredCalls > config.openAiDailyAnalysisLimit) {
    throw new Error(`Daily OpenAI analysis limit reached (${config.openAiDailyAnalysisLimit})`);
  }
}

function inputHash(kind: string, context: string) {
  return stableHash(`${kind}\n${context}`);
}

function requiredOpenAiCallsForOnDemandGeneration() {
  const config = getConfig();
  if (!config.marketResearchEnabled || config.marketResearchProvider === "none" || config.marketResearchProvider === "reddit") {
    return 1;
  }

  return 2;
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
  const hash = inputHash("summary", context);

  if (!force) {
    const cached = await getCachedOpenAiOutput("summary", repoId, hash, config.openAiModel);
    if (cached) {
      await prisma.repository.update({
        where: { id: repoId },
        data: { shortSummaryPl: cached.content, lastAnalyzedAt: new Date() }
      });
      return cached.content;
    }
  }

  await ensureOpenAiBudget();
  const content = await generateOpenAiText(buildSummaryPrompt(), context);
  await saveOpenAiOutput("summary", repoId, hash, config.openAiModel, content);
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
  const hash = inputHash("repo-report", context);

  if (!force) {
    const cached = await getCachedOpenAiOutput("repo-report", repoId, hash, config.openAiModel);
    if (cached) {
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
          inputHash: hash
        }
      });
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: "ANALYZED", lastAnalyzedAt: new Date() }
      });
      return report;
    }
  }

  await ensureOpenAiBudget(requiredOpenAiCallsForOnDemandGeneration());
  const research = await getMarketResearchForRepository(buildResearchContext("repo-report", repository, context, "full"));
  const reportContext = [context, "Market research:", formatMarketResearchForPrompt(research)].join("\n\n");
  await ensureOpenAiBudget();

  const content = await generateOpenAiText(buildRepoReportPrompt(), reportContext);
  await saveOpenAiOutput("repo-report", repoId, hash, config.openAiModel, content);
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
      inputHash: hash
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

export async function generateIdeaForRepository(repoId: string) {
  const repository = await getRepositoryForReport(repoId);
  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const hash = inputHash("idea", context);
  const cached = await getCachedOpenAiOutput("idea", repoId, hash, config.openAiModel);
  const research = cached
    ? null
    : await (async () => {
        await ensureOpenAiBudget(requiredOpenAiCallsForOnDemandGeneration());
        return getMarketResearchForRepository(buildResearchContext("idea", repository, context, "full"));
      })();
  const ideaContext = research
    ? [context, "Market research:", formatMarketResearchForPrompt(research)].join("\n\n")
    : context;
  if (!cached) {
    await ensureOpenAiBudget();
  }
  const content = cached?.content ?? (await generateOpenAiText(buildIdeaPrompt("full"), ideaContext));

  if (!cached) {
    await saveOpenAiOutput("idea", repoId, hash, config.openAiModel, content);
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
      evidenceIdsJson: JSON.stringify(research?.sourceIds ?? []),
      confidenceScore: parsed.confidenceScore ?? research?.confidenceScore ?? null,
      opportunityScore:
        parsed.opportunityScore === undefined ? null : Math.round(clamp(Number(parsed.opportunityScore), 0, 100)),
      applicationSummary: parsed.applicationSummary ?? null,
      businessRationale: parsed.businessRationale ?? null,
      researchMode: "full",
      status: "FULL",
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

export async function generateOpportunityCandidateForRepository(repoId: string) {
  const repository = await getRepositoryForReport(repoId);
  const config = getConfig();
  const context = buildRepositoryContext({
    ...repository,
    topics: topicsFromJson(repository.topicsJson),
    snapshots: repository.snapshots
  });
  const research = await getMarketResearchForRepository(
    buildResearchContext("opportunity-candidate", repository, context, "light")
  );
  const opportunityScore = calculateOpportunityScore({
    trendScore: repository.trendScore,
    relevanceScore: repository.relevanceScore,
    starsCurrent: repository.starsCurrent,
    research
  });

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
  const existing = await prisma.idea.findFirst({
    where: {
      sourceRepoId: repoId,
      status: "CANDIDATE",
      researchMode: "light"
    },
    orderBy: { createdAt: "desc" }
  });
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
    applicationSummary: fallback.applicationSummary,
    businessRationale: fallback.businessRationale,
    researchMode: "light",
    status: "CANDIDATE"
  };

  const idea = existing
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
