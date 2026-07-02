-- Phase 4 — Intelligence Layer (PRD §9 Phase 4).
-- Adds:
--   * AnalyticsEvent  — append-only event log used to compute the conversion
--                       funnel (menu views → orders started → orders completed)
--                       called out in PRD §5.18, plus any future behavioural
--                       metrics. Server Actions append rows here; the analytics
--                       dashboard reads from it.
--   * AnalyticsEventType enum — discriminator (menu_view / order_started /
--                                order_completed / recommendation_used /
--                                meal_builder_used).
--
-- Notes on privacy:
--   * No PII is stored on the event row itself. `customerId` is optional and
--     only set when the visitor is signed in; `sessionId` is an opaque hash
--     derived from the visitor's IP + user-agent so we can dedupe repeated
--     menu views from the same browser without tracking identity.
--   * Rows are tenant-scoped like every other model — a query for restaurant
--     A's analytics can never return restaurant B's events.

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('menu_view', 'order_started', 'order_completed', 'recommendation_used', 'meal_builder_used');

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT,
    "eventType" "AnalyticsEventType" NOT NULL,
    -- Optional context payload. JSON string (Postgres would use jsonb; the
    -- local SQLite dev environment stores it as TEXT and helpers in
    -- src/lib/db/serialize.ts handle parsing).
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_restaurantId_eventType_createdAt_idx" ON "AnalyticsEvent"("restaurantId", "eventType", "createdAt");
CREATE INDEX "AnalyticsEvent_restaurantId_createdAt_idx" ON "AnalyticsEvent"("restaurantId", "createdAt");
CREATE INDEX "AnalyticsEvent_customerId_idx" ON "AnalyticsEvent"("customerId");
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
