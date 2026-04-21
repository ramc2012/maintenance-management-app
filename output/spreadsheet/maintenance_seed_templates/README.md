# Maintenance Seed Template Catalog

These workbooks were generated from the live Prisma schema in `deploy/server/prisma/schema.prisma`.

## 01_admin_org_templates.xlsx

Administration, users, organization, and budget masters

Sheets: Company, Department, User, Budget, LaborRate

## 02_procurement_templates.xlsx

Procurement case and commentary seeding

Sheets: Case, CaseComment

## 03_equipment_registry_templates.xlsx

Equipment, instruments, calibration masters, and registry data

Sheets: Installation, InstrumentType, MeterType, EquipmentType, Product, CalibrationPerformer, CalibrationStandard, InstrumentMaster, RunningEquipmentMaster, CustodyTransferMeter, InternalFlowMeter, PMSchedule, CalibrationLog, ReplacementHistory, PMSInitialState

## 04_asset_hierarchy_templates.xlsx

ISO 14224 asset hierarchy, strategies, and location mapping

Sheets: Site, Area, System, FunctionalLocation, Asset, AssetInstallation, MaintenanceStrategy, StrategyTask, MaintenancePlanAssignment, OperationalReading, SkidConfiguration, SkidDriveTrain, EngineRegistry, FLAssetAssignment, AssignmentAuditLog, StaticEquipment

## 05_work_execution_templates.xlsx

Maintenance requests, work orders, teams, and execution data

Sheets: MaintenanceRequest, WorkOrder, WorkOrderChecklist, WorkOrderTeam, WOAttachment, FailureMode, FailureMechanism, CauseCode, ActionCode, Notification

## 06_calibration_advanced_templates.xlsx

Advanced calibration events, traceability, and reliability models

Sheets: CalibrationEvent, CalibrationPoint, ISO14224Level, RCMAnalysis, CalibrationTraceability, UnifiedCalibrationHistory

## 07_training_energy_operations_templates.xlsx

Operations logs, manpower, training, energy, workshop, and MOH

Sheets: Manpower, MaintenanceLog, MaintenanceLogTeam, EquipmentLog, TrainingRecord, TrainingAttendee, DailyEnergyLog, MonthlyElectricityBill, WorkshopJob, MOHRecord

## 08_collaboration_templates.xlsx

Collaboration, feedback, reactions, and presentation content

Sheets: Discussion, DiscussionReply, DiscussionReaction, ReplyReaction, Feedback, FeedbackReaction, FeedbackComment, Presentation

## 09_contracts_templates.xlsx

Contracts, contractor access scopes, milestones, and reports

Sheets: Contract, ContractMilestone, ContractDocument, ContractUserAccess, ContractInstallationScope, ContractInstrumentTypeScope, ContractEquipmentScope, ContractFunctionalLocationScope, WorkOrderExecutionLog, ContractorReport

## 10_manuals_audit_templates.xlsx

Manual repository, audit observations, process logs, and gas compression

Sheets: ManualFolder, RepositoryDocument, AuditObservation, AuditAction, ActivityAuditLog, GasCompressionLog

## 11_inspection_templates.xlsx

Inspection rounds and execution records

Sheets: InspectionRound, InspectionExecution
