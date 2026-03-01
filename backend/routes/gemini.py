from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
import os

router = APIRouter(prefix="/gemini", tags=["gemini"])

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(body: ChatRequest):
    client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not set"}
    
    client = genai.Client(os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=body.message,
    )
    return {"reply": response.text}