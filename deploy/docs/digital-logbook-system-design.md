# Digital Logbook Redesign

## Purpose

Design a proper digital logbook system for the maintenance platform where:

- running equipment and compressors can have operational logs
- instruments are limited to calibration history and maintenance history
- maintenance activity is captured from the field report flow, not as a separate duplicate entry
- running hours and operating parameters can be entered manually, automatically from live data, or in hybrid mode
- special assets such as gas compressors have richer process logs
- the UI supports shift operations, supervisor review, asset history, and analytics

This redesign is grounded in the current codebase:

- running hours UI is currently ad hoc and parameter-driven from local state in [RunningHoursLog.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/logbook/components/RunningHoursLog.tsx>)
- maintenance logs already originate from the field report form in [DailyLogForm.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/reports/components/DailyLogForm.tsx>)
- backend currently mixes maintenance events and operating logs by auto-creating `EquipmentLog` rows from field reports in [maintenance.controller.ts](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/server/src/controllers/maintenance.controller.ts>)
- compressor process logging exists, but as an isolated flow in [CompressionLog.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/logbook/components/CompressionLog.tsx>) and `GasCompressionLog` in [schema.prisma](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/server/prisma/schema.prisma>)

## Current Problems

### 1. Work logs and operating logs are conflated

`MaintenanceLog` is a work-execution event. `EquipmentLog` is an operating log. They should not be written from the same action.

Current issue:

- field report submission writes a maintenance record and then attempts a `DPR -> EquipmentLog` sync
- `runStatus` is inferred from `jobType !== 'BD'`, which is operationally incorrect
- breakdown maintenance does not always mean the equipment was stopped for the full logged duration
- preventive maintenance work does not mean the equipment was running

### 2. Operational parameters are unstructured

Current running-hours UI stores arbitrary parameters in JSON and derives columns from local UI state. That is useful for experimentation, but weak for enterprise analytics because:

- parameters are not governed per asset class/type
- units, min/max, required/optional flags, and alert thresholds are not modeled
- charting and comparisons across assets are inconsistent

### 3. Auto-captured equipment is not modeled differently

Some assets have live data. The system currently has no first-class source model for:

- telemetry origin
- tag mapping
- sample quality
- aggregation rules
- manual override and supervisor reconciliation

### 4. Compressor logs are under-modeled

Gas compressors need more than runtime:

- fuel gas
- suction/discharge
- input gas
- output gas
- stage conditions
- shutdown reasons
- throughput and efficiency

The existing `GasCompressionLog` is useful but too narrow for full operational analysis.

## Design Principles

1. Separate work history from operating history.
2. Use one logbook experience, but multiple source modes:
   - `MANUAL`
   - `AUTO`
   - `HYBRID`
3. Model parameter definitions centrally, not in browser local storage.
4. Keep the asset timeline unified:
   - operational logs
   - maintenance events
   - alarms/exceptions
   - work orders
   - process logs
5. Use TimescaleDB properly for time-series telemetry and aggregates.
6. Support both operator data entry and supervisor validation.
7. Keep instrument history separate from runtime logging.

## Target Domain Model

### A. Maintenance Activity

Maintenance remains event-based and comes from the field report page.

Keep:

- `MaintenanceLog` as the canonical maintenance event

Change:

- stop auto-writing `EquipmentLog` inside `createMaintenanceLog`
- instead, optionally generate:
  - `DowntimeEvent`
  - `ConditionObservation`
  - `MaintenanceImpact`

### B. Operational Logbook

Replace the current generic role of `EquipmentLog` with a clearer model:

#### `OperationalLog`

One row per equipment, per date, per shift, or per day depending on profile.

Suggested fields:

```prisma
model OperationalLog {
  id                  String   @id @default(uuid())
  logDate             DateTime
  shift               String?  // DAY, NIGHT, GENERAL
  granularity         String   // SHIFT, DAILY, HOURLY_SUMMARY
  sourceMode          String   // MANUAL, AUTO, HYBRID
  sourceStatus        String   // DRAFT, AUTO_CAPTURED, REVIEWED, APPROVED, REJECTED

  installationId      String
  equipmentTag        String

  runtimeHours        Float?   // actual running hours in the period
  downtimeHours       Float?   // stopped / unavailable hours
  standbyHours        Float?
  cumulativeHours     Float?

  operatingState      String?  // RUNNING, STOPPED, STANDBY, TRIPPED, MAINTENANCE
  availabilityStatus  String?  // AVAILABLE, DEGRADED, UNAVAILABLE

  enteredBy           String?
  reviewedBy          String?
  approvedBy          String?
  approvedAt          DateTime?

  remarks             String?
  qualityScore        Float?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

#### `OperationalMetricDefinition`

Master definition of metrics.

```prisma
model OperationalMetricDefinition {
  id              String   @id @default(uuid())
  code            String   @unique
  label           String
  unit            String?
  assetClass      String?  // MOTOR, PUMP, COMPRESSOR, GENERATOR
  valueType       String   // NUMBER, BOOLEAN, ENUM, TEXT
  captureType     String   // MANUAL, AUTO, EITHER
  aggregationRule String?  // LAST, AVG, MIN, MAX, SUM
  alertMin        Float?
  alertMax        Float?
  warningMin      Float?
  warningMax      Float?
  displayGroup    String?  // PRESSURE, TEMPERATURE, ENERGY, FLOW, HEALTH
  sortOrder       Int      @default(0)
  isRequired      Boolean  @default(false)
  isActive        Boolean  @default(true)
}
```

#### `OperationalLogMetric`

Actual captured values per log.

```prisma
model OperationalLogMetric {
  id                 String   @id @default(uuid())
  operationalLogId   String
  metricDefinitionId String

  valueNumber        Float?
  valueText          String?
  valueBoolean       Boolean?
  valueEnum          String?

  sourceQuality      String?  // GOOD, BAD, SUBSTITUTED, MANUAL_OVERRIDE
  sourceTag          String?
  readingTimestamp   DateTime?

  createdAt          DateTime @default(now())

  @@unique([operationalLogId, metricDefinitionId])
}
```

### C. Asset Log Profile

Every equipment does not need the same logbook shape.

Add a configurable log profile:

```prisma
model AssetLogProfile {
  id                String   @id @default(uuid())
  assetClass        String   // RUNNING_EQUIPMENT, COMPRESSOR
  equipmentTypeId   String?
  equipmentTag      String?  @unique

  logGranularity    String   // SHIFT, DAILY
  defaultSourceMode String   // MANUAL, AUTO, HYBRID
  requiresApproval  Boolean  @default(false)
  allowBackdated    Boolean  @default(true)
  active            Boolean  @default(true)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

and a join table:

```prisma
model AssetLogProfileMetric {
  id                 String   @id @default(uuid())
  assetLogProfileId  String
  metricDefinitionId String
  isRequired         Boolean  @default(false)
  sequence           Int      @default(0)
  defaultVisible     Boolean  @default(true)

  @@unique([assetLogProfileId, metricDefinitionId])
}
```

This replaces the current browser-only template system in `RunningHoursLog.tsx`.

### D. Instrument History

Instruments do not participate in the operational logbook.

Use:

- `CalibrationEvent` / `CalibrationLog` for calibration history
- `MaintenanceLog` for instrument work carried out from field reports

Recommended UI:

- instrument history on the calibration side
- timeline made of:
  - calibration events
  - maintenance events
  - work orders

Do not expose:

- running hours entry
- runtime / downtime summaries
- compressor-style operating parameters

### E. Telemetry / Live Data

Use the existing TimescaleDB deployment for telemetry samples.

#### `TelemetrySource`

```prisma
model TelemetrySource {
  id            String   @id @default(uuid())
  name          String
  sourceType    String   // OPC_UA, MODBUS, MQTT, SCADA_API, CSV_PUSH
  baseUrl       String?
  pollInterval  Int?
  authConfig    Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### `TelemetryPointMap`

```prisma
model TelemetryPointMap {
  id                 String   @id @default(uuid())
  telemetrySourceId  String
  equipmentTag       String
  metricDefinitionId String
  sourceTag          String
  aggregationRule    String   // AVG, LAST, SUM, RUNTIME
  scaleFactor        Float?   @default(1)
  offsetValue        Float?   @default(0)
  active             Boolean  @default(true)
}
```

#### `TelemetrySample`

Store as hypertable in TimescaleDB:

- `sample_time`
- `equipment_tag`
- `metric_code`
- `numeric_value`
- `quality`
- `source_tag`

This is not for the daily UI directly. It is the raw layer.

#### `OperationalLogAutoCaptureJob`

Background job that:

- aggregates raw telemetry into daily/shift `OperationalLog`
- writes `OperationalLogMetric`
- flags missing or suspicious data
- marks source as `AUTO_CAPTURED`

### F. Specialized Process Logs for Compressors

Keep `GasCompressionLog`, but make it a special process-log layer linked to the operational log.

Revised direction:

```prisma
model CompressorProcessLog {
  id                  String   @id @default(uuid())
  operationalLogId    String?  @unique
  compressorId        String
  installationId      String?
  logDate             DateTime
  shift               String?

  inputGasVolume      Float?
  outputGasVolume     Float?
  fuelGasVolume       Float?
  recycleGasVolume    Float?
  flareGasVolume      Float?

  suctionPressure     Float?
  dischargePressure   Float?
  interstagePressure  Float?
  suctionTemp         Float?
  dischargeTemp       Float?
  lubeOilPressure     Float?
  lubeOilTemp         Float?
  jacketWaterTemp     Float?
  vibration           Float?

  runtimeHours        Float?
  loadPct             Float?
  efficiencyPct       Float?
  tripCount           Int      @default(0)
  shutdownReason      String?

  sourceMode          String   // MANUAL, AUTO, HYBRID
  remarks             String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

This supports proper compressor analytics:

- throughput
- specific fuel consumption
- discharge performance
- trip behaviour
- load efficiency

## Target Workflows

### 1. Maintenance Workflow

User path:

- operator or technician uses field report page
- fills work done, timing, manpower, job type, notes, equipment
- submits one `MaintenanceLog`

System behaviour:

- no direct operating log is created
- if the log indicates outage, create `DowntimeEvent`
- if tied to work order, update WO progress
- append to asset timeline

### 2. Manual Operations Workflow

For pumps, motors, generators, package units, utilities:

- supervisor opens `Operations Logbook`
- sees pending assets for the shift/day
- enters runtime, cumulative hours, state, and configured metrics
- submits log

System behaviour:

- creates `OperationalLog`
- writes metric rows
- runs validation:
  - cumulative must not decrease
  - runtime cannot exceed 24h or shift max
  - values outside warning/alert range are flagged

### 3. Auto-Captured Workflow

For equipment with SCADA/live feed:

- telemetry collector ingests raw samples
- aggregation job creates draft `OperationalLog`
- operator reviews only exceptions or missing values
- approve or override

System behaviour:

- log shows source as `AUTO` or `HYBRID`
- audit trail captures manual overrides

### 4. Compressor Workflow

For gas compressors and similar process assets:

- operator enters or reviews process volumes and operating envelope
- specialized compressor form is shown instead of generic running-hours form

System behaviour:

- `OperationalLog` stores runtime summary
- `CompressorProcessLog` stores process details
- dashboards compute efficiency, trip rate, and throughput

## UI Design

## A. New Logbook Module Structure

Replace the current generic pages with a clearer shell:

1. `Operations Overview`
2. `Daily / Shift Entry`
3. `Asset Timeline`
4. `Compressor Console`
5. `Exceptions & Review`
6. `Analytics`

### 1. Operations Overview

Purpose:

- control room / supervisor landing page

Cards:

- assets pending log submission
- total runtime today
- downtime today
- top exceptions
- logs auto-captured vs manual
- compressor throughput today

Visuals:

- stacked runtime vs downtime bar by installation
- sparkline for last 7 days runtime
- heatmap of missing log submissions

### 2. Daily / Shift Entry

Primary entry screen.

Layout:

- left rail: installations and due assets
- center: asset cards by due status
- right panel: selected asset log form

Behavior:

- form renders from `AssetLogProfile`
- required metrics highlighted
- previous shift/day values shown inline
- auto-filled values for telemetry assets remain editable if hybrid

### 3. Asset Timeline

A single timeline per asset that merges:

- operational logs
- maintenance logs
- work orders
- downtime events
- alarms/exceptions
- compressor process logs

This is the most important asset-view screen.

### 4. Compressor Console

A dedicated cockpit for compressor-class assets.

Tabs:

- Throughput
- Fuel / Gas Balance
- Pressure / Temperature
- Trips / Shutdowns
- Maintenance Correlation

Charts:

- input vs output gas trend
- fuel gas per unit output
- suction vs discharge envelope
- runtime vs load
- trip count trend

### 5. Exceptions & Review

For supervisors:

- missing logs
- abnormal values
- telemetry gaps
- manual override queue
- approval queue

### 6. Analytics

Role-based analytics pages.

Views:

- installation view
- asset-class view
- asset-detail view
- compressor fleet view

## Visualisation Strategy

### Core charts

- runtime vs downtime stacked bars
- trend lines for key metrics
- operating envelope scatter plots
- parameter deviation bands with thresholds
- heatmaps for availability and data quality
- Sankey-style gas balance for compressors if desired later

### Key KPI tiles

- utilization %
- availability %
- average runtime/day
- bad-actor assets
- MTBF
- MTTR
- breakdown count
- logs submitted on time %
- auto-capture success %
- compressor specific fuel consumption

### Analytics drill-down

Clicking any KPI should drill to:

- installation
- equipment tag
- date range
- event list

## Analytics Model

### Operational analytics

- runtime hours by asset / installation / day
- downtime hours by reason
- utilization by class
- standby vs running split
- cumulative hour progression

### Reliability analytics

- MTBF from downtime events / breakdown logs
- MTTR from maintenance completion timings
- repeat failure assets
- maintenance against runtime

### Maintenance correlation

- breakdowns after threshold overruns
- maintenance hours vs runtime
- PM compliance vs downtime trend

### Compressor analytics

- input vs output gas ratio
- fuel gas consumption per output gas
- suction/discharge deviation
- average load factor
- trip frequency
- hours since last overhaul vs performance drop

### Data quality analytics

- missing shift logs
- telemetry gaps
- overridden auto-captured values
- values outside configured range

## API Design

### Keep

- `/api/maintenance/logs`

### Introduce

- `/api/operations/logs`
- `/api/operations/logs/:id`
- `/api/operations/logs/pending`
- `/api/operations/logs/exceptions`
- `/api/operations/assets/:equipmentTag/timeline`
- `/api/operations/profiles`
- `/api/operations/metrics`
- `/api/operations/review/:id/approve`
- `/api/operations/review/:id/reject`

### Telemetry

- `/api/telemetry/sources`
- `/api/telemetry/point-maps`
- `/api/telemetry/assets/:equipmentTag/latest`
- `/api/telemetry/assets/:equipmentTag/trend`

### Compressor

- `/api/process/compressors/logs`
- `/api/process/compressors/:compressorId/dashboard`
- `/api/process/compressors/:compressorId/performance`

## Rules Engine

Add a light validation/rules layer:

- runtime + downtime + standby cannot exceed shift/day total
- cumulative hours must be monotonic
- compressor output gas cannot exceed impossible bounds
- telemetry samples with bad quality do not auto-approve
- required metrics depend on asset profile

## Permissions

Roles:

- operator: create manual logs
- supervisor: review, approve, override
- engineer: analyze, annotate
- admin: configure profiles and telemetry mappings
- contractor: only assets in contract scope

## Implementation Direction

### Phase 1: Correct the domain split

1. Stop syncing `MaintenanceLog` into `EquipmentLog`.
2. Add new `OperationalLog` tables.
3. Migrate current running-hours UI to `/api/operations/logs`.
4. Keep maintenance history sourced only from field reports.

### Phase 2: Parameter governance

1. Add `OperationalMetricDefinition`.
2. Add `AssetLogProfile` and profile metrics.
3. Replace localStorage templates in UI with backend-driven forms.

### Phase 3: Telemetry and hybrid mode

1. Add telemetry source and point mapping.
2. Add raw sample ingestion and daily aggregation.
3. Add review workflow for auto-generated logs.

### Phase 4: Compressor cockpit

1. Expand compressor process schema.
2. Build compressor console and performance analytics.

### Phase 5: Reliability analytics

1. Downtime events
2. MTBF / MTTR
3. alerting and exception dashboards

## Immediate Refactors Needed in Current Code

1. [maintenance.controller.ts](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/server/src/controllers/maintenance.controller.ts>)
   Remove `DPR -> EquipmentLog` creation.

2. [RunningHoursLog.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/logbook/components/RunningHoursLog.tsx>)
   Replace local parameter templates with backend log profiles and metric definitions.

3. [MaintenanceLog.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/logbook/components/MaintenanceLog.tsx>)
   Make this a read-only maintenance history view over `MaintenanceLog`, not a pseudo-logbook.

4. [CompressionLog.tsx](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/src/modules/logbook/components/CompressionLog.tsx>)
   Rebuild as a specialized process log tied to the operational summary layer.

5. [schema.prisma](</Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/server/prisma/schema.prisma>)
   Add the new operational, telemetry, and process-log models; keep `MaintenanceLog` as the work-event source of truth.

## Recommended Final Product Shape

In the finished system:

- field work is captured once, in field reports
- daily/shift operations are captured once, in the operational logbook
- live-data assets are auto-populated and reviewed, not manually re-entered
- compressors have a richer process dashboard than standard equipment
- every running equipment asset has one timeline that combines operation, maintenance, and reliability history
- instruments use calibration history plus maintenance history instead of operational timelines

This is the correct enterprise model for the app. It removes duplication, supports telemetry, and gives supervisors meaningful analytics rather than flat tables.
