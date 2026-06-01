"""Local LLM Service using Ollama."""
import os
import httpx
from typing import Optional, Dict, Any, List, Tuple

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_REQUEST_TIMEOUT = float(os.getenv("OLLAMA_REQUEST_TIMEOUT", "120"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "640"))
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "30m")
OLLAMA_MAX_CONTEXT_CHARS = int(os.getenv("OLLAMA_MAX_CONTEXT_CHARS", "6000"))
OLLAMA_MAX_PROMPT_CHARS = int(os.getenv("OLLAMA_MAX_PROMPT_CHARS", "1200"))

# Available models - user can select from these. Keep the installed local
# workstation model first so Kelvin defaults to it in the picker.
AVAILABLE_MODELS = [
    {"id": "gemma4:e4b", "name": "Gemma 4 E4B", "description": "Local Gemma 4 8B profile installed on this workstation."},
    {"id": "gemma4:e2b", "name": "Gemma 4 E2B", "description": "Smaller Gemma 4 profile retained as a fallback when installed."},
    {"id": "tinyllama", "name": "TinyLlama ⚡", "description": "Fastest fallback (3-4 sec, 1.1B params)"},
    {"id": "gemma2", "name": "Gemma 2", "description": "Legacy Google model retained for compatibility."},
    {"id": "llama3.2", "name": "Llama 3.2", "description": "Balanced (6-8 sec, 3.2B params)"},
    {"id": "mistral", "name": "Mistral ⏱️", "description": "Best quality (10-15 sec, 7.2B params)"},
]

DEFAULT_MODEL = os.getenv("DEFAULT_OLLAMA_MODEL", "gemma4:e4b")


def _base_model_name(model_name: str) -> str:
    return model_name.split(":", 1)[0]


def _matches_installed_model(configured_model_id: str, installed_model_name: str) -> bool:
    if configured_model_id == installed_model_name:
        return True

    if ":" in configured_model_id:
        return False

    return _base_model_name(configured_model_id) == _base_model_name(installed_model_name)


def _find_installed_match(configured_model_id: str, installed_models: List[str]) -> Optional[str]:
    for installed_model in installed_models:
        if _matches_installed_model(configured_model_id, installed_model):
            return installed_model
    return None


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
    requested_installed = _find_installed_match(requested_model, installed_models)
    if requested_installed:
        return requested_installed, None

    for preferred in [DEFAULT_MODEL, *[model["id"] for model in AVAILABLE_MODELS]]:
        preferred_installed = _find_installed_match(preferred, installed_models)
        if preferred_installed:
            return preferred_installed, (
                f"Requested model '{requested_model}' is not installed. "
                f"Using '{preferred_installed}' instead."
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
        return [
            {
                **model,
                "installed": bool(_find_installed_match(model["id"], installed_names)),
                "installed_name": _find_installed_match(model["id"], installed_names),
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
            "Answer concisely with probable answers and practical options first. "
            "When a query is broad or incomplete, infer the likely intent from the current context and retrieved data, "
            "then list the best matching options. Avoid ending with questions; present follow-up choices as available filters or next actions instead. "
            "Ask a clarifying question only if the user is requesting a risky write/change action and a wrong choice could change data. "
            "Do not reply with only 'please specify' when context contains matching equipment, installations, logs, reports, or documents. "
            "Keep broad search answers compact: identify the likely installation or module, group the top candidates, and show no more than 8 bullets unless the user asks for a full list. "
            "Cite document or module names when they appear in context."
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
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": resolved_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_prompt},
                    ],
                    "stream": False,
                    "think": False,
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
                model_response = (
                    data.get("message", {}).get("content")
                    or data.get("response")
                    or "I couldn't generate a response."
                )
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
