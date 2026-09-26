-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "rawLabel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "merchant" TEXT,
    "plan" TEXT,
    "frequency" TEXT,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "isCancellation" BOOLEAN NOT NULL DEFAULT false,
    "nextChargeDate" DATETIME,
    "nextChargeAmount" REAL,
    CONSTRAINT "Transaction_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "category" TEXT,
    "frequency" TEXT NOT NULL,
    "averageAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "yearlyCost" REAL NOT NULL,
    "firstSeen" DATETIME NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "usage" TEXT,
    "labelKey" TEXT NOT NULL,
    "details" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "intermediaryTransactionId" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    CONSTRAINT "Match_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_intermediaryTransactionId_fkey" FOREIGN KEY ("intermediaryTransactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Descriptor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "category" TEXT,
    "cancellationUrl" TEXT
);

-- CreateTable
CREATE TABLE "TrackedTrial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "priceAfter" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Profile" (
    "sessionId" TEXT NOT NULL PRIMARY KEY,
    "answers" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BankLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "alertEmail" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "validUntil" DATETIME NOT NULL,
    "lastReadAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" DATETIME
);

-- CreateIndex
CREATE INDEX "Upload_sessionId_idx" ON "Upload"("sessionId");

-- CreateIndex
CREATE INDEX "Transaction_sessionId_idx" ON "Transaction"("sessionId");

-- CreateIndex
CREATE INDEX "Subscription_sessionId_idx" ON "Subscription"("sessionId");

-- CreateIndex
CREATE INDEX "Match_sessionId_idx" ON "Match"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Descriptor_sessionId_pattern_key" ON "Descriptor"("sessionId", "pattern");

-- CreateIndex
CREATE INDEX "TrackedTrial_sessionId_idx" ON "TrackedTrial"("sessionId");

-- CreateIndex
CREATE INDEX "BankLink_sessionId_idx" ON "BankLink"("sessionId");

-- CreateIndex
CREATE INDEX "Alert_sessionId_idx" ON "Alert"("sessionId");

