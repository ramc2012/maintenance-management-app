"""RAG Engine with hybrid search, source citations, and DB/manual fallback."""
import os
import re
import csv
import html
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Optional
from xml.etree import ElementTree

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

import db_connector as db

_model = None
_chroma_client = None
_collections: Dict[str, Any] = {}

MANUAL_DIRS = [
    Path("/app/manuals"),
    Path("/app/client/public"),
    Path("/app/server_storage/manuals"),
    Path("/app/server_storage/contracts"),
    Path("/app/server_storage/presentations"),
    Path("/app/server_storage/wo-attachments"),
]

SEMANTIC_COLLECTIONS = ["procurement_docs", "workshop_docs", "manual_docs", "module_data"]

STOPWORDS = {
    "about", "above", "after", "against", "all", "and", "answer", "are", "asset", "assets",
    "available", "by", "can", "details", "equipment", "for", "from", "give", "has", "have",
    "history", "in", "installed", "installation", "installations", "is", "list", "log",
    "logs", "maintenance", "me", "module", "of", "on", "options", "please", "probable",
    "provide", "report", "reports", "show", "the", "to", "under", "what", "where", "which",
}


def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.Client(
            Settings(anonymized_telemetry=False, is_persistent=True, persist_directory="/app/chroma_data")
        )
    return _chroma_client


def get_collection(name: str):
    if name not in _collections:
        _collections[name] = get_chroma_client().get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collections[name]


def _chunk_text(text: str, chunk_size: int = 550, overlap: int = 100) -> List[str]:
    """Chunk long text with sentence-aware splitting."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= chunk_size:
        return [cleaned]

    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
                current = current[-overlap:] + " " + sentence if overlap > 0 else sentence
            else:
                chunks.append(sentence[:chunk_size])
                current = sentence[chunk_size - overlap :] if overlap > 0 else ""

    if current:
        chunks.append(current.strip())

    return [c for c in chunks if c]


def _xml_text(raw: bytes) -> str:
    try:
        root = ElementTree.fromstring(raw)
    except ElementTree.ParseError:
        return ""
    values = []
    for node in root.iter():
        if node.text and node.text.strip():
            values.append(node.text.strip())
    return " ".join(values)


def _read_docx_text(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            parts = [
                name
                for name in archive.namelist()
                if name.startswith("word/") and name.endswith(".xml")
            ]
            return "\n".join(_xml_text(archive.read(name)) for name in parts)
    except Exception:
        return ""


def _read_xlsx_text(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            shared_strings: List[str] = []
            if "xl/sharedStrings.xml" in archive.namelist():
                shared_strings = _xml_text(archive.read("xl/sharedStrings.xml")).split()
            values: List[str] = []
            for name in archive.namelist():
                if not (name.startswith("xl/worksheets/") and name.endswith(".xml")):
                    continue
                worksheet_text = _xml_text(archive.read(name))
                values.append(worksheet_text)
            return " ".join(shared_strings + values)
    except Exception:
        return ""


def _read_csv_text(path: Path) -> str:
    try:
        rows = []
        with path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
            for row in csv.reader(handle):
                rows.append(" | ".join(cell.strip() for cell in row if cell.strip()))
        return "\n".join(rows)
    except Exception:
        return ""


def _read_indexable_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".html":
        raw = path.read_text(encoding="utf-8", errors="ignore")
        stripped = re.sub(r"<[^>]+>", " ", raw)
        return html.unescape(stripped)
    if suffix == ".docx":
        return _read_docx_text(path)
    if suffix == ".xlsx":
        return _read_xlsx_text(path)
    if suffix == ".csv":
        return _read_csv_text(path)
    return ""


def _keyword_score(query: str, text: str) -> float:
    q_terms = [t for t in re.findall(r"\w+", query.lower()) if len(t) > 2]
    if not q_terms:
        return 0.0
    lower = text.lower()
    hits = sum(1 for t in q_terms if t in lower)
    return hits / len(q_terms)


def _module_intent_boost(query: str, module: str) -> float:
    q = query.lower()
    module = (module or "").lower()
    boost = 0.0
    if any(term in q for term in ["installed", "installation", "equipment", "asset", "tag"]):
        if module in {"equipment", "instrument", "installation", "asset_history"}:
            boost += 0.12
    if any(term in q for term in ["history", "maintenance history", "daily report", "maint"]):
        if module in {"maintenance_log", "asset_history", "work_order", "logbook"}:
            boost += 0.08
    if any(term in q for term in ["running hour", "run hour", "process", "compressor", "parameter"]):
        if module in {"logbook", "process_log", "gas_compression", "equipment"}:
            boost += 0.1
    if any(term in q for term in ["calibration", "calibrate", "instrument due"]):
        if module in {"calibration", "instrument", "notification"}:
            boost += 0.1
    if any(term in q for term in ["energy", "power", "fuel", "electricity"]):
        if module in {"energy", "electricity_bill"}:
            boost += 0.1
    if any(term in q for term in ["manual", "guide", "procedure", "sop", "drawing", "document", "attachment", "report file"]):
        if module in {"manuals", "contract", "presentation", "work_order"}:
            boost += 0.08
    return boost


def _candidate_terms(query: str) -> List[str]:
    """Extract likely installation/location tokens from a broad user query."""
    terms: List[str] = []
    for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9-]*", query):
        normalized = token.strip()
        if len(normalized) < 2:
            continue
        lower = normalized.lower()
        if lower in STOPWORDS:
            continue
        if normalized.isupper() or any(char.isdigit() for char in normalized) or lower in {"cpf", "ctf", "ggs", "gandhar", "ank", "ankleshwar"}:
            terms.append(normalized)

    # Preserve user order while dropping duplicates.
    seen = set()
    ordered = []
    for term in terms:
        key = term.lower()
        if key not in seen:
            seen.add(key)
            ordered.append(term)
    return ordered[:4]


def _format_installation_equipment_context(query: str) -> List[str]:
    terms = _candidate_terms(query)
    if not terms:
        return []

    context_parts: List[str] = []
    try:
        payload = db.get_equipment_by_installation_terms(terms, limit=18)
    except Exception as exc:
        return [f"[DB equipment lookup unavailable: {exc}]"]

    installations = payload.get("installations") or []
    running_equipment = payload.get("running_equipment") or []
    instruments = payload.get("instruments") or []
    if not installations and not running_equipment and not instruments:
        return []

    context_parts.append(f"[DB] Installation/equipment matches for terms: {', '.join(terms)}")
    if installations:
        context_parts.append("Installations:")
        for inst in installations[:5]:
            context_parts.append(f"- {inst.get('installationId')} | {inst.get('location')} | type {inst.get('type')}")

    if running_equipment:
        context_parts.append("Installed running equipment examples:")
        for eq in running_equipment[:12]:
            context_parts.append(
                f"- {eq.get('equipmentTag')} | {eq.get('description')} | "
                f"{eq.get('installationId')} | {eq.get('primaryDiscipline')} | {eq.get('serviceLine') or 'service not set'}"
            )

    if instruments:
        context_parts.append("Installed instrument examples:")
        for inst in instruments[:8]:
            context_parts.append(
                f"- {inst.get('tagId')} | {inst.get('description')} | "
                f"{inst.get('installationId')} | {inst.get('primaryDiscipline')}"
            )

    context_parts.append(
        "Answering guidance: If the user asked a broad equipment/installation question, summarize these likely matches and offer filters by installation, service, discipline, equipment type, or tag."
    )
    return context_parts


def _reset_collection(collection_name: str):
    collection = get_collection(collection_name)
    try:
        existing = collection.get()
        ids = existing.get("ids") or []
        if ids:
            collection.delete(ids=ids)
    except Exception:
        pass
    return collection


def _clear_module(collection, module: Optional[str] = None):
    if not module:
        return _reset_collection("module_data")
    try:
        collection.delete(where={"module": module})
    except Exception:
        pass
    return collection


def _safe_identifier(value: Any) -> str:
    text = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or "unknown")).strip("_")
    return text[:140] or "unknown"


def _metadata_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _metadata_value(value) for key, value in metadata.items()}


def _add_to_collection(collection, docs: List[str], metas: List[Dict[str, Any]], ids: List[str]) -> int:
    if not docs:
        return 0
    model = get_embedding_model()
    batch_size = 128
    indexed = 0
    for start in range(0, len(docs), batch_size):
        end = start + batch_size
        batch_docs = docs[start:end]
        embeddings = model.encode(batch_docs).tolist()
        collection.add(
            documents=batch_docs,
            embeddings=embeddings,
            metadatas=metas[start:end],
            ids=ids[start:end],
        )
        indexed += len(batch_docs)
    return indexed


def index_procurement_cases(limit: int = 600) -> Dict[str, Any]:
    collection = _reset_collection("procurement_docs")
    model = get_embedding_model()
    cases = db.get_all_cases(limit=limit)

    docs, metas, ids = [], [], []
    for case in cases:
        text = (
            f"Case {case.get('id')} | {case.get('title', 'Untitled')} | "
            f"Type: {case.get('type', 'NA')} | Stage: {case.get('currentStage', 'NA')} | "
            f"Department: {case.get('department_name', 'NA')} | Vendor: {case.get('vendor', 'NA')} | "
            f"PR: {case.get('prValue', 0)} {case.get('currency', 'INR')}"
        )
        for idx, chunk in enumerate(_chunk_text(text)):
            docs.append(chunk)
            metas.append(
                {
                    "module": "procurement",
                    "source_type": "database",
                    "source": f"Case:{case.get('id')}",
                    "title": case.get("title", "Untitled"),
                }
            )
            ids.append(f"proc_{case.get('id')}_{idx}")

    if docs:
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, embeddings=embeddings, metadatas=metas, ids=ids)

    return {"module": "procurement", "indexed": len(docs)}


def index_workshop_jobs(limit: int = 300) -> Dict[str, Any]:
    collection = _reset_collection("workshop_docs")
    model = get_embedding_model()
    jobs = db.get_workshop_jobs(limit=limit)

    docs, metas, ids = [], [], []
    for job in jobs:
        text = (
            f"Workshop job {job.get('jobNumber', 'NA')} {job.get('title', '')}. "
            f"Shop: {job.get('shopType', 'NA')} Status: {job.get('status', 'NA')} "
            f"Priority: {job.get('priority', 'NA')}"
        )
        for idx, chunk in enumerate(_chunk_text(text)):
            docs.append(chunk)
            metas.append(
                {
                    "module": "workshop",
                    "source_type": "database",
                    "source": f"WorkshopJob:{job.get('id', 'NA')}",
                    "title": job.get("title", "Workshop Job"),
                }
            )
            ids.append(f"workshop_{job.get('id', 'na')}_{idx}")

    if docs:
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, embeddings=embeddings, metadatas=metas, ids=ids)

    return {"module": "workshop", "indexed": len(docs)}


def index_manual_documents(max_files: int = 50) -> Dict[str, Any]:
    collection = _reset_collection("manual_docs")
    model = get_embedding_model()

    docs, metas, ids = [], [], []
    count = 0
    for base in MANUAL_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if count >= max_files:
                break
            if path.suffix.lower() not in {".txt", ".md", ".html", ".docx", ".xlsx", ".csv"}:
                continue
            try:
                raw = _read_indexable_file(path)
            except Exception:
                continue
            if not raw.strip():
                continue
            module_name = "manuals"
            if "/contracts/" in str(path):
                module_name = "contract"
            elif "/presentations/" in str(path):
                module_name = "presentation"
            elif "/wo-attachments/" in str(path):
                module_name = "work_order"

            for idx, chunk in enumerate(_chunk_text(raw)):
                docs.append(chunk)
                metas.append(
                    {
                        "module": module_name,
                        "source_type": "storage_file",
                        "source": str(path),
                        "title": path.name,
                    }
                )
                ids.append(f"manual_{path.stem}_{idx}_{count}")
            count += 1

    if docs:
        embeddings = model.encode(docs).tolist()
        collection.add(documents=docs, embeddings=embeddings, metadatas=metas, ids=ids)

    return {"module": "manuals", "indexed": len(docs), "files_scanned": count}


def index_app_database(module: Optional[str] = None, limit_per_module: int = 300) -> Dict[str, Any]:
    """Index live app database records across every major user-facing module."""
    collection = get_collection("module_data")
    _clear_module(collection, module)

    payload = db.get_app_rag_records(
        limit_per_module=limit_per_module,
        modules=[module] if module else None,
    )
    records = payload.get("records", [])
    errors = payload.get("errors", [])

    docs: List[str] = []
    metas: List[Dict[str, Any]] = []
    ids: List[str] = []
    module_counts: Dict[str, int] = {}

    for record in records:
        text = str(record.get("text") or "").strip()
        if not text:
            continue
        source_module = str(record.get("module") or "app")
        source = record.get("source") or record.get("title") or source_module
        module_counts[source_module] = module_counts.get(source_module, 0) + 1

        for idx, chunk in enumerate(_chunk_text(text)):
            docs.append(chunk)
            metas.append(
                _sanitize_metadata(
                    {
                        "module": source_module,
                        "source_type": record.get("source_type", "database"),
                        "source": source,
                        "title": record.get("title", source),
                        "status": record.get("status", ""),
                        "installation": record.get("installation", ""),
                        "equipment_tag": record.get("equipment_tag", ""),
                        "discipline": record.get("discipline", ""),
                    }
                )
            )
            ids.append(f"app_{_safe_identifier(source_module)}_{_safe_identifier(source)}_{idx}")

    indexed = _add_to_collection(collection, docs, metas, ids)
    return {
        "module": module or "app_database",
        "indexed": indexed,
        "records": len(records),
        "source_modules": module_counts,
        "errors": errors,
    }


def index_all_modules() -> Dict[str, Any]:
    results = [
        index_procurement_cases(),
        index_workshop_jobs(),
        index_manual_documents(),
        index_app_database(),
    ]
    return {
        "total_indexed": sum(r.get("indexed", 0) for r in results),
        "modules": results,
    }


# Compatibility alias used in existing API routes
index_cases = index_procurement_cases


def index_assets() -> Dict[str, Any]:
    """Compatibility alias for older advanced RAG routes."""
    return index_app_database(module="equipment")


def index_budgets() -> Dict[str, Any]:
    """Compatibility alias for older advanced RAG routes."""
    return index_app_database(module="budget")


def semantic_search(query: str, top_k: int = 6, module: Optional[str] = None) -> List[Dict[str, Any]]:
    model = get_embedding_model()
    query_embedding = model.encode([query]).tolist()

    collections = SEMANTIC_COLLECTIONS
    results: List[Dict[str, Any]] = []

    for coll_name in collections:
        try:
            coll = get_collection(coll_name)
            where = {"module": module} if module else None
            res = coll.query(
                query_embeddings=query_embedding,
                n_results=max(top_k * 4, 12),
                include=["documents", "metadatas", "distances"],
                where=where,
            )
            if not res.get("ids") or not res["ids"][0]:
                continue

            for i in range(len(res["ids"][0])):
                doc = res["documents"][0][i]
                meta = res["metadatas"][0][i] or {}
                semantic_sim = 1 - float(res["distances"][0][i])
                keyword_sim = _keyword_score(query, doc)
                module_boost = _module_intent_boost(query, meta.get("module", ""))
                hybrid = round((semantic_sim * 0.75) + (keyword_sim * 0.25) + module_boost, 4)
                results.append(
                    {
                        "id": res["ids"][0][i],
                        "document": doc,
                        "metadata": meta,
                        "semantic_similarity": round(semantic_sim, 4),
                        "keyword_similarity": round(keyword_sim, 4),
                        "module_boost": round(module_boost, 4),
                        "hybrid_score": hybrid,
                        "citation": {
                            "source": meta.get("source", "unknown"),
                            "title": meta.get("title", "untitled"),
                            "module": meta.get("module", "unknown"),
                            "source_type": meta.get("source_type", "unknown"),
                        },
                    }
                )
        except Exception:
            continue

    results.sort(key=lambda x: x["hybrid_score"], reverse=True)
    deduped: List[Dict[str, Any]] = []
    seen_sources = set()
    for result in results:
        citation = result.get("citation") or {}
        source_key = (
            citation.get("module", "unknown"),
            citation.get("source", "unknown"),
            citation.get("title", "untitled"),
        )
        if source_key in seen_sources:
            continue
        seen_sources.add(source_key)
        deduped.append(result)
        if len(deduped) >= top_k:
            break

    return deduped


def index_status() -> Dict[str, Any]:
    """Return collection and module counts for RAG diagnostics."""
    collections: Dict[str, Any] = {}
    total_chunks = 0

    for coll_name in SEMANTIC_COLLECTIONS:
        try:
            coll = get_collection(coll_name)
            count = coll.count()
            total_chunks += count
            module_counts: Dict[str, int] = {}
            source_type_counts: Dict[str, int] = {}
            sample_sources: List[Dict[str, str]] = []

            if count:
                data = coll.get(include=["metadatas"])
                for meta in data.get("metadatas") or []:
                    meta = meta or {}
                    module = str(meta.get("module") or "unknown")
                    source_type = str(meta.get("source_type") or "unknown")
                    module_counts[module] = module_counts.get(module, 0) + 1
                    source_type_counts[source_type] = source_type_counts.get(source_type, 0) + 1
                    if len(sample_sources) < 8:
                        sample_sources.append(
                            {
                                "module": module,
                                "title": str(meta.get("title") or "untitled"),
                                "source": str(meta.get("source") or "unknown"),
                                "source_type": source_type,
                            }
                        )

            collections[coll_name] = {
                "chunks": count,
                "modules": dict(sorted(module_counts.items())),
                "source_types": dict(sorted(source_type_counts.items())),
                "sample_sources": sample_sources,
            }
        except Exception as exc:
            collections[coll_name] = {"error": str(exc)}

    storage_paths = [str(path) for path in MANUAL_DIRS if path.exists()]
    return {
        "status": "ready" if total_chunks else "empty",
        "total_chunks": total_chunks,
        "collections": collections,
        "storage_paths": storage_paths,
    }


def search_diagnostics(query: str, top_k: int = 8, module: Optional[str] = None) -> Dict[str, Any]:
    """Return raw retrieval hits with scores and citations."""
    hits = semantic_search(query=query, top_k=top_k, module=module)
    return {
        "query": query,
        "module": module,
        "count": len(hits),
        "hits": [
            {
                "id": hit.get("id"),
                "score": hit.get("hybrid_score"),
                "semantic_similarity": hit.get("semantic_similarity"),
                "keyword_similarity": hit.get("keyword_similarity"),
                "module_boost": hit.get("module_boost"),
                "citation": hit.get("citation", {}),
                "excerpt": hit.get("document", "")[:700],
            }
            for hit in hits
        ],
    }


def _db_fallback_context(query: str, module: Optional[str]) -> List[str]:
    context_parts: List[str] = []
    context_parts.extend(_format_installation_equipment_context(query))
    try:
        if not module or module == "procurement":
            stages = db.get_stage_distribution()
            if stages:
                context_parts.append("[DB] Procurement stages:")
                for s in stages[:5]:
                    context_parts.append(f"- {s['stage']}: {s['count']}")
        if not module or module == "workshop":
            jobs = db.get_workshop_jobs(limit=5)
            if jobs:
                context_parts.append("[DB] Recent workshop jobs:")
                for j in jobs:
                    context_parts.append(f"- {j.get('jobNumber')}: {j.get('title')} ({j.get('status')})")
    except Exception as exc:
        context_parts.append(f"[DB fallback unavailable: {exc}]")
    return context_parts


def build_context(query: str, module: Optional[str] = None) -> str:
    """Build context string with citations + DB fallback when semantic index is sparse."""
    parts: List[str] = []
    hits = semantic_search(query=query, top_k=5, module=module)

    if hits:
        parts.append("=== Retrieved Knowledge (with citations) ===")
        for h in hits:
            c = h["citation"]
            parts.append(
                f"[{c['module']}|{c['source_type']}] {h['document']}\n"
                f"Citation: {c['title']} ({c['source']}) | hybrid={h['hybrid_score']}"
            )
    else:
        parts.append("No semantic matches found. Falling back to live database/manual summaries.")

    parts.extend(_db_fallback_context(query, module))
    return "\n".join(parts)
