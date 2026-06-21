CREATE TABLE "AiJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "repoId" TEXT,
  "ideaId" TEXT,
  "reportId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "dedupeKey" TEXT,
  "resultJson" TEXT NOT NULL DEFAULT '{}',
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  CONSTRAINT "AiJob_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiJob_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AiJob_type_idx" ON "AiJob"("type");
CREATE INDEX "AiJob_status_idx" ON "AiJob"("status");
CREATE INDEX "AiJob_repoId_idx" ON "AiJob"("repoId");
CREATE INDEX "AiJob_ideaId_idx" ON "AiJob"("ideaId");
CREATE INDEX "AiJob_reportId_idx" ON "AiJob"("reportId");
CREATE INDEX "AiJob_priority_idx" ON "AiJob"("priority");
CREATE INDEX "AiJob_createdAt_idx" ON "AiJob"("createdAt");
CREATE INDEX "AiJob_dedupeKey_idx" ON "AiJob"("dedupeKey");
