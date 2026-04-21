"""Main FastAPI application for Cognitive Service with enhanced RAG."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import llm_service
import rag_engine

# Try to import advanced features, fallback if not available
try:
    import rag_engine_advanced
    HAS_ADVANCED = True
except ImportError:
    HAS_ADVANCED = False
    print("Advanced RAG features not available")

import mcp_tools

app = FastAPI(title="Cognitive Service", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    module: Optional[str] = None
    model: Optional[str] = llm_service.DEFAULT_MODEL
    use_rag: bool = True
    use_multi_hop: bool = True
    current_path: Optional[str] = None
    context: Optional[str] = None
    use_llm: bool = True

class QueryResponse(BaseModel):
    response: str
    model_used: str
    context_used: bool
    sources: Optional[List[Dict]] = None
    tool_used: Optional[str] = None
    llm_enhanced: bool = False


def build_rule_based_response(query: str, context: str, sources: List[Dict[str, Any]]) -> str:
    """Fast non-LLM fallback for the chat endpoint."""
    if not context and not sources:
        return f"No indexed context was found for '{query}'. Try a more specific module, tag, or document reference."

    parts: List[str] = []
    if context:
        condensed_context = " ".join(str(context).split())
        if len(condensed_context) > 800:
            condensed_context = f"{condensed_context[:800].rstrip()}..."
        parts.append(condensed_context)

    if sources:
        source_labels = []
        for source in sources[:3]:
            label = source.get("title") or source.get("source") or source.get("module")
            if label and label not in source_labels:
                source_labels.append(label)
        if source_labels:
            parts.append(f"Sources: {', '.join(source_labels)}")

    return "\n\n".join(parts)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "cognitive", "version": "2.0.0"}

@app.get("/models")
async def get_models():
    """Get available LLM models - format expected by frontend."""
    try:
        models = await llm_service.get_available_models()
        ollama_available = await llm_service.check_ollama_available()
        return {
            "models": models,
            "ollama_available": ollama_available,
            "default": llm_service.DEFAULT_MODEL
        }
    except Exception as e:
        return {
            "models": llm_service.AVAILABLE_MODELS,
            "ollama_available": False,
            "default": llm_service.DEFAULT_MODEL
        }

@app.get("/cognitive/models")
async def get_cognitive_models():
    """Get available LLM models."""
    return await llm_service.get_available_models()

@app.get("/cognitive/check-ollama")
async def check_ollama():
    """Check if Ollama is available."""
    available = await llm_service.check_ollama_available()
    return {"available": available}

@app.post("/chat")
async def chat_basic(request: QueryRequest):
    """Basic chat endpoint (rule-based)."""
    try:
        context = ""
        results = []

        if request.use_rag:
            context = rag_engine.build_context(request.query, request.module)
            results = rag_engine.semantic_search(request.query, top_k=3, module=request.module)

        if request.use_llm:
            response_text = await llm_service.generate_response(
                prompt=request.query,
                context=context,
                model=request.model
            )
        else:
            response_text = build_rule_based_response(
                request.query,
                context,
                [r.get("citation", {}) for r in results],
            )
        
        return {
            "response": response_text,
            "tool_used": "rag_search" if request.use_rag else "direct_lookup",
            "model_used": request.model if request.use_llm else "rule-based",
            "llm_enhanced": request.use_llm,
            "sources": [r.get("citation", {}) for r in results]
        }
    except Exception as e:
        return {
            "response": f"I encountered an issue: {str(e)}. Please try again.",
            "tool_used": None,
            "model_used": None,
            "llm_enhanced": False
        }

@app.post("/chat/enhanced")
async def chat_enhanced(request: QueryRequest):
    """Enhanced chat with LLM and multi-hop reasoning."""
    try:
        context = ""
        sources = []
        
        if request.use_rag:
            if HAS_ADVANCED and request.use_multi_hop:
                context = rag_engine_advanced.build_comprehensive_context(
                    request.query,
                    use_multi_hop=True
                )
                results = rag_engine_advanced.multi_hop_search(request.query)
                sources = [
                    {
                        "module": r['metadata'].get('module', 'unknown'),
                        "relevance": round(r['similarity'], 2)
                    }
                    for r in results[:3]
                ]
            else:
                context = rag_engine.build_context(request.query, request.module)
                results = rag_engine.semantic_search(request.query, top_k=3, module=request.module)
                sources = [
                    {
                        "module": r.get("citation", {}).get("module", "unknown"),
                        "source": r.get("citation", {}).get("source", "unknown"),
                        "title": r.get("citation", {}).get("title", "untitled"),
                    }
                    for r in results
                ]

        if request.use_llm:
            response_text = await llm_service.generate_response(
                prompt=request.query,
                context=context,
                model=request.model
            )
        else:
            response_text = build_rule_based_response(request.query, context, sources)
        
        return {
            "response": response_text,
            "tool_used": "enhanced_rag" if request.use_rag and HAS_ADVANCED and request.use_multi_hop else ("rag_search" if request.use_rag else "direct_lookup"),
            "model_used": request.model if request.use_llm else "rule-based",
            "llm_enhanced": request.use_llm,
            "sources": sources
        }
    except Exception as e:
        return {
            "response": f"LLM error: {str(e)}",
            "tool_used": None,
            "model_used": None,
            "llm_enhanced": False
        }

@app.post("/cognitive/query", response_model=QueryResponse)
async def query_with_rag(request: QueryRequest):
    """Enhanced query endpoint with RAG support."""
    try:
        context = ""
        sources = []
        
        if request.use_rag:
            if request.use_multi_hop and HAS_ADVANCED:
                context = rag_engine_advanced.build_comprehensive_context(
                    request.query,
                    use_multi_hop=True
                )
                results = rag_engine_advanced.multi_hop_search(request.query)
                sources = [
                    {
                        "module": r['metadata'].get('module', 'unknown'),
                        "relevance": round(r['similarity'], 2),
                        "hop": r.get('hop', 1)
                    }
                    for r in results[:5]
                ]
            else:
                context = rag_engine.build_context(request.query, request.module)
                results = rag_engine.semantic_search(request.query, top_k=5, module=request.module)
                sources = [
                    {
                        "module": r.get("citation", {}).get("module", "unknown"),
                        "relevance": round(r.get("hybrid_score", 0), 3),
                        "source": r.get("citation", {}).get("source", "unknown"),
                        "title": r.get("citation", {}).get("title", "untitled"),
                    }
                    for r in results
                ]
        
        if request.use_llm:
            response_text = await llm_service.generate_response(
                prompt=request.query,
                context=context,
                model=request.model
            )
        else:
            response_text = build_rule_based_response(request.query, context, sources)
        
        return QueryResponse(
            response=response_text,
            model_used=request.model if request.use_llm else "rule-based",
            context_used=bool(context),
            sources=sources if sources else None,
            llm_enhanced=request.use_llm
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cognitive/index")
async def index_all_data():
    """Index all module data for RAG search."""
    try:
        if HAS_ADVANCED:
            result = rag_engine_advanced.index_everything()
        else:
            result = rag_engine.index_all_modules()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cognitive/index/{module}")
async def index_module(module: str):
    """Index specific module data."""
    try:
        if module == "procurement":
            result = rag_engine.index_procurement_cases()
        elif module == "workshop":
            result = rag_engine.index_workshop_jobs()
        elif module == "manuals":
            result = rag_engine.index_manual_documents()
        elif HAS_ADVANCED:
            if module == "calibration":
                result = rag_engine_advanced.index_calibration_data()
            elif module == "maintenance":
                result = rag_engine_advanced.index_maintenance_schedules()
            elif module == "assets":
                result = rag_engine_advanced.index_all_equipment()
            else:
                raise HTTPException(status_code=400, detail=f"Unknown module: {module}")
        else:
            raise HTTPException(status_code=400, detail=f"Module indexing not available: {module}")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# MCP Tool endpoints
@app.post("/mcp/run-tool")
async def run_mcp_tool(tool_request: dict):
    """Run an MCP tool."""
    return await mcp_tools.run_tool(tool_request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
