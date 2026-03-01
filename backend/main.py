from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.store import router
from routes.store import router
from routes.gemini import router as gemini_router  # add this
from routes.analyze import router as analyze_router
from routes.session_sync import router as sync_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(gemini_router) 
app.include_router(analyze_router) 
app.include_router(sync_router)