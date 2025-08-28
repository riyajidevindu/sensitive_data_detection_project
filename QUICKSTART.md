# Quick Start Guide

## Prerequisites
- Python 3.9+
- Node.js 16+
- Your fine-tuned YOLOv8 models (already in `model/` folder)

## Quick Setup (Windows)

1. **Run the setup script:**
   ```cmd
   setup.bat
   ```

2. **Start the backend:**
   ```cmd
   cd backend
   venv\Scripts\activate
   uvicorn app.main:app --reload
   ```

3. **Start the frontend (new terminal):**
   ```cmd
   cd frontend
   npm start
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

## Manual Setup

### Backend Setup
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy ..\\.env.example .env
uvicorn app.main:app --reload
```

### Frontend Setup
```cmd
cd frontend
npm install
npm start
```

## API Endpoints

- `POST /api/v1/detect` - Upload and process images
- `GET /api/v1/health` - Health check
- `GET /api/v1/models/info` - Model information
- `GET /api/v1/download/{filename}` - Download processed images

## Configuration

Edit `backend/.env` to customize:
- Model settings (confidence threshold, IOU threshold)
- File upload limits
- Processing options (blur settings)

## Docker Deployment

```cmd
docker-compose up --build
```

## Troubleshooting

**Model not found error:**
- Ensure your YOLOv8 models are in the `model/` directory
- Check the MODEL_PATH in `backend/.env`

**Import errors:**
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` in the backend directory

**Port conflicts:**
- Backend default: 8000
- Frontend default: 3000
- Change ports in configuration if needed
