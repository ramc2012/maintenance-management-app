-- Extend existing core tables for contractor workspaces
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "isExternal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "companyName" TEXT,
    ADD COLUMN IF NOT EXISTS "phone" TEXT,
    ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;

ALTER TABLE "Contract"
    ADD COLUMN IF NOT EXISTS "workspaceSlug" TEXT,
    ADD COLUMN IF NOT EXISTS "workspaceLabel" TEXT,
    ADD COLUMN IF NOT EXISTS "externalAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "shareAllInstallations" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "shareAllInstrumentTypes" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "shareAllEquipmentScopes" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "dashboardMode" TEXT NOT NULL DEFAULT 'CONTRACT';

ALTER TABLE "MaintenanceRequest"
    ADD COLUMN IF NOT EXISTS "requestOrigin" TEXT NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN IF NOT EXISTS "assetClass" TEXT,
    ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "contractId" TEXT;

ALTER TABLE "WorkOrder"
    ADD COLUMN IF NOT EXISTS "requestOrigin" TEXT NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN IF NOT EXISTS "executionStage" TEXT NOT NULL DEFAULT 'REQUESTED',
    ADD COLUMN IF NOT EXISTS "executionUpdatedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "contractId" TEXT,
    ADD COLUMN IF NOT EXISTS "assignedContractorCompany" TEXT,
    ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

ALTER TABLE "WorkOrderTeam"
    ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Contract workspace access and scope tables
CREATE TABLE "ContractUserAccess" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessRole" TEXT NOT NULL,
    "scopeMode" TEXT NOT NULL DEFAULT 'CONTRACT',
    "canViewDashboard" BOOLEAN NOT NULL DEFAULT true,
    "canCreateRequests" BOOLEAN NOT NULL DEFAULT false,
    "canGenerateWorkOrders" BOOLEAN NOT NULL DEFAULT false,
    "canSubmitReports" BOOLEAN NOT NULL DEFAULT false,
    "canReviewReports" BOOLEAN NOT NULL DEFAULT false,
    "canCloseWorkOrders" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractUserAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractInstallationScope" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'EXECUTE',
    "canRaiseRequests" BOOLEAN NOT NULL DEFAULT true,
    "canGenerateWorkOrders" BOOLEAN NOT NULL DEFAULT false,
    "canSubmitReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractInstallationScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractInstrumentTypeScope" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "serviceLine" TEXT,
    "accessLevel" TEXT NOT NULL DEFAULT 'UPDATE',
    "canEditMasterData" BOOLEAN NOT NULL DEFAULT false,
    "canSubmitReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractInstrumentTypeScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractEquipmentScope" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeValue" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'EXECUTE',
    "canEditMasterData" BOOLEAN NOT NULL DEFAULT false,
    "canSubmitReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractEquipmentScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractFunctionalLocationScope" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "flId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'EXECUTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractFunctionalLocationScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkOrderExecutionLog" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "contractId" TEXT,
    "stage" TEXT NOT NULL,
    "previousStage" TEXT,
    "remarks" TEXT,
    "performedById" TEXT,
    "performedByName" TEXT,
    "performedByRole" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'CONTRACTOR_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractorReport" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "maintenanceRequestId" TEXT,
    "installationId" TEXT,
    "assetClass" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "instrumentTagId" TEXT,
    "runningEquipmentTag" TEXT,
    "reportType" TEXT NOT NULL,
    "reportStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "severity" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "findings" JSONB,
    "measurements" JSONB,
    "recommendations" TEXT,
    "actionTaken" TEXT,
    "evidence" JSONB,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'CONTRACTOR_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorReport_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "Contract_workspaceSlug_key" ON "Contract"("workspaceSlug");
CREATE UNIQUE INDEX "ContractUserAccess_contractId_userId_key" ON "ContractUserAccess"("contractId", "userId");
CREATE UNIQUE INDEX "ContractInstallationScope_contractId_installationId_key" ON "ContractInstallationScope"("contractId", "installationId");
CREATE UNIQUE INDEX "ContractInstrumentTypeScope_contractId_instrumentType_key" ON "ContractInstrumentTypeScope"("contractId", "instrumentType");
CREATE UNIQUE INDEX "ContractEquipmentScope_contractId_scopeType_scopeValue_key" ON "ContractEquipmentScope"("contractId", "scopeType", "scopeValue");
CREATE UNIQUE INDEX "ContractFunctionalLocationScope_contractId_flId_key" ON "ContractFunctionalLocationScope"("contractId", "flId");

-- Secondary indexes
CREATE INDEX "MaintenanceRequest_contractId_requestedAt_idx" ON "MaintenanceRequest"("contractId", "requestedAt");
CREATE INDEX "MaintenanceRequest_createdByUserId_requestedAt_idx" ON "MaintenanceRequest"("createdByUserId", "requestedAt");
CREATE INDEX "WorkOrder_contractId_executionStage_idx" ON "WorkOrder"("contractId", "executionStage");
CREATE INDEX "WorkOrderTeam_userId_idx" ON "WorkOrderTeam"("userId");
CREATE INDEX "ContractUserAccess_userId_isActive_idx" ON "ContractUserAccess"("userId", "isActive");
CREATE INDEX "ContractUserAccess_contractId_accessRole_isActive_idx" ON "ContractUserAccess"("contractId", "accessRole", "isActive");
CREATE INDEX "ContractInstallationScope_installationId_accessLevel_idx" ON "ContractInstallationScope"("installationId", "accessLevel");
CREATE INDEX "ContractInstrumentTypeScope_serviceLine_idx" ON "ContractInstrumentTypeScope"("serviceLine");
CREATE INDEX "ContractEquipmentScope_scopeType_scopeValue_idx" ON "ContractEquipmentScope"("scopeType", "scopeValue");
CREATE INDEX "ContractFunctionalLocationScope_flId_accessLevel_idx" ON "ContractFunctionalLocationScope"("flId", "accessLevel");
CREATE INDEX "WorkOrderExecutionLog_workOrderId_createdAt_idx" ON "WorkOrderExecutionLog"("workOrderId", "createdAt");
CREATE INDEX "WorkOrderExecutionLog_contractId_createdAt_idx" ON "WorkOrderExecutionLog"("contractId", "createdAt");
CREATE INDEX "ContractorReport_contractId_reportStatus_createdAt_idx" ON "ContractorReport"("contractId", "reportStatus", "createdAt");
CREATE INDEX "ContractorReport_workOrderId_reportStatus_idx" ON "ContractorReport"("workOrderId", "reportStatus");
CREATE INDEX "ContractorReport_installationId_assetClass_createdAt_idx" ON "ContractorReport"("installationId", "assetClass", "createdAt");
CREATE INDEX "ContractorReport_assetTag_reportType_createdAt_idx" ON "ContractorReport"("assetTag", "reportType", "createdAt");

-- Foreign keys
ALTER TABLE "MaintenanceRequest"
    ADD CONSTRAINT "MaintenanceRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "MaintenanceRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkOrder"
    ADD CONSTRAINT "WorkOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "WorkOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkOrderTeam"
    ADD CONSTRAINT "WorkOrderTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractUserAccess"
    ADD CONSTRAINT "ContractUserAccess_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractUserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractInstallationScope"
    ADD CONSTRAINT "ContractInstallationScope_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractInstallationScope_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractInstrumentTypeScope"
    ADD CONSTRAINT "ContractInstrumentTypeScope_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractEquipmentScope"
    ADD CONSTRAINT "ContractEquipmentScope_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractFunctionalLocationScope"
    ADD CONSTRAINT "ContractFunctionalLocationScope_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractFunctionalLocationScope_flId_fkey" FOREIGN KEY ("flId") REFERENCES "FunctionalLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkOrderExecutionLog"
    ADD CONSTRAINT "WorkOrderExecutionLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "WorkOrderExecutionLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "WorkOrderExecutionLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractorReport"
    ADD CONSTRAINT "ContractorReport_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_instrumentTagId_fkey" FOREIGN KEY ("instrumentTagId") REFERENCES "InstrumentMaster"("tagId") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_runningEquipmentTag_fkey" FOREIGN KEY ("runningEquipmentTag") REFERENCES "RunningEquipmentMaster"("equipmentTag") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContractorReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
