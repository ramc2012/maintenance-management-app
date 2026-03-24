"""MCP-style tools for procurement, maintenance, and asset data access."""
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import db_connector as db

# ═══════════════════════════════════════════════════════════════
# TOOL SCHEMAS (MCP-compatible)
# ═══════════════════════════════════════════════════════════════

class SearchCasesInput(BaseModel):
    stage: Optional[str] = Field(None, description="Filter by stage: Requirement Raised, Approval, PR Release, Tendering, etc.")
    department: Optional[str] = Field(None, description="Filter by department name")
    case_type: Optional[str] = Field(None, description="Filter by type: STORES, SPARES, CAPITAL, SERVICES, PETTY")
    aged_days: Optional[int] = Field(None, description="Get cases older than N days")

class GetCaseDetailsInput(BaseModel):
    case_id: str = Field(..., description="The UUID of the case to retrieve")

class BudgetSummaryInput(BaseModel):
    department: Optional[str] = Field(None, description="Filter by department name")
    fiscal_year: Optional[str] = Field(None, description="Filter by FY e.g. 2024-25")

class VendorAnalysisInput(BaseModel):
    vendor_name: Optional[str] = Field(None, description="Specific vendor to analyze")

# --- MAINTENANCE & ASSET INPUTS ---

class SearchWorkOrdersInput(BaseModel):
    priority: Optional[str] = Field(None, description="Filter by priority: HIGH, EMERGENCY, NORMAL")
    status: Optional[str] = Field(None, description="Filter by status: OPEN, CLOSED, IN_PROGRESS")
    wo_type: Optional[str] = Field(None, description="Filter by type: PREVENTIVE, CORRECTIVE")

class AssetDetailsInput(BaseModel):
    asset_tag: str = Field(..., description="Tag number or name of the asset")

# --- NEW MODULE INPUTS ---

class WorkshopJobsInput(BaseModel):
    shop_type: Optional[str] = Field(None, description="Filter by shop: FABRICATION, DIESEL, MACHINE, ELECTRICAL")
    status: Optional[str] = Field(None, description="Filter by status: PENDING, IN_PROGRESS, COMPLETED")

class LogbookEntriesInput(BaseModel):
    equipment_tag: Optional[str] = Field(None, description="Filter by equipment tag e.g. K-101")
    limit: Optional[int] = Field(20, description="Number of recent logs to retrieve")

class EnergyLogsInput(BaseModel):
    installation_id: Optional[str] = Field(None, description="Filter by installation name or ID")

class MOHRecordsInput(BaseModel):
    installation_id: Optional[str] = Field(None, description="Filter by installation name or ID")
    status: Optional[str] = Field(None, description="Filter by status: PLANNED, IN_PROGRESS, COMPLETED")

class StockAnalysisInput(BaseModel):
    category: Optional[str] = Field(None, description="Filter by category: STORES, SPARES, CAPITAL")

# ═══════════════════════════════════════════════════════════════
# TOOL IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════

AVAILABLE_TOOLS = {}

def tool(name: str, description: str):
    """Decorator to register a tool."""
    def decorator(func):
        AVAILABLE_TOOLS[name] = {
            "function": func,
            "description": description,
            "name": name
        }
        return func
    return decorator

@tool("search_cases", "Search and filter procurement cases by stage, department, type, or age")
def search_cases(params: SearchCasesInput) -> Dict[str, Any]:
    """Search cases with various filters."""
    try:
        if params.aged_days:
            cases = db.get_aged_cases(params.aged_days)
            return {"success": True, "count": len(cases), "cases": cases, 
                    "summary": f"Found {len(cases)} cases older than {params.aged_days} days that are still open"}
        
        if params.stage:
            cases = db.get_cases_by_stage(params.stage)
            return {"success": True, "count": len(cases), "cases": cases,
                    "summary": f"Found {len(cases)} cases in '{params.stage}' stage"}
        
        if params.department:
            cases = db.get_cases_by_department(params.department)
            return {"success": True, "count": len(cases), "cases": cases,
                    "summary": f"Found {len(cases)} cases for department matching '{params.department}'"}
        
        if params.case_type:
            cases = db.get_cases_by_type(params.case_type)
            return {"success": True, "count": len(cases), "cases": cases,
                    "summary": f"Found {len(cases)} {params.case_type} cases"}
        
        # Default: get all cases
        cases = db.get_all_cases(50)
        return {"success": True, "count": len(cases), "cases": cases,
                "summary": f"Retrieved {len(cases)} recent cases"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_case_details", "Get detailed information about a specific case by ID")
def get_case_details(params: GetCaseDetailsInput) -> Dict[str, Any]:
    """Get full details of a specific case."""
    try:
        case = db.get_case_by_id(params.case_id)
        if case:
            return {"success": True, "case": case}
        return {"success": False, "error": "Case not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_budget_summary", "Get budget allocation and utilization summary")
def get_budget_summary(params: BudgetSummaryInput) -> Dict[str, Any]:
    """Get budget summary with optional filters."""
    try:
        budget_data = db.get_budget_summary(params.fiscal_year)
        spend_data = db.get_department_spend(params.department)
        
        return {
            "success": True,
            "budget_allocations": budget_data,
            "department_spend": spend_data,
            "summary": f"Budget data for {params.fiscal_year or 'all years'}, {len(spend_data)} departments"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_analytics", "Get procurement analytics: stage distribution, type breakdown, vendor summary")
def get_analytics(params: None = None) -> Dict[str, Any]:
    """Get comprehensive procurement analytics."""
    try:
        stage_dist = db.get_stage_distribution()
        type_dist = db.get_type_distribution()
        vendor_summary = db.get_vendor_summary()
        departments = db.get_departments()
        
        return {
            "success": True,
            "stage_distribution": stage_dist,
            "type_distribution": type_dist,
            "vendor_summary": vendor_summary,
            "departments": departments,
            "summary": f"{sum(s['count'] for s in stage_dist)} total cases across {len(departments)} departments"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_vendor_analysis", "Analyze vendor performance and procurement history")
def get_vendor_analysis(params: VendorAnalysisInput) -> Dict[str, Any]:
    """Get vendor analysis."""
    try:
        vendors = db.get_vendor_summary()
        
        if params.vendor_name:
            # Filter to specific vendor
            vendors = [v for v in vendors if params.vendor_name.lower() in (v.get('vendor') or '').lower()]
        
        return {
            "success": True,
            "vendors": vendors,
            "summary": f"Found {len(vendors)} vendors" + (f" matching '{params.vendor_name}'" if params.vendor_name else "")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- MAINTENANCE & ASSET TOOLS ---

@tool("search_work_orders", "Search work orders by priority, type, or status")
def search_work_orders(params: SearchWorkOrdersInput) -> Dict[str, Any]:
    """Search maintenance work orders."""
    try:
        if params.priority:
            orders = db.get_work_orders_by_priority(params.priority)
            return {"success": True, "count": len(orders), "work_orders": orders,
                    "summary": f"Found {len(orders)} {params.priority} priority work orders"}
        
        if params.wo_type:
            orders = db.get_work_orders_by_type(params.wo_type)
            return {"success": True, "count": len(orders), "work_orders": orders,
                    "summary": f"Found {len(orders)} {params.wo_type} work orders"}
            
        # Default: get open orders
        orders = db.get_open_work_orders(50)
        return {"success": True, "count": len(orders), "work_orders": orders,
                "summary": f"Found {len(orders)} open work orders"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_asset_details", "Get status and history of an asset/equipment")
def get_asset_details(params: AssetDetailsInput) -> Dict[str, Any]:
    """Get full details of an asset including history."""
    try:
        details = db.get_asset_details(params.asset_tag)
        if not details:
            return {"success": False, "error": f"Asset '{params.asset_tag}' not found"}
            
        history = db.get_asset_work_history(params.asset_tag)
        
        return {
            "success": True,
            "details": details,
            "work_history": history,
            "summary": f"Asset {details.get('name')} found with {len(history)} logic records"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- NEW MODULE TOOLS ---

@tool("get_workshop_status", "Search and filter workshop job status and history")
def get_workshop_status(params: WorkshopJobsInput) -> Dict[str, Any]:
    """Get workshop status."""
    try:
        jobs = db.get_workshop_jobs(params.shop_type, params.status)
        return {"success": True, "count": len(jobs), "jobs": jobs,
                "summary": f"Found {len(jobs)} workshop jobs" + (f" in {params.shop_type}" if params.shop_type else "")}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_logbook_entries", "Get recent equipment operation logs (readings, status)")
def get_logbook_entries(params: LogbookEntriesInput) -> Dict[str, Any]:
    """Get logbook entries."""
    try:
        logs = db.get_equipment_logs(params.equipment_tag, params.limit)
        return {"success": True, "count": len(logs), "logs": logs,
                "summary": f"Retrieved {len(logs)} operational logs" + (f" for {params.equipment_tag}" if params.equipment_tag else "")}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_energy_summary", "Get energy consumption logs and electricity bill status")
def get_energy_summary(params: EnergyLogsInput) -> Dict[str, Any]:
    """Get energy logs."""
    try:
        logs = db.get_energy_logs(params.installation_id)
        return {"success": True, "count": len(logs), "logs": logs,
                "summary": f"Found {len(logs)} energy log entries"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_moh_status", "Track progress of Major Overhauls (MOH) for equipment")
def get_moh_status(params: MOHRecordsInput) -> Dict[str, Any]:
    """Get MOH records."""
    try:
        records = db.get_moh_records(params.installation_id, params.status)
        return {"success": True, "count": len(records), "records": records,
                "summary": f"Found {len(records)} MOH records"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_stock_analysis", "Analyze material requirements, stock levels, and procurement categories")
def get_stock_analysis(params: StockAnalysisInput) -> Dict[str, Any]:
    """Analyze stock from cases."""
    try:
        analysis = db.get_stock_analysis(params.category)
        return {"success": True, "analysis": analysis,
                "summary": f"Retrieved stock analysis for {params.category or 'all categories'}"}
    except Exception as e:
        return {"success": False, "error": str(e)}



class DraftWorkOrderInput(BaseModel):
    equipment_tag: str = Field(..., description="Target equipment tag")
    issue_description: str = Field(..., description="Issue/problem summary")
    priority: str = Field("NORMAL", description="LOW, NORMAL, HIGH, EMERGENCY")
    wo_type: str = Field("CORRECTIVE", description="PREVENTIVE or CORRECTIVE")

class ChartDataInput(BaseModel):
    chart_type: str = Field("bar", description="bar, pie, line")
    metric: str = Field("stage_distribution", description="stage_distribution, type_distribution, workshop_status")

@tool("draft_work_order", "Create a structured draft work-order payload for frontend/API submission")
def draft_work_order(params: DraftWorkOrderInput) -> Dict[str, Any]:
    """Generate draft work order payload (non-persistent)."""
    try:
        draft = {
            "equipmentTag": params.equipment_tag,
            "description": params.issue_description,
            "priority": params.priority.upper(),
            "type": params.wo_type.upper(),
            "status": "DRAFT",
            "recommendedActions": [
                "Inspect root cause",
                "Verify spares availability",
                "Assign technician and ETA",
            ],
        }
        return {
            "success": True,
            "draft": draft,
            "summary": f"Prepared {draft['type']} draft WO for {draft['equipmentTag']} with {draft['priority']} priority",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@tool("get_chart_data", "Get chart-ready analytics payload for dashboard visualizations")
def get_chart_data(params: ChartDataInput) -> Dict[str, Any]:
    """Return chart-ready data bundles."""
    try:
        if params.metric == "stage_distribution":
            rows = db.get_stage_distribution()
            labels = [r.get("stage", "Unknown") for r in rows]
            values = [r.get("count", 0) for r in rows]
        elif params.metric == "type_distribution":
            rows = db.get_type_distribution()
            labels = [r.get("type", "Unknown") for r in rows]
            values = [r.get("count", 0) for r in rows]
        elif params.metric == "workshop_status":
            rows = db.get_workshop_jobs(limit=200)
            agg: Dict[str, int] = {}
            for r in rows:
                key = r.get("status", "UNKNOWN")
                agg[key] = agg.get(key, 0) + 1
            labels = list(agg.keys())
            values = list(agg.values())
        else:
            return {"success": False, "error": f"Unsupported metric: {params.metric}"}

        return {
            "success": True,
            "chart": {
                "type": params.chart_type,
                "metric": params.metric,
                "labels": labels,
                "datasets": [{"label": params.metric, "data": values}],
            },
            "summary": f"Prepared {params.chart_type} chart payload for {params.metric}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ═══════════════════════════════════════════════════════════════
# TOOL EXECUTION
# ═══════════════════════════════════════════════════════════════

def get_tool_descriptions() -> List[Dict[str, str]]:
    """Get descriptions of all available tools."""
    return [{"name": t["name"], "description": t["description"]} for t in AVAILABLE_TOOLS.values()]

async def run_tool(tool_request: dict) -> Dict[str, Any]:
    """Entry point for running a tool (async)."""
    tool_name = tool_request.get("name")
    params = tool_request.get("parameters", {})
    return execute_tool(tool_name, params)

def execute_tool(tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by name with given parameters."""
    if tool_name not in AVAILABLE_TOOLS:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    tool_info = AVAILABLE_TOOLS[tool_name]
    func = tool_info["function"]
    
    # Create appropriate input model based on tool
    try:
        if tool_name == "search_cases":
            input_model = SearchCasesInput(**params)
        elif tool_name == "get_case_details":
            input_model = GetCaseDetailsInput(**params)
        elif tool_name == "get_budget_summary":
            input_model = BudgetSummaryInput(**params)
        elif tool_name == "get_vendor_analysis":
            input_model = VendorAnalysisInput(**params)
        elif tool_name == "search_work_orders":
            input_model = SearchWorkOrdersInput(**params)
        elif tool_name == "get_asset_details":
            input_model = AssetDetailsInput(**params)
        elif tool_name == "get_workshop_status":
            input_model = WorkshopJobsInput(**params)
        elif tool_name == "get_logbook_entries":
            input_model = LogbookEntriesInput(**params)
        elif tool_name == "get_energy_summary":
            input_model = EnergyLogsInput(**params)
        elif tool_name == "get_moh_status":
            input_model = MOHRecordsInput(**params)
        elif tool_name == "get_stock_analysis":
            input_model = StockAnalysisInput(**params)
        elif tool_name == "draft_work_order":
            input_model = DraftWorkOrderInput(**params)
        elif tool_name == "get_chart_data":
            input_model = ChartDataInput(**params)
        else:
            input_model = None
            
        return func(input_model)
    except Exception as e:
        return {"success": False, "error": f"Parameter validation error: {str(e)}"}
