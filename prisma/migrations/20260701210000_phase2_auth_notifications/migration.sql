-- Phase 2 — NextAuth v5 verification tokens + FCM notification token store
-- + customer passwordHash column for the Credentials provider.
-- Adds the schema changes required by Phase 2 features:
--   * VerificationToken      — required by NextAuth v5 Prisma adapter for email
--                              verification / magic link flows.
--   * NotificationToken      — persists FCM / web-push tokens so order & reservation
--                              events can actually push to customers (Phase 1 only
--                              logged the token to the console).
--   * Customer.passwordHash  — bcrypt hash for the Credentials provider. Guest
--                              checkout still works without one.

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateTable
CREATE TABLE "NotificationToken" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationToken_restaurantId_token_key" ON "NotificationToken"("restaurantId", "token");
CREATE INDEX "NotificationToken_restaurantId_idx" ON "NotificationToken"("restaurantId");
CREATE INDEX "NotificationToken_customerId_idx" ON "NotificationToken"("customerId");

-- AddForeignKey
ALTER TABLE "NotificationToken" ADD CONSTRAINT "NotificationToken_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationToken" ADD CONSTRAINT "NotificationToken_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn: Customer.passwordHash
ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT;

