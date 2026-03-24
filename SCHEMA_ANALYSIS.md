# Schema Analysis & Improvement Recommendations
*Generated: March 2026 — ONGC Ankleshwar Maintenance Management System*

---

## 1. USER & ORG MODULE

### Current State
```
User: id, username, password, role, departmentId, createdAt, lastLogin
Department: id, name, companyId
Company: id, name
```

### Missing Fields / Issues

**User model needs:**
```prisma
email          String?   @unique
phone          String?
employeeId     String?   @unique   // ONGC staff ID
designation    String?              // e.g. "Senior Engineer"
isActive       Boolean  @default(true)
section        String?              // Instrumentation, Electrical, Mechanical
profilePhotoUrl String?
```

**Department model needs:**
```prisma
code           String?   @unique   // Short code: "ELECT", "MECH", "INST"
headUserId     String?              // FK → User (dept head)
parentId       String?              // FK → Department (for sub-departments)
phone          String?
email          String?
```

**New: Shift model**
```prisma
model Shift {
  id         String   @id @default(uuid())
  name       String   // "A", "B", "C", "DAY", "NIGHT"
  startTime  String   // "06:00"
  endTime    String   // "14:00"
  isDefault  Boolean  @default(false)
}
```

---

## 2. EQUIPMENT MASTER (RunningEquipmentMaster + Asset)

### Current State
```
RunningEquipmentMaster: equipmentTag (PK), category, description, make, model,
  powerRating, pmFrequencyDays, specifications(JSON), installationId,
  equipmentTypeId, serviceLine
```

### Missing Fields (HIGH PRIORITY)

```prisma
// Add to RunningEquipmentMaster:
serialNumber          String?
commissionDate        DateTime?      // When put into service
decommissionDate      DateTime?      // When taken out of service
purchaseDate          DateTime?
purchaseOrderNo       String?
supplierName          String?
assetValue            Float?         // Purchase cost
replacementValue      Float?         // Current replacement cost
warrantyExpiryDate    DateTime?
criticality           String?        // 'A' (Critical), 'B' (Important), 'C' (Non-critical)
safetyClassification  String?        // 'SIS', 'PROCESS', 'UTILITY', 'GENERAL'
locationDescription   String?        // "Compressor Hall B, Bay 3" (within installation)
referenceDrawing      String?        // P&ID drawing number
lastInspectionDate    DateTime?
nextInspectionDate    DateTime?
departmentId          String?        // FK → Department (owning dept)
flId                  String?        // FK → FunctionalLocation (ISO 14224 linkage)
parentEquipmentTag    String?        // FK → RunningEquipmentMaster (for sub-assemblies)
qrCode                String?        // QR code reference for mobile scanning
notes                 String?        // Long-form technical notes
```

**Why these matter:**
- `criticality` drives maintenance priority scheduling (A=always maintain, B=maintain when possible, C=run-to-failure acceptable)
- `flId` links the old simple equipment registry to the ISO 14224 hierarchy — currently these are two parallel, disconnected systems
- `departmentId` allows procurement dashboard asset-wise breakdowns to show owning department
- `commissionDate` enables age-based maintenance scheduling and lifecycle analysis

### Missing Model: EquipmentSpareList
```prisma
model EquipmentSpare {
  id           String @id @default(uuid())
  equipmentTag String
  equipment    RunningEquipmentMaster @relation(...)
  spareName    String           // "Mechanical Seal", "Bearing SKF 6205"
  partNumber   String?
  quantity     Int   @default(1)  // Min stock required
  unit         String @default("EA")
  criticality  String @default("NORMAL")  // CRITICAL, NORMAL, OPTIONAL
  vendor       String?
  leadTimeDays Int?
  remarks      String?
}
```

### Missing Model: EquipmentDocument
```prisma
model EquipmentDocument {
  id           String @id @default(uuid())
  equipmentTag String
  docType      String  // 'OEM_MANUAL', 'DRAWING', 'CERTIFICATE', 'WARRANTY', 'INSPECTION'
  title        String
  fileUrl      String
  version      String?
  uploadedBy   String
  uploadedAt   DateTime @default(now())
}
```

---

## 3. PROCUREMENT (Case) MODULE

### Current State
```
Case: id, title, type, currentStage, createdAt, vendor, prValue, poValue,
  currency, prNumber, poNumber, tag (assetTag), departmentId
```

### Missing Fields

```prisma
// Add to Case:
priority           String   @default("NORMAL")  // LOW, NORMAL, HIGH, URGENT
deliveryAddress    String?
expectedDeliveryDate DateTime?
actualDeliveryDate  DateTime?
grDate             DateTime?   // Goods Receipt date
grNumber           String?     // GRN number
inspectionDate     DateTime?
inspectionBy       String?
inspectionResult   String?     // PASS, FAIL, CONDITIONAL
warrantyPeriodMonths Int?
warrantyExpiry     DateTime?
urgencyJustification String?  // Why HIGH/URGENT priority
indentor           String?     // Person who raised the indent
approvedBy         String?
approvalDate       DateTime?
closedAt           DateTime?
closedBy           String?
```

**Rename `tag` → `assetTag`** (currently just a string, no FK)
- Should eventually have FK to RunningEquipmentMaster / InstrumentMaster

### Missing Model: CaseAttachment
```prisma
model CaseAttachment {
  id       String @id @default(uuid())
  caseId   String
  case     Case   @relation(...)
  docType  String  // 'PR', 'QUOTATION', 'PO', 'INVOICE', 'GRN', 'INSPECTION'
  fileName String
  fileUrl  String
  uploadedBy String
  uploadedAt DateTime @default(now())
}
```

### Stage Transition Log (currently missing)
```prisma
model CaseStageHistory {
  id          String   @id @default(uuid())
  caseId      String
  case        Case     @relation(...)
  fromStage   String
  toStage     String
  changedBy   String
  changedAt   DateTime @default(now())
  remarks     String?
}
```

---

## 4. CALIBRATION MODULE

### Current State
- Has TWO calibration systems: `CalibrationLog` (old simple) + `CalibrationEvent` (new ISO 10012)
- This causes confusion — which one is the source of truth?

### Recommended Action
**Deprecate `CalibrationLog`** — migrate any data to `CalibrationEvent`. The `CalibrationEvent` + `CalibrationPoint` models fully cover ISO 10012. Keep `CalibrationLog` in schema temporarily with a `@deprecated` note.

### Missing Fields in InstrumentMaster

```prisma
// Add to InstrumentMaster:
commissionDate        DateTime?
decommissionDate      DateTime?
locationDescription   String?     // "Separator S-101, Inlet nozzle"
hazardousAreaZone     String?     // "Zone 1", "Zone 2", "Safe Area"
ipRating              String?     // "IP66", "IP67"
sensorType            String?     // "4-20mA", "HART", "Foundation Fieldbus", "Wireless"
failSafeDirection     String?     // "Fail Open", "Fail Close", "Fail Last"
certificationRequired Boolean     @default(false)  // External cert needed?
lastMaintenanceDate   DateTime?   // Auto-updated from MaintenanceLog sync
flId                  String?     // FK → FunctionalLocation linkage
departmentId          String?
qrCode                String?
```

### Missing Model: CalibrationDueAlert
```prisma
model CalibrationDueAlert {
  id              String   @id @default(uuid())
  instrumentTagId String
  alertType       String   // 'DUE_SOON', 'OVERDUE'
  dueDate         DateTime
  alertDate       DateTime
  notifiedTo      String[] // email list
  isAcknowledged  Boolean  @default(false)
  acknowledgedBy  String?
  acknowledgedAt  DateTime?
}
```

---

## 5. MAINTENANCE LOG / REPORTS MODULE

### Current State
```
MaintenanceLog: id, date, installationId, department, section, jobType,
  reportCriticality, equipmentTag, serviceLine, equipmentTypeName,
  notificationNo, description, status, startTime, endTime, durationHours,
  remarks, bdReportTime, teamReportTime, jobCompletionTime, pmsScheduleId
```

### Issues
1. `equipmentTag` is a plain string — no enforced FK to any equipment registry
2. BD (Breakdown) reports lack structured root cause analysis
3. No attachment support (photos of breakdown/repair)
4. `reportCriticality` (1/2/3) is an integer but should be labeled for UI clarity

### Missing Fields

```prisma
// Add to MaintenanceLog:
workOrderId       String?    // FK → WorkOrder (if raised from WO module)
procurementCaseId String?    // FK → Case (if spares were procured for this job)
mohRecordId       String?    // FK → MOHRecord (if part of major overhaul)
parentLogId       String?    // FK → MaintenanceLog (for follow-up jobs)
attachmentCount   Int        @default(0)  // denormalized count
isolationRequired Boolean    @default(false)
isolationPermitNo String?    // PTW / Isolation permit number
```

### Missing Model: MaintenanceLogAttachment
```prisma
model MaintenanceLogAttachment {
  id               String         @id @default(uuid())
  maintenanceLogId String
  log              MaintenanceLog @relation(...)
  fileType         String         // 'PHOTO', 'VIDEO', 'DOCUMENT'
  fileName         String
  fileUrl          String
  caption          String?
  uploadedBy       String
  uploadedAt       DateTime       @default(now())
}
```

### Missing Model: BreakdownAnalysis
```prisma
model BreakdownAnalysis {
  id               String         @id @default(uuid())
  maintenanceLogId String         @unique
  log              MaintenanceLog @relation(...)

  // Root Cause Analysis (RCA)
  failureMode      String?   // ISO 14224 failure mode code
  failureMechanism String?   // Wear, Corrosion, Fatigue, etc.
  rootCause        String?   // Human, Equipment, External, etc.
  immediateAction  String?   // What was done to restore
  correctiveAction String?   // What will prevent recurrence
  preventiveAction String?   // Long term fix / recommendation

  downtime         Float?    // Equipment downtime in hours
  productionLoss   Float?    // Estimated production loss
  repairCost       Float?

  analysisBy       String?
  reviewedBy       String?
  closedAt         DateTime?
}
```

---

## 6. MRP / STOCK MODULE

### Current State
The schema has **no MRP/Stock models at all** — this is a major gap.
The frontend has `MRPHub`, `RequirementList`, `RequirementForm`, `DraftManager` components
but there's no backing schema.

### Recommended New Models

```prisma
model StockItem {
  id            String   @id @default(uuid())
  itemCode      String   @unique
  description   String
  category      String   // SPARE, CONSUMABLE, CHEMICAL, TOOL, SAFETY
  unit          String   // EA, KG, LTR, MTR

  currentStock  Float    @default(0)
  minStock      Float    @default(0)   // Reorder level
  maxStock      Float?

  location      String?  // Store bin/shelf location
  make          String?
  partNumber    String?

  unitPrice     Float?
  totalValue    Float?   // currentStock × unitPrice

  relatedEquipmentTags String[]  // Which equipment this spare is for

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model MaterialRequest {
  id            String   @id @default(uuid())
  mrNumber      String   @unique  // MR-2025-0001

  requestedBy   String
  departmentId  String?
  installationId String?

  priority      String   @default("NORMAL")
  requiredByDate DateTime?
  purpose       String?  // "BD Repair for K-101", "PM Service for June"

  status        String   @default("DRAFT")  // DRAFT, SUBMITTED, APPROVED, ISSUED, CLOSED

  items         MaterialRequestItem[]

  approvedBy    String?
  approvalDate  DateTime?
  issuedBy      String?
  issueDate     DateTime?

  remarks       String?

  // Link to driving document
  maintenanceLogId  String?  // FK → MaintenanceLog (BD/PM that triggered this)
  workOrderId       String?  // FK → WorkOrder
  procurementCaseId String?  // FK → Case (if procurement needed)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model MaterialRequestItem {
  id                  String          @id @default(uuid())
  materialRequestId   String
  request             MaterialRequest @relation(...)

  stockItemId         String?         // FK → StockItem (if available in store)
  description         String          // Item description (if not from stock)
  quantity            Float
  unit                String

  issuedQuantity      Float?          // Actual qty issued
  balanceQuantity     Float?          // remaining after issue

  remarks             String?
}

model StockTransaction {
  id           String    @id @default(uuid())
  stockItemId  String
  item         StockItem @relation(...)

  txType       String    // 'RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'SCRAP'
  quantity     Float
  unitPrice    Float?
  totalValue   Float?

  referenceNo  String?   // GRN, MR number, PO number

  performedBy  String
  txDate       DateTime  @default(now())
  remarks      String?
}
```

---

## 7. ENERGY MODULE

### Current State
```
DailyEnergyLog: date, fuelType, fuelQuantity, electricityKwh, generatorHours
MonthlyElectricityBill: month, year, unitsConsumed, billAmount
```

### Missing Fields / Models

```prisma
// Add to DailyEnergyLog:
shift             String?   // DAY, NIGHT
equipmentTag      String?   // FK → RunningEquipmentMaster (which generator/engine)
peakDemandKw      Float?
powerFactorAvg    Float?
dieselPricePerLtr Float?
gasPricePerMcm    Float?
carbonEmissionTon Float?   // Calculated: fuel × emission factor

// New: Per-equipment energy consumption tracking
model EquipmentEnergyLog {
  id           String   @id @default(uuid())
  date         DateTime
  shift        String
  equipmentTag String
  equipment    RunningEquipmentMaster @relation(...)

  runHours     Float?
  kwhConsumed  Float?
  fuelConsumed Float?
  fuelUnit     String?

  specificConsumption Float?  // kWh/unit output (efficiency metric)

  loggedBy     String
  createdAt    DateTime @default(now())
}
```

---

## 8. WORKSHOP MODULE

### Current State
```
WorkshopJob: jobNumber, shopType, title, equipmentTag (string), workOrderRef (string)
```

### Issues
- `equipmentTag` has no FK constraint
- `workOrderRef` has no FK constraint
- No parts tracking
- No sub-tasks

### Missing Fields / Models

```prisma
// Add to WorkshopJob:
mohRecordId       String?   // FK → MOHRecord
maintenanceLogId  String?   // FK → MaintenanceLog (auto-create log on completion)
installationId    String?   // Properly typed

// New: Workshop Job Materials
model WorkshopJobMaterial {
  id           String      @id @default(uuid())
  jobId        String
  job          WorkshopJob @relation(...)
  description  String
  partNumber   String?
  quantity     Float
  unit         String
  stockItemId  String?     // FK → StockItem
  cost         Float?
  source       String      @default("STORE")  // STORE, PURCHASE, REUSE
  remarks      String?
}

// New: Workshop Job Photos
model WorkshopJobPhoto {
  id         String      @id @default(uuid())
  jobId      String
  job        WorkshopJob @relation(...)
  caption    String?
  photoUrl   String
  takenAt    DateTime    @default(now())
  takenBy    String
  stage      String?     // 'BEFORE', 'DURING', 'AFTER'
}
```

---

## 9. MOH (MAJOR OVERHAUL) MODULE

### Issues
- `equipmentId` (String?) and `equipmentTag` (String) are redundant
- No FK constraint on equipmentTag
- No task-level tracking (just a single scopeOfWork text)
- No parts consumed tracking

### Missing Models

```prisma
model MOHTask {
  id          String    @id @default(uuid())
  mohId       String
  moh         MOHRecord @relation(...)

  taskCode    String?   // From MaintenanceStrategy
  description String
  sequence    Int
  status      String    @default("PENDING")

  plannedHours  Float?
  actualHours   Float?
  performedBy   String?
  completedAt   DateTime?
  remarks       String?
}

model MOHPart {
  id          String    @id @default(uuid())
  mohId       String
  moh         MOHRecord @relation(...)

  description String
  partNumber  String?
  quantity    Float
  unit        String
  unitCost    Float?
  totalCost   Float?
  source      String    // 'STORE', 'PROCUREMENT'
  caseId      String?   // FK → Case if procured
  stockItemId String?   // FK → StockItem if from store
}
```

---

## 10. TRAINING MODULE

### Issues
- `TrainingAttendee.employeeId` is a plain string — should link to `Manpower` or `User`
- No certificate issuance model
- No competency/skill matrix

### Missing Models

```prisma
model TrainingCertificate {
  id           String          @id @default(uuid())
  attendeeId   String
  attendee     TrainingAttendee @relation(...)

  certificateNo String        @unique
  issuedDate    DateTime
  expiryDate    DateTime?      // Some certs expire (BOSIET, H2S, etc.)

  issuedBy     String
  fileUrl      String?
}

model CompetencyMatrix {
  id           String   @id @default(uuid())
  employeeId   String   // FK → Manpower

  competencyType String  // 'EQUIPMENT_OPERATION', 'MAINTENANCE', 'HSE', 'CERTIFICATION'
  competencyName String  // "Operation of Centrifugal Pump", "H2S Awareness"

  status       String   @default("NOT_TRAINED")  // NOT_TRAINED, TRAINED, CERTIFIED, EXPIRED
  trainedDate  DateTime?
  expiryDate   DateTime?
  trainingId   String?  // FK → TrainingRecord

  assessedBy   String?
  score        Float?
  remarks      String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([employeeId, competencyName])
}
```

---

## 11. COLLABORATION MODULE

### Issues
- `Discussion.authorId`, `DiscussionReply.authorId`, `Feedback.authorId` are plain strings — no FK to User
- No attachment support for discussions
- No tagging to equipment/incidents

### Fix
```prisma
// In Discussion, DiscussionReply, Feedback: authorId should FK → User
// Add:
linkedEquipmentTag String?   // Link discussion to specific equipment
linkedIncidentId   String?   // Link to breakdown/maintenance event
attachments        String[]  // File URLs
```

---

## 12. DATA FLOW: END-TO-END REPORT → EQUIPMENT LOG

### Current Flow (FIXED in this update)

```
DailyLogForm (Frontend)
  → POST /api/maintenance/logs
  → createMaintenanceLog (Controller)
  → prisma.maintenanceLog.create()  ← Stores DPR/Report
  → syncDprToEquipmentLog()         ← Auto-save to EquipmentLog
       ↓ (RUNNING_EQUIPMENT only)
       prisma.equipmentLog.create() ← Equipment operational log
       ↓ (INSTRUMENT)
       MaintenanceLog IS the record ← No separate sync needed
```

### New Endpoint for Equipment History Tab
```
GET /api/maintenance/equipment/:tag/history
→ Returns merged MaintenanceLogs + EquipmentLogs for that tag
→ Frontend Assets module can call this to show full history
```

### Cross-Module Auto-Sync (RECOMMENDED — future implementation)

| Trigger | Auto-creates in |
|---|---|
| WorkshopJob status → COMPLETED | MaintenanceLog (workshop job type) |
| MOHRecord status → COMPLETED | MaintenanceLog (major overhaul type) |
| CalibrationEvent created | MaintenanceLog (calibration job type) |
| WorkOrder status → CLOSED | MaintenanceLog (work order type) |

---

## 13. SCHEMA MIGRATION PRIORITY

### Priority 1 (Critical — affects data integrity)
1. Add `equipmentTag` FK constraints (currently plain strings with no validation)
2. Add MRP/Stock models (StockItem, MaterialRequest — currently no schema backing the UI)
3. Fix `Case.tag` → rename to `assetTag`, add FK to equipment

### Priority 2 (Important — affects functionality)
4. Add `RunningEquipmentMaster.criticality`, `commissionDate`, `departmentId`, `flId`
5. Add `InstrumentMaster.lastMaintenanceDate` (auto-populated from sync)
6. Add `BreakdownAnalysis` model for structured BD RCA
7. Deprecate `CalibrationLog` — consolidate into `CalibrationEvent`

### Priority 3 (Enhancement — analytics and reporting)
8. Add `CaseStageHistory` for audit trail
9. Add `CompetencyMatrix` for training linkage
10. Add `EquipmentDocument` for document management
11. Add `EquipmentSpareList` for critical spares inventory

---

## 14. MIGRATION COMMANDS

When ready to apply schema changes to running Docker:

```bash
# 1. Edit prisma/schema.prisma with additions above
# 2. Generate migration
docker exec deploy-server-1 npx prisma migrate dev --name "add_equipment_fields_mrp_schema"

# OR for production (no rollback):
docker exec deploy-server-1 npx prisma migrate deploy

# 3. Regenerate Prisma client
docker exec deploy-server-1 npx prisma generate

# 4. Restart server
docker compose -f deploy/docker-compose.yml restart server
```
