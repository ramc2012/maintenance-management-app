"""Local LLM Service using Ollama."""
import os
import httpx
from typing import Optional, Dict, Any, List

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")


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
        system_prompt = """You are an intelligent assistant for a Procurement Dashboard application.
You help users understand their procurement data, find cases, analyze budgets, and answer questions.
Be concise and helpful. Format responses with markdown when appropriate.
Use the context provided to give accurate, data-driven answers."""

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
