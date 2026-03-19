FROM python:3.10-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.runtime.txt .
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --retries ${PIP_RETRIES} --timeout ${PIP_DEFAULT_TIMEOUT} -r requirements.runtime.txt

COPY . .

EXPOSE 5328

CMD ["uvicorn", "quantum_gen.server:app", "--host", "0.0.0.0", "--port", "5328"]
