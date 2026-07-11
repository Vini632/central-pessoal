@echo off
title Central Pessoal - Build APK (Android)
echo ========================================
echo  Central Pessoal - Build APK Android
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale em: https://nodejs.org
    pause
    exit /b 1
)

:: Navigate to project root
cd /d "%~dp0"

:: Install Capacitor
echo [1/4] Instalando Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar Capacitor.
    pause
    exit /b 1
)

:: Init Capacitor (if not already)
echo [2/4] Inicializando Capacitor...
if not exist "capacitor.config.json" (
    npx cap init CentralPessoal com.centralpessoal.app
)

:: Add Android platform
echo [3/4] Adicionando plataforma Android...
call npx cap add android
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao adicionar Android. Verifique se o Android Studio esta instalado.
    echo.
    echo Requisitos:
    echo   - Android Studio (https://developer.android.com/studio)
    echo   - Android SDK (instalado pelo Android Studio)
    echo   - JAVA 17+ (OpenJDK)
    echo.
    pause
    exit /b 1
)

:: Sync web files
echo [4/4] Sincronizando arquivos...
call npx cap sync android

echo.
echo ========================================
echo  PASSO FINAL: Abrir no Android Studio
echo ========================================
echo.
echo 1. Execute o comando abaixo para abrir o projeto:
echo    npx cap open android
echo.
echo 2. No Android Studio, va em Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo 3. O APK sera gerado em: android/app/build/outputs/apk/debug/
echo.
echo 4. (Opcional) Para gerar APK de release com sua chave:
echo    - Build -^> Generate Signed Bundle / APK
echo    - Selecione APK
echo    - Crie ou selecione sua keystore
echo.
pause
