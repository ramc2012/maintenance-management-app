-- AlterTable
ALTER TABLE "CustodyTransferMeter" ADD COLUMN     "elementSize" TEXT,
ADD COLUMN     "fluidType" TEXT NOT NULL DEFAULT 'LIQUID',
ADD COLUMN     "gasComposition" JSONB,
ADD COLUMN     "pipeSize" TEXT,
ADD COLUMN     "propertiesLastUpdated" TIMESTAMP(3),
ADD COLUMN     "referenceDensity" DOUBLE PRECISION,
ADD COLUMN     "specificGravity" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InternalFlowMeter" ADD COLUMN     "elementSize" TEXT,
ADD COLUMN     "fluidType" TEXT NOT NULL DEFAULT 'LIQUID',
ADD COLUMN     "gasComposition" JSONB,
ADD COLUMN     "lastCalDate" TIMESTAMP(3),
ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "pipeSize" TEXT,
ADD COLUMN     "product" TEXT,
ADD COLUMN     "propertiesLastUpdated" TIMESTAMP(3),
ADD COLUMN     "referenceDensity" DOUBLE PRECISION,
ADD COLUMN     "specificGravity" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PMSchedule" ADD COLUMN     "equipmentTypeId" TEXT,
ALTER COLUMN "instrumentTypeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RunningEquipmentMaster" ADD COLUMN     "equipmentTypeId" TEXT;

-- CreateTable
CREATE TABLE "EquipmentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_name_key" ON "EquipmentType"("name");

-- AddForeignKey
ALTER TABLE "RunningEquipmentMaster" ADD CONSTRAINT "RunningEquipmentMaster_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMSchedule" ADD CONSTRAINT "PMSchedule_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
