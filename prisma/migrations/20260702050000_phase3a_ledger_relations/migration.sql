-- Phase 3a: Add FK constraints on LoyaltyPointLedger.staffUserId and .loyaltyRuleId
--
-- The columns already existed since Phase 3 but were untyped strings — no FK
-- constraint, no referential integrity, and no way for Prisma to JOIN them.
-- This migration adds the FK constraints (ON DELETE SET NULL, so deleting a
-- staff user or a rule doesn't wipe the audit trail — the ledger entry is
-- preserved with a null reference, which is the correct behaviour for an
-- audit log).
--
-- The corresponding Prisma schema relations (`staffUser` and `loyaltyRule` on
-- `LoyaltyPointLedger`, plus the inverse `loyaltyLedger` on `StaffUser` and
-- `ledgerEntries` on `LoyaltyRule`) were added in the same change.

-- AddForeignKey: LoyaltyPointLedger.staffUserId -> StaffUser.id
ALTER TABLE "LoyaltyPointLedger" ADD CONSTRAINT "LoyaltyPointLedger_staffUserId_fkey"
    FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LoyaltyPointLedger.loyaltyRuleId -> LoyaltyRule.id
ALTER TABLE "LoyaltyPointLedger" ADD CONSTRAINT "LoyaltyPointLedger_loyaltyRuleId_fkey"
    FOREIGN KEY ("loyaltyRuleId") REFERENCES "LoyaltyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
