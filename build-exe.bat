@echo off
title Central Pessoal - Build EXE (Windows)
echo ========================================
echo  Central Pessoal - Build EXE Windows
echo ========================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale em: https://nodejs.org
    pause
    exit /b 1
)

:: Clean previous build
echo [1/5] Limpando build anterior...
if exist "dist-electron" rmdir /s /q "dist-electron"
if exist "dist\CentralPessoal-win32-x64" rmdir /s /q "dist\CentralPessoal-win32-x64"

:: Create directory structure
echo [2/5] Criando estrutura...
mkdir "dist-electron\resources\app" 2>nul

:: Install Electron if needed
echo [3/5] Verificando Electron...
if not exist "node_modules\electron\dist\electron.exe" (
    npm install --save-dev electron @electron/packager
)

:: Copy app files
echo [4/5] Copiando arquivos...
copy /Y "electron-main.js" "dist-electron\resources\app\" >nul
copy /Y "server.js" "dist-electron\resources\app\" >nul
copy /Y "index.html" "dist-electron\resources\app\" >nul
copy /Y "favicon.svg" "dist-electron\resources\app\" >nul
copy /Y "sw.js" "dist-electron\resources\app\" >nul
if exist "manifest.json" copy /Y "manifest.json" "dist-electron\resources\app\" >nul
xcopy /E /I /Y "css" "dist-electron\resources\app\css\" >nul
xcopy /E /I /Y "js" "dist-electron\resources\app\js\" >nul
if exist "icons" xcopy /E /I /Y "icons" "dist-electron\resources\app\icons\" >nul

:: Create package.json for the app
echo { > "dist-electron\resources\app\package.json"
echo   "name": "central-pessoal", >> "dist-electron\resources\app\package.json"
echo   "version": "1.0.0", >> "dist-electron\resources\app\package.json"
echo   "private": true, >> "dist-electron\resources\app\package.json"
echo   "main": "electron-main.js", >> "dist-electron\resources\app\package.json"
echo   "dependencies": { >> "dist-electron\resources\app\package.json"
echo     "better-sqlite3": "^12.11.1", >> "dist-electron\resources\app\package.json"
echo     "ws": "^8.16.0" >> "dist-electron\resources\app\package.json"
echo   } >> "dist-electron\resources\app\package.json"
echo } >> "dist-electron\resources\app\package.json"

:: Install production deps in app
echo [5/5] Instalando dependencias...
cd "dist-electron\resources\app"
call npm install --omit=dev
cd "%~dp0"

:: Copy Electron binary
echo.
echo Copiando Electron...
xcopy /E /I /Y "node_modules\electron\dist\*" "dist-electron\" >nul
copy /Y "node_modules\electron\path.txt" "dist-electron\" >nul

:: Rename executable
rename "dist-electron\electron.exe" "CentralPessoal.exe" >nul

:: Copy to builds/ for web download
echo.
echo Copiando para builds/...
if not exist "builds" mkdir "builds"
copy /Y "dist-electron\CentralPessoal.exe" "builds\CentralPessoal.exe" >nul

echo.
echo ========================================
echo  BUILD CONCLUIDO!
echo ========================================
echo.
echo Executavel em: dist-electron\CentralPessoal.exe
echo Link pra download: /builds/CentralPessoal.exe
echo Tamanho: ~180 MB
echo.
echo Para executar, de um duplo clique em:
echo   dist-electron\CentralPessoal.exe
echo.
pause
