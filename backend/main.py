from fastapi import FastAPI
from routes.store import router

app = FastAPI()

app.include_router(router)