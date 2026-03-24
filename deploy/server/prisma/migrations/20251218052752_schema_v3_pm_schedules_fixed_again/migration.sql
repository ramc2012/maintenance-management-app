-- CreateTable
CREATE TABLE "PMSchedule" (
    "id" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "instrumentTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PMSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PMSchedule" ADD CONSTRAINT "PMSchedule_instrumentTypeId_fkey" FOREIGN KEY ("instrumentTypeId") REFERENCES "InstrumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
