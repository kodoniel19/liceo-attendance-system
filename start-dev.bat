@echo off
title Liceo Attendance System

echo.
echo  ============================================
echo   Liceo de Cagayan University
echo   QR Code Attendance Management System
echo  ============================================
echo.

echo  Starting Backend API (port 3000)...
start "Liceo Backend API" cmd /k "cd /d %~dp0backend && node src/index.js"

echo  Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo  Starting Frontend (port 4200)...
start "Liceo Frontend" cmd /k "cd /d %~dp0frontend && ng serve --host 0.0.0.0 --ssl --open"

echo.
echo  Both servers are starting in separate windows!
echo.
echo  Frontend: http://localhost:4200
echo  Backend:  http://localhost:3000
echo.
echo  Demo Credentials:
echo    Instructor: instructor@liceo.edu.ph / Admin@2024
echo    Student:    student@liceo.edu.ph    / Admin@2024
echo.
pause
