FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and other libraries
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgthread-2.0-0 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with increased timeout and in stages
# Set pip timeout to 300 seconds (5 minutes) for large downloads
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --default-timeout=300 --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    python-multipart==0.0.6 \
    pydantic==2.9.2 \
    pydantic-settings==2.4.0 && \
    pip install --default-timeout=300 --no-cache-dir \
    onnxruntime==1.22.1 \
    opencv-python==4.10.0.84 \
    Pillow==10.4.0 \
    "numpy>=1.23.5,<2.0.0" \
    python-dotenv==1.0.0 \
    aiofiles==23.2.1 \
    typing-extensions==4.12.2 && \
    pip install --default-timeout=300 --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision && \
    pip install --default-timeout=300 --no-cache-dir ultralytics==8.3.0

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads outputs uploads/reference_encodings

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
