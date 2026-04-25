#!/bin/bash
export WOLFRAM_ALPHA_APPID="" # Replace with actual AppID if available, else it will fallback to rule 30 CA
if [ -f "venv311/bin/activate" ]; then
  source venv311/bin/activate
elif [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
else
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.runtime.txt
fi
uvicorn quantum_gen.server:app --host 0.0.0.0 --port 5328
