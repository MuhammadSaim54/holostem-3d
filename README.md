# HoloSTEM 3D - Touchless 3D STEM Lab

An advanced, interactive holographic learning platform designed to revolutionize STEM education. Built for the 2026 STEM Competition, this project transforms any standard computer into a touchless 3D laboratory using computer vision and Spatial AI.

## 🚀 Key Features
*   **Touchless Hand Tracking:** 100% hands-free interaction using MediaPipe. Rotate, scale, and dissect models using natural hand gestures.
*   **Spatial AI Co-Pilot:** An intelligent AI tutor integrated into the 3D space. It detects exactly which component you are looking at and provides multilingual (English/Urdu/Hindi) voice responses with dynamic smart follow-up questions.
*   **Radial 3D Dissection:** Close your fist to instantly explode complex 3D structures (like the Human Heart or a Carbon Atom) to study internal components.
*   **Infinite Showcase & Local Persistence:** Upload custom `.GLB` files locally, add them to your showcase dock, and save them permanently in the browser via IndexedDB.
*   **AAA-Grade Graphics:** Cinematic post-processing (Bloom), a sci-fi holodeck grid, and smooth interactive physics.

## 💻 Tech Stack
*   **Frontend:** Next.js, React, Tailwind CSS, Lucide Icons.
*   **3D Rendering:** Three.js, React Three Fiber, React Three Drei.
*   **Computer Vision:** Google MediaPipe Tasks Vision (21-Joint Biomechanical tracking).
*   **Backend Engine:** Python, FastAPI.
*   **AI Integration:** Google Gemini 1.5 Flash SDK, Web Speech API (Multilingual TTS).

## 🛠️ How to Run Locally

### 1. Start the Python AI Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn requests google-genai pydantic
uvicorn main:app --reload --port 8000