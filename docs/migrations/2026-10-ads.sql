-- Régie publicitaire : à exécuter une fois sur une base Turso créée avant octobre 2026 (après 2026-10-billing.sql).
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advertiser" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "categories" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaKind" TEXT,
    "posterUrl" TEXT,
    "pricing" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "budget" REAL NOT NULL,
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "postbackSecret" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AdStat" (
    "campaignId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("campaignId", "day")
);
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" DATETIME
);
CREATE INDEX "AdClick_campaignId_idx" ON "AdClick"("campaignId");
