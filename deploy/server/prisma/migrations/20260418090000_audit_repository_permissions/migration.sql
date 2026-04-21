-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canCloseWorkOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canCreateWorkOrder" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuditObservation" (
    "id" TEXT NOT NULL,
    "observationNo" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "installationId" TEXT,
    "department" TEXT,
    "service" TEXT,
    "category" TEXT,
    "severity" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "reference" TEXT,
    "targetDate" TIMESTAMP(3),
    "reportedBy" TEXT,
    "assignedTo" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAction" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "actionNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasCompressionLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "compressorId" TEXT NOT NULL,
    "installationId" TEXT,
    "gasCompressed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flowRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suctionPressure" DOUBLE PRECISION,
    "dischargePressure" DOUBLE PRECISION,
    "suctionTemp" DOUBLE PRECISION,
    "dischargeTemp" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GasCompressionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditObservation_observationNo_key" ON "AuditObservation"("observationNo");

-- CreateIndex
CREATE INDEX "AuditObservation_status_createdAt_idx" ON "AuditObservation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditObservation_installationId_status_idx" ON "AuditObservation"("installationId", "status");

-- CreateIndex
CREATE INDEX "AuditObservation_agency_status_idx" ON "AuditObservation"("agency", "status");

-- CreateIndex
CREATE INDEX "AuditAction_status_targetDate_idx" ON "AuditAction"("status", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "AuditAction_observationId_actionNo_key" ON "AuditAction"("observationId", "actionNo");

-- CreateIndex
CREATE INDEX "GasCompressionLog_installationId_date_idx" ON "GasCompressionLog"("installationId", "date");

-- CreateIndex
CREATE INDEX "GasCompressionLog_compressorId_date_idx" ON "GasCompressionLog"("compressorId", "date");

-- AddForeignKey
ALTER TABLE "AuditAction" ADD CONSTRAINT "AuditAction_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "AuditObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
