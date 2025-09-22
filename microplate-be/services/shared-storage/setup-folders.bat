@echo off
REM Setup shared folders for Microplate AI on Windows
REM This script creates the necessary folder structure for file storage

set BASE_DIR=%~dp0shared-storage
echo Setting up shared folders in %BASE_DIR%...

REM Create base directories
mkdir "%BASE_DIR%\raw-images" 2>nul
mkdir "%BASE_DIR%\annotated-images" 2>nul
mkdir "%BASE_DIR%\interface-files" 2>nul
mkdir "%BASE_DIR%\temp-files" 2>nul

REM Create subdirectories for organization
mkdir "%BASE_DIR%\raw-images\original" 2>nul
mkdir "%BASE_DIR%\raw-images\processed" 2>nul
mkdir "%BASE_DIR%\annotated-images\predictions" 2>nul
mkdir "%BASE_DIR%\annotated-images\overlays" 2>nul
mkdir "%BASE_DIR%\interface-files\csv" 2>nul
mkdir "%BASE_DIR%\interface-files\exports" 2>nul
mkdir "%BASE_DIR%\temp-files\uploads" 2>nul
mkdir "%BASE_DIR%\temp-files\processing" 2>nul

REM Create .gitkeep files to preserve directory structure
echo. > "%BASE_DIR%\raw-images\.gitkeep"
echo. > "%BASE_DIR%\raw-images\original\.gitkeep"
echo. > "%BASE_DIR%\raw-images\processed\.gitkeep"
echo. > "%BASE_DIR%\annotated-images\.gitkeep"
echo. > "%BASE_DIR%\annotated-images\predictions\.gitkeep"
echo. > "%BASE_DIR%\annotated-images\overlays\.gitkeep"
echo. > "%BASE_DIR%\interface-files\.gitkeep"
echo. > "%BASE_DIR%\interface-files\csv\.gitkeep"
echo. > "%BASE_DIR%\interface-files\exports\.gitkeep"
echo. > "%BASE_DIR%\temp-files\.gitkeep"
echo. > "%BASE_DIR%\temp-files\uploads\.gitkeep"
echo. > "%BASE_DIR%\temp-files\processing\.gitkeep"

echo Shared folders created successfully!
echo.
echo Folder structure:
echo %BASE_DIR%\
echo ├── raw-images\
echo │   ├── original\
echo │   └── processed\
echo ├── annotated-images\
echo │   ├── predictions\
echo │   └── overlays\
echo ├── interface-files\
echo │   ├── csv\
echo │   └── exports\
echo └── temp-files\
echo     ├── uploads\
echo     └── processing\
echo.
pause
