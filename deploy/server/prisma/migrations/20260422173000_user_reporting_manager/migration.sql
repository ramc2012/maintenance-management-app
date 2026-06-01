ALTER TABLE "User"
ADD COLUMN "managerId" TEXT;

CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

ALTER TABLE "User"
ADD CONSTRAINT "User_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
