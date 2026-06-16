ALTER TABLE "MarketResearchRun" ADD COLUMN "queriesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "MarketResearchRun" ADD COLUMN "providersJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "MarketResearchSource" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "MarketResearchSource" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "MarketResearchSource" ADD COLUMN "evidenceKind" TEXT;
ALTER TABLE "MarketResearchSource" ADD COLUMN "whatItProves" TEXT;
ALTER TABLE "MarketResearchSource" ADD COLUMN "sourceConfidence" INTEGER;
ALTER TABLE "MarketResearchSource" ADD COLUMN "sourceRank" INTEGER;

CREATE TABLE "ExternalResearchCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "mode" TEXT,
  "query" TEXT,
  "contentJson" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ExternalResearchCache_provider_cacheKey_key" ON "ExternalResearchCache"("provider", "cacheKey");
CREATE INDEX "ExternalResearchCache_provider_idx" ON "ExternalResearchCache"("provider");
CREATE INDEX "ExternalResearchCache_expiresAt_idx" ON "ExternalResearchCache"("expiresAt");
CREATE INDEX "ExternalResearchCache_createdAt_idx" ON "ExternalResearchCache"("createdAt");

CREATE INDEX "MarketResearchSource_sourceKey_idx" ON "MarketResearchSource"("sourceKey");
CREATE INDEX "MarketResearchSource_canonicalUrl_idx" ON "MarketResearchSource"("canonicalUrl");
CREATE INDEX "MarketResearchSource_evidenceKind_idx" ON "MarketResearchSource"("evidenceKind");
CREATE INDEX "MarketResearchSource_sourceConfidence_idx" ON "MarketResearchSource"("sourceConfidence");
