ALTER TABLE "Idea" ADD COLUMN "opportunityScore" INTEGER;
ALTER TABLE "Idea" ADD COLUMN "applicationSummary" TEXT;
ALTER TABLE "Idea" ADD COLUMN "businessRationale" TEXT;
ALTER TABLE "Idea" ADD COLUMN "researchMode" TEXT NOT NULL DEFAULT 'full';

ALTER TABLE "MarketResearchRun" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'full';

CREATE INDEX "Idea_researchMode_idx" ON "Idea"("researchMode");
CREATE INDEX "MarketResearchRun_mode_idx" ON "MarketResearchRun"("mode");
