import { prisma } from "@/lib/db/client";
import { getRepositoryForReport } from "@/lib/db/repositories";
import { countOpenAiAnalysesToday, getCachedOpenAiOutput, saveOpenAiOutput } from "@/lib/db/openai-cache";
import { getConfig } from "@/lib/config";
import { stableHash } from "@/lib/hash";
import { safeJsonParse } from "@/lib/utils";
import { repoReportPath, writeMarkdownReport } from "@/lib/reports/writer";
import { buildIdeaPrompt, buildRepoReportPrompt, buildRepositoryContext, buildSummaryPrompt } from "./prompts";
import { generateOpenAiText } from "./client";

function topicsFromJson(value: string) {
  return safeJsonParse<string[]>(value, []);
}

async function ensureOpenAiBudget() {
  const config = getConfig();
  const usedToday = await countOpenAiAnalysesToday();
  if (usedToday >= config.openAiDailyAnalysisLimit) {
    throw new Error(`Daily OpenAI analysis limit reached (${config.openAiDailyAnalysisLimit})`);
  }
}

function inputHash(kind: string, context: string) {
  return stableHash(`${kind}\n${context}`);
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

  await ensureOpenAiBudget();
  const content = await generateOpenAiText(buildRepoReportPrompt(), context);
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
  if (!cached) {
    await ensureOpenAiBudget();
  }
  const content = cached?.content ?? (await generateOpenAiText(buildIdeaPrompt(), context));

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
      firstStepsJson: JSON.stringify(parsed.firstSteps ?? ["Zdefiniuj użytkownika", "Opisz problem", "Zrób landing/demo", "Zbuduj MVP", "Zbierz feedback"])
    }
  });

  await prisma.repository.update({
    where: { id: repoId },
    data: { status: "IDEA" }
  });

  return idea;
}
