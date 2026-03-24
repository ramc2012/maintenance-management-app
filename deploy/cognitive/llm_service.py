"""Local LLM Service using Ollama."""
import os
import httpx
from typing import Optional, Dict, Any, List

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")

# Available models - user can select from these
AVAILABLE_MODELS = [
    {"id": "tinyllama", "name": "TinyLlama ⚡", "description": "Fastest (3-4 sec, 1.1B params)"},
    {"id": "gemma2", "name": "Gemma 2", "description": "Google's model (4-6 sec, 2.6B params)"},
    {"id": "llama3.2", "name": "Llama 3.2", "description": "Balanced (6-8 sec, 3.2B params)"},
    {"id": "mistral", "name": "Mistral ⏱️", "description": "Best quality (10-15 sec, 7.2B params)"},
]

DEFAULT_MODEL = "tinyllama"

async def check_ollama_available() -> bool:
    """Check if Ollama is available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            return response.status_code == 200
    except:
        return False

async def get_available_models() -> List[Dict[str, Any]]:
    """Get list of available models from Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                installed = [m["name"].split(":")[0] for m in data.get("models", [])]
                # Return our available models with installation status
                return [
                    {**m, "installed": m["id"] in installed or any(m["id"] in i for i in installed)}
                    for m in AVAILABLE_MODELS
                ]
    except:
        pass
    return AVAILABLE_MODELS

async def generate_response(
    prompt: str,
    context: str = "",
    model: str = DEFAULT_MODEL,
    system_prompt: str = None
) -> str:
    """Generate a response using Ollama."""
    
    if system_prompt is None:
        system_prompt = """You are Kelvin AI, an intelligent assistant for an Enterprise Maintenance Management System.

You help users across ALL 12 modules:
- **Assets**: Equipment tracking, maintenance schedules, asset lifecycle
- **Calibration**: Instrument calibration management, schedules, certificates
- **Collaboration**: Team communication, tasks, document sharing
- **Enterprise**: Organization-level dashboard, KPIs, overview
- **Energy**: Energy consumption monitoring, efficiency analysis
- **Logbook**: Equipment logs, readings, operational events
- **Manuals & Drawings**: Technical documentation, drawings repository, specifications
- **MOH (Machine Operating Hours)**: Machine usage tracking, runtime analysis
- **MRP (Materials Resource Planning)**: Inventory, procurement, materials management
- **Reports**: Analytics, custom reports, data visualization
- **Training**: Training records, certifications, skill management
- **Workshop**: Repair tasks, work orders, maintenance execution

You can search through uploaded manuals and technical drawings to answer complex technical questions.
When referencing manuals or drawings, cite the document name.
Provide concise, accurate answers with markdown formatting when helpful."""

    full_prompt = f"""Context:
{context}

User Query: {prompt}

Based on the context above, provide a helpful response to the user's query."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": full_prompt,
                    "system": system_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 500
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "I couldn't generate a response.")
            else:
                return f"Model error: {response.status_code}"
    except httpx.TimeoutException:
        return "The model took too long to respond. Try a simpler question."
    except Exception as e:
        return f"LLM not available: {str(e)}"

async def enhance_response_with_llm(
    tool_response: str,
    original_query: str,
    model: str = DEFAULT_MODEL
) -> str:
    """Use LLM to enhance/summarize tool response."""
    
    prompt = f"""The user asked: "{original_query}"

Here's the raw data response:
{tool_response}

Please provide a natural, conversational summary of this data. Keep it concise but informative.
If there are insights or patterns, mention them. Format with markdown for readability."""

    try:
        return await generate_response(prompt, model=model)
    except:
        return tool_response  # Fall back to original if LLM fails

