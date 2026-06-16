ALTER TABLE "Idea" ADD COLUMN "marketSummary" TEXT;
ALTER TABLE "Idea" ADD COLUMN "evidenceIdsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Idea" ADD COLUMN "confidenceScore" INTEGER;

CREATE TABLE "MarketResearchRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repoId" TEXT,
  "reportId" TEXT,
  "ideaId" TEXT,
  "provider" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  CONSTRAINT "MarketResearchRun_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MarketResearchRun_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MarketResearchRun_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MarketResearchSource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "repoId" TEXT,
  "reportId" TEXT,
  "ideaId" TEXT,
  "sourceType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publisher" TEXT,
  "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" DATETIME,
  "snippet" TEXT NOT NULL,
  "sentiment" TEXT,
  "relevanceScore" INTEGER,
  CONSTRAINT "MarketResearchSource_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketResearchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MarketResearchSource_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MarketResearchSource_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MarketResearchSource_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "maskedTarget" TEXT,
  "payloadJson" TEXT,
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "MarketResearchRun_repoId_idx" ON "MarketResearchRun"("repoId");
CREATE INDEX "MarketResearchRun_reportId_idx" ON "MarketResearchRun"("reportId");
CREATE INDEX "MarketResearchRun_ideaId_idx" ON "MarketResearchRun"("ideaId");
CREATE INDEX "MarketResearchRun_provider_idx" ON "MarketResearchRun"("provider");
CREATE INDEX "MarketResearchRun_queryHash_idx" ON "MarketResearchRun"("queryHash");
CREATE INDEX "MarketResearchRun_status_idx" ON "MarketResearchRun"("status");
CREATE INDEX "MarketResearchRun_startedAt_idx" ON "MarketResearchRun"("startedAt");

CREATE INDEX "MarketResearchSource_runId_idx" ON "MarketResearchSource"("runId");
CREATE INDEX "MarketResearchSource_repoId_idx" ON "MarketResearchSource"("repoId");
CREATE INDEX "MarketResearchSource_reportId_idx" ON "MarketResearchSource"("reportId");
CREATE INDEX "MarketResearchSource_ideaId_idx" ON "MarketResearchSource"("ideaId");
CREATE INDEX "MarketResearchSource_sourceType_idx" ON "MarketResearchSource"("sourceType");
CREATE INDEX "MarketResearchSource_retrievedAt_idx" ON "MarketResearchSource"("retrievedAt");

CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");
CREATE INDEX "NotificationLog_eventType_idx" ON "NotificationLog"("eventType");
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
