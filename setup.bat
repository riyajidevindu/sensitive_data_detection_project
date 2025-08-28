@echo off
REM Setup script for Sensitive Data Detection Project (Windows)
echo 🚀 Setting up Sensitive Data Detection Project...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.9+ first.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo ✅ Python %python_version% detected

REM Create virtual environment
echo 📦 Creating Python virtual environment...
python -m venv venv

REM Activate virtual environment
echo ✅ Activating virtual environment...
call venv\Scripts\activate.bat

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo ✅ Backend dependencies installed

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
echo ✅ Node.js %node_version% detected

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

echo ✅ Frontend dependencies installed

REM Create directories
echo 📁 Creating necessary directories...
if not exist "uploads" mkdir uploads
if not exist "outputs" mkdir outputs

REM Copy environment file
echo ⚙️ Setting up environment configuration...
copy .env.example backend\.env

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Copy your YOLOv8 models to the model/ directory if not already done
echo 2. Review and update backend/.env file with your configuration
echo 3. Run the application:
echo.
echo    Backend:
echo    cd backend
echo    uvicorn app.main:app --reload
echo.
echo    Frontend (in a new terminal):
echo    cd frontend
echo    npm start
echo.
echo 4. Access the application at http://localhost:3000
echo.
echo 📖 For more information, see README.md
echo.
pause
