@echo off
rem Lance Quizzoni en local sur Windows (double-clic). Rien a installer.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8080
pause
