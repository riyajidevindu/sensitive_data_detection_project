# Sensitive Data Detection Application

A computer vision application for detecting sensitive data in images, including faces and license plates, using fine-tuned YOLOv8 models.

## Features

- 🔍 **Face Detection**: Automatically detect and blur faces in images
- 🚗 **License Plate Detection**: Identify and redact license plates
- 🖥️ **Web Interface**: User-friendly web application for easy interaction
- ⚡ **Fast Inference**: ONNX-optimized models for real-time processing
- 🔒 **Privacy-First**: Secure handling of sensitive data
- 📊 **Batch Processing**: Process multiple images at once

## Architecture

```
├── backend/          # FastAPI backend for inference
├── frontend/         # React frontend application
├── model/           # Fine-tuned YOLOv8 models
├── uploads/         # Temporary upload storage
├── outputs/         # Processed images output
└── docker/          # Docker configuration
```

## Tech Stack

**Backend:**
- FastAPI (Python)
- ONNX Runtime
- OpenCV
- Pillow

**Frontend:**
- React.js with TypeScript
- Material-UI
- Axios

**DevOps:**
- Docker & Docker Compose
- Poetry for dependency management

## Quick Start

### Method 1: Using Docker (Recommended - No Library Issues! 🐳)

This is the easiest and most reliable method, especially if you're having Python library compatibility issues.

**Prerequisites:**
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))

**Steps:**

1. **Clone the repository**
2. **Run the start script:**

**Windows:**
```bash
docker-start.bat
```

**Linux/Mac:**
```bash
docker-compose up --build
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

**That's it!** No Python environment setup, no dependency conflicts! 🎉

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed Docker instructions.

---

### Method 2: Manual Setup (For Development)

**Prerequisites:**
- Python 3.11+ (3.13 may have compatibility issues)
- Node.js 16+

**Setup Environment:**

1. **Create Python virtual environment:**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. **Install backend dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install --legacy-peer-deps
```

### Running the Application

1. **Start the backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

2. **Start the frontend:**
```bash
cd frontend
npm start
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## API Endpoints

- `POST /api/v1/detect` - Upload and process images
- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/models/info` - Model information

## Configuration

Environment variables can be set in `.env` file:

```env
MODEL_PATH=./model/yolov8n.onnx
CONFIDENCE_THRESHOLD=0.5
MAX_FILE_SIZE=10MB
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
