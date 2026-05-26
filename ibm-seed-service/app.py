from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="IBM Quantum Seed Service", version="1.0.0")


class SeedRequest(BaseModel):
  orderId: str = Field(min_length=1, max_length=200)
  purpose: str = Field(default="seed")


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _normalize_bearer(value: str) -> str:
  v = (value or "").strip()
  if not v:
    return ""
  if v.lower().startswith("bearer "):
    return v
  return "Bearer " + v


def _require_auth(authorization: str | None) -> None:
  expected = (os.getenv("SEED_SERVICE_AUTH") or os.getenv("IBM_QUANTUM_SEED_SERVICE_AUTH") or "").strip()
  if not expected:
    return
  expected_norm = _normalize_bearer(expected)
  got_norm = _normalize_bearer(authorization or "")
  if not got_norm or got_norm != expected_norm:
    raise HTTPException(status_code=401, detail="unauthorized")


def _derive_seed_hex(order_id: str, backend_name: str, job_id: str, payload: Any) -> str:
  raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
  base = f"{order_id}|{backend_name}|{job_id}|{raw}".encode("utf-8")
  return hashlib.sha256(base).hexdigest()


@app.get("/health")
def health():
  return {"ok": True}


@app.post("/seed")
def seed(req: SeedRequest, authorization: str | None = Header(default=None)):
  _require_auth(authorization)

  if sys.version_info >= (3, 13):
    raise HTTPException(status_code=503, detail="unsupported_python_version_use_python_3_11_or_3_12")

  token = (os.getenv("QISKIT_IBM_TOKEN") or "").strip()
  instance = (os.getenv("QISKIT_IBM_INSTANCE") or "").strip()
  channel = (os.getenv("QISKIT_IBM_CHANNEL") or "ibm_cloud").strip() or "ibm_cloud"
  backend_name = (os.getenv("IBM_QUANTUM_BACKEND") or "").strip()

  if not token or not instance:
    raise HTTPException(status_code=503, detail="missing_QISKIT_IBM_TOKEN_or_QISKIT_IBM_INSTANCE")

  try:
    from qiskit import QuantumCircuit
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
    from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"missing_dependencies:{type(e).__name__}")

  try:
    service = QiskitRuntimeService(channel=channel, token=token, instance=instance)
    backend = service.backend(backend_name) if backend_name else service.least_busy(operational=True, simulator=False)
    resolved_backend_name = getattr(backend, "name", None) or backend_name or "unknown"

    qc = QuantumCircuit(8)
    qc.h(range(8))
    qc.measure_all()

    pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
    isa_circuit = pm.run(qc)

    sampler = SamplerV2(mode=backend)
    job = sampler.run([isa_circuit], shots=256)
    job_id = job.job_id()
    result = job.result()

    meas = result[0].data.meas
    counts = meas.get_counts()
    payload: dict[str, Any] = {"counts": counts}
    seed_hex = _derive_seed_hex(req.orderId, resolved_backend_name, job_id, payload)

    return {
      "success": True,
      "data": {
        "provider": "ibm",
        "jobId": job_id,
        "backend": resolved_backend_name,
        "seed": seed_hex,
        "shots": int(sum(counts.values())),
        "createdAt": _now_iso(),
      },
    }
  except HTTPException:
    raise
  except Exception as e:
    msg = (str(e) or "").strip()
    detail = f"ibm_runtime_error:{type(e).__name__}"
    if msg:
      detail = detail + ":" + msg[:300]
    raise HTTPException(status_code=502, detail=detail)
