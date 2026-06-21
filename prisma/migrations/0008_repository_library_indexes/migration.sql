CREATE INDEX "Repository_firstSeenAt_idx" ON "Repository"("firstSeenAt");
CREATE INDEX "Repository_isDeletedFromView_trendScore_idx" ON "Repository"("isDeletedFromView", "trendScore");
CREATE INDEX "Repository_isDeletedFromView_status_trendScore_idx" ON "Repository"("isDeletedFromView", "status", "trendScore");
CREATE INDEX "Repository_isDeletedFromView_primaryLanguage_trendScore_idx" ON "Repository"("isDeletedFromView", "primaryLanguage", "trendScore");
CREATE INDEX "Repository_isOldRepo_isDeletedFromView_trendScore_idx" ON "Repository"("isOldRepo", "isDeletedFromView", "trendScore");
