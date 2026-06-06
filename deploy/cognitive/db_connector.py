"""Database connector for read-only access to PostgreSQL."""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional, Set

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

def get_connection():
    """Get a database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    """Execute a read-only query and return results."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def _json_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, default=str, ensure_ascii=True)
    except TypeError:
        return str(value)


def _rag_record(
    module: str,
    source: str,
    title: str,
    text: str,
    source_type: str = "database",
    **metadata: Any,
) -> Dict[str, Any]:
    return {
        "module": module,
        "source_type": source_type,
        "source": str(source or ""),
        "title": str(title or source or module),
        "text": " ".join(str(text or "").split()),
        **metadata,
    }

# ═══════════════════════════════════════════════════════════════
# PROCUREMENT CASE QUERIES
# ═══════════════════════════════════════════════════════════════

def get_all_cases(limit: int = 100) -> List[Dict]:
    """Get all cases with department info."""
    return execute_query("""
        SELECT c.id, c.title, c.type, c."currentStage", c."createdAt", c."updatedAt",
               c."createdBy", c.vendor, c."prValue", c."poValue", c.currency,
               d.name as department_name
        FROM "Case" c
        LEFT JOIN "Department" d ON c."departmentId" = d.id
        ORDER BY c."updatedAt" DESC
        LIMIT %s
    """, (limit,))

def get_cases_by_stage(stage: str) -> List[Dict]:
    """Get cases in a specific stage."""
    return execute_query("""
        SELECT c.id, c.title, c.type, c."currentStage", c."createdAt",
               c.vendor, c."prValue", d.name as department_name
        FROM "Case" c
        LEFT JOIN "Department" d ON c."departmentId" = d.id
        WHERE c."currentStage" = %s
        ORDER BY c."createdAt" DESC
    """, (stage,))

def get_cases_by_department(dept_name: str) -> List[Dict]:
    """Get cases for a specific department."""
    return execute_query("""
        SELECT c.id, c.title, c.type, c."currentStage", c."createdAt",
               c.vendor, c."prValue"
        FROM "Case" c
        JOIN "Department" d ON c."departmentId" = d.id
        WHERE LOWER(d.name) LIKE LOWER(%s)
        ORDER BY c."updatedAt" DESC
    """, (f"%{dept_name}%",))

def get_cases_by_type(case_type: str) -> List[Dict]:
    """Get cases of a specific type."""
    return execute_query("""
        SELECT c.id, c.title, c."currentStage", c."createdAt",
               c.vendor, c."prValue", d.name as department_name
        FROM "Case" c
        LEFT JOIN "Department" d ON c."departmentId" = d.id
        WHERE UPPER(c.type) = UPPER(%s)
        ORDER BY c."updatedAt" DESC
    """, (case_type,))

def get_aged_cases(days: int = 30) -> List[Dict]:
    """Get cases older than specified days that are not closed."""
    return execute_query("""
        SELECT c.id, c.title, c.type, c."currentStage", c."createdAt",
               c.vendor, c."prValue", d.name as department_name,
               EXTRACT(DAY FROM NOW() - c."createdAt")::int as age_days
        FROM "Case" c
        LEFT JOIN "Department" d ON c."departmentId" = d.id
        WHERE c."currentStage" != 'Closed'
          AND c."createdAt" < NOW() - INTERVAL '%s days'
        ORDER BY c."createdAt" ASC
    """, (days,))

def get_case_by_id(case_id: str) -> Optional[Dict]:
    """Get a specific case by ID with full details."""
    results = execute_query("""
        SELECT c.*, d.name as department_name
        FROM "Case" c
        LEFT JOIN "Department" d ON c."departmentId" = d.id
        WHERE c.id = %s
    """, (case_id,))
    return results[0] if results else None

# ═══════════════════════════════════════════════════════════════
# BUDGET QUERIES
# ═══════════════════════════════════════════════════════════════

def get_budget_summary(fy: str = None) -> List[Dict]:
    """Get budget summary by department."""
    query = """
        SELECT d.name as department, b.fy, b.category,
               SUM(b.amount) as total_budget
        FROM "Budget" b
        JOIN "Department" d ON b."departmentId" = d.id
    """
    if fy:
        query += " WHERE b.fy = %s"
        query += " GROUP BY d.name, b.fy, b.category ORDER BY d.name"
        return execute_query(query, (fy,))
    query += " GROUP BY d.name, b.fy, b.category ORDER BY d.name"
    return execute_query(query)

def get_department_spend(dept_name: str = None) -> List[Dict]:
    """Get total spend (PR values) by department."""
    query = """
        SELECT d.name as department,
               COUNT(c.id) as case_count,
               COALESCE(SUM(c."prValue"), 0) as total_pr_value,
               COALESCE(SUM(c."poValue"), 0) as total_po_value
        FROM "Department" d
        LEFT JOIN "Case" c ON c."departmentId" = d.id
    """
    if dept_name:
        query += " WHERE LOWER(d.name) LIKE LOWER(%s)"
        query += " GROUP BY d.name ORDER BY total_pr_value DESC"
        return execute_query(query, (f"%{dept_name}%",))
    query += " GROUP BY d.name ORDER BY total_pr_value DESC"
    return execute_query(query)

# ═══════════════════════════════════════════════════════════════
# MAINTENANCE & WORK ORDER QUERIES
# ═══════════════════════════════════════════════════════════════

def get_open_work_orders(limit: int = 50) -> List[Dict]:
    """Get open work orders with asset details."""
    return execute_query("""
        SELECT wo.id, wo."woNumber", wo.description, wo.priority, wo.status,
               wo."scheduledDate", wo."woType",
               fl.name as functional_location, fl."flId"
        FROM "WorkOrder" wo
        LEFT JOIN "FunctionalLocation" fl ON wo."flId" = fl.id
        WHERE wo.status NOT IN ('CLOSED', 'COMPLETED')
        ORDER BY 
            CASE wo.priority 
                WHEN 'EMERGENCY' THEN 1 
                WHEN 'HIGH' THEN 2 
                WHEN 'NORMAL' THEN 3 
                ELSE 4 
            END,
            wo."scheduledDate" ASC
        LIMIT %s
    """, (limit,))

def get_work_orders_by_priority(priority: str) -> List[Dict]:
    """Get work orders by priority (HIGH, EMERGENCY, NORMAL)."""
    return execute_query("""
        SELECT wo.id, wo."woNumber", wo.description, wo.status, wo."scheduledDate",
               fl.name as functional_location
        FROM "WorkOrder" wo
        LEFT JOIN "FunctionalLocation" fl ON wo."flId" = fl.id
        WHERE wo.priority = %s AND wo.status != 'CLOSED'
        ORDER BY wo."scheduledDate" ASC
    """, (priority,))

def get_work_orders_by_type(wo_type: str) -> List[Dict]:
    """Get work orders by type (PREVENTIVE, CORRECTIVE)."""
    return execute_query("""
        SELECT wo.id, wo."woNumber", wo.description, wo.priority, wo.status,
               fl.name as functional_location
        FROM "WorkOrder" wo
        LEFT JOIN "FunctionalLocation" fl ON wo."flId" = fl.id
        WHERE wo."woType" = %s AND wo.status != 'CLOSED'
        ORDER BY wo."scheduledDate" ASC
    """, (wo_type,))

def get_asset_work_history(asset_tag: str, limit: int = 10) -> List[Dict]:
    """Get work order history for a specific asset/location."""
    return execute_query("""
        SELECT wo.id, wo."woNumber", wo.description, wo.status, wo."completionDate",
               wo."woType", wo."failureMode", wo."actionTaken"
        FROM "WorkOrder" wo
        JOIN "FunctionalLocation" fl ON wo."flId" = fl.id
        WHERE fl."flId" = %s OR fl.name LIKE %s
        ORDER BY wo."updatedAt" DESC
        LIMIT %s
    """, (asset_tag, f"%{asset_tag}%", limit))

# ═══════════════════════════════════════════════════════════════
# ASSET & EQUIPMENT QUERIES
# ═══════════════════════════════════════════════════════════════

def get_asset_details(tag: str) -> Optional[Dict]:
    """Get details of a functional location/asset."""
    results = execute_query("""
        SELECT fl.id, fl."flId", fl.name, fl.description, fl."flType",
               s.name as system_name, a.name as area_name
        FROM "FunctionalLocation" fl
        LEFT JOIN "System" s ON fl."systemId" = s.id
        LEFT JOIN "Area" a ON s."areaId" = a.id
        WHERE fl."flId" = %s OR fl.name LIKE %s
    """, (tag, f"%{tag}%"))
    return results[0] if results else None

def get_asset_status_summary() -> List[Dict]:
    """Get status summary of assets (from Assets table if status exists)."""
    # Note: Using Asset table for physical status
    return execute_query("""
        SELECT status, COUNT(*) as count
        FROM "Asset"
        GROUP BY status
    """)

# ═══════════════════════════════════════════════════════════════
# ANALYTICS QUERIES (UPDATED)
# ═══════════════════════════════════════════════════════════════

def get_stage_distribution() -> List[Dict]:
    """Get count of cases in each stage."""
    return execute_query("""
        SELECT "currentStage" as stage, COUNT(*) as count
        FROM "Case"
        GROUP BY "currentStage"
        ORDER BY count DESC
    """)

def get_type_distribution() -> List[Dict]:
    """Get count of cases by type."""
    return execute_query("""
        SELECT type, COUNT(*) as count,
               COALESCE(SUM("prValue"), 0) as total_value
        FROM "Case"
        GROUP BY type
        ORDER BY count DESC
    """)

def get_vendor_summary() -> List[Dict]:
    """Get summary by vendor."""
    return execute_query("""
        SELECT vendor, COUNT(*) as case_count,
               COALESCE(SUM("prValue"), 0) as total_value,
               COALESCE(SUM("poValue"), 0) as total_po_value
        FROM "Case"
        WHERE vendor IS NOT NULL AND vendor != ''
        GROUP BY vendor
        ORDER BY case_count DESC
        LIMIT 20
    """)

def get_departments() -> List[Dict]:
    """Get all departments."""
    return execute_query("""
        SELECT d.id, d.name, c.name as company_name
        FROM "Department" d
        JOIN "Company" c ON d."companyId" = c.id
        ORDER BY d.name
    """)

# ═══════════════════════════════════════════════════════════════
# ENHANCED MULTI-MODULE QUERIES
# ═══════════════════════════════════════════════════════════════

def get_calibration_due(days: int = 30) -> List[Dict]:
    """Get instruments due for calibration in next N days."""
    return execute_query("""
        SELECT im."tagId" as tag, im.description, im.type as instrument_type,
               im."serviceLine", im."primaryDiscipline", i."installationId" as location,
               cl."nextDueDate" as next_due_date, im."calibrationFreqMonths" as calibration_frequency,
               cl.result, cl."performedBy"
        FROM "InstrumentMaster" im
        LEFT JOIN "Installation" i ON i.id = im."installationId"
        LEFT JOIN LATERAL (
            SELECT *
            FROM "CalibrationLog" cl
            WHERE cl."instrumentTagId" = im."tagId"
            ORDER BY cl."currentCalDate" DESC
            LIMIT 1
        ) cl ON true
        WHERE cl."nextDueDate" IS NOT NULL
          AND cl."nextDueDate" <= CURRENT_DATE + (%s || ' days')::interval
        ORDER BY cl."nextDueDate" ASC
    """, (days,))

def get_equipment_maintenance_schedule(limit: int = 50) -> List[Dict]:
    """Get upcoming maintenance schedules."""
    return execute_query("""
        SELECT pm.id, pm.frequency, pm."taskDescription" as activity,
               et.name as equipment_type, it.name as instrument_type,
               pm."alertLeadTime", pm."createdAt" as next_due
        FROM "PMSchedule" pm
        LEFT JOIN "EquipmentType" et ON et.id = pm."equipmentTypeId"
        LEFT JOIN "InstrumentType" it ON it.id = pm."instrumentTypeId"
        ORDER BY pm."updatedAt" DESC
        LIMIT %s
    """, (limit,))

def get_all_equipment(limit: int = 100) -> List[Dict]:
    """Get all equipment from running equipment master."""
    return execute_query("""
        SELECT rem."equipmentTag" as tag, rem.description,
               i."installationId" as location, rem."equipmentTypeName" as equipment_type,
               rem.make as manufacturer, rem.model, rem.category as status,
               rem."serviceLine", rem."primaryDiscipline", rem.criticality
        FROM "RunningEquipmentMaster" rem
        LEFT JOIN "Installation" i ON i.id = rem."installationId"
        ORDER BY rem."equipmentTag" ASC
        LIMIT %s
    """, (limit,))

def get_installation_hierarchy() -> List[Dict]:
    """Get installation/department hierarchy."""
    return execute_query("""
        SELECT id, "installationId" as name, NULL as parent_id, type as level, location as path
        FROM "Installation"
        ORDER BY "installationId" ASC
    """)

def get_installation_matches(terms: List[str], limit: int = 10) -> List[Dict]:
    """Find installations matching user wording such as CPF, GGS, CTF, or Gandhar."""
    clean_terms = [term.strip() for term in terms if term and term.strip()]
    if not clean_terms:
        return []

    where = " OR ".join(['i."installationId" ILIKE %s OR i.location ILIKE %s OR i.type ILIKE %s' for _ in clean_terms])
    params: List[str] = []
    for term in clean_terms:
        like = f"%{term}%"
        params.extend([like, like, like])
    params.append(limit)

    return execute_query(f"""
        SELECT i.id, i."installationId", i.location, i.type, i."isActive"
        FROM "Installation" i
        WHERE {where}
        ORDER BY
          CASE WHEN i."installationId" ILIKE %s THEN 0 ELSE 1 END,
          i."installationId" ASC
        LIMIT %s
    """, tuple(params[:-1] + [f"%{clean_terms[0]}%", limit]))

def get_equipment_by_installation_terms(terms: List[str], limit: int = 30) -> Dict[str, Any]:
    """Return running equipment and instruments installed at matching installations."""
    clean_terms = [term.strip() for term in terms if term and term.strip()]
    if not clean_terms:
        return {"installations": [], "running_equipment": [], "instruments": []}

    where = " OR ".join(['i."installationId" ILIKE %s OR i.location ILIKE %s OR i.type ILIKE %s' for _ in clean_terms])
    params: List[str] = []
    for term in clean_terms:
        like = f"%{term}%"
        params.extend([like, like, like])

    installations = execute_query(f"""
        SELECT i.id, i."installationId", i.location, i.type
        FROM "Installation" i
        WHERE {where}
        ORDER BY i."installationId" ASC
        LIMIT 10
    """, tuple(params))

    if not installations:
        return {"installations": [], "running_equipment": [], "instruments": []}

    installation_ids = [row["id"] for row in installations]
    placeholders = ",".join(["%s"] * len(installation_ids))

    running_equipment = execute_query(f"""
        SELECT rem."equipmentTag", rem.description, rem.category, rem."serviceLine",
               rem."primaryDiscipline", i."installationId", i.location
        FROM "RunningEquipmentMaster" rem
        JOIN "Installation" i ON i.id = rem."installationId"
        WHERE rem."installationId" IN ({placeholders})
        ORDER BY i."installationId" ASC, rem."equipmentTag" ASC
        LIMIT %s
    """, tuple(installation_ids + [limit]))

    instruments = execute_query(f"""
        SELECT im."tagId", im.description, im."serviceLine", im."primaryDiscipline",
               i."installationId", i.location
        FROM "InstrumentMaster" im
        JOIN "Installation" i ON i.id = im."installationId"
        WHERE im."installationId" IN ({placeholders})
        ORDER BY i."installationId" ASC, im."tagId" ASC
        LIMIT %s
    """, tuple(installation_ids + [limit]))

    return {
        "installations": installations,
        "running_equipment": running_equipment,
        "instruments": instruments,
    }

def search_across_modules(keyword: str, limit: int = 20) -> Dict[str, List]:
    """Search for a keyword across multiple modules."""
    results = {
        "cases": [],
        "equipment": [],
        "instruments": [],
        "budgets": []
    }
    
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Search in cases
        cur.execute("""
            SELECT id, title, type, "currentStage", vendor
            FROM "Case"
            WHERE title ILIKE %s OR vendor ILIKE %s
            LIMIT %s
        """, (f'%{keyword}%', f'%{keyword}%', limit))
        results["cases"] = cur.fetchall()
        
        # Search in equipment
        cur.execute("""
            SELECT rem."equipmentTag" as tag, rem.description, i."installationId" as location,
                   rem."equipmentTypeName" as equipment_type
            FROM "RunningEquipmentMaster" rem
            LEFT JOIN "Installation" i ON i.id = rem."installationId"
            WHERE rem.description ILIKE %s OR rem."equipmentTag" ILIKE %s
            LIMIT %s
        """, (f'%{keyword}%', f'%{keyword}%', limit))
        results["equipment"] = cur.fetchall()
        
        # Search in instruments
        cur.execute("""
            SELECT im."tagId" as tag, im.description, i."installationId" as location,
                   im.type as instrument_type
            FROM "InstrumentMaster" im
            LEFT JOIN "Installation" i ON i.id = im."installationId"
            WHERE im.description ILIKE %s OR im."tagId" ILIKE %s
            LIMIT %s
        """, (f'%{keyword}%', f'%{keyword}%', limit))
        results["instruments"] = cur.fetchall()
        
        return results
    finally:
        cur.close()
        conn.close()


# ═══════════════════════════════════════════════════════════════
# WORKSHOP & LOGBOOK QUERIES
# ═══════════════════════════════════════════════════════════════

def get_workshop_jobs(shop_type: str = None, status: str = None, limit: int = 50) -> List[Dict]:
    """Get workshop jobs with optional filters."""
    query = 'SELECT * FROM "WorkshopJob" WHERE 1=1'
    params = []
    if shop_type:
        query += ' AND "shopType" = %s'
        params.append(shop_type)
    if status:
        query += ' AND status = %s'
        params.append(status)
    query += ' ORDER BY "requestDate" DESC LIMIT %s'
    params.append(limit)
    return execute_query(query, tuple(params))

def get_equipment_logs(equipment_tag: str = None, limit: int = 20) -> List[Dict]:
    """Get recent equipment logs."""
    query = 'SELECT * FROM "EquipmentLog" WHERE 1=1'
    params = []
    if equipment_tag:
        query += ' AND "equipmentTag" = %s'
        params.append(equipment_tag)
    query += ' ORDER BY date DESC, "createdAt" DESC LIMIT %s'
    params.append(limit)
    return execute_query(query, tuple(params))

def get_energy_logs(installation_id: str = None, limit: int = 20) -> List[Dict]:
    """Get daily energy logs."""
    query = 'SELECT el.*, i."installationId" as inst_id FROM "DailyEnergyLog" el JOIN "Installation" i ON el."installationId" = i.id'
    params = []
    if installation_id:
        query += ' WHERE el."installationId" = %s OR i."installationId" = %s'
        params.extend([installation_id, installation_id])
    query += ' ORDER BY el.date DESC LIMIT %s'
    params.append(limit)
    return execute_query(query, tuple(params))

def get_moh_records(installation_id: str = None, status: str = None, limit: int = 20) -> List[Dict]:
    """Get Major Overhaul records."""
    query = 'SELECT * FROM "MOHRecord" WHERE 1=1'
    params = []
    if installation_id:
        query += ' AND "installationId" = %s'
        params.append(installation_id)
    if status:
        query += ' AND status = %s'
        params.append(status)
    query += ' ORDER BY "createdAt" DESC LIMIT %s'
    params.append(limit)
    return execute_query(query, tuple(params))

def get_stock_analysis(category: str = None) -> List[Dict]:
    """Analyze stock levels from MRP (Case table)."""
    # Categories: STORES, SPARES, CAPITAL
    query = """
        SELECT type as category, COUNT(*) as requirement_count, 
               COALESCE(SUM("prValue"), 0) as total_pr_value,
               COALESCE(SUM("poValue"), 0) as total_po_value
        FROM "Case"
        WHERE type IN ('STORES', 'SPARES', 'CAPITAL')
    """
    params = []
    if category:
        query += ' AND type = %s'
        params.append(category)
    query += ' GROUP BY type ORDER BY total_pr_value DESC'
    return execute_query(query, tuple(params) if params else None)


# ═══════════════════════════════════════════════════════════════
# APP-WIDE RAG RECORDS
# ═══════════════════════════════════════════════════════════════

def _module_filter(modules: Optional[Set[str]], module: str) -> bool:
    return not modules or module in modules


def get_app_rag_records(limit_per_module: int = 300, modules: Optional[List[str]] = None) -> Dict[str, Any]:
    """Build schema-aligned records for app-wide semantic indexing."""
    selected = {m.strip().lower() for m in modules or [] if m and m.strip()}
    records: List[Dict[str, Any]] = []
    errors: List[Dict[str, str]] = []

    def add(module: str, query: str, params: tuple, mapper):
        if not _module_filter(selected, module):
            return
        try:
            for row in execute_query(query, params):
                records.append(mapper(row))
        except Exception as exc:
            errors.append({"module": module, "error": str(exc)})

    add("installation", """
        SELECT id, "installationId", location, type, "isActive"
        FROM "Installation"
        ORDER BY "installationId" ASC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "installation", f"Installation:{r['installationId']}", r["installationId"],
        f"Installation {r['installationId']} at {r['location']}. Type {r['type']}. Active {r['isActive']}.",
        installation=r.get("installationId"), status="ACTIVE" if r.get("isActive") else "INACTIVE",
    ))

    add("equipment", """
        SELECT rem.*, i."installationId" as installation_code, i.location
        FROM "RunningEquipmentMaster" rem
        LEFT JOIN "Installation" i ON i.id = rem."installationId"
        ORDER BY rem."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "equipment", f"RunningEquipment:{r['equipmentTag']}", r["equipmentTag"],
        f"Running equipment {r['equipmentTag']} {r.get('description')}. Category {r.get('category')}. "
        f"Type {r.get('equipmentTypeName')}. Service {r.get('serviceLine')}. Discipline {r.get('primaryDiscipline')}. "
        f"Installation {r.get('installation_code')} {r.get('location')}. Make {r.get('make')} model {r.get('model')}. "
        f"Power {r.get('powerRating')}. Criticality {r.get('criticality')}. Specs {_json_text(r.get('specifications'))}.",
        installation=r.get("installation_code"), equipment_tag=r.get("equipmentTag"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("category") or ""),
    ))

    add("instrument", """
        SELECT im.*, i."installationId" as installation_code, i.location
        FROM "InstrumentMaster" im
        LEFT JOIN "Installation" i ON i.id = im."installationId"
        ORDER BY im."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "instrument", f"Instrument:{r['tagId']}", r["tagId"],
        f"Instrument {r['tagId']} {r.get('description')}. Type {r.get('type')}. Service {r.get('serviceLine')}. "
        f"Discipline {r.get('primaryDiscipline')}. Installation {r.get('installation_code')} {r.get('location')}. "
        f"Make {r.get('make')} model {r.get('model')} serial {r.get('serialNo')}. "
        f"Range {r.get('rangeMin')} to {r.get('rangeMax')} {r.get('unit')}. Health {r.get('healthStatus')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("tagId"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("healthStatus") or ""),
    ))

    add("asset_history", """
        SELECT a."assetCode", a."assetClass", a.status, a.manufacturer, a.model,
               fl."flId", fl.name as fl_name, ai."installDate", ai."removalDate", ai.reason
        FROM "AssetInstallation" ai
        JOIN "Asset" a ON a.id = ai."assetId"
        JOIN "FunctionalLocation" fl ON fl.id = ai."flId"
        ORDER BY ai."installDate" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "asset_history", f"AssetInstallation:{r['assetCode']}:{r['flId']}:{r['installDate']}", r["assetCode"],
        f"Asset history {r['assetCode']} class {r.get('assetClass')} status {r.get('status')}. "
        f"Installed at {r.get('flId')} {r.get('fl_name')} on {r.get('installDate')}. "
        f"Removed {r.get('removalDate')}. Reason {r.get('reason')}. Make {r.get('manufacturer')} model {r.get('model')}.",
        equipment_tag=r.get("assetCode"), status=str(r.get("status") or ""),
    ))

    add("work_order", """
        SELECT wo.*, fl."flId", fl.name as fl_name
        FROM "WorkOrder" wo
        LEFT JOIN "FunctionalLocation" fl ON fl.id = wo."flId"
        ORDER BY wo."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "work_order", f"WorkOrder:{r['woNumber']}", r["woNumber"],
        f"Work order {r['woNumber']}. {r.get('description')}. Type {r.get('woType')}. Priority {r.get('priority')}. "
        f"Status {r.get('status')}. Stage {r.get('executionStage')}. Discipline {r.get('primaryDiscipline')}. "
        f"Functional location {r.get('flId')} {r.get('fl_name')}. Scheduled {r.get('scheduledDate')}. "
        f"Failure {r.get('failureMode')} cause {r.get('causeCode')} action {r.get('actionTaken')}. Remarks {r.get('remarks')}.",
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("status") or ""),
    ))

    add("maintenance_request", """
        SELECT mr.*, i."installationId" as installation_code
        FROM "MaintenanceRequest" mr
        LEFT JOIN "Installation" i ON i.id = mr."installationId"
        ORDER BY mr."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "maintenance_request", f"MaintenanceRequest:{r['reqNumber']}", r["reqNumber"],
        f"Maintenance request {r['reqNumber']} {r.get('title')}. {r.get('description')}. "
        f"Equipment {r.get('equipmentTag')} asset class {r.get('assetClass')}. Installation {r.get('installation_code')}. "
        f"Type {r.get('requestType')} priority {r.get('priority')} status {r.get('status')}. "
        f"Origin {r.get('requestOrigin')} requested by {r.get('requestedBy')}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("equipmentTag"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("status") or ""),
    ))

    add("maintenance_log", """
        SELECT ml.*, i."installationId" as installation_code,
               COALESCE(string_agg(mp.name || ' (' || mp."employeeId" || ')', ', '), '') as crew
        FROM "MaintenanceLog" ml
        LEFT JOIN "Installation" i ON i.id = ml."installationId"
        LEFT JOIN "MaintenanceLogTeam" mlt ON mlt."maintenanceLogId" = ml.id
        LEFT JOIN "Manpower" mp ON mp.id = mlt."manpowerId"
        GROUP BY ml.id, i."installationId"
        ORDER BY ml.date DESC, ml."createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "maintenance_log", f"MaintenanceLog:{r['id']}", f"{r.get('date')} {r.get('equipmentTag') or r.get('section')}",
        f"Maintenance daily report on {r.get('date')} for {r.get('installation_code')}. Service {r.get('department')} section {r.get('section')}. "
        f"Discipline {r.get('primaryDiscipline')}. Job {r.get('jobType')} criticality {r.get('reportCriticality')}. "
        f"Equipment {r.get('equipmentTag')} type {r.get('equipmentTypeName')} service line {r.get('serviceLine')}. "
        f"Description {r.get('description')}. Status {r.get('status')}. Time {r.get('startTime')} to {r.get('endTime')} "
        f"duration {r.get('durationHours')} hours. Crew {r.get('crew')}. External crew {_json_text(r.get('externalCrew'))}. "
        f"Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("equipmentTag"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("status") or ""),
    ))

    add("logbook", """
        SELECT el.*, rem.description, rem."serviceLine", rem."primaryDiscipline",
               i."installationId" as installation_code
        FROM "EquipmentLog" el
        LEFT JOIN "RunningEquipmentMaster" rem ON rem."equipmentTag" = el."equipmentTag"
        LEFT JOIN "Installation" i ON i.id = rem."installationId"
        ORDER BY el.date DESC, el."createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "logbook", f"EquipmentLog:{r['id']}", f"{r.get('equipmentTag')} {r.get('date')}",
        f"Running hour logbook entry for {r.get('equipmentTag')} {r.get('description')} on {r.get('date')} shift {r.get('shift')}. "
        f"Installation {r.get('installation_code')}. Status {'RUNNING' if r.get('runStatus') else 'STOPPED'}. "
        f"Start {r.get('startTime')} stop {r.get('stopTime')} run hours {r.get('totalRunHours')} "
        f"cumulative meter {r.get('cumulativeMeterReading')}. Parameters {_json_text(r.get('parameters'))}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("equipmentTag"),
        discipline=str(r.get("primaryDiscipline") or ""), status="RUNNING" if r.get("runStatus") else "STOPPED",
    ))

    add("process_log", """
        SELECT ol.*, i."installationId" as installation_code, rem.description,
               COALESCE(string_agg(omd.label || '=' || COALESCE(olm."valueNumber"::text, olm."valueText", olm."valueEnum", olm."valueBoolean"::text), ', '), '') as metrics
        FROM "OperationalLog" ol
        LEFT JOIN "Installation" i ON i.id = ol."installationId"
        LEFT JOIN "RunningEquipmentMaster" rem ON rem."equipmentTag" = ol."equipmentTag"
        LEFT JOIN "OperationalLogMetric" olm ON olm."operationalLogId" = ol.id
        LEFT JOIN "OperationalMetricDefinition" omd ON omd.id = olm."metricDefinitionId"
        GROUP BY ol.id, i."installationId", rem.description
        ORDER BY ol."logDate" DESC, ol."createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "process_log", f"OperationalLog:{r['id']}", f"{r.get('equipmentTag')} {r.get('logDate')}",
        f"Process log for {r.get('equipmentTag')} {r.get('description')} at {r.get('installation_code')} on {r.get('logDate')} shift {r.get('shift')}. "
        f"State {r.get('operatingState')} availability {r.get('availabilityStatus')}. Runtime {r.get('runtimeHours')}h "
        f"downtime {r.get('downtimeHours')}h standby {r.get('standbyHours')}h cumulative {r.get('cumulativeHours')}h. "
        f"Metrics {r.get('metrics')}. Source {r.get('sourceMode')} {r.get('sourceStatus')}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("equipmentTag"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("operatingState") or ""),
    ))

    add("gas_compression", """
        SELECT gcl.*, i."installationId" as installation_code
        FROM "GasCompressionLog" gcl
        LEFT JOIN "Installation" i ON i.id = gcl."installationId"
        ORDER BY gcl.date DESC, gcl."createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "gas_compression", f"GasCompressionLog:{r['id']}", f"{r.get('compressorId')} {r.get('date')}",
        f"Compressor process log for {r.get('compressorId')} at {r.get('installation_code')} on {r.get('date')} shift {r.get('shift')}. "
        f"Run hours {r.get('runHours')}. Gas compressed {r.get('gasCompressed')}. Flow rate {r.get('flowRate')}. "
        f"Input {r.get('inputGasVolume')} output {r.get('outputGasVolume')} fuel {r.get('fuelGasVolume')} recycle {r.get('recycleGasVolume')} flare {r.get('flareGasVolume')}. "
        f"Suction pressure {r.get('suctionPressure')} discharge pressure {r.get('dischargePressure')}. "
        f"Suction temp {r.get('suctionTemp')} discharge temp {r.get('dischargeTemp')}. Load {r.get('loadPct')} efficiency {r.get('efficiencyPct')}. "
        f"Trips {r.get('tripCount')} shutdown {r.get('shutdownReason')}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("compressorId"),
        discipline=str(r.get("primaryDiscipline") or ""), status=str(r.get("sourceMode") or ""),
    ))

    add("calibration", """
        SELECT cl.*, im.description, im.type, i."installationId" as installation_code
        FROM "CalibrationLog" cl
        LEFT JOIN "InstrumentMaster" im ON im."tagId" = cl."instrumentTagId"
        LEFT JOIN "Installation" i ON i.id = im."installationId"
        ORDER BY cl."currentCalDate" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "calibration", f"CalibrationLog:{r['id']}", r["instrumentTagId"],
        f"Calibration record for instrument {r.get('instrumentTagId')} {r.get('description')} type {r.get('type')} at {r.get('installation_code')}. "
        f"Last calibration {r.get('lastCalDate')} current calibration {r.get('currentCalDate')} next due {r.get('nextDueDate')}. "
        f"Result {r.get('result')} performed by {r.get('performedBy')}. Five point data {_json_text(r.get('fivePointData'))}.",
        installation=r.get("installation_code"), equipment_tag=r.get("instrumentTagId"), status=str(r.get("result") or ""),
    ))

    add("pm_schedule", """
        SELECT pm.*, et.name as equipment_type, it.name as instrument_type
        FROM "PMSchedule" pm
        LEFT JOIN "EquipmentType" et ON et.id = pm."equipmentTypeId"
        LEFT JOIN "InstrumentType" it ON it.id = pm."instrumentTypeId"
        ORDER BY pm."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "pm_schedule", f"PMSchedule:{r['id']}", r["taskDescription"],
        f"PM schedule {r.get('taskDescription')}. Frequency {r.get('frequency')}. "
        f"Equipment type {r.get('equipment_type')} instrument type {r.get('instrument_type')}. Alert lead {r.get('alertLeadTime')}.",
    ))

    add("moh", """
        SELECT *
        FROM "MOHRecord"
        ORDER BY "updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "moh", f"MOHRecord:{r['mohNumber']}", r["mohNumber"],
        f"Major overhaul {r.get('mohNumber')} for {r.get('equipmentTag')} {r.get('equipmentName')}. "
        f"Installation {r.get('installationId')}. Status {r.get('status')} priority {r.get('priority')}. "
        f"Last MOH {r.get('lastMOHDate')} current run hours {r.get('currentRunHours')} D-check interval {r.get('dCheckInterval')} next due {r.get('nextMOHDue')}.",
        installation=r.get("installationId"), equipment_tag=r.get("equipmentTag"), status=str(r.get("status") or ""),
    ))

    add("energy", """
        SELECT del.*, i."installationId" as installation_code
        FROM "DailyEnergyLog" del
        LEFT JOIN "Installation" i ON i.id = del."installationId"
        ORDER BY del.date DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "energy", f"DailyEnergyLog:{r['id']}", f"{r.get('installation_code')} {r.get('date')}",
        f"Daily energy log for {r.get('installation_code')} on {r.get('date')}. Fuel {r.get('fuelQuantity')} {r.get('fuelUnit')} {r.get('fuelType')} cost {r.get('fuelCost')}. "
        f"Electricity {r.get('electricityKwh')} kWh cost {r.get('electricityCost')}. Generator hours {r.get('generatorHours')}. Remarks {r.get('remarks')}. Logged by {r.get('loggedBy')}.",
        installation=r.get("installation_code"),
    ))

    add("electricity_bill", """
        SELECT meb.*, i."installationId" as installation_code
        FROM "MonthlyElectricityBill" meb
        LEFT JOIN "Installation" i ON i.id = meb."installationId"
        ORDER BY meb.year DESC, meb.month DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "electricity_bill", f"MonthlyElectricityBill:{r['id']}", f"{r.get('installation_code')} {r.get('month')}/{r.get('year')}",
        f"Electricity bill for {r.get('installation_code')} month {r.get('month')} year {r.get('year')}. "
        f"Units {r.get('unitsConsumed')} kWh demand {r.get('demandKva')} KVA amount {r.get('billAmount')} total {r.get('totalAmount')}. "
        f"Bill {r.get('billNumber')} status {r.get('status')} due {r.get('dueDate')}.",
        installation=r.get("installation_code"), status=str(r.get("status") or ""),
    ))

    add("workshop", """
        SELECT *
        FROM "WorkshopJob"
        ORDER BY "updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "workshop", f"WorkshopJob:{r['jobNumber']}", r["jobNumber"],
        f"Workshop job {r.get('jobNumber')} {r.get('title')}. {r.get('description')}. Shop {r.get('shopType')}. "
        f"Installation {r.get('installationId')} equipment {r.get('equipmentTag')} work order {r.get('workOrderRef')}. "
        f"Priority {r.get('priority')} status {r.get('status')}. Estimated {r.get('estimatedHours')}h actual {r.get('actualHours')}h. "
        f"Costs material {r.get('materialCost')} labor {r.get('laborCost')} total {r.get('totalCost')}. Assigned {r.get('assignedTo')}. Remarks {r.get('remarks')}.",
        installation=r.get("installationId"), equipment_tag=r.get("equipmentTag"), status=str(r.get("status") or ""),
    ))

    add("procurement", """
        SELECT c.*, d.name as department_name
        FROM "Case" c
        LEFT JOIN "Department" d ON d.id = c."departmentId"
        ORDER BY c."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "procurement", f"Case:{r['id']}", r["title"],
        f"Procurement case {r.get('id')} {r.get('title')}. Type {r.get('type')} stage {r.get('currentStage')}. "
        f"Department {r.get('department_name')} vendor {r.get('vendor')}. PR value {r.get('prValue')} PO value {r.get('poValue')} {r.get('currency')}. "
        f"Created by {r.get('createdBy')}.",
        status=str(r.get("currentStage") or ""),
    ))

    add("budget", """
        SELECT b.*, d.name as department_name
        FROM "Budget" b
        LEFT JOIN "Department" d ON d.id = b."departmentId"
        ORDER BY b.fy DESC, d.name ASC, b.category ASC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "budget", f"Budget:{r['id']}", f"{r.get('department_name')} {r.get('fy')} {r.get('category')}",
        f"Budget for {r.get('department_name')} financial year {r.get('fy')} category {r.get('category')}. "
        f"Amount {r.get('amount')}. Indicative {r.get('isIndicative')}.",
    ))

    add("contract", """
        SELECT c.*, i."installationId" as installation_code, d.name as department_name
        FROM "Contract" c
        LEFT JOIN "Installation" i ON i.id = c."installationId"
        LEFT JOIN "Department" d ON d.id = c."departmentId"
        ORDER BY c."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "contract", f"Contract:{r['contractNumber']}", r["contractNumber"],
        f"Contract {r.get('contractNumber')} {r.get('title')}. Scope {r.get('scope')}. Work type {r.get('workType')}. "
        f"Contractor {r.get('contractorName')} code {r.get('contractorCode')}. Value {r.get('contractValue')} {r.get('currency')}. "
        f"Period {r.get('startDate')} to {r.get('endDate')}. Status {r.get('status')}. Installation {r.get('installation_code')} department {r.get('department_name')}. "
        f"ONGC officer {r.get('ongcOfficer')}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), status=str(r.get("status") or ""),
    ))

    add("contractor_report", """
        SELECT cr.*, c."contractNumber", i."installationId" as installation_code
        FROM "ContractorReport" cr
        LEFT JOIN "Contract" c ON c.id = cr."contractId"
        LEFT JOIN "Installation" i ON i.id = cr."installationId"
        ORDER BY cr."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "contractor_report", f"ContractorReport:{r['id']}", r["title"],
        f"Contractor report {r.get('title')} for contract {r.get('contractNumber')}. Type {r.get('reportType')} status {r.get('reportStatus')} severity {r.get('severity')}. "
        f"Asset {r.get('assetTag')} class {r.get('assetClass')} installation {r.get('installation_code')}. Summary {r.get('summary')}. "
        f"Findings {_json_text(r.get('findings'))}. Measurements {_json_text(r.get('measurements'))}. Recommendations {r.get('recommendations')}. Action taken {r.get('actionTaken')}.",
        installation=r.get("installation_code"), equipment_tag=r.get("assetTag"), status=str(r.get("reportStatus") or ""),
    ))

    add("training", """
        SELECT tr.*, i."installationId" as installation_code
        FROM "TrainingRecord" tr
        LEFT JOIN "Installation" i ON i.id = tr."installationId"
        ORDER BY tr."updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "training", f"TrainingRecord:{r['id']}", r["title"],
        f"Training {r.get('title')} type {r.get('trainingType')} at {r.get('installation_code')}. "
        f"Description {r.get('description')}. Trainer {r.get('trainerName')}. Date {r.get('startDate')} to {r.get('endDate')} duration {r.get('durationHours')}h. "
        f"Venue {r.get('venue')} status {r.get('status')} max attendees {r.get('maxAttendees')}. Remarks {r.get('remarks')}.",
        installation=r.get("installation_code"), status=str(r.get("status") or ""),
    ))

    add("manpower", """
        SELECT *
        FROM "Manpower"
        ORDER BY "updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "manpower", f"Manpower:{r['employeeId']}", r["name"],
        f"Manpower employee {r.get('employeeId')} {r.get('name')}. Service {r.get('department')} section {r.get('section')}. "
        f"Designation {r.get('designation')}. Active {r.get('isActive')}.",
        status="ACTIVE" if r.get("isActive") else "INACTIVE",
    ))

    add("manuals", """
        SELECT rd.*, mf.name as folder_name, mf.category
        FROM "RepositoryDocument" rd
        LEFT JOIN "ManualFolder" mf ON mf.id = rd."folderId"
        ORDER BY rd."uploadedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "manuals", f"RepositoryDocument:{r['id']}", r["originalName"],
        f"Repository document {r.get('originalName')} stored as {r.get('storedName')}. Folder {r.get('folder_name')} category {r.get('category')}. "
        f"Discipline {r.get('primaryDiscipline')}. Extension {r.get('extension')} mime {r.get('mimeType')} path {r.get('repositoryPath')}. Uploaded {r.get('uploadedAt')}.",
        source_type="document_repository", discipline=str(r.get("primaryDiscipline") or ""),
    ))

    add("presentation", """
        SELECT *
        FROM "Presentation"
        ORDER BY "updatedAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "presentation", f"Presentation:{r['id']}", r["title"],
        f"Presentation {r.get('title')} category {r.get('category')}. Description {r.get('description')}. "
        f"Original file {r.get('originalName')} author {r.get('author')} version {r.get('version')} tags {r.get('tags')}. Public {r.get('isPublic')}.",
        source_type="presentation",
    ))

    add("notification", """
        SELECT *
        FROM "Notification"
        ORDER BY "createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "notification", f"Notification:{r['id']}", r["title"],
        f"Notification module {r.get('module')} type {r.get('type')} title {r.get('title')}. "
        f"Message {r.get('message')}. Severity {r.get('severity')} status {r.get('status')}. Entity {r.get('entityType')} {r.get('entityId')}. Metadata {_json_text(r.get('metadata'))}.",
        status=str(r.get("status") or ""),
    ))

    add("inspection", """
        SELECT ie.*, ir.name as round_name, ir.description as round_description, ir.frequency, ir."assignedDept"
        FROM "InspectionExecution" ie
        LEFT JOIN "InspectionRound" ir ON ir.id = ie."roundId"
        ORDER BY ie."createdAt" DESC
        LIMIT %s
    """, (limit_per_module,), lambda r: _rag_record(
        "inspection", f"InspectionExecution:{r['id']}", r.get("round_name") or r["id"],
        f"Inspection execution for round {r.get('round_name')}. Description {r.get('round_description')}. "
        f"Frequency {r.get('frequency')} assigned service {r.get('assignedDept')}. "
        f"Status {r.get('status')} executed by {r.get('executedBy')} at {r.get('executedAt')} completed {r.get('completedAt')}. "
        f"Readings {_json_text(r.get('readings'))}. Flagged items {_json_text(r.get('flaggedItems'))}.",
        status=str(r.get("status") or ""),
    ))

    return {"records": records, "errors": errors}
