@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Play.ps1" -AppWindow
if errorlevel 1 pause
