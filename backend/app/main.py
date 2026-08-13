from __future__ import annotations
"""
Voxa Backend — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.api import translate, stt, tts, pipeline, ocr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the translation model on startup to avoid cold-start latency."""
    settings = get_settings()
    logger.info("🚀 Voxa backend starting — pre-loading NLLB-200...")
    try:
        from app.services.nllb_service import get_translation_service
        svc = get_translation_service()
        svc._load()
        logger.info("✅ NLLB-200 loaded and ready.")
    except Exception as e:
        logger.warning("⚠️  Could not pre-load NLLB-200: %s", e)
    yield
    logger.info("🛑 Voxa backend shutting down.")


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Interpreter backend — Twi ↔ English",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(translate.router, prefix=API_PREFIX)
app.include_router(stt.router, prefix=API_PREFIX)
app.include_router(tts.router, prefix=API_PREFIX)
app.include_router(pipeline.router, prefix=API_PREFIX)
app.include_router(ocr.router, prefix=API_PREFIX)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "version": settings.APP_VERSION})


@app.get("/", tags=["System"])
async def root() -> JSONResponse:
    return JSONResponse({
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    })
