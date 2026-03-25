-- Migration: gap_closure
-- Adds: Notification model (to schema.prisma), WOAttachment, InspectionRound,
--        InspectionExecution, LaborRate
-- Modifies: WorkOrder (attachments relation), Case (equipmentTag, maintenanceRelated)

-- ============================================================================
-- NOTIFICATION TABLE (already created via ops_foundation migration as raw SQL,
-- but adding here for Prisma schema alignment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Notification" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT,
    "username"     TEXT,
    "role"         TEXT,
    "module"       TEXT NOT NULL,
    "type"         TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "message"      TEXT NOT NULL,
    "severity"     TEXT NOT NULL DEFAULT 'INFO',
    "entityType"   TEXT,
    "entityId"     TEXT,
    "status"       TEXT NOT NULL DEFAULT 'UNREAD',
    "dedupeKey"    TEXT NOT NULL,
    "metadata"     JSONB,
    "scheduledFor" TIMESTAMP(3),
    "readAt"       TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_module_type_createdAt_idx" ON "Notification"("module", "type", "createdAt");

-- ============================================================================
-- WO ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE "WOAttachment" (
    "id"          TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fileName"    TEXT NOT NULL,
    "fileUrl"     TEXT NOT NULL,
    "fileType"    TEXT NOT NULL,
    "mimeType"    TEXT,
    "fileSize"    INTEGER,
    "caption"     TEXT,
    "uploadedBy"  TEXT NOT NULL,
    "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WOAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WOAttachment_workOrderId_idx" ON "WOAttachment"("workOrderId");
ALTER TABLE "WOAttachment" ADD CONSTRAINT "WOAttachment_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- INSPECTION ROUNDS TABLE
-- ============================================================================
CREATE TABLE "InspectionRound" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "flIds"        JSONB NOT NULL,
    "frequency"    TEXT NOT NULL,
    "assignedDept" TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdBy"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionRound_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INSPECTION EXECUTIONS TABLE
-- ============================================================================
CREATE TABLE "InspectionExecution" (
    "id"           TEXT NOT NULL,
    "roundId"      TEXT NOT NULL,
    "executedBy"   TEXT NOT NULL,
    "executedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"  TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "readings"     JSONB NOT NULL,
    "flaggedItems" JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionExecution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InspectionExecution_roundId_executedAt_idx" ON "InspectionExecution"("roundId", "executedAt");
ALTER TABLE "InspectionExecution" ADD CONSTRAINT "InspectionExecution_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "InspectionRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- LABOR RATE TABLE
-- ============================================================================
CREATE TABLE "LaborRate" (
    "id"            TEXT NOT NULL,
    "department"    TEXT NOT NULL,
    "designation"   TEXT,
    "dailyRate"     DOUBLE PRECISION NOT NULL,
    "currency"      TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LaborRate_department_designation_effectiveFrom_key"
    ON "LaborRate"("department", "designation", "effectiveFrom");

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Case: add equipmentTag and maintenanceRelated
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "equipmentTag" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "maintenanceRelated" BOOLEAN NOT NULL DEFAULT false;
