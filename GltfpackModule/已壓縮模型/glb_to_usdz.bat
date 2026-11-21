@echo off
setlocal EnableExtensions
chcp 65001 >nul

rem ============================================================
rem  GLB -> USDZ (iPhone AR Quick Look)
rem  Drag one or more .glb files onto this file.
rem  A .usdz with the same name is created next to each .glb.
rem  glb_to_usdz.py must be in the same folder as this .bat.
rem ============================================================

rem --- Settings (edit if needed) ------------------------------
rem Full path to blender.exe. Leave empty to auto-detect.
set "BLENDER="
rem Extra options for glb_to_usdz.py, e.g. --target 100000 --min-ratio 0.4
set "OPTIONS=--min-ratio 0.5"
rem -----------------------------------------------------------

set "SCRIPT=%~dp0glb_to_usdz.py"
if not exist "%SCRIPT%" (
    echo [ERROR] glb_to_usdz.py not found next to this .bat:
    echo         %SCRIPT%
    goto end
)

rem Auto-detect Blender (picks the newest "Blender x.x" folder)
if not defined BLENDER (
    for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender *") do (
        if exist "%%D\blender.exe" set "BLENDER=%%D\blender.exe"
    )
)
if not defined BLENDER (
    for %%B in (blender.exe) do if not "%%~$PATH:B"=="" set "BLENDER=%%~$PATH:B"
)
if not defined BLENDER (
    echo [ERROR] Blender not found. Set BLENDER at the top of this file.
    goto end
)
echo Blender: %BLENDER%
echo.

if "%~1"=="" (
    echo Usage: drag one or more .glb files onto this .bat file.
    goto end
)

set /a OK=0, FAIL=0

:loop
if "%~1"=="" goto summary

if /i not "%~x1"==".glb" (
    echo [SKIP] Not a .glb file: %~nx1
    goto next
)

echo ------------------------------------------------------------
echo [START] %~nx1  -^>  %~n1.usdz
echo ------------------------------------------------------------

rem Converted textures go to a temp folder (they are packed inside the .usdz)
set "TEXDIR=%TEMP%\glb_to_usdz\%~n1"

"%BLENDER%" -b --factory-startup --python-exit-code 1 -P "%SCRIPT%" -- "%~f1" "%~dpn1.usdz" --texture-dir "%TEXDIR%" %OPTIONS%

if errorlevel 1 (
    echo [FAILED] %~nx1
    set /a FAIL+=1
) else (
    echo [DONE] %~dpn1.usdz
    set /a OK+=1
)
echo.

:next
shift
goto loop

:summary
echo ============================================================
echo  Finished: %OK% succeeded, %FAIL% failed
echo ============================================================

:end
echo.
pause
