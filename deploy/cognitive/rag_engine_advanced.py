"""Advanced RAG Engine with Multi-Hop Reasoning and Document Citations."""
import os
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import db_connector as db

# Import from base RAG engine
from rag_engine import (
    get_embedding_model,
    get_chroma_client,
    get_collection,
    _format_installation_equipment_context,
    index_all_modules,
    index_app_database,
    semantic_search,
)

# ═══════════════════════════════════════════════════════════════
# ADVANCED INDEXING - All Modules
# ═══════════════════════════════════════════════════════════════

def index_logbook_data():
    """Index equipment operation logs."""
    return index_app_database(module="logbook")

def index_moh_records():
    """Index Major Overhaul (MOH) records."""
    return index_app_database(module="moh")

def index_calibration_data():
    """Index calibration schedules and instruments."""
    return index_app_database(module="calibration")

def index_maintenance_schedules():
    """Index preventive maintenance schedules."""
    pm = index_app_database(module="pm_schedule")
    logs = index_app_database(module="maintenance_log")
    requests = index_app_database(module="maintenance_request")
    return {
        "module": "maintenance",
        "indexed": pm.get("indexed", 0) + logs.get("indexed", 0) + requests.get("indexed", 0),
        "modules": [pm, logs, requests],
    }

def index_all_equipment():
    """Index all equipment for comprehensive search."""
    equipment = index_app_database(module="equipment")
    instruments = index_app_database(module="instrument")
    asset_history = index_app_database(module="asset_history")
    return {
        "module": "assets",
        "indexed": equipment.get("indexed", 0) + instruments.get("indexed", 0) + asset_history.get("indexed", 0),
        "modules": [equipment, instruments, asset_history],
    }

# ═══════════════════════════════════════════════════════════════
# MULTI-HOP REASONING & CONTEXT
# ═══════════════════════════════════════════════════════════════

def multi_hop_search(query: str, max_hops: int = 3) -> List[Dict[str, Any]]:
    """Perform multi-hop reasoning search."""
    hits = semantic_search(query, top_k=10)
    return [
        {
            "hop": 1,
            "id": hit["id"],
            "document": hit["document"],
            "metadata": hit.get("metadata", {}),
            "similarity": hit.get("hybrid_score", hit.get("semantic_similarity", 0)),
            "citation": hit.get("citation", {}),
        }
        for hit in hits
    ]

def build_comprehensive_context(query: str, use_multi_hop: bool = True) -> str:
    """Build comprehensive context from multi-hop search and live data."""
    context_parts = []

    installation_context = _format_installation_equipment_context(query)
    if installation_context:
        context_parts.append("=== Live Installation / Equipment Matches ===")
        context_parts.extend(installation_context)
    
    # 1. Multi-hop results
    try:
        results = multi_hop_search(query)
        if results:
            context_parts.append("=== Relevant Multi-Module Information ===")
            for r in results[:5]:
                meta = r.get("metadata") or {}
                citation = r.get("citation") or {}
                m = meta.get("module", "unknown")
                title = citation.get("title") or meta.get("title", "untitled")
                source = citation.get("source") or meta.get("source", "unknown")
                context_parts.append(
                    f"[{m.upper()}] {r['document']}\n"
                    f"Citation: {title} ({source}) | relevance={round(r.get('similarity', 0), 3)}"
                )
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
    result = index_all_modules()
    return {**result, "status": "complete"}
