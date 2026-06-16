CREATE TABLE "ActionItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "repoId" TEXT,
  "ideaId" TEXT,
  "reportId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "dueAt" DATETIME,
  "snoozedUntil" DATETIME,
  "completedAt" DATETIME,
  "dismissedAt" DATETIME,
  "dedupeKey" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ActionItem_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ActionItem_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ActionItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ActionItem_dedupeKey_key" ON "ActionItem"("dedupeKey");
CREATE INDEX "ActionItem_type_idx" ON "ActionItem"("type");
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");
CREATE INDEX "ActionItem_priority_idx" ON "ActionItem"("priority");
CREATE INDEX "ActionItem_dueAt_idx" ON "ActionItem"("dueAt");
CREATE INDEX "ActionItem_snoozedUntil_idx" ON "ActionItem"("snoozedUntil");
CREATE INDEX "ActionItem_repoId_idx" ON "ActionItem"("repoId");
CREATE INDEX "ActionItem_ideaId_idx" ON "ActionItem"("ideaId");
CREATE INDEX "ActionItem_reportId_idx" ON "ActionItem"("reportId");
CREATE INDEX "ActionItem_createdAt_idx" ON "ActionItem"("createdAt");
