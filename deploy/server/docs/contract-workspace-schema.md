# Contract Workspace Schema

This schema merges the existing `deploy` maintenance platform with the contractor execution patterns from the CMS app.

## Kept From `deploy`

- `InstrumentMaster`
- `RunningEquipmentMaster`
- `MaintenanceRequest`
- `WorkOrder`
- `WorkOrderTeam`
- `Contract`
- `FLAssetAssignment`

These remain the system-of-record tables for shared plant data.

## Brought In From the CMS App

- Contract-scoped user membership and role-based access
- Installation and asset scoping for third-party visibility
- Forward contractor execution stages on work orders
- Structured contractor report submission tied to the same work orders and assets
- Work-order timeline history for contractor-facing execution flow

## New Tables

- `ContractUserAccess`
  - maps users to a contract workspace with explicit execution permissions
- `ContractInstallationScope`
  - limits contract access to specific installations
- `ContractInstrumentTypeScope`
  - limits contract access by instrument type and service line
- `ContractEquipmentScope`
  - limits contract access by equipment category, type, tag, or service line
- `ContractFunctionalLocationScope`
  - optional FL-level scoping when access follows plant hierarchy
- `WorkOrderExecutionLog`
  - contractor-style execution timeline on top of the existing work-order table
- `ContractorReport`
  - structured field reports for instruments/equipment/work orders with internal review

## Extended Tables

- `User`
  - adds `isExternal`, company/profile fields, contract access relations, assignment relations
- `Contract`
  - becomes the workspace root with flags like `externalAccessEnabled`, `shareAllInstrumentTypes`, and route-friendly `workspaceSlug`
- `MaintenanceRequest`
  - gains `contractId`, `createdByUserId`, `requestOrigin`, and `assetClass`
- `WorkOrder`
  - gains `contractId`, contractor `executionStage`, execution timestamps, and creator link
- `WorkOrderTeam`
  - can now point at an actual `User` for assignable internal/external workforce

## Execution Model

- Internal and external users write into the same `MaintenanceRequest`, `WorkOrder`, and asset master tables.
- Visibility is controlled by contract access plus installation/asset/FL scope.
- Contractors submit evidence through `ContractorReport`.
- Internal reviewers can approve, reject, or request revision without duplicating data into a second system.
