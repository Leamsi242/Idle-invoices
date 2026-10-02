-- Comptes (connexion par lien e-mail) : à exécuter une fois sur une base Turso créée avant octobre 2026.
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Account_emailHash_key" ON "Account"("emailHash");
CREATE UNIQUE INDEX "Account_sessionId_key" ON "Account"("sessionId");
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");
CREATE INDEX "LoginToken_emailHash_idx" ON "LoginToken"("emailHash");
