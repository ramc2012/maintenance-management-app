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
