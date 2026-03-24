-- AlterTable
ALTER TABLE "InstrumentMaster" ADD COLUMN     "custodyMeterId" TEXT,
ADD COLUMN     "internalMeterId" TEXT;

-- CreateTable
CREATE TABLE "InternalFlowMeter" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "meterType" TEXT NOT NULL,
    "elementDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalFlowMeter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalFlowMeter_meterId_key" ON "InternalFlowMeter"("meterId");

-- AddForeignKey
ALTER TABLE "InstrumentMaster" ADD CONSTRAINT "InstrumentMaster_custodyMeterId_fkey" FOREIGN KEY ("custodyMeterId") REFERENCES "CustodyTransferMeter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentMaster" ADD CONSTRAINT "InstrumentMaster_internalMeterId_fkey" FOREIGN KEY ("internalMeterId") REFERENCES "InternalFlowMeter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
