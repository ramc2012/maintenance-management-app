"""RAG Engine with hybrid search, source citations, and DB/manual fallback."""
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

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
]


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


def _keyword_score(query: str, text: str) -> float:
    q_terms = [t for t in re.findall(r"\w+", query.lower()) if len(t) > 2]
    if not q_terms:
        return 0.0
    lower = text.lower()
    hits = sum(1 for t in q_terms if t in lower)
    return hits / len(q_terms)


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
            if path.suffix.lower() not in {".txt", ".md", ".html"}:
                continue
            try:
                raw = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for idx, chunk in enumerate(_chunk_text(raw)):
                docs.append(chunk)
                metas.append(
                    {
                        "module": "manuals",
                        "source_type": "manual",
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


def index_all_modules() -> Dict[str, Any]:
    results = [index_procurement_cases(), index_workshop_jobs(), index_manual_documents()]
    return {
        "total_indexed": sum(r.get("indexed", 0) for r in results),
        "modules": results,
    }


# Compatibility alias used in existing API routes
index_cases = index_procurement_cases


def semantic_search(query: str, top_k: int = 6, module: Optional[str] = None) -> List[Dict[str, Any]]:
    model = get_embedding_model()
    query_embedding = model.encode([query]).tolist()

    collections = ["procurement_docs", "workshop_docs", "manual_docs"]
    results: List[Dict[str, Any]] = []

    for coll_name in collections:
        try:
            coll = get_collection(coll_name)
            where = {"module": module} if module else None
            res = coll.query(
                query_embeddings=query_embedding,
                n_results=top_k,
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
                hybrid = round((semantic_sim * 0.75) + (keyword_sim * 0.25), 4)
                results.append(
                    {
                        "id": res["ids"][0][i],
                        "document": doc,
                        "metadata": meta,
                        "semantic_similarity": round(semantic_sim, 4),
                        "keyword_similarity": round(keyword_sim, 4),
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
    return results[:top_k]


def _db_fallback_context(module: Optional[str]) -> List[str]:
    context_parts: List[str] = []
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

    parts.extend(_db_fallback_context(module))
    return "\n".join(parts)
