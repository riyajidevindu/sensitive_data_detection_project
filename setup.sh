#!/bin/bash

# Setup script for Sensitive Data Detection Project
echo "🚀 Setting up Sensitive Data Detection Project..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Check Python version
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "✅ Python $python_version detected"

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python -m venv venv

# Activate virtual environment (Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "✅ Virtual environment activated"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "✅ Backend dependencies installed"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

node_version=$(node --version)
echo "✅ Node.js $node_version detected"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Frontend dependencies installed"

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p outputs

# Copy environment file
echo "⚙️ Setting up environment configuration..."
cp .env.example backend/.env

echo "
🎉 Setup completed successfully!

Next steps:
1. Copy your YOLOv8 models to the model/ directory if not already done
2. Review and update backend/.env file with your configuration
3. Run the application:

   Backend:
   cd backend
   uvicorn app.main:app --reload
   
   Frontend (in a new terminal):
   cd frontend
   npm start

4. Access the application at http://localhost:3000

📖 For more information, see README.md
"
