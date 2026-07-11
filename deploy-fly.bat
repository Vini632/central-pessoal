@echo off
title Central Pessoal - Deploy Fly.io
echo ========================================
echo  Central Pessoal - Deploy no Fly.io
echo ========================================
echo.
echo Requisitos:
echo   - Cartao de credito (NAO sera cobrado, apenas verificacao)
echo   - Nao precisa de Node.js instalado
echo.
echo O Fly.io tem free tier generoso:
echo   - 3 VMs sempre ligadas (nunca dormem)
echo   - 3GB de volume persistente (pra SQLite)
echo   - 160GB de banda/mes
echo.
set /p "choice=Quer continuar? (s/n): "
if /i not "%choice%"=="s" exit /b

:: Check if flyctl is installed
where flyctl >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [1/3] Instalando Fly.io CLI...
    echo Baixando de: https://fly.io/install.sh
    powershell -Command "iwr -useb https://fly.io/install.ps1 | iex"
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar flyctl.
        echo Instale manualmente: https://fly.io/docs/hands-on/install-flyctl/
        pause
        exit /b 1
    )
    :: Add to PATH for current session
    set "PATH=%USERPROFILE%\.fly\bin;%PATH%"
)

echo.
echo [2/3] Fazendo login (abre navegador)...
call flyctl auth signup
if %errorlevel% neq 0 (
    echo [ERRO] Login falhou.
    pause
    exit /b 1
)

echo.
echo [3/3] Fazendo deploy...
call flyctl launch --no-deploy
if %errorlevel% neq 0 (
    echo [ERRO] Launch falhou.
    pause
    exit /b 1
)

call flyctl volumes create central_data --region gig --size 1
if %errorlevel% neq 0 (
    echo [AVISO] Volume pode ja existir, continuando...
)

call flyctl deploy
if %errorlevel% neq 0 (
    echo [ERRO] Deploy falhou.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOY CONCLUIDO!
echo ========================================
echo.
echo Para ver o app:
call flyctl open
echo.
echo Comandos uteis:
echo   flyctl logs       - Ver logs
echo   flyctl ssh        - Acessar o servidor
echo   flyctl deploy     - Re-deploy apos alteracoes
echo.
pause
