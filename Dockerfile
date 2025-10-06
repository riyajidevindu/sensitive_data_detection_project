FROM node:18-alpine AS frontend-build-base
# (Header comments moved below to avoid linters complaining about leading comments)

##############################
# Fullstack (Frontend + Backend) Container for Railway
# Builds React frontend, then FastAPI backend serving API + static build.
##############################

ARG PYTHON_VERSION=3.11-slim

# ---------- Frontend Build Stage ----------
FROM frontend-build-base AS frontend-build
WORKDIR /frontend

# Install dependencies first (leverage caching)
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ---------- Backend / Runtime Stage ----------
FROM python:${PYTHON_VERSION} AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_MODULE=app.main:app \
    SERVE_FRONTEND=true \
    PORT=8000

# System deps for OpenCV / Torch runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 libgthread-2.0-0 libgl1 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements & install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge || true

# Copy backend code & model assets
COPY backend/app ./app
COPY backend/uploads ./uploads
COPY model ./model

# Copy frontend build output
COPY --from=frontend-build /frontend/build ./frontend_build

# Create expected directories
RUN mkdir -p outputs uploads/reference_encodings sessions

EXPOSE 8000

# Healthcheck (optional): simple TCP
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn $APP_MODULE --host 0.0.0.0 --port ${PORT:-8000}"]
