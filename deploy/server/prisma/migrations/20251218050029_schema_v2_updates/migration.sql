/*
  Warnings:

  - You are about to drop the column `calibrationFreqDays` on the `InstrumentMaster` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InstrumentMaster" DROP COLUMN "calibrationFreqDays",
ADD COLUMN     "calibrationFreqMonths" INTEGER NOT NULL DEFAULT 12;

-- CreateTable
CREATE TABLE "InstrumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyTransferMeter" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "frequencyMonths" INTEGER NOT NULL DEFAULT 12,
    "lastCalDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodyTransferMeter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentType_name_key" ON "InstrumentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustodyTransferMeter_meterId_key" ON "CustodyTransferMeter"("meterId");
