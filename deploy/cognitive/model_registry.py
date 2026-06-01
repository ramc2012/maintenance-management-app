"""Persistent model registry and Ollama inventory helpers."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
REGISTRY_PATH = Path(__file__).with_name("model_registry.json")

DEFAULT_REGISTRY: Dict[str, Any] = {
    "default_model": "gemma4:e4b",
    "models": [
        {
            "id": "gemma4:e4b",
            "name": "Gemma 4 E4B",
            "description": "Local Gemma 4 8B profile installed on this workstation.",
        },
        {
            "id": "gemma4:e2b",
            "name": "Gemma 4 E2B",
            "description": "Smaller Gemma 4 profile retained as a fallback when installed.",
        },
        {
            "id": "phi4-mini",
            "name": "Phi-4 Mini",
            "description": "Latest lightweight Microsoft model. Fast local option for day-to-day chat.",
        },
        {
            "id": "gemma3:4b",
            "name": "Gemma 3 4B",
            "description": "Latest compact Gemma 3 release for balanced local reasoning.",
        },
        {
            "id": "llama3.2",
            "name": "Llama 3.2",
            "description": "Compact Meta model retained for compatibility and smaller local systems.",
        },
        {
            "id": "mistral-nemo",
            "name": "Mistral NeMo",
            "description": "Higher-quality long-context option when you want stronger synthesis.",
        },
    ],
}


def _write_registry(payload: Dict[str, Any]) -> None:
    REGISTRY_PATH.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def _normalize_model_entry(entry: Dict[str, Any]) -> Optional[Dict[str, str]]:
    model_id = str(entry.get("id", "")).strip()
    if not model_id:
        return None

    name = str(entry.get("name", "")).strip() or model_id
    description = str(entry.get("description", "")).strip()
    return {"id": model_id, "name": name, "description": description}


def load_registry() -> Dict[str, Any]:
    if not REGISTRY_PATH.exists():
        _write_registry(DEFAULT_REGISTRY)

    try:
        raw = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        raw = DEFAULT_REGISTRY
        _write_registry(raw)

    normalized_models: List[Dict[str, str]] = []
    seen_ids = set()

    for entry in raw.get("models", []):
        normalized = _normalize_model_entry(entry)
        if not normalized or normalized["id"] in seen_ids:
            continue
        seen_ids.add(normalized["id"])
        normalized_models.append(normalized)

    if not normalized_models:
        normalized_models = [model.copy() for model in DEFAULT_REGISTRY["models"]]

    default_model = str(raw.get("default_model", "")).strip()
    available_ids = {model["id"] for model in normalized_models}
    if default_model not in available_ids:
        default_model = normalized_models[0]["id"]

    registry = {"default_model": default_model, "models": normalized_models}
    if registry != raw:
        _write_registry(registry)

    return registry


def save_registry(default_model: str, models: List[Dict[str, Any]]) -> Dict[str, Any]:
    normalized_models: List[Dict[str, str]] = []
    seen_ids = set()

    for model in models:
        normalized = _normalize_model_entry(model)
        if not normalized or normalized["id"] in seen_ids:
            continue
        seen_ids.add(normalized["id"])
        normalized_models.append(normalized)

    if not normalized_models:
        raise ValueError("At least one model must be configured.")

    if default_model not in {model["id"] for model in normalized_models}:
        raise ValueError("Default model must exist in the configured model list.")

    registry = {"default_model": default_model, "models": normalized_models}
    _write_registry(registry)
    return registry


def get_default_model() -> str:
    return load_registry()["default_model"]


async def _request_ollama(
    method: str,
    path: str,
    payload: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.request(method, f"{OLLAMA_URL}{path}", json=payload)


async def fetch_installed_model_names() -> List[str]:
    try:
        response = await _request_ollama("GET", "/api/tags", timeout=10.0)
        if response.status_code != 200:
            return []
        data = response.json()
        return [str(model.get("name", "")).strip() for model in data.get("models", []) if model.get("name")]
    except Exception:
        return []


def _matches_installed_model(configured_model_id: str, installed_model_name: str) -> bool:
    if configured_model_id == installed_model_name:
        return True

    configured_base = configured_model_id.split(":", 1)[0]
    installed_base = installed_model_name.split(":", 1)[0]

    if ":" in configured_model_id:
        return False

    return configured_base == installed_base


def _find_installed_match(configured_model_id: str, installed_models: List[str]) -> Optional[str]:
    for installed_model in installed_models:
        if _matches_installed_model(configured_model_id, installed_model):
            return installed_model
    return None


async def check_ollama_available() -> bool:
    try:
        response = await _request_ollama("GET", "/api/tags", timeout=5.0)
        return response.status_code == 200
    except Exception:
        return False


async def get_available_models() -> List[Dict[str, Any]]:
    registry = load_registry()
    installed_models = await fetch_installed_model_names()

    configured = []
    for model in registry["models"]:
        installed_name = _find_installed_match(model["id"], installed_models)
        configured.append(
            {
                **model,
                "installed": bool(installed_name),
                "installed_name": installed_name,
            }
        )

    return configured


async def get_model_settings() -> Dict[str, Any]:
    registry = load_registry()
    models = await get_available_models()
    installed_models = await fetch_installed_model_names()

    return {
        "default": registry["default_model"],
        "models": models,
        "installed_models": installed_models,
        "installed_count": len(installed_models),
        "ollama_available": await check_ollama_available(),
    }


async def pull_model(model_id: str) -> Dict[str, Any]:
    response = await _request_ollama(
        "POST",
        "/api/pull",
        payload={"model": model_id, "stream": False},
        timeout=1800.0,
    )
    data = response.json() if response.content else {}
    if response.status_code != 200:
        raise RuntimeError(data.get("error") or f"Failed to pull model {model_id}")
    return data


async def delete_model(model_id: str) -> Dict[str, Any]:
    response = await _request_ollama(
        "DELETE",
        "/api/delete",
        payload={"model": model_id},
        timeout=60.0,
    )
    data = response.json() if response.content else {}
    if response.status_code != 200:
        raise RuntimeError(data.get("error") or f"Failed to delete model {model_id}")
    return data


async def resolve_requested_model(requested_model: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    registry = load_registry()
    configured_ids = [model["id"] for model in registry["models"]]
    installed_models = await fetch_installed_model_names()

    if not installed_models:
        return None, "No Ollama models are installed. Open Settings > AI Models and pull a model first."

    preferred_model = requested_model or registry["default_model"]
    preferred_installed = _find_installed_match(preferred_model, installed_models)
    if preferred_installed:
        return preferred_installed, None

    default_installed = _find_installed_match(registry["default_model"], installed_models)
    if default_installed:
        return (
            default_installed,
            f"Requested model '{preferred_model}' is not installed. Kelvin used the default model '{default_installed}' instead.",
        )

    for configured_model_id in configured_ids:
        configured_installed = _find_installed_match(configured_model_id, installed_models)
        if configured_installed:
            return (
                configured_installed,
                f"Requested model '{preferred_model}' is not installed. Kelvin used '{configured_installed}' instead.",
            )

    return (
        installed_models[0],
        f"Requested model '{preferred_model}' is not installed. Kelvin used the only available local model '{installed_models[0]}' instead.",
    )
