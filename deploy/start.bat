@echo off
title Maintenance Management System - Startup
color 0A
echo.
echo ===============================================
echo   MAINTENANCE MANAGEMENT SYSTEM - STARTUP
echo   ONGC Ankleshwar Asset
echo ===============================================
echo.

:: Step 1: Start Ollama
echo [1/4] Starting Ollama AI Service...
start "" "C:\Users\%USERNAME%\AppData\Local\Programs\Ollama\ollama.exe" serve
timeout /t 5 /nobreak >nul
echo       Ollama started.
echo.

:: Step 2: Pull AI Models (if not already downloaded)
echo [2/4] Checking AI Models...
ollama list | findstr "tinyllama" >nul || (
    echo       Downloading TinyLlama...
    ollama pull tinyllama
)
ollama list | findstr "gemma2" >nul || (
    echo       Downloading Gemma2...
    ollama pull gemma2:2b
)
ollama list | findstr "llama3.2" >nul || (
    echo       Downloading Llama 3.2...
    ollama pull llama3.2
)
ollama list | findstr "mistral" >nul || (
    echo       Downloading Mistral...
    ollama pull mistral
)
echo       AI Models ready.
echo.

:: Step 3: Start Docker Containers
echo [3/4] Starting Docker Containers...
docker-compose up -d --build
echo       Docker containers started.
echo.

:: Step 4: Wait for services
echo [4/4] Waiting for services to initialize...
timeout /t 10 /nobreak >nul
echo.

:: Display Access Info
echo ===============================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ===============================================
echo.
echo   Web Application:  http://localhost:8080
echo   User Guide:       http://localhost:8080/help.html
echo   API Server:       http://localhost:5000
echo   Kelvin AI:        http://localhost:8001
echo.
echo   Default Login:
echo   Username: admin
echo   Password: admin123
echo.
echo   Available AI Models:
echo   - TinyLlama (Fast, 3-4 sec)
echo   - Gemma2 (Balanced, 4-6 sec)
echo   - Llama 3.2 (Good, 6-8 sec)
echo   - Mistral (Best Quality, 10-15 sec)
echo.
echo ===============================================
echo   Press any key to open the application...
echo ===============================================
pause >nul
start http://localhost:8080
