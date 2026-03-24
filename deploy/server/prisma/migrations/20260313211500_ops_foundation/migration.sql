CREATE TABLE IF NOT EXISTS "ActivityAuditLog" (
  "id" TEXT NOT NULL,
  "requestId" TEXT,
  "userId" TEXT,
  "username" TEXT,
  "role" TEXT,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "statusCode" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "username" TEXT,
  "role" TEXT,
  "module" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "entityType" TEXT,
  "entityId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UNREAD',
  "dedupeKey" TEXT,
  "metadata" JSONB,
  "scheduledFor" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "ActivityAuditLog_module_createdAt_idx" ON "ActivityAuditLog"("module", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityAuditLog_userId_createdAt_idx" ON "ActivityAuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_module_type_createdAt_idx" ON "Notification"("module", "type", "createdAt");
