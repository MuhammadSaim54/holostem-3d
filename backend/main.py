import os
import requests
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    api_key = (
        os.getenv("GEMINI_API_KEY")
        or "AQ.Ab8RN6IIpIgqvJEPLvsT5rfB-OqDtQTlKyg6bibdb65WKQv5ww"
    ).strip()

    system_instruction = (
        "You are an intelligent, friendly STEM Classroom AI Co-Pilot integrated into a 3D Touchless Hologram Studio. "
        f"Currently on screen: 3D Model '{payload.active_model}' ({payload.category}). "
        f"Model summary: {payload.summary}. "
        f"Currently focused/isolated part: {payload.selected_part}. "
        f"All model parts: {', '.join(payload.all_parts)}. "
        "Answer the student's or teacher's question clearly, accurately, and concisely in 2 to 3 sentences so it sounds great when spoken aloud. "
        "Do not use markdown asterisks (*)."
    )

    # ---------------------------------------------------------
    # LAYER 1: Try Google Gemini SDK (Works with AIzaSy... or Vertex keys)
    # ---------------------------------------------------------
    if api_key.startswith("AIza"):
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_instruction}\n\nQuestion: {payload.question}",
            )
            if response and response.text:
                return {"answer": response.text.replace("*", "").strip(), "source": "gemini-sdk"}
        except Exception as e:
            print("Gemini SDK note:", e)

    # ---------------------------------------------------------
    # LAYER 2: Free Keyless Live LLM API (Answers ANY question like ChatGPT/Gemini!)
    # ---------------------------------------------------------
    try:
        llm_res = requests.post(
            "https://text.pollinations.ai/openai",
            json={
                "model": "openai",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": payload.question},
                ],
                "temperature": 0.7,
            },
            timeout=12,
        )
        if llm_res.status_code == 200:
            data = llm_res.json()
            reply_text = data["choices"][0]["message"]["content"].replace("*", "").strip()
            if reply_text:
                return {"answer": reply_text, "source": "live-ai-llm"}
    except Exception as e:
        print("Live Keyless LLM note:", e)

    # ---------------------------------------------------------
    # LAYER 3: 100% Offline Scientific Fallback (If Wi-Fi drops on stage)
    # ---------------------------------------------------------
    part_title = payload.selected_part.split(":")[0] if payload.selected_part else "Core Assembly"
    other_parts = ", ".join([p.split(":")[0] for p in payload.all_parts[:3]])

    return {
        "answer": (
            f"In the {payload.active_model} ({payload.category}), {payload.summary} "
            f"Specifically looking at {part_title}, it works in coordination with "
            f"{other_parts} to maintain the system's structure and function."
        ),
        "source": "offline-engine",
    }