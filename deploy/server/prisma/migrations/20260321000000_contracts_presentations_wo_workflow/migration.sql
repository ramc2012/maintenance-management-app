-- CreateTable MaintenanceRequest
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "reqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "equipmentTag" TEXT,
    "flId" TEXT,
    "installationId" TEXT,
    "requestType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "workOrderId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaintenanceRequest_reqNumber_key" ON "MaintenanceRequest"("reqNumber");

-- CreateTable WorkOrderTeam
CREATE TABLE "WorkOrderTeam" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "role" TEXT NOT NULL,
    "isContractor" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkOrderChecklist
CREATE TABLE "WorkOrderChecklist" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "taskCode" TEXT,
    "description" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable Contract
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "contractorCode" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contractValue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentTerms" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "installationId" TEXT,
    "departmentId" TEXT,
    "documentRef" TEXT,
    "ongcOfficer" TEXT,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateTable ContractMilestone
CREATE TABLE "ContractMilestone" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentPct" DOUBLE PRECISION,
    "paymentAmt" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContractDocument
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable Presentation
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "author" TEXT,
    "version" TEXT,
    "tags" TEXT[],
    "installationId" TEXT,
    "departmentId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- Add maintenanceRequestId to WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "maintenanceRequestId" TEXT;

-- Add new columns to InstrumentMaster
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "commissioningDate" TIMESTAMP(3);
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMP(3);
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "criticality" TEXT;
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "safetyClassification" TEXT;
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "processConnection" TEXT;
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "mountingLocation" TEXT;
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "drawingRef" TEXT;
ALTER TABLE "InstrumentMaster" ADD COLUMN IF NOT EXISTS "healthStatus" TEXT NOT NULL DEFAULT 'OK';

-- Add new columns to RunningEquipmentMaster
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "commissioningDate" TIMESTAMP(3);
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMP(3);
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "criticality" TEXT;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "ratedPressure" DOUBLE PRECISION;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "ratedTemperature" DOUBLE PRECISION;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "ratedFlow" DOUBLE PRECISION;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "mountingLocation" TEXT;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "drawingRef" TEXT;
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN IF NOT EXISTS "purchaseOrderNo" TEXT;

-- Add new columns to Asset
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "commissioningDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "criticality" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "nextInspectionDue" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "certifications" JSONB;

-- AddForeignKey WorkOrderTeam
ALTER TABLE "WorkOrderTeam" ADD CONSTRAINT "WorkOrderTeam_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey WorkOrderChecklist
ALTER TABLE "WorkOrderChecklist" ADD CONSTRAINT "WorkOrderChecklist_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ContractMilestone
ALTER TABLE "ContractMilestone" ADD CONSTRAINT "ContractMilestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ContractDocument
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
