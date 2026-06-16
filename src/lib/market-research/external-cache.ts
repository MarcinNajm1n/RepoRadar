import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { stableHash } from "@/lib/hash";
import { safeJsonParse, sanitizeExternalText } from "@/lib/utils";
import type { MarketResearchContext } from "./types";

export function buildExternalResearchCacheKey(provider: string, context: MarketResearchContext, query: string) {
  return stableHash(
    [
      provider,
      context.mode ?? getConfig().marketResearchMode,
      context.fullName,
      context.readmeHash ?? "",
      sanitizeExternalText(query, 240) ?? ""
    ].join("\n")
  );
}

export async function getExternalResearchCache<T = unknown>(provider: string, cacheKey: string) {
  const row = await prisma.externalResearchCache.findUnique({
    where: {
      provider_cacheKey: {
        provider,
        cacheKey
      }
    }
  });

  if (!row || row.expiresAt <= new Date()) {
    return null;
  }

  return safeJsonParse<T | null>(row.contentJson, null);
}

export async function setExternalResearchCache(
  provider: string,
  cacheKey: string,
  content: unknown,
  options: { mode?: string; query?: string; ttlHours?: number } = {}
) {
  const contentJson = JSON.stringify(content);
  if (!contentJson || contentJson === "null" || contentJson === "[]" || contentJson === "{}") {
    return null;
  }

  const ttlHours = options.ttlHours ?? getConfig().externalResearchCacheTtlHours;
  const expiresAt = new Date(Date.now() + Math.max(1, ttlHours) * 60 * 60 * 1000);
  return prisma.externalResearchCache.upsert({
    where: {
      provider_cacheKey: {
        provider,
        cacheKey
      }
    },
    update: {
      mode: sanitizeExternalText(options.mode, 40),
      query: sanitizeExternalText(options.query, 240),
      contentJson,
      expiresAt
    },
    create: {
      provider,
      cacheKey,
      mode: sanitizeExternalText(options.mode, 40),
      query: sanitizeExternalText(options.query, 240),
      contentJson,
      expiresAt
    }
  });
}

export async function deleteExpiredExternalResearchCache() {
  return prisma.externalResearchCache.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
}
