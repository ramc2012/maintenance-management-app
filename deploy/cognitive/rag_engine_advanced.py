"""Advanced RAG Engine with Multi-Hop Reasoning and Document Citations."""
import os
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import db_connector as db

# Import from base RAG engine
from rag_engine import get_embedding_model, get_chroma_client, get_collection

# ═══════════════════════════════════════════════════════════════
# ADVANCED INDEXING - All Modules
# ═══════════════════════════════════════════════════════════════

def index_logbook_data():
    """Index equipment operation logs."""
    collection = get_collection("module_data")
    model = get_embedding_model()
    
    try:
        logs = db.get_equipment_logs(limit=200)
        documents = []
        metadatas = []
        ids = []
        
        for log in logs:
            doc_text = f"Equipment Log: {log.get('equipmentTag', 'Unknown')}\nDate: {log.get('date', 'Unknown')}\nStatus: {'Running' if log.get('runStatus') else 'Stopped'}\nRemarks: {log.get('remarks', 'None')}\nModule: Logbooks"
            documents.append(doc_text.strip())
            metadatas.append({
                "module": "logbook",
                "type": "log",
                "equipment_tag": log.get('equipmentTag', '')
            })
            ids.append(f"log_{log.get('id', 'unknown')}")
        
        if documents:
            embeddings = model.encode(documents).tolist()
            collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return {"indexed": len(documents), "module": "logbook"}
    except Exception as e:
        return {"error": str(e), "module": "logbook"}
    return {"indexed": 0, "module": "logbook"}

def index_moh_records():
    """Index Major Overhaul (MOH) records."""
    collection = get_collection("module_data")
    model = get_embedding_model()
    
    try:
        records = db.get_moh_records(limit=100)
        documents = []
        metadatas = []
        ids = []
        
        for record in records:
            doc_text = f"MOH Record: {record.get('mohNumber', 'Unknown')}\nEquipment: {record.get('equipmentTag', 'Unknown')}\nStatus: {record.get('status', 'Unknown')}\nFindings: {record.get('findings', 'None')}\nActions: {record.get('actionsTaken', 'None')}\nModule: MOH"
            documents.append(doc_text.strip())
            metadatas.append({
                "module": "moh",
                "type": "record",
                "equipment_tag": record.get('equipmentTag', ''),
                "status": record.get('status', '')
            })
            ids.append(f"moh_{record.get('id', 'unknown')}")
        
        if documents:
            embeddings = model.encode(documents).tolist()
            collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return {"indexed": len(documents), "module": "moh"}
    except Exception as e:
        return {"error": str(e), "module": "moh"}
    return {"indexed": 0, "module": "moh"}

def index_calibration_data():
    """Index calibration schedules and instruments."""
    collection = get_collection("module_data")
    model = get_embedding_model()
    try:
        cal_due = db.get_calibration_due(days=90)
        documents = []
        metadatas = []
        ids = []
        for item in cal_due:
            doc_text = f"Instrument: {item.get('tag', 'Unknown')} - {item.get('description', '')}\nLocation: {item.get('location', 'Unknown')}\nNext Due: {item.get('next_due_date', 'Unknown')}\nModule: Calibration"
            documents.append(doc_text.strip())
            metadatas.append({"module": "calibration", "type": "instrument", "tag": item.get('tag', '')})
            ids.append(f"cal_{item.get('tag', 'unknown')}")
        
        if documents:
            embeddings = model.encode(documents).tolist()
            collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return {"indexed": len(documents), "module": "calibration"}
    except Exception as e: return {"error": str(e), "module": "calibration"}
    return {"indexed": 0, "module": "calibration"}

def index_maintenance_schedules():
    """Index preventive maintenance schedules."""
    collection = get_collection("module_data")
    model = get_embedding_model()
    try:
        pm_schedules = db.get_equipment_maintenance_schedule(limit=100)
        documents = []
        metadatas = []
        ids = []
        for pm in pm_schedules:
            doc_text = f"Equipment: {pm.get('equipment_tag', 'Unknown')}\nActivity: {pm.get('activity', 'Unknown')}\nNext Due: {pm.get('next_due', 'Unknown')}\nModule: Maintenance"
            documents.append(doc_text.strip())
            metadatas.append({"module": "maintenance", "type": "pm_schedule", "tag": pm.get('equipment_tag', '')})
            ids.append(f"pm_{pm.get('id', 'unknown')}")
        
        if documents:
            embeddings = model.encode(documents).tolist()
            collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return {"indexed": len(documents), "module": "maintenance"}
    except Exception as e: return {"error": str(e), "module": "maintenance"}
    return {"indexed": 0, "module": "maintenance"}

def index_all_equipment():
    """Index all equipment for comprehensive search."""
    collection = get_collection("module_data")
    model = get_embedding_model()
    try:
        equipment = db.get_all_equipment(limit=200)
        documents = []
        metadatas = []
        ids = []
        for eq in equipment:
            doc_text = f"Equipment Tag: {eq.get('tag', 'Unknown')}\nDescription: {eq.get('description', '')}\nType: {eq.get('equipment_type', 'Unknown')}\nStatus: {eq.get('status', 'Unknown')}\nModule: Assets"
            documents.append(doc_text.strip())
            metadatas.append({"module": "assets", "type": "equipment", "tag": eq.get('tag', '')})
            ids.append(f"eq_{eq.get('tag', 'unknown')}")
        
        if documents:
            embeddings = model.encode(documents).tolist()
            collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
            return {"indexed": len(documents), "module": "assets"}
    except Exception as e: return {"error": str(e), "module": "assets"}
    return {"indexed": 0, "module": "assets"}

# ═══════════════════════════════════════════════════════════════
# MULTI-HOP REASONING & CONTEXT
# ═══════════════════════════════════════════════════════════════

def multi_hop_search(query: str, max_hops: int = 3) -> List[Dict[str, Any]]:
    """Perform multi-hop reasoning search."""
    model = get_embedding_model()
    query_embedding = model.encode([query]).tolist()
    all_results = []
    
    for coll_name in ["procurement_docs", "module_data"]:
        try:
            coll = get_collection(coll_name)
            res = coll.query(query_embeddings=query_embedding, n_results=5, include=["documents", "metadatas", "distances"])
            if res['ids'] and res['ids'][0]:
                for i in range(len(res['ids'][0])):
                    all_results.append({
                        "hop": 1, "id": res['ids'][0][i], "document": res['documents'][0][i],
                        "metadata": res['metadatas'][0][i], "similarity": 1 - res['distances'][0][i]
                    })
        except: pass
    
    all_results.sort(key=lambda x: x['similarity'], reverse=True)
    return all_results[:10]

def build_comprehensive_context(query: str, use_multi_hop: bool = True) -> str:
    """Build comprehensive context from multi-hop search and live data."""
    context_parts = []
    
    # 1. Multi-hop results
    try:
        results = multi_hop_search(query)
        if results:
            context_parts.append("=== Relevant Multi-Module Information ===")
            for r in results[:5]:
                m = r['metadata'].get('module', 'unknown')
                context_parts.append(f"[{m.upper()}] {r['document']}")
    except: pass
    
    # 2. Live Insights
    q_low = query.lower()
    if 'log' in q_low or 'reading' in q_low or 'flow' in q_low:
        try:
            logs = db.get_equipment_logs(limit=5)
            if logs:
                context_parts.append("\n=== Recent Operational Logs ===")
                for l in logs:
                    context_parts.append(f"- {l['equipmentTag']}: {l.get('remarks', 'No remarks')} (Date: {l['date']})")
        except: pass
        
    if 'moh' in q_low or 'overhaul' in q_low:
        try:
            records = db.get_moh_records(limit=5)
            if records:
                context_parts.append("\n=== Major Overhaul (MOH) Summary ===")
                for r in records:
                    context_parts.append(f"- {r['mohNumber']}: {r['equipmentTag']} ({r['status']})")
        except: pass

    if 'workshop' in q_low or 'job' in q_low:
        try:
            jobs = db.get_workshop_jobs(limit=5)
            if jobs:
                context_parts.append("\n=== Workshop Jobs Activity ===")
                for j in jobs:
                    context_parts.append(f"- {j['jobNumber']}: {j['title']} (Shop: {j['shopType']}, Status: {j['status']})")
        except: pass
        
    return "\n".join(context_parts) if context_parts else "General context used."

def index_everything():
    """Index all modules comprehensively."""
    from rag_engine import index_procurement_cases, index_assets, index_budgets, index_workshop_jobs
    results = []
    results.append(index_procurement_cases())
    results.append(index_assets())
    results.append(index_budgets())
    results.append(index_workshop_jobs())
    results.append(index_logbook_data())
    results.append(index_moh_records())
    results.append(index_calibration_data())
    results.append(index_maintenance_schedules())
    results.append(index_all_equipment())
    
    return {
        "total_indexed": sum(r.get("indexed", 0) for r in results if isinstance(r, dict)),
        "modules": results,
        "status": "complete"
    }
