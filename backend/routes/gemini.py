from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
import os

router = APIRouter(prefix="/gemini", tags=["gemini"])

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(body: ChatRequest):
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=body.message,
    )
    return {"reply": response.text}