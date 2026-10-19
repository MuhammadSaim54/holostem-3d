import os
import requests
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import urllib.parse

app = FastAPI(title="Touchless STEM Spatial AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AIQuery(BaseModel):
    question: str
    active_model: str
    category: str
    summary: str
    selected_part: str
    all_parts: List[str]
    is_dissected: bool

@app.get("/")
def health_check():
    return {"status": "online", "engine": "Spatial STEM AI Co-Pilot"}

@app.post("/api/ask-ai")
async def ask_spatial_ai(payload: AIQuery):
    # 🚀 FIX: os.getenv hata diya hai. Apni exact key yahan paste karein double quotes ke andar!
    api_key = "AQ.Ab8RN6JKSKplj4s1wvr4QZErjM4wfg-WMPIoJMPXQvSELwgIpA"

    system_instruction = (
        "You are an advanced Spatial AI Co-Pilot. "
        f"Active 3D Model: {payload.active_model} ({payload.category}).\n"
        f"USER IS CURRENTLY LOOKING AT: {payload.selected_part}\n\n"
        "CRITICAL RULES:\n"
        "1. Match the user's language EXACTLY (Roman Urdu, Hindi, English).\n"
        "2. Explain the specific part the user is looking at in 2-3 short sentences.\n"
        "3. At the very end of your answer, add exactly this separator: '|||' followed by exactly 3 short follow-up questions related to the topic, separated by '|||'.\n"
        "Example Format: Dil ka ye hissa khoon pump karta hai. ||| Aorta kya hai? ||| Dil kaise dharakta hai? ||| Iska size kya hai?"
    )

    def process_text(raw_text, source):
        parts = [p.strip() for p in raw_text.split("|||") if p.strip()]
        answer = parts[0].replace("*", "") if len(parts) > 0 else raw_text.replace("*", "")
        suggestions = parts[1:4] if len(parts) > 1 else ["Explain this further", "What happens if we dissect it?", "Ask me a quiz question"]
        return {"answer": answer, "suggestions": suggestions, "source": source}

    errors = []

    # ---------------------------------------------------------
    # LAYER 1: DIRECT GEMINI REST API (Now guaranteed to run)
    # ---------------------------------------------------------
    if api_key and api_key != "AQ.Ab8RN6JKSKplj4s1wvr4QZErjM4wfg-WMPIoJMPXQvSELwgIpA":
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            gemini_data = {"contents": [{"parts": [{"text": f"{system_instruction}\n\nQuestion: {payload.question}"}]}]}
            # Timeout badha kar 25 kar diya hai
            res = requests.post(gemini_url, headers={"Content-Type": "application/json"}, json=gemini_data, timeout=25)
            if res.status_code == 200:
                json_res = res.json()
                reply_text = json_res['candidates'][0]['content']['parts'][0]['text']
                return process_text(reply_text, "gemini-rest")
            else:
                errors.append(f"Gemini API Blocked ({res.status_code}): {res.text[:100]}")
        except Exception as e:
            errors.append(f"Gemini Timeout: {str(e)}")
    else:
        errors.append("Gemini API Key is missing or invalid.")

    # ---------------------------------------------------------
    # LAYER 2: Ultra-Reliable Free API Fallback
    # ---------------------------------------------------------
    try:
        free_res = requests.post(
            "https://text.pollinations.ai/openai",
            json={
                "model": "openai",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": payload.question}
                ],
                "temperature": 0.5
            },
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=25  # Timeout badha kar 25 kar diya hai
        )
        if free_res.status_code == 200:
            data = free_res.json()
            reply_text = data["choices"][0]["message"]["content"]
            return process_text(reply_text, "live-free-ai")
        else:
            errors.append(f"FreeAPI Blocked ({free_res.status_code})")
    except Exception as e:
        errors.append(f"FreeAPI Timeout: {str(e)}")

    # ---------------------------------------------------------
    # LAYER 3: Show exact errors
    # ---------------------------------------------------------
    error_details = " | ".join(errors)
    return {
        "answer": f"API servers are blocking the connection. Exact Errors: {error_details}",
        "suggestions": ["Check API Key", "Check VPN", "Show Error Logs"],
        "source": "offline-engine",
    }