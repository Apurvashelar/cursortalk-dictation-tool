"""
Enterprise Voice Dictation - FastAPI Wrapper (server.py)
========================================================
Thin FastAPI server that sits in front of vLLM and exposes a single
POST /clean endpoint. Bakes in the system prompt so the Mac app only
needs to send raw dictation text and get cleaned text back.

Phase 0.2: Model versioning - /health returns model version, GET /info
           returns full model metadata.
Phase 0.3: Dictation logging - every raw->cleaned pair logged as JSONL
           with daily rotation and 30-day retention.

Usage (manual):
    source /home/ubuntu/dictation-server/venv/bin/activate
    uvicorn server:app --host 127.0.0.1 --port 8080

In production this is managed by dictation-api.service (systemd).
"""

import glob
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://127.0.0.1:8000/v1/chat/completions")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")
MODEL_META_PATH = os.path.join(MODEL_PATH, "model_meta.json")

AUTH_ME_URL = os.getenv("AUTH_ME_URL", "http://127.0.0.1:4000/auth/me")
AUTH_TIMEOUT = float(os.getenv("AUTH_TIMEOUT", "10.0"))

SYSTEM_PROMPT = (
    "You clean raw English dictation transcripts. Remove disfluencies, false starts, "
    "repetitions, and obvious ASR artifacts. Restore punctuation and capitalization. "
    "Preserve meaning exactly, especially numbers, names, identifiers, URLs, file paths, "
    "versions, and dates. Output only the cleaned plain text."
)

MAX_TOKENS = int(os.getenv("MAX_TOKENS", "512"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.0"))  # deterministic cleanup
VLLM_TIMEOUT = float(os.getenv("VLLM_TIMEOUT", "30.0"))  # seconds - generous for a 3B model on T4

# Dictation log settings
DICTATION_LOG_DIR = Path(os.getenv("DICTATION_LOG_DIR", "/tmp/dictation-logs"))
DICTATION_LOG_RETENTION_DAYS = int(os.getenv("DICTATION_LOG_RETENTION_DAYS", "30"))

# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("dictation-api")

# ---------------------------------------------------------------------------
# MODEL METADATA
# ---------------------------------------------------------------------------


def _load_model_meta() -> dict:
    """Load model_meta.json from the model directory. Returns empty dict on failure."""
    try:
        with open(MODEL_META_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("model_meta.json not found at %s", MODEL_META_PATH)
        return {}
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Could not read model_meta.json: %s", e)
        return {}


def _compute_system_prompt_hash() -> str:
    """SHA-256 hash of the system prompt (first 12 hex chars)."""
    return hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest()[:12]


# Load once at startup
_model_meta = _load_model_meta()
_model_version = _model_meta.get("model_version", "unknown")
_system_prompt_hash = _compute_system_prompt_hash()

# Patch the hash into the loaded metadata if it was null
if _model_meta:
    _model_meta["system_prompt_hash"] = _system_prompt_hash

logger.info(
    "Model version: %s | System prompt hash: %s",
    _model_version,
    _system_prompt_hash,
)

# ---------------------------------------------------------------------------
# DICTATION LOGGING
# ---------------------------------------------------------------------------


def _get_log_path() -> Path:
    """Return today's JSONL log file path, creating the directory if needed."""
    DICTATION_LOG_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return DICTATION_LOG_DIR / f"dictations-{today}.jsonl"


def _log_dictation(raw: str, cleaned: str, latency_ms: int, tokens_used: int):
    """Append a raw->cleaned pair to today's JSONL log file."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_version": _model_version,
        "system_prompt_hash": _system_prompt_hash,
        "raw": raw,
        "cleaned": cleaned,
        "raw_len": len(raw),
        "cleaned_len": len(cleaned),
        "latency_ms": latency_ms,
        "tokens_used": tokens_used,
    }
    try:
        log_path = _get_log_path()
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError as e:
        logger.error("Failed to write dictation log: %s", e)


def _cleanup_old_logs():
    """Delete JSONL log files older than DICTATION_LOG_RETENTION_DAYS."""
    if not DICTATION_LOG_DIR.exists():
        return
    cutoff = datetime.now(timezone.utc) - timedelta(days=DICTATION_LOG_RETENTION_DAYS)
    for filepath in glob.glob(str(DICTATION_LOG_DIR / "dictations-*.jsonl")):
        basename = os.path.basename(filepath)
        try:
            date_str = basename.replace("dictations-", "").replace(".jsonl", "")
            file_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if file_date < cutoff:
                os.remove(filepath)
                logger.info("Deleted old dictation log: %s", basename)
        except (ValueError, OSError) as e:
            logger.warning("Could not process log file %s: %s", basename, e)


_cleanup_old_logs()

# ---------------------------------------------------------------------------
# APP + MODELS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Dictation Cleanup API",
    version="1.0.0",
    description="Send raw dictation text, get cleaned text back.",
)


class CleanRequest(BaseModel):
    raw: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Raw dictation transcript to clean up.",
        json_schema_extra={"example": "um so the meeting is uh scheduled for like Tuesday"},
    )


class CleanResponse(BaseModel):
    cleaned: str = Field(description="Cleaned plain text.")
    latency_ms: int = Field(description="Round-trip inference time in milliseconds.")
    tokens_used: int = Field(description="Total tokens (prompt + completion) reported by vLLM.")
    model_version: str = Field(description="Version of the cleanup model that produced this result.")


async def _require_org_session(authorization: Optional[str]) -> dict:
    """Validate bearer token against the local auth service and require org membership."""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Sign in with your organization account to use organization mode.",
        )

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(
            status_code=401,
            detail="Your session token is missing or invalid. Sign in again.",
        )

    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Your session token is missing or invalid. Sign in again.",
        )

    try:
        async with httpx.AsyncClient(timeout=AUTH_TIMEOUT) as client:
            response = await client.get(
                AUTH_ME_URL,
                headers={"Authorization": f"Bearer {token}"},
            )
    except httpx.ConnectError:
        logger.error("Cannot connect to auth service at %s", AUTH_ME_URL)
        raise HTTPException(
            status_code=503,
            detail="CursorTalk could not verify your session right now. Please try again shortly.",
        )
    except httpx.TimeoutException:
        logger.error("Auth service request timed out after %.1fs", AUTH_TIMEOUT)
        raise HTTPException(
            status_code=503,
            detail="CursorTalk session verification took too long. Please try again.",
        )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=401,
            detail="Your session is no longer valid. Sign in again to continue.",
        )

    if response.status_code >= 500:
        logger.error("Auth service returned %d: %s", response.status_code, response.text)
        raise HTTPException(
            status_code=503,
            detail="CursorTalk could not verify your account right now. Please try again shortly.",
        )

    if response.status_code != 200:
        logger.error("Unexpected auth service status %d: %s", response.status_code, response.text)
        raise HTTPException(
            status_code=503,
            detail="CursorTalk could not verify your account. Please try again.",
        )

    try:
        profile = response.json()
    except ValueError:
        logger.error("Auth service returned invalid JSON: %s", response.text)
        raise HTTPException(
            status_code=503,
            detail="CursorTalk could not verify your account. Please try again.",
        )

    organization_id = profile.get("organization_id")
    if not organization_id:
        raise HTTPException(
            status_code=403,
            detail="This account is not attached to an organization yet.",
        )

    return profile


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    """Quick liveness check. Returns 200 with model version."""
    return {
        "status": "ok",
        "model_version": _model_version,
    }


# ---------------------------------------------------------------------------
# MODEL INFO
# ---------------------------------------------------------------------------


@app.get("/info")
async def info():
    """Return full model metadata from model_meta.json."""
    if not _model_meta:
        raise HTTPException(
            status_code=404,
            detail="model_meta.json not found or unreadable.",
        )
    return _model_meta


# ---------------------------------------------------------------------------
# MAIN ENDPOINT
# ---------------------------------------------------------------------------


@app.post("/clean", response_model=CleanResponse)
async def clean(
    request: CleanRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Accept raw dictation text, send it to vLLM with the baked-in system
    prompt, and return the cleaned result.
    """
    profile = await _require_org_session(authorization)

    payload = {
        "model": MODEL_PATH,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.raw},
        ],
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
    }

    start = time.perf_counter()

    try:
        async with httpx.AsyncClient(timeout=VLLM_TIMEOUT) as client:
            response = await client.post(VLLM_BASE_URL, json=payload)
            response.raise_for_status()
    except httpx.ConnectError:
        logger.error("Cannot connect to vLLM at %s", VLLM_BASE_URL)
        raise HTTPException(
            status_code=503,
            detail="vLLM backend is not reachable. Is the vllm service running?",
        )
    except httpx.TimeoutException:
        logger.error("vLLM request timed out after %.1fs", VLLM_TIMEOUT)
        raise HTTPException(
            status_code=504,
            detail=f"vLLM request timed out after {VLLM_TIMEOUT}s.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("vLLM returned HTTP %d: %s", exc.response.status_code, exc.response.text)
        raise HTTPException(
            status_code=502,
            detail=f"vLLM error: {exc.response.status_code}",
        )

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    data = response.json()

    try:
        cleaned = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        logger.error("Unexpected vLLM response structure: %s", data)
        raise HTTPException(
            status_code=502,
            detail="Could not parse vLLM response.",
        )

    usage = data.get("usage", {})
    tokens_used = usage.get("total_tokens", 0)

    logger.info(
        "Cleaned %d chars -> %d chars | %d ms | %d tokens | model %s | user %s | org %s",
        len(request.raw),
        len(cleaned),
        elapsed_ms,
        tokens_used,
        _model_version,
        profile.get("user", {}).get("email", "unknown"),
        profile.get("organization_name", "unknown"),
    )

    _log_dictation(
        raw=request.raw,
        cleaned=cleaned,
        latency_ms=elapsed_ms,
        tokens_used=tokens_used,
    )

    return CleanResponse(
        cleaned=cleaned,
        latency_ms=elapsed_ms,
        tokens_used=tokens_used,
        model_version=_model_version,
    )
