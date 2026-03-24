"""Database connector for read-only access to PostgreSQL."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional

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
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT im.tag, im.description, im.location, cl.next_due_date,
                   cl.calibration_frequency, im.instrument_type
            FROM "InstrumentMaster" im
            LEFT JOIN "CalibrationLog" cl ON im.tag = cl.instrument_tag
            WHERE cl.next_due_date IS NOT NULL 
            AND cl.next_due_date <= CURRENT_DATE + INTERVAL '%s days'
            ORDER BY cl.next_due_date
        """, (days,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def get_equipment_maintenance_schedule(limit: int = 50) -> List[Dict]:
    """Get upcoming maintenance schedules."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT pm.id, pm.equipment_tag, pm.activity, pm.frequency,
                   pm.last_done, pm.next_due, re.description as equipment_name
            FROM "PMSchedule" pm
            LEFT JOIN "RunningEquipmentMaster" re ON pm.equipment_tag = re.tag
            WHERE pm.next_due >= CURRENT_DATE
            ORDER BY pm.next_due
            LIMIT %s
        """, (limit,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def get_all_equipment(limit: int = 100) -> List[Dict]:
    """Get all equipment from running equipment master."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT tag, description, location, equipment_type, 
                   manufacturer, model, status
            FROM "RunningEquipmentMaster"
            ORDER BY tag
            LIMIT %s
        """, (limit,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def get_installation_hierarchy() -> List[Dict]:
    """Get installation/department hierarchy."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT id, name, parent_id, level, path
            FROM "Installation"
            ORDER BY path
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

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
            SELECT tag, description, location, equipment_type
            FROM "RunningEquipmentMaster"
            WHERE description ILIKE %s OR tag ILIKE %s
            LIMIT %s
        """, (f'%{keyword}%', f'%{keyword}%', limit))
        results["equipment"] = cur.fetchall()
        
        # Search in instruments
        cur.execute("""
            SELECT tag, description, location, instrument_type
            FROM "InstrumentMaster"
            WHERE description ILIKE %s OR tag ILIKE %s
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
