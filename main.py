from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.scan import router as scan_router
from app.routes.workers import router as workers_router


BACKEND_ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"
WORKER_FACE_DIR = BACKEND_ROOT / "worker_data" / "faces"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
WORKER_FACE_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="AI SafeGuard API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploaded_scan",
)


app.mount(
    "/worker-photos",
    StaticFiles(directory=str(WORKER_FACE_DIR)),
    name="worker_photo",
)


app.include_router(
    scan_router,
    prefix="/api",
)


app.include_router(
    workers_router,
    prefix="/api",
)


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "AI SafeGuard backend is running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }