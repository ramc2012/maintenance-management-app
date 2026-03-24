import sys
import os
import asyncio

# Add parent directory to path to import db_connector and mcp_tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db_connector as db
import mcp_tools
import rag_engine
import rag_engine_advanced

async def run_tests():
    print("--- Starting Verification ---")
    
    # 1. Test db_connector queries
    print("\nTesting db_connector queries:")
    try:
        ws_jobs = db.get_workshop_jobs(limit=1)
        print(f"  Workshop jobs query: SUCCESS ({len(ws_jobs)} found)")
        
        eq_logs = db.get_equipment_logs(limit=1)
        print(f"  Equipment logs query: SUCCESS ({len(eq_logs)} found)")
        
        en_logs = db.get_energy_logs(limit=1)
        print(f"  Energy logs query: SUCCESS ({len(en_logs)} found)")
        
        moh_records = db.get_moh_records(limit=1)
        print(f"  MOH records query: SUCCESS ({len(moh_records)} found)")
        
        stock = db.get_stock_analysis()
        print(f"  Stock analysis query: SUCCESS ({len(stock)} found)")
    except Exception as e:
        print(f"  DB Query failed: {e}")

    # 2. Test MCP tools
    print("\nTesting MCP tools implementations:")
    try:
        ws_res = mcp_tools.execute_tool("get_workshop_status", {"shop_type": "DIESEL"})
        print(f"  get_workshop_status tool: {ws_res.get('success', False)}")
        
        log_res = mcp_tools.execute_tool("get_logbook_entries", {"limit": 1})
        print(f"  get_logbook_entries tool: {log_res.get('success', False)}")
        
        stock_res = mcp_tools.execute_tool("get_stock_analysis", {"category": "SPARES"})
        print(f"  get_stock_analysis tool: {stock_res.get('success', False)}")
    except Exception as e:
        print(f"  MCP Tool execution failed: {e}")

    # 3. Test Indexing
    print("\nTesting indexing logic:")
    try:
        # Note: We don't want to actually run the full indexing if it's too slow, 
        # but we can check if the functions exist and are callable.
        res = rag_engine_advanced.index_everything()
        print(f"  index_everything: SUCCESS (Indexed {res.get('total_indexed', 0)} items)")
    except Exception as e:
        print(f"  Indexing failed: {e}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
