#!/bin/bash
export WOLFRAM_ALPHA_APPID="" # Replace with actual AppID if available, else it will fallback to rule 30 CA
source venv/bin/activate
uvicorn quantum_gen.server:app --host 0.0.0.0 --port 5328
