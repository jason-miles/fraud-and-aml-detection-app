"""Investec Fraud & AML — FastAPI application entry point.

Serves the built React frontend (frontend/dist) and the /api routes as a single
process (Databricks Apps binds one port; single-process avoids CORS).
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from server.routes import alerts, network, customers, travel

app = FastAPI(title="Investec Fraud & AML", version="0.1.0")

# CORS for local dev (Vite :5173 -> FastAPI :8000). Harmless in the app.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router)
app.include_router(network.router)
app.include_router(customers.router)
app.include_router(travel.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "investec-fraud-aml"}


# Serve React frontend. Built artifacts live in webroot/ (a copy of
# frontend/dist under a name that `databricks sync` won't special-case, so the
# built UI ships to the app). Fall back to frontend/dist for local dev.
_HERE = os.path.dirname(__file__)
FRONTEND_DIR = os.path.join(_HERE, "webroot")
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(_HERE, "frontend", "dist")
if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "not found"}, status_code=404)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
