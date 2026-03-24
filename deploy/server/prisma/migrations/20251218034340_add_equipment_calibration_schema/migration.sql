-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "departmentId" TEXT,
    "serviceLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "ServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceLineId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "serviceLineId" TEXT,
    "fy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isIndicative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3),
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageSnapshot" TEXT,

    CONSTRAINT "CaseComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "vendor" TEXT,
    "vendorCode" TEXT,
    "prValue" DOUBLE PRECISION,
    "poValue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "prNumber" TEXT,
    "poNumber" TEXT,
    "sanctionFileNumber" TEXT,
    "tenderingFileNumber" TEXT,
    "procurementMethod" TEXT,
    "category" TEXT,
    "value" DOUBLE PRECISION,
    "tag" TEXT,
    "processedBy" TEXT,
    "departmentId" TEXT,
    "serviceLineId" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "natureType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentMaster" (
    "tagId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serialNo" TEXT,
    "rangeMin" DOUBLE PRECISION,
    "rangeMax" DOUBLE PRECISION,
    "unit" TEXT,
    "modelYear" INTEGER,
    "installationId" TEXT NOT NULL,
    "calibrationFreqDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentMaster_pkey" PRIMARY KEY ("tagId")
);

-- CreateTable
CREATE TABLE "RunningEquipmentMaster" (
    "equipmentTag" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "powerRating" TEXT,
    "installationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunningEquipmentMaster_pkey" PRIMARY KEY ("equipmentTag")
);

-- CreateTable
CREATE TABLE "CalibrationStandard" (
    "stdId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "standardType" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serialNo" TEXT,
    "modelYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalibrationStandard_pkey" PRIMARY KEY ("stdId")
);

-- CreateTable
CREATE TABLE "CalibrationLog" (
    "id" TEXT NOT NULL,
    "instrumentTagId" TEXT NOT NULL,
    "masterStdId" TEXT NOT NULL,
    "lastCalDate" TIMESTAMP(3) NOT NULL,
    "currentCalDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "reportFileUrl" TEXT,
    "fivePointData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementHistory" (
    "id" TEXT NOT NULL,
    "instrumentTagId" TEXT NOT NULL,
    "oldSerialNo" TEXT,
    "newSerialNo" TEXT NOT NULL,
    "replacedBy" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "ReplacementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_departmentId_serviceLineId_fy_category_key" ON "Budget"("departmentId", "serviceLineId", "fy", "category");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComment" ADD CONSTRAINT "CaseComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentMaster" ADD CONSTRAINT "InstrumentMaster_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningEquipmentMaster" ADD CONSTRAINT "RunningEquipmentMaster_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_instrumentTagId_fkey" FOREIGN KEY ("instrumentTagId") REFERENCES "InstrumentMaster"("tagId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_masterStdId_fkey" FOREIGN KEY ("masterStdId") REFERENCES "CalibrationStandard"("stdId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementHistory" ADD CONSTRAINT "ReplacementHistory_instrumentTagId_fkey" FOREIGN KEY ("instrumentTagId") REFERENCES "InstrumentMaster"("tagId") ON DELETE RESTRICT ON UPDATE CASCADE;
