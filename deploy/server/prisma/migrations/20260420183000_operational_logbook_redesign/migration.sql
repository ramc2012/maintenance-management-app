-- Operational logbook redesign
-- Separates operating logs from maintenance work logs and enriches compressor process logging.

CREATE TABLE "OperationalMetricDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,
    "assetClass" TEXT,
    "valueType" TEXT NOT NULL,
    "captureType" TEXT NOT NULL DEFAULT 'MANUAL',
    "aggregationRule" TEXT,
    "alertMin" DOUBLE PRECISION,
    "alertMax" DOUBLE PRECISION,
    "warningMin" DOUBLE PRECISION,
    "warningMax" DOUBLE PRECISION,
    "displayGroup" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalMetricDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalMetricDefinition_code_key" ON "OperationalMetricDefinition"("code");

CREATE TABLE "AssetLogProfile" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'RUNNING_EQUIPMENT',
    "description" TEXT,
    "logGranularity" TEXT NOT NULL DEFAULT 'DAILY',
    "defaultSourceMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowBackdated" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "matcherKeywords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetLogProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetLogProfile_code_key" ON "AssetLogProfile"("code");

CREATE TABLE "AssetLogProfileMetric" (
    "id" TEXT NOT NULL,
    "assetLogProfileId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "defaultVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AssetLogProfileMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetLogProfileMetric_assetLogProfileId_metricDefinitionId_key"
    ON "AssetLogProfileMetric"("assetLogProfileId", "metricDefinitionId");

CREATE TABLE "OperationalLog" (
    "id" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'GENERAL',
    "granularity" TEXT NOT NULL DEFAULT 'DAILY',
    "sourceMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "assetClass" TEXT NOT NULL DEFAULT 'RUNNING_EQUIPMENT',
    "profileCode" TEXT,
    "installationId" TEXT NOT NULL,
    "equipmentTag" TEXT NOT NULL,
    "runtimeHours" DOUBLE PRECISION,
    "downtimeHours" DOUBLE PRECISION,
    "standbyHours" DOUBLE PRECISION,
    "cumulativeHours" DOUBLE PRECISION,
    "operatingState" TEXT,
    "availabilityStatus" TEXT,
    "enteredBy" TEXT,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalLog_logDate_shift_equipmentTag_key"
    ON "OperationalLog"("logDate", "shift", "equipmentTag");
CREATE INDEX "OperationalLog_installationId_logDate_idx" ON "OperationalLog"("installationId", "logDate");
CREATE INDEX "OperationalLog_equipmentTag_logDate_idx" ON "OperationalLog"("equipmentTag", "logDate");
CREATE INDEX "OperationalLog_sourceMode_logDate_idx" ON "OperationalLog"("sourceMode", "logDate");

CREATE TABLE "OperationalLogMetric" (
    "id" TEXT NOT NULL,
    "operationalLogId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "valueNumber" DOUBLE PRECISION,
    "valueText" TEXT,
    "valueBoolean" BOOLEAN,
    "valueEnum" TEXT,
    "sourceQuality" TEXT,
    "sourceTag" TEXT,
    "readingTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalLogMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalLogMetric_operationalLogId_metricDefinitionId_key"
    ON "OperationalLogMetric"("operationalLogId", "metricDefinitionId");

ALTER TABLE "GasCompressionLog"
    ADD COLUMN IF NOT EXISTS "shift" TEXT NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS "sourceMode" TEXT NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS "operationalLogId" TEXT,
    ADD COLUMN IF NOT EXISTS "inputGasVolume" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "outputGasVolume" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "fuelGasVolume" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "recycleGasVolume" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "flareGasVolume" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "interstagePressure" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "lubeOilPressure" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "lubeOilTemp" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "jacketWaterTemp" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "vibration" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "loadPct" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "efficiencyPct" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "tripCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "shutdownReason" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "GasCompressionLog_operationalLogId_key"
    ON "GasCompressionLog"("operationalLogId");
CREATE UNIQUE INDEX IF NOT EXISTS "GasCompressionLog_date_shift_compressorId_key"
    ON "GasCompressionLog"("date", "shift", "compressorId");

ALTER TABLE "AssetLogProfileMetric"
    ADD CONSTRAINT "AssetLogProfileMetric_assetLogProfileId_fkey"
    FOREIGN KEY ("assetLogProfileId") REFERENCES "AssetLogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "AssetLogProfileMetric_metricDefinitionId_fkey"
    FOREIGN KEY ("metricDefinitionId") REFERENCES "OperationalMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OperationalLog"
    ADD CONSTRAINT "OperationalLog_installationId_fkey"
    FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "OperationalLog_equipmentTag_fkey"
    FOREIGN KEY ("equipmentTag") REFERENCES "RunningEquipmentMaster"("equipmentTag") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalLogMetric"
    ADD CONSTRAINT "OperationalLogMetric_operationalLogId_fkey"
    FOREIGN KEY ("operationalLogId") REFERENCES "OperationalLog"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "OperationalLogMetric_metricDefinitionId_fkey"
    FOREIGN KEY ("metricDefinitionId") REFERENCES "OperationalMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GasCompressionLog"
    ADD CONSTRAINT "GasCompressionLog_operationalLogId_fkey"
    FOREIGN KEY ("operationalLogId") REFERENCES "OperationalLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
