-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL DEFAULT 'INSTRUMENTATION',
    "description" TEXT,
    "rigType" TEXT,
    "headerFields" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "header" JSONB NOT NULL,
    "responses" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "flaggedCount" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "shiftInchargeSign" TEXT,
    "deptInchargeSign" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_code_key" ON "ChecklistTemplate"("code");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_discipline_isActive_idx" ON "ChecklistTemplate"("discipline", "isActive");

-- CreateIndex
CREATE INDEX "ChecklistSubmission_templateId_date_idx" ON "ChecklistSubmission"("templateId", "date");

-- CreateIndex
CREATE INDEX "ChecklistSubmission_status_date_idx" ON "ChecklistSubmission"("status", "date");

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
