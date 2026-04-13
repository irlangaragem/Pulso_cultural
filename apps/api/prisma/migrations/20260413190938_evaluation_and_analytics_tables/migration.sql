-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "sentiment" DOUBLE PRECISION,
    "experienceScore" DOUBLE PRECISION,
    "shareChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "exhibitionId" TEXT,
    "museumSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evaluation_exhibitionId_rating_idx" ON "Evaluation"("exhibitionId", "rating");

-- CreateIndex
CREATE INDEX "Evaluation_exhibitionId_createdAt_idx" ON "Evaluation"("exhibitionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_visitorId_exhibitionId_key" ON "Evaluation"("visitorId", "exhibitionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_exhibitionId_event_idx" ON "AnalyticsEvent"("exhibitionId", "event");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_museumSlug_createdAt_idx" ON "AnalyticsEvent"("museumSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
