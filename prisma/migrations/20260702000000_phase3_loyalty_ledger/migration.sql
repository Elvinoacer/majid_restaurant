-- Phase 3 — Operations Layer (PRD §9 Phase 3).
-- Adds:
--   * Restaurant.loyaltySpendPerPoint  — owner-configurable accrual ratio
--                                        (1 point per N currency units spent,
--                                        default 100 → 1 pt per KSh 100).
--   * LoyaltyPointLedger                — audit trail for every loyalty point
--                                         mutation (accrual / redemption /
--                                         adjustment / expiry). The cached
--                                         balance lives on
--                                         Customer.loyaltyPoints; this table
--                                         is the source of truth and can be
--                                         replayed to rebuild the balance.
--   * LoyaltyLedgerEntryType enum       — discriminator on the ledger.
--
-- The rest of Phase 3 (EventBooking, JobPosting, JobApplication,
-- RestaurantTable.qrCodeUrl) was already in the schema from Phase 0/1 —
-- Phase 3 wires the UIs and actions around them.

-- AddColumn: Restaurant.loyaltySpendPerPoint
ALTER TABLE "Restaurant" ADD COLUMN "loyaltySpendPerPoint" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- CreateEnum
CREATE TYPE "LoyaltyLedgerEntryType" AS ENUM ('ACCRUAL', 'REDEMPTION', 'ADJUSTMENT', 'EXPIRY');

-- CreateTable
CREATE TABLE "LoyaltyPointLedger" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "entryType" "LoyaltyLedgerEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "loyaltyRuleId" TEXT,
    "description" TEXT NOT NULL,
    "staffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyPointLedger_restaurantId_customerId_idx" ON "LoyaltyPointLedger"("restaurantId", "customerId");
CREATE INDEX "LoyaltyPointLedger_restaurantId_createdAt_idx" ON "LoyaltyPointLedger"("restaurantId", "createdAt");
CREATE INDEX "LoyaltyPointLedger_orderId_idx" ON "LoyaltyPointLedger"("orderId");

-- AddForeignKey
ALTER TABLE "LoyaltyPointLedger" ADD CONSTRAINT "LoyaltyPointLedger_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyPointLedger" ADD CONSTRAINT "LoyaltyPointLedger_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
