@echo off
:: 🌟 2026 智慧型 3D 幾何極致壓縮工具
chcp 65001 >nul
title gLTFPack 自動化壓縮引擎

echo ===================================================
echo     🛠️  gLTFPack 25%% 體積極致壓縮自動化工具
echo ===================================================

:: 檢查是否有拖曳檔案進來
if "%~1"=="" (
    echo ❌ 錯誤：請直接將您的 .glb 檔案「拖曳」到此 .bat 圖示上執行！
    echo.
    pause
    exit
)

:: 設定變數
set "INPUT_FILE=%~1"
set "OUTPUT_DIR=%~dp1已壓縮模型"
set "OUTPUT_FILE=%OUTPUT_DIR%\%~n1_compressed.glb"

:: 建立輸出資料夾
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo 📦 偵測到原始檔案：%~nx1
echo ⚙️  正在啟動工業級幾何優化（目標體積：~25%%）...

:: 🚀 執行您的黃金壓縮指令 (-si 0.25 保留25%面數, -vp 14 提高圓弧精準度, -noq 關閉法線量化確保烤漆反光完美)
gltfpack -i "%INPUT_FILE%" -o "%OUTPUT_FILE%" -si 0.25 -vp 14 

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo 🎉 壓縮成功！
    echo 📁 輸出路徑：%OUTPUT_FILE%
    echo 💡 提示：現在您可以把這個檔案放進您的 Three.js 網頁導出成完美 USDZ 了！
    echo ===================================================
) else (
    echo.
    echo ❌ 壓縮失敗！請檢查電腦是否已正確安裝 gltfpack。
)

echo.
pause