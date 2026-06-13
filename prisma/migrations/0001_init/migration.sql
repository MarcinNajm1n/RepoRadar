CREATE TABLE "Repository" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "githubId" INTEGER NOT NULL,
  "fullName" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "readmeHash" TEXT,
  "readmeExcerpt" TEXT,
  "primaryLanguage" TEXT,
  "topicsJson" TEXT NOT NULL DEFAULT '[]',
  "license" TEXT,
  "createdAt" DATETIME NOT NULL,
  "pushedAt" DATETIME,
  "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "starsCurrent" INTEGER NOT NULL DEFAULT 0,
  "forksCurrent" INTEGER NOT NULL DEFAULT 0,
  "watchersCurrent" INTEGER NOT NULL DEFAULT 0,
  "openIssues" INTEGER NOT NULL DEFAULT 0,
  "ageMonths" INTEGER NOT NULL DEFAULT 0,
  "isOldRepo" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isFork" BOOLEAN NOT NULL DEFAULT false,
  "isDeletedFromView" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "shortSummaryPl" TEXT,
  "lastAnalyzedAt" DATETIME,
  "trendScore" INTEGER NOT NULL DEFAULT 0,
  "relevanceScore" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'github',
  "createdDbAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedDbAt" DATETIME NOT NULL
);

CREATE TABLE "RepoSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repoId" TEXT NOT NULL,
  "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stars" INTEGER NOT NULL,
  "forks" INTEGER NOT NULL,
  "watchers" INTEGER NOT NULL,
  "openIssues" INTEGER NOT NULL,
  "pushedAt" DATETIME,
  "growth24h" INTEGER,
  "growth7d" INTEGER,
  "growthPercent7d" REAL,
  CONSTRAINT "RepoSnapshot_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "repoId" TEXT,
  "title" TEXT NOT NULL,
  "markdownPath" TEXT,
  "contentMarkdown" TEXT NOT NULL,
  "summary" TEXT,
  "repoCount" INTEGER NOT NULL DEFAULT 0,
  "topRepoIdsJson" TEXT NOT NULL DEFAULT '[]',
  "inputHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Idea" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceRepoId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "proposedSolution" TEXT NOT NULL,
  "targetUser" TEXT NOT NULL,
  "mvpScope" TEXT NOT NULL,
  "monetizationPotential" TEXT NOT NULL,
  "difficulty" INTEGER NOT NULL,
  "usefulnessScore" INTEGER NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "suggestedStack" TEXT NOT NULL,
  "firstStepsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Idea_sourceRepoId_fkey" FOREIGN KEY ("sourceRepoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "IgnoredRepository" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repoId" TEXT,
  "fullName" TEXT NOT NULL,
  "reason" TEXT,
  "ignoredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "permanent" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "IgnoredRepository_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ScanRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "reposFound" INTEGER NOT NULL DEFAULT 0,
  "reposUpdated" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT
);

CREATE TABLE "OpenAiCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "repoId" TEXT,
  "inputHash" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpenAiCache_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");
CREATE INDEX "Repository_status_idx" ON "Repository"("status");
CREATE INDEX "Repository_trendScore_idx" ON "Repository"("trendScore");
CREATE INDEX "Repository_starsCurrent_idx" ON "Repository"("starsCurrent");
CREATE INDEX "Repository_pushedAt_idx" ON "Repository"("pushedAt");
CREATE INDEX "Repository_createdAt_idx" ON "Repository"("createdAt");
CREATE INDEX "Repository_isOldRepo_idx" ON "Repository"("isOldRepo");
CREATE INDEX "Repository_source_idx" ON "Repository"("source");
CREATE INDEX "RepoSnapshot_repoId_capturedAt_idx" ON "RepoSnapshot"("repoId", "capturedAt");
CREATE INDEX "Report_type_idx" ON "Report"("type");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_repoId_idx" ON "Report"("repoId");
CREATE INDEX "Idea_sourceRepoId_idx" ON "Idea"("sourceRepoId");
CREATE INDEX "Idea_status_idx" ON "Idea"("status");
CREATE UNIQUE INDEX "IgnoredRepository_repoId_key" ON "IgnoredRepository"("repoId");
CREATE UNIQUE INDEX "IgnoredRepository_fullName_key" ON "IgnoredRepository"("fullName");
CREATE UNIQUE INDEX "OpenAiCache_kind_repoId_inputHash_model_key" ON "OpenAiCache"("kind", "repoId", "inputHash", "model");
CREATE INDEX "OpenAiCache_kind_idx" ON "OpenAiCache"("kind");
CREATE INDEX "OpenAiCache_createdAt_idx" ON "OpenAiCache"("createdAt");
CREATE INDEX "ScanRun_startedAt_idx" ON "ScanRun"("startedAt");
CREATE INDEX "ScanRun_status_idx" ON "ScanRun"("status");
