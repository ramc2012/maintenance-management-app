"""Local LLM Service using Ollama."""
import os
import httpx
from typing import Optional, Dict, Any, List, Tuple

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_REQUEST_TIMEOUT = float(os.getenv("OLLAMA_REQUEST_TIMEOUT", "120"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "160"))
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "30m")
OLLAMA_MAX_CONTEXT_CHARS = int(os.getenv("OLLAMA_MAX_CONTEXT_CHARS", "3000"))
OLLAMA_MAX_PROMPT_CHARS = int(os.getenv("OLLAMA_MAX_PROMPT_CHARS", "1200"))

# Available models - user can select from these
AVAILABLE_MODELS = [
    {"id": "gemma4:e2b", "name": "Gemma 4 E2B", "description": "Local Gemma 4 5.1B profile currently installed on this workstation."},
    {"id": "gemma4:e4b", "name": "Gemma 4 E4B", "description": "Higher-memory Gemma 4 8B profile for better synthesis when available."},
    {"id": "tinyllama", "name": "TinyLlama ⚡", "description": "Fastest fallback (3-4 sec, 1.1B params)"},
    {"id": "gemma2", "name": "Gemma 2", "description": "Legacy Google model retained for compatibility."},
    {"id": "llama3.2", "name": "Llama 3.2", "description": "Balanced (6-8 sec, 3.2B params)"},
    {"id": "mistral", "name": "Mistral ⏱️", "description": "Best quality (10-15 sec, 7.2B params)"},
]

DEFAULT_MODEL = os.getenv("DEFAULT_OLLAMA_MODEL", "gemma4:e2b")


def _base_model_name(model_name: str) -> str:
    return model_name.split(":", 1)[0]


def _compact_text(value: str, limit: int) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


async def _fetch_installed_model_names() -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code != 200:
                return []
            data = response.json()
            return [str(model.get("name", "")).strip() for model in data.get("models", []) if model.get("name")]
    except Exception:
        return []


def _resolve_installed_model(requested_model: str, installed_models: List[str]) -> Tuple[Optional[str], Optional[str]]:
    for installed_model in installed_models:
        if installed_model == requested_model:
            return installed_model, None

    requested_base = _base_model_name(requested_model)
    for installed_model in installed_models:
        if _base_model_name(installed_model) == requested_base:
            return installed_model, None

    for preferred in [DEFAULT_MODEL, *[model["id"] for model in AVAILABLE_MODELS]]:
        preferred_base = _base_model_name(preferred)
        for installed_model in installed_models:
            if installed_model == preferred or _base_model_name(installed_model) == preferred_base:
                return installed_model, (
                    f"Requested model '{requested_model}' is not installed. "
                    f"Using '{installed_model}' instead."
                )

    if installed_models:
        return installed_models[0], (
            f"Requested model '{requested_model}' is not installed. "
            f"Using the only available local model '{installed_models[0]}' instead."
        )

    return None, "No Ollama models are installed."

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
        installed_names = await _fetch_installed_model_names()
        installed_name_set = set(installed_names)
        installed_base_map = {
            _base_model_name(installed_name): installed_name for installed_name in installed_names
        }
        return [
            {
                **model,
                "installed": model["id"] in installed_name_set or _base_model_name(model["id"]) in installed_base_map,
                "installed_name": (
                    model["id"]
                    if model["id"] in installed_name_set
                    else installed_base_map.get(_base_model_name(model["id"]))
                ),
            }
            for model in AVAILABLE_MODELS
        ]
    except Exception:
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
        system_prompt = (
            "You are Kelvin AI for a maintenance management system. "
            "Answer concisely, prefer operationally useful guidance, and cite document names when they appear in context."
        )

    compact_prompt = _compact_text(prompt, OLLAMA_MAX_PROMPT_CHARS)
    compact_context = _compact_text(context, OLLAMA_MAX_CONTEXT_CHARS) if context else ""
    full_prompt = (
        f"Context:\n{compact_context}\n\nUser Query: {compact_prompt}"
        if compact_context
        else compact_prompt
    )

    try:
        installed_models = await _fetch_installed_model_names()
        resolved_model, fallback_notice = _resolve_installed_model(model, installed_models)
        if not resolved_model:
            return "No Ollama models are installed. Pull a model in local Ollama first."

        async with httpx.AsyncClient(timeout=OLLAMA_REQUEST_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": resolved_model,
                    "prompt": full_prompt,
                    "system": system_prompt,
                    "stream": False,
                    "keep_alive": OLLAMA_KEEP_ALIVE,
                    "options": {
                        "temperature": OLLAMA_TEMPERATURE,
                        "num_predict": OLLAMA_NUM_PREDICT,
                        "top_p": 0.9,
                        "repeat_penalty": 1.05,
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                model_response = data.get("response", "I couldn't generate a response.")
                if fallback_notice:
                    return f"{fallback_notice}\n\n{model_response}"
                return model_response
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
{_compact_text(tool_response, OLLAMA_MAX_CONTEXT_CHARS)}

Please provide a natural, conversational summary of this data. Keep it concise but informative.
If there are insights or patterns, mention them. Format with markdown for readability."""

    try:
        return await generate_response(prompt, model=model)
    except:
        return tool_response  # Fall back to original if LLM fails
