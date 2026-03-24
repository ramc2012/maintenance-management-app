@echo off
title Maintenance Management System - Shutdown
color 0C
echo.
echo ===============================================
echo   MAINTENANCE MANAGEMENT SYSTEM - SHUTDOWN
echo ===============================================
echo.

:: Stop Docker Containers
echo [1/2] Stopping Docker Containers...
docker-compose down
echo       Docker containers stopped.
echo.

:: Stop Ollama
echo [2/2] Stopping Ollama Service...
taskkill /IM "ollama.exe" /F 2>nul
echo       Ollama stopped.
echo.

echo ===============================================
echo   SYSTEM STOPPED SUCCESSFULLY
echo ===============================================
echo.
pause
