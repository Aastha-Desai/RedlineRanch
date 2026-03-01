from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent / ".env")

router = APIRouter(prefix="/gemini", tags=["gemini"])

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(body: ChatRequest):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=body.message,
    )
    return {"reply": response.text}