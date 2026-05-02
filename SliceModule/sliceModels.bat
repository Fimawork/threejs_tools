@echo off
echo Running npm run base64_glb ...

:: 自動切換到目前腳本所在的資料夾
cd /d "%~dp0"

npm run base64_glb

pause