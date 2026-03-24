# ONGC Ankleshwar Asset Maintenance Information System - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Enterprise Hub](#1-enterprise-hub)
3. [Asset Management](#2-asset-management)
4. [Digital Logbook](#3-digital-logbook)
5. [MOH (Major Overhaul)](#4-moh-major-overhaul)
6. [Calibration](#5-calibration)
7. [Work Orders](#6-work-orders)
8. [Procurement](#7-procurement)
9. [Stock/MRP](#8-stockmrp)
10. [Audit Observations](#9-audit-observations)
11. [Training](#10-training)
12. [Energy Management](#11-energy-management)
13. [Workshop](#12-workshop)
14. [Collaboration](#13-collaboration)
15. [Contracts](#14-contracts)
16. [Manuals](#15-manuals)
17. [Manpower](#16-manpower)
18. [Presentations](#17-presentations)
19. [Reports](#18-reports)
20. [General Tips](#general-tips)

---

## Getting Started

### Accessing the Application

- **URL**: http://localhost:8083
- **Login Required**: Yes. Enter your username and password on the login screen.
- **Default Credentials**: admin / admin123 (or as configured by your administrator)

### After Login

After successful login, you will land on the **Enterprise Hub** — the main dashboard. The hub displays tiles for every module in the system. Click any tile to navigate directly to that module.

---

## 1. Enterprise Hub

**Route**: `/hub`

The Enterprise Hub is the central navigation point of the application. It displays tiles representing all available modules. Each tile shows the module name and may include summary statistics (counts, alerts, etc.).

### How to Use

1. After login, you are on the Enterprise Hub by default.
2. Review the tiles to see a summary of each module.
3. Click any tile to navigate to that module.
4. To return to the hub from any module, click the logo or "Enterprise Hub" link in the navigation bar.

---

## 2. Asset Management

**Route**: `/assets`

The Asset Management module is the backbone of the system. It maintains the full equipment registry, functional location hierarchy, metering equipment, calibration history, and master configuration data.

### 2.1 Hierarchy Dashboard

View the complete asset hierarchy organized by installation. This provides a top-down view of all functional locations and the equipment installed at each.

### 2.2 Functional Locations

Browse functional locations within the asset tree structure. Functional locations represent physical positions in the plant where equipment can be installed.

### 2.3 Equipment Registry

The Equipment Registry is organized into three tabs:

- **Mechanical** — Pumps, compressors, turbines, vessels, etc.
- **Electrical** — Motors, transformers, switchgear, etc.
- **Instruments** — Transmitters, control valves, analyzers, etc.

Each tab shows a table of equipment with columns for tag number, description, installation, status, and more. Equipment status can be:

- **Working**
- **Not Working**
- **Under MOH**

You can filter the list by installation and status using the dropdowns at the top of the page.

#### How to Add/Update Equipment

1. Navigate to **Assets** then **Equipment Registry**.
2. Select the appropriate tab: Mechanical, Electrical, or Instruments.
3. Click the **"Add Equipment"** button.
4. Fill in the required fields:
   - **Installation** — Select from dropdown
   - **Equipment Tag** — Unique identifier for this equipment
   - **Description** — Brief description of the equipment
   - **Make** — Manufacturer name
   - **Model** — Model number
   - **Serial No** — Serial number
   - **Specifications** — Technical specifications (capacity, rating, range, etc.)
   - **Status** — Working / Not Working / Under MOH
5. Click **Save** to create the record.

To edit an existing equipment record:

1. Find the equipment in the registry table (use filters if needed).
2. Click the **Edit** icon (pencil) on the row.
3. Modify the fields as needed.
4. Click **Save** to apply changes.

### 2.4 Custody Meters

Manage custody transfer metering equipment. These are meters used for fiscal measurement of oil and gas at transfer points.

#### How to Add/Update Custody Meters

1. Navigate to **Assets** then **Custody Meters**.
2. Click **"Add Meter"** to create a new entry.
3. Fill in: Installation, Meter Tag, Type, Make, Model, Range, Accuracy Class.
4. Click **Save**.
5. To edit, click the Edit icon on any existing meter record and update the fields.

### 2.5 Internal Meters

Manage internal flow meters used for process monitoring and allocation purposes.

#### How to Add/Update Internal Meters

1. Navigate to **Assets** then **Internal Meters**.
2. Click **"Add Meter"** to create a new entry.
3. Fill in: Installation, Meter Tag, Type, Description, Range.
4. Click **Save**.
5. To edit, click the Edit icon on any existing record and update as needed.

### 2.6 Equipment History

View the full history of an instrument or equipment item, including calibration events, replacements, and maintenance actions.

#### How to View Equipment History

1. Navigate to **Assets** then **Equipment History**.
2. Select an instrument or equipment tag from the dropdown or search field.
3. The system displays the complete history: calibration records, replacement records, and associated maintenance events.

### 2.7 Calibration Records

Enter and manage calibration records following the ISO 10012 standard directly from the Asset module.

#### How to Add a Calibration Record

1. Navigate to **Assets** then **Calibration Records**.
2. Click **"New Calibration"**.
3. Select the instrument tag.
4. Enter calibration date, reference standard used, ambient conditions.
5. Fill in the multi-point calibration data.
6. Submit the record.

### 2.8 Master Setup

Configure the foundational data used throughout the system.

#### How to Configure Master Data

1. Navigate to **Assets** then **Master Setup**.
2. Configure any of the following:
   - **Equipment Types** — Add or edit types (pump, compressor, transmitter, etc.)
   - **Installations** — Add or edit installation names and codes
   - **Categories** — Define equipment categories and subcategories
3. Click **Add** to create new entries or **Edit** to modify existing ones.
4. Click **Save** after each change.

---

## 3. Digital Logbook

**Route**: `/logbooks`

The Digital Logbook module replaces paper-based shift logs. It captures running hours, gas compression data, and process parameters for all rotating and process equipment.

### 3.1 Running Hours Log (Mechanical / Electrical)

Separate tabs for Mechanical and Electrical equipment running hours.

#### How to Add a Running Hours Entry

1. Navigate to **Logbooks** then **Running Hours** (select the Mechanical or Electrical tab as needed).
2. Use the **Installation filter** at the top to view logs for a specific installation.
3. Click the **"Add Entry"** button.
4. Select **Installation** from the dropdown.
5. The **Equipment** dropdown auto-populates with equipment belonging to that installation. Select the equipment.
6. Enter the following:
   - **Date** — Date of the log entry
   - **Shift** — Shift during which the reading was taken
   - **Run Hours** — Hours the equipment ran during this shift
   - **Cumulative Hours** — Total cumulative running hours
   - **Operating Parameters** — Temperature, pressure, vibration, or other parameters as configured
7. Click **Save**.

#### How to Configure Custom Parameter Columns

1. From the Running Hours Log view, click the **"Columns"** button.
2. Add or remove parameter columns (e.g., Temperature, Pressure, Vibration, Current).
3. Save the column configuration. New columns will appear in the log table and entry forms.

#### How to View Equipment Trend Charts

1. In the Running Hours Log, click on any **equipment tag** link.
2. The system displays the equipment history and trend charts showing running hours, cumulative hours, and configured parameters over time.

### 3.2 Gas Compression Log

Track gas compression operations including volumes, run hours, flow rates, and process conditions.

#### How to Add a Gas Compression Entry

1. Navigate to **Logbooks** then **Gas Compression** tab.
2. Use the **Installation filter** at the top to narrow the view.
3. Click the **"Add Entry"** button.
4. Select **Installation** from the dropdown.
5. The **Gas Compressor** dropdown auto-populates showing only gas compressors (air compressors are excluded from this list).
6. Select the gas compressor from the dropdown.
7. Enter the following:
   - **Date** — Date of the log entry
   - **Gas Compressed (m3)** — Volume of gas compressed in cubic meters
   - **Run Hours** — Hours the compressor ran
   - **Flow Rate** — Gas flow rate
   - **Suction Pressure** — Inlet pressure
   - **Discharge Pressure** — Outlet pressure
   - **Suction Temperature** — Inlet temperature
   - **Discharge Temperature** — Outlet temperature
8. Click **Save**.

### 3.3 Process Parameters

Similar to the gas compression log but focused on displaying temperature and pressure columns for process monitoring.

#### How to Add a Process Parameter Entry

1. Navigate to **Logbooks** then **Process Parameters** tab.
2. Filter by installation at the top.
3. Click **"Add Entry"**.
4. Select Installation and Equipment.
5. Enter date, shift, and all temperature/pressure readings as shown in the form columns.
6. Click **Save**.

---

## 4. MOH (Major Overhaul)

**Route**: `/moh`

The MOH module tracks major overhaul activities for critical rotating equipment. It monitors D-Check intervals, planned vs. actual overhaul dates, costs, and completion status.

### 4.1 Dashboard

The MOH Dashboard provides an overview of all MOH statistics including:

- Total MOH records
- Count by status (Planned, In Progress, Completed, Overdue)
- Upcoming MOH schedule
- Cost summaries

### 4.2 MOH Records

View and manage all MOH tracking records.

#### How to Add/Update an MOH Record

1. Navigate to **MOH** then **MOH Records**.
2. Use **Installation** and **Status** filters at the top to find specific records.
3. To **edit** a record, click the **Edit icon** (pencil) on the row.
4. Update any of the following fields:
   - **Status** — Planned / Pending / In Progress / Overdue / Completed / Cancelled
   - **Priority** — Low / Medium / High / Critical
   - **Assigned To** — Person or team responsible
   - **Run Hours** — Current equipment running hours
   - **D-Check Interval** — Hours between major overhauls
   - **Last MOH Date** — Date of the last completed MOH
   - **Planned Start Date** — Scheduled start date for the next MOH
   - **Actual Start Date** — When the MOH actually began
   - **Completed Date** — Date the MOH was finished
   - **Next Due Date** — When the next MOH is due
   - **Estimated Cost** — Budgeted cost for the MOH
   - **Actual Cost** — Actual expenditure
   - **Scope of Work** — Description of work to be performed
   - **Findings** — Observations and findings during the MOH
   - **Actions Taken** — Corrective and preventive actions performed
5. Click **"Save Changes"** to update the record.

#### Additional MOH Actions

- Click the **Eye icon** to view full details of an MOH record in read-only mode.
- Click the **Play icon** to start a planned MOH (changes status to In Progress and records the actual start date).
- Click the **Check icon** to mark an in-progress MOH as completed (records the completion date).

### 4.3 Overdue MOH

This view lists all equipment that has exceeded 90% of its D-Check interval since the last MOH. These items require immediate scheduling attention.

#### How to Review Overdue MOH

1. Navigate to **MOH** then **Overdue MOH**.
2. Review the list of equipment approaching or exceeding their D-Check interval.
3. Click the Edit icon on any record to schedule or start the overhaul.
4. Update status, planned dates, and assigned personnel.
5. Click **Save Changes**.

---

## 5. Calibration

**Route**: `/calibration`

The Calibration module manages instrument calibration in compliance with ISO 10012. It tracks calibration events, reference standards, due dates, and compliance rates.

### 5.1 Dashboard

The Calibration Dashboard displays:

- **Total Instruments** — Count of all instruments in the system
- **Due This Month** — Instruments requiring calibration this month
- **Overdue** — Instruments past their calibration due date
- **Compliance Rate** — Percentage of instruments with current calibration

### 5.2 Calibration Records

View all calibration events with details including instrument tag, date, result (Pass/Fail), and technician.

### 5.3 New Calibration

#### How to Create a Calibration Event

1. Navigate to **Calibration** then **New Calibration**.
2. Select the **Instrument Tag ID** from the dropdown.
3. Select the **Reference Standard** used for calibration.
4. Enter the **Calibration Date** and **Ambient Conditions** (temperature, humidity).
5. Fill in the **5-point calibration data** for both ascending and descending readings:
   - For each point, enter the standard value, as-found reading, and as-left reading.
   - The system covers 0%, 25%, 50%, 75%, and 100% of the instrument range.
6. Click **"Calculate Results"** — the system auto-calculates errors and determines pass/fail based on the configured tolerance for that instrument type.
7. Review the results. If any point exceeds tolerance, the overall result will be **Fail**.
8. Click **Submit** for approval.

### 5.4 Standards Registry

Manage calibration reference standards (master instruments used as references during calibration).

#### How to Add/Update a Reference Standard

1. Navigate to **Calibration** then **Standards Registry**.
2. Click **"Add Standard"**.
3. Enter: Standard ID, Description, Type, Range, Accuracy, Calibration Certificate No., Certificate Expiry Date.
4. Click **Save**.
5. To edit, click the Edit icon on any existing standard and update the fields.

### 5.5 Due Schedule

View the complete schedule of instruments due for calibration, sorted by due date.

#### How to Use the Due Schedule

1. Navigate to **Calibration** then **Due Schedule**.
2. Review the list of instruments sorted by upcoming due dates.
3. Instruments overdue are highlighted for attention.
4. Click on any instrument to initiate a new calibration event.

---

## 6. Work Orders

**Route**: `/workorders`

The Work Orders module manages maintenance work orders from creation through completion.

### Status Flow

Work orders follow this lifecycle:

**Open** --> **In Progress** --> **Completed**

#### How to Create a Work Order

1. Navigate to **Work Orders**.
2. Click **"Create Work Order"**.
3. Fill in the required fields:
   - **Title** — Brief description of the work
   - **Functional Location** — Select from the asset hierarchy
   - **Equipment** — Link to specific equipment (optional)
   - **Priority** — Low / Medium / High / Critical
   - **Description** — Detailed description of the work required
   - **Assigned To** — Person or team responsible
   - **Target Date** — Expected completion date
4. Click **Save** to create the work order with status "Open".

#### How to Update a Work Order

1. Find the work order in the list (use filters if needed).
2. Click the **Edit** icon.
3. Update status, add notes, record actual work performed.
4. Change status to **In Progress** when work begins.
5. Change status to **Completed** when work is finished.
6. Click **Save**.

---

## 7. Procurement

**Route**: `/procurement`

The Procurement module tracks procurement cases from requisition through delivery.

### 7.1 Dashboard

View procurement case statistics including total cases, pending, approved, and completed counts.

### 7.2 Cases

#### How to Create a Procurement Case

1. Navigate to **Procurement** then **Cases**.
2. Click **"New Case"**.
3. Fill in: Case Title, Description, Required Items, Estimated Cost, Priority, Required By Date.
4. Link to equipment or work order if applicable.
5. Click **Submit**.

#### How to Update a Procurement Case

1. Find the case in the list.
2. Click the Edit icon.
3. Update status, add vendor quotes, record approval details.
4. Click **Save**.

### 7.3 Budgets

Manage budget allocations for procurement activities.

#### How to Manage Budgets

1. Navigate to **Procurement** then **Budgets**.
2. View current budget allocations by department or category.
3. Click **"Add Budget"** to create a new allocation.
4. Enter: Budget Head, Amount, Financial Year, Department.
5. Click **Save**.

### 7.4 Admin/Hierarchy

Configure the organizational structure used in the procurement approval workflow.

---

## 8. Stock/MRP

**Route**: `/stock`

The Stock/MRP module handles Material Requirements Planning, inventory tracking, and reorder management.

#### How to Manage Stock

1. Navigate to **Stock/MRP**.
2. View current inventory levels for all materials.
3. Check items approaching reorder points (highlighted).
4. To add a new material:
   - Click **"Add Material"**
   - Enter: Material Code, Description, Unit, Reorder Level, Reorder Quantity
   - Click **Save**
5. To update stock levels:
   - Click the Edit icon on the material row
   - Update quantity, reorder level, or other details
   - Click **Save**

---

## 9. Audit Observations

**Route**: `/audit`

The Audit Observations module tracks findings from safety, environmental, and operational audits, along with corrective actions.

### 9.1 Dashboard

The Audit Dashboard displays:

- **Total Observations** — All audit observations in the system
- **Open** — Observations awaiting action
- **Closed** — Observations with all actions completed
- **Overdue** — Observations past their target date
- Breakdowns by **Agency**, **Service**, and **Severity**

### 9.2 Observations

#### How to Create an Audit Observation

1. Navigate to **Audit** then **Observations** tab.
2. Click the **"New Observation"** button.
3. Fill in all required fields:
   - **Agency** — Auditing agency or body
   - **Audit Date** — Date the audit was conducted
   - **Installation** — Installation where the observation was made
   - **Department** — Relevant department
   - **Service** — Service area (Drilling, Production, etc.)
   - **Severity** — Critical / Major / Minor / Observation
   - **Observation** — Full text of the audit finding
   - **Target Date** — Date by which the observation should be addressed
4. Click **"Create Observation"**.

#### How to Edit an Existing Observation

1. Find the observation in the list (use filters for installation, status, severity).
2. Click the **Edit** action button on the row.
3. Update any fields as needed.
4. Click **Save**.

### 9.3 Action Tracking

#### How to Add and Track Corrective Actions

1. Open an observation by clicking on it.
2. Click the **"Add Action"** button.
3. Fill in:
   - **Description** — What corrective action needs to be taken
   - **Assigned To** — Person responsible for the action
   - **Target Date** — Date by which the action should be completed
4. Click **Save** to add the action.
5. To update action progress:
   - Find the action in the observation detail view
   - Click the Edit icon on the action
   - Change the status: **Pending** --> **In Progress** --> **Completed**
   - Add remarks or completion notes
   - Click **Save**
6. When **all actions** for an observation are marked as Completed, the observation is **automatically closed** by the system.

---

## 10. Training

**Route**: `/training`

The Training module tracks employee training records, certifications, and scheduled training events.

#### How to Manage Training Records

1. Navigate to **Training**.
2. To add a training record:
   - Click **"Add Training Record"**
   - Enter: Employee Name, Training Title, Training Type, Date, Duration, Trainer, Certification (if applicable)
   - Click **Save**
3. To schedule a training event:
   - Click **"Schedule Training"**
   - Enter: Title, Description, Date, Venue, Trainer, Target Participants
   - Click **Save**
4. To update an existing record, click the Edit icon and modify fields as needed.

---

## 11. Energy Management

**Route**: `/energy`

The Energy Management module tracks energy consumption across all installations and monitors efficiency metrics.

#### How to Add/Update Energy Data

1. Navigate to **Energy Management**.
2. Select the installation from the filter.
3. Click **"Add Entry"** to record energy consumption data.
4. Enter: Date, Installation, Energy Type (Electricity, Gas, Diesel), Quantity Consumed, Unit, Cost.
5. Click **Save**.
6. Review efficiency metrics and trend charts on the dashboard.
7. To edit existing data, click the Edit icon on any row and update the values.

---

## 12. Workshop

**Route**: `/workshop`

The Workshop module manages workshop jobs, tasks, and resources.

#### How to Manage Workshop Jobs

1. Navigate to **Workshop**.
2. Click **"New Job"** to create a workshop job.
3. Enter: Job Title, Description, Equipment Tag, Priority, Assigned Technician, Expected Duration.
4. Click **Save**.
5. To update job progress:
   - Click the Edit icon on the job
   - Update status, add work notes, record actual hours
   - Click **Save**
6. Track workshop equipment and resource allocation from the resources section.

---

## 13. Collaboration

**Route**: `/collaboration`

The Collaboration module provides team communication, feedback, meeting notes, and action item tracking.

#### How to Use Collaboration Features

1. Navigate to **Collaboration**.
2. To post a message or feedback:
   - Click **"New Post"**
   - Enter the subject, message content, and tag relevant team members
   - Click **Submit**
3. To create meeting notes:
   - Click **"New Meeting"**
   - Enter: Meeting Title, Date, Attendees, Agenda, Minutes, Action Items
   - Click **Save**
4. To track action items:
   - View action items from meetings
   - Update status and add completion notes via the Edit icon

---

## 14. Contracts

**Route**: `/contracts`

The Contracts module manages vendor contracts, milestones, and expiration tracking.

#### How to Manage Contracts

1. Navigate to **Contracts**.
2. Click **"New Contract"** to create a contract record.
3. Enter: Contract Number, Vendor Name, Description, Start Date, End Date, Value, Terms.
4. Click **Save**.
5. To update contract details:
   - Click the Edit icon on the contract row
   - Update milestones, payment status, extension details
   - Click **Save**
6. The system alerts when contracts are approaching expiration.

---

## 15. Manuals

**Route**: `/manuals`

The Manuals module provides a document repository for equipment manuals, SOPs, and technical documents.

#### How to Upload/Manage Manuals

1. Navigate to **Manuals**.
2. Click **"Upload Manual"**.
3. Select the file from your computer (PDF, Word, or other supported formats).
4. Enter: Document Title, Equipment/Category, Description, Version.
5. Click **Upload**.
6. To update a document, upload a new version and the system maintains version history.
7. Search for documents using the search bar or filter by category.

---

## 16. Manpower

**Route**: `/manpower`

The Manpower module handles user management and role assignment.

#### How to Manage Users and Roles

1. Navigate to **Manpower**.
2. View the list of all users and their assigned roles.
3. To add a new user:
   - Click **"Add User"**
   - Enter: Name, Employee ID, Designation, Department, Installation, Email, Role
   - Click **Save**
4. To update a user:
   - Click the Edit icon on the user row
   - Modify role, department, installation, or other details
   - Click **Save**

---

## 17. Presentations

**Route**: `/presentations`

The Presentations module allows uploading and managing presentation files for review meetings and technical presentations.

#### How to Upload/Manage Presentations

1. Navigate to **Presentations**.
2. Click **"Upload Presentation"**.
3. Select the file (PowerPoint, PDF, or other supported formats).
4. Enter: Title, Description, Category, Date.
5. Click **Upload**.
6. To view a presentation, click on its title in the list.
7. To delete or replace, use the action buttons on the row.

---

## 18. Reports

**Route**: `/reports`

The Reports module generates various maintenance and operational reports.

#### How to Generate Reports

1. Navigate to **Reports**.
2. Select the report type from the available options.
3. Set filters: Date Range, Installation, Equipment Type, Status.
4. Click **"Generate Report"**.
5. Review the report on screen.
6. Click **"Export"** to download as PDF or Excel.

---

## General Tips

- **Use installation filters** to narrow equipment lists in any module. Most modules provide an installation dropdown at the top of the page.
- **Date format**: All dates in the system use the **DD-MMM-YYYY** format (e.g., 15-Mar-2026).
- **Equipment tags are unique identifiers** — always use the exact tag when searching or creating records. Tags are case-sensitive.
- **Dashboard statistics auto-refresh** when underlying data is updated. Return to any dashboard to see the latest counts and metrics.
- **All modules are accessible from the Enterprise Hub** — click the logo or "Enterprise Hub" link in the navigation bar to return to the hub at any time.
- **Filters persist within a session** — if you set an installation filter, it remains active until you change it or navigate away.
- **Required fields** are marked with an asterisk (*) in all forms. The system will not allow saving until all required fields are filled.
- **Browser compatibility** — the application works best with modern browsers (Chrome, Firefox, Edge). Keep your browser updated for the best experience.
- **Session timeout** — the application will log you out after a period of inactivity. Save your work frequently to avoid data loss.

---

*ONGC Ankleshwar Asset Maintenance Information System - User Guide*
*For support, contact your system administrator.*
