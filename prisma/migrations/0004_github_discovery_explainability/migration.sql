ALTER TABLE "Repository" ADD COLUMN "initialMomentumScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Repository" ADD COLUMN "scoreBreakdownJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Repository" ADD COLUMN "discoveryProfilesJson" TEXT NOT NULL DEFAULT '[]';
