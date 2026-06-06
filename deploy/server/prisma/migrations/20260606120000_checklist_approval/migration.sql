-- ChecklistTemplate: approver designation
ALTER TABLE "ChecklistTemplate" ADD COLUMN "approvers" JSONB;

-- ChecklistSubmission: two-gate approval
ALTER TABLE "ChecklistSubmission" ADD COLUMN "shiftApprovedBy" TEXT;
ALTER TABLE "ChecklistSubmission" ADD COLUMN "shiftApprovedAt" TIMESTAMP(3);
ALTER TABLE "ChecklistSubmission" ADD COLUMN "instrApprovedBy" TEXT;
ALTER TABLE "ChecklistSubmission" ADD COLUMN "instrApprovedAt" TIMESTAMP(3);
