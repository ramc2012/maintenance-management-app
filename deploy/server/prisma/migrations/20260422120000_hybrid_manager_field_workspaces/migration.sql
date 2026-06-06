CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE "Discipline" AS ENUM ('MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION');
CREATE TYPE "DisciplineAccessLevel" AS ENUM ('VIEW', 'EXECUTE', 'MANAGE');

-- Add discipline ownership columns
ALTER TABLE "Case" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "InstrumentMaster" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'INSTRUMENTATION';
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "MaintenanceLog" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "OperationalLog" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "WorkOrder" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "StaticEquipment" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "MaintenanceRequest" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "ManualFolder" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "RepositoryDocument" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';
ALTER TABLE "GasCompressionLog" ADD COLUMN "primaryDiscipline" "Discipline" NOT NULL DEFAULT 'MECHANICAL';

-- Create access mapping table
CREATE TABLE "UserDisciplineAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "discipline" "Discipline" NOT NULL,
  "accessLevel" "DisciplineAccessLevel" NOT NULL DEFAULT 'EXECUTE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "canViewProcurement" BOOLEAN NOT NULL DEFAULT true,
  "canUpdateProcurement" BOOLEAN NOT NULL DEFAULT false,
  "canRaiseRequirements" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserDisciplineAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserDisciplineAccess_userId_discipline_key" ON "UserDisciplineAccess"("userId", "discipline");
CREATE INDEX "UserDisciplineAccess_userId_isDefault_idx" ON "UserDisciplineAccess"("userId", "isDefault");
CREATE INDEX "UserDisciplineAccess_discipline_accessLevel_idx" ON "UserDisciplineAccess"("discipline", "accessLevel");

ALTER TABLE "UserDisciplineAccess"
  ADD CONSTRAINT "UserDisciplineAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supporting indexes
CREATE INDEX "Case_primaryDiscipline_currentStage_idx" ON "Case"("primaryDiscipline", "currentStage");
CREATE INDEX "InstrumentMaster_primaryDiscipline_installationId_idx" ON "InstrumentMaster"("primaryDiscipline", "installationId");
CREATE INDEX "RunningEquipmentMaster_primaryDiscipline_installationId_idx" ON "RunningEquipmentMaster"("primaryDiscipline", "installationId");
CREATE INDEX "MaintenanceLog_primaryDiscipline_date_idx" ON "MaintenanceLog"("primaryDiscipline", "date");
CREATE INDEX "MaintenanceLog_primaryDiscipline_installationId_idx" ON "MaintenanceLog"("primaryDiscipline", "installationId");
CREATE INDEX "OperationalLog_primaryDiscipline_logDate_idx" ON "OperationalLog"("primaryDiscipline", "logDate");
CREATE INDEX "WorkOrder_primaryDiscipline_status_idx" ON "WorkOrder"("primaryDiscipline", "status");
CREATE INDEX "StaticEquipment_primaryDiscipline_installationId_idx" ON "StaticEquipment"("primaryDiscipline", "installationId");
CREATE INDEX "MaintenanceRequest_primaryDiscipline_requestedAt_idx" ON "MaintenanceRequest"("primaryDiscipline", "requestedAt");
CREATE INDEX "ManualFolder_primaryDiscipline_idx" ON "ManualFolder"("primaryDiscipline");
CREATE INDEX "RepositoryDocument_primaryDiscipline_uploadedAt_idx" ON "RepositoryDocument"("primaryDiscipline", "uploadedAt");
CREATE INDEX "GasCompressionLog_primaryDiscipline_date_idx" ON "GasCompressionLog"("primaryDiscipline", "date");

-- Backfill master data disciplines
UPDATE "InstrumentMaster"
SET "primaryDiscipline" = 'INSTRUMENTATION';

UPDATE "RunningEquipmentMaster"
SET "primaryDiscipline" = CASE
  WHEN lower(coalesce("serviceLine", '') || ' ' || coalesce("equipmentTypeName", '') || ' ' || coalesce("description", '')) ~ '(motor|electrical|generator|transformer|switchgear|mcc|panel|ups|breaker|relay|cable|lighting|dg)'
    THEN 'ELECTRICAL'::"Discipline"
  ELSE 'MECHANICAL'::"Discipline"
END;

UPDATE "StaticEquipment"
SET "primaryDiscipline" = 'MECHANICAL';

-- Backfill workflow and document disciplines
UPDATE "ManualFolder"
SET "primaryDiscipline" = CASE
  WHEN lower(coalesce("category", '')) = 'electrical' THEN 'ELECTRICAL'::"Discipline"
  WHEN lower(coalesce("category", '')) = 'instrumentation' THEN 'INSTRUMENTATION'::"Discipline"
  ELSE 'MECHANICAL'::"Discipline"
END;

UPDATE "RepositoryDocument" d
SET "primaryDiscipline" = f."primaryDiscipline"
FROM "ManualFolder" f
WHERE f."id" = d."folderId";

UPDATE "MaintenanceLog"
SET "primaryDiscipline" = CASE
  WHEN lower(coalesce("department", '') || ' ' || coalesce("section", '') || ' ' || coalesce("serviceLine", '') || ' ' || coalesce("equipmentTypeName", '')) ~ '(instr|instrument|transmitter|analyzer|control valve|flow|pressure|temperature)'
    THEN 'INSTRUMENTATION'::"Discipline"
  WHEN lower(coalesce("department", '') || ' ' || coalesce("section", '') || ' ' || coalesce("serviceLine", '') || ' ' || coalesce("equipmentTypeName", '')) ~ '(elect|power|motor|generator|transformer|switchgear|mcc|panel|ups|cable|lighting)'
    THEN 'ELECTRICAL'::"Discipline"
  ELSE 'MECHANICAL'::"Discipline"
END;

UPDATE "OperationalLog" o
SET "primaryDiscipline" = e."primaryDiscipline"
FROM "RunningEquipmentMaster" e
WHERE e."equipmentTag" = o."equipmentTag";

UPDATE "GasCompressionLog" g
SET "primaryDiscipline" = e."primaryDiscipline"
FROM "RunningEquipmentMaster" e
WHERE e."equipmentTag" = g."compressorId";

UPDATE "MaintenanceRequest" mr
SET "primaryDiscipline" = i."primaryDiscipline"
FROM "InstrumentMaster" i
WHERE i."tagId" = mr."equipmentTag";

UPDATE "MaintenanceRequest" mr
SET "primaryDiscipline" = e."primaryDiscipline"
FROM "RunningEquipmentMaster" e
WHERE e."equipmentTag" = mr."equipmentTag";

UPDATE "Case" c
SET "primaryDiscipline" = i."primaryDiscipline"
FROM "InstrumentMaster" i
WHERE i."tagId" = c."equipmentTag";

UPDATE "Case" c
SET "primaryDiscipline" = e."primaryDiscipline"
FROM "RunningEquipmentMaster" e
WHERE e."equipmentTag" = c."equipmentTag";

UPDATE "Case"
SET "primaryDiscipline" = CASE
  WHEN lower(coalesce("title", '') || ' ' || coalesce("category", '') || ' ' || coalesce("tag", '')) ~ '(instr|instrument|transmitter|analyzer|control valve|flow|pressure|temperature)'
    THEN 'INSTRUMENTATION'::"Discipline"
  WHEN lower(coalesce("title", '') || ' ' || coalesce("category", '') || ' ' || coalesce("tag", '')) ~ '(elect|power|motor|generator|transformer|switchgear|mcc|panel|ups|cable|lighting)'
    THEN 'ELECTRICAL'::"Discipline"
  ELSE "primaryDiscipline"
END;

UPDATE "WorkOrder"
SET "primaryDiscipline" = 'MECHANICAL';

-- Seed user discipline access
WITH all_disciplines AS (
  SELECT unnest(ARRAY['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'])::"Discipline" AS discipline
)
INSERT INTO "UserDisciplineAccess" (
  "id",
  "userId",
  "discipline",
  "accessLevel",
  "isDefault",
  "canViewProcurement",
  "canUpdateProcurement",
  "canRaiseRequirements"
)
SELECT
  gen_random_uuid()::text,
  u."id",
  d.discipline,
  'MANAGE'::"DisciplineAccessLevel",
  d.discipline = 'MECHANICAL'::"Discipline",
  true,
  true,
  true
FROM "User" u
CROSS JOIN all_disciplines d
WHERE u."role" IN ('ADMIN', 'HOD', 'ENGINEER')
ON CONFLICT ("userId", "discipline") DO NOTHING;

INSERT INTO "UserDisciplineAccess" (
  "id",
  "userId",
  "discipline",
  "accessLevel",
  "isDefault",
  "canViewProcurement",
  "canUpdateProcurement",
  "canRaiseRequirements"
)
SELECT
  gen_random_uuid()::text,
  u."id",
  CASE
    WHEN lower(coalesce(dep."name", '') || ' ' || coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(instr|instrument)'
      THEN 'INSTRUMENTATION'::"Discipline"
    WHEN lower(coalesce(dep."name", '') || ' ' || coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(elect|power)'
      THEN 'ELECTRICAL'::"Discipline"
    ELSE 'MECHANICAL'::"Discipline"
  END,
  CASE
    WHEN lower(coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(procurement|buyer|materials|hpo|cpd)'
      THEN 'MANAGE'::"DisciplineAccessLevel"
    ELSE 'EXECUTE'::"DisciplineAccessLevel"
  END,
  true,
  true,
  lower(coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(procurement|buyer|materials|hpo|cpd)',
  true
FROM "User" u
LEFT JOIN "Department" dep ON dep."id" = u."departmentId"
WHERE u."role" NOT IN ('ADMIN', 'HOD', 'ENGINEER')
  AND lower(coalesce(dep."name", '') || ' ' || coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(mechanical|electrical|power|instr|instrument)'
ON CONFLICT ("userId", "discipline") DO NOTHING;

INSERT INTO "UserDisciplineAccess" (
  "id",
  "userId",
  "discipline",
  "accessLevel",
  "isDefault",
  "canViewProcurement",
  "canUpdateProcurement",
  "canRaiseRequirements"
)
SELECT
  gen_random_uuid()::text,
  u."id",
  d.discipline,
  CASE
    WHEN lower(coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(procurement|buyer|materials|hpo|cpd)'
      THEN 'MANAGE'::"DisciplineAccessLevel"
    ELSE 'EXECUTE'::"DisciplineAccessLevel"
  END,
  d.discipline = 'MECHANICAL'::"Discipline",
  true,
  lower(coalesce(u."jobTitle", '') || ' ' || coalesce(u."username", '')) ~ '(procurement|buyer|materials|hpo|cpd)',
  true
FROM "User" u
CROSS JOIN all_disciplines d
WHERE NOT EXISTS (
  SELECT 1 FROM "UserDisciplineAccess" uda WHERE uda."userId" = u."id"
)
ON CONFLICT ("userId", "discipline") DO NOTHING;
