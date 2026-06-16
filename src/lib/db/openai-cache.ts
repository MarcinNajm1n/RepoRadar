import { prisma } from "./client";

export async function getCachedOpenAiOutput(kind: string, repoId: string | null, inputHash: string, model: string) {
  return prisma.openAiCache.findFirst({
    where: { kind, repoId, inputHash, model }
  });
}

export async function saveOpenAiOutput(kind: string, repoId: string | null, inputHash: string, model: string, content: string) {
  const existing = await getCachedOpenAiOutput(kind, repoId, inputHash, model);
  if (existing) {
    return prisma.openAiCache.update({
      where: { id: existing.id },
      data: { content }
    });
  }

  return prisma.openAiCache.create({
    data: { kind, repoId, inputHash, model, content }
  });
}

export async function countOpenAiAnalysesToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return prisma.openAiCache.count({
    where: {
      kind: { in: ["summary", "repo-report", "idea"] },
      createdAt: {
        gte: start
      }
    }
  });
}
