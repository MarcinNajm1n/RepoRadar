ALTER TABLE "Repository" ADD COLUMN "growth24h" INTEGER;
ALTER TABLE "Repository" ADD COLUMN "growth7d" INTEGER;
ALTER TABLE "Repository" ADD COLUMN "growthPercent7d" REAL;

-- Backfill from the latest snapshot per repository so growth-based sorting works
-- immediately for existing local databases. Repositories without snapshots remain
-- NULL and will be populated by the next scan.
UPDATE "Repository"
SET
  "growth24h" = (
    SELECT "growth24h"
    FROM "RepoSnapshot"
    WHERE "RepoSnapshot"."repoId" = "Repository"."id"
    ORDER BY "capturedAt" DESC, "id" DESC
    LIMIT 1
  ),
  "growth7d" = (
    SELECT "growth7d"
    FROM "RepoSnapshot"
    WHERE "RepoSnapshot"."repoId" = "Repository"."id"
    ORDER BY "capturedAt" DESC, "id" DESC
    LIMIT 1
  ),
  "growthPercent7d" = (
    SELECT "growthPercent7d"
    FROM "RepoSnapshot"
    WHERE "RepoSnapshot"."repoId" = "Repository"."id"
    ORDER BY "capturedAt" DESC, "id" DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM "RepoSnapshot"
  WHERE "RepoSnapshot"."repoId" = "Repository"."id"
);

CREATE INDEX "Repository_isDeletedFromView_growth7d_trendScore_idx" ON "Repository"("isDeletedFromView", "growth7d", "trendScore");
