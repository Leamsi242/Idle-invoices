-- Paiements Premium (Stripe) : à exécuter une fois, après 2026-10-accounts.sql, sur une base Turso créée avant octobre 2026.
ALTER TABLE "Account" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Account" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Account" ADD COLUMN "premiumUntil" DATETIME;
ALTER TABLE "Account" ADD COLUMN "billingEventAt" INTEGER;
CREATE UNIQUE INDEX "Account_stripeCustomerId_key" ON "Account"("stripeCustomerId");
