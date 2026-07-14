@echo off
title Central Pessoal — Mobile
cd /d "%~dp0"
cls
echo ========================================
echo   Central Pessoal — Modo Mobile
echo ========================================
echo.

:: Check if cloudflared exists
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] cloudflared nao encontrado.
    echo Baixe em: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
    pause
    exit /b 1
)

:: Mata processos antigos
echo Limpando processos anteriores...
taskkill /f /im cloudflared.exe >nul 2>&1
powershell -NoLogo -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 3456 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul

:: Inicia Satella Bot (se disponivel)
if exist "iniciar-bot.bat" (
    echo [0/3] Iniciando Satella Bot...
    call iniciar-bot.bat
    timeout /t 3 /nobreak >nul
)

:: Inicia servidor
echo [2/3] Iniciando servidor...
start /B node server.js > nul 2>&1
timeout /t 3 /nobreak >nul

:: Inicia Cloudflare Tunnel
echo [3/3] Conectando ao Cloudflare...
echo.
del tunnel.log 2>nul
start /B cloudflared tunnel --url http://localhost:3456 > tunnel.log 2>&1

:: Aguarda a URL aparecer (ate 45s)
echo Aguardando tunel...
:waitloop
timeout /t 2 /nobreak >nul
powershell -NoLogo -Command "if((Get-Content tunnel.log -Raw) -match 'https://[\w-]+\.trycloudflare\.com'){exit 0}else{exit 1}"
if %errorlevel% equ 0 goto found
goto waitloop

:found
cls
for /f "delims=" %%a in ('powershell -NoLogo -Command "$l=Get-Content tunnel.log -Raw; $m=[regex]::Match($l,'https://[\w-]+\.trycloudflare\.com'); if($m.Success){$m.Value}else{''}"') do set "url=%%a"
echo ========================================
echo   TUNEL ATIVO!
echo ========================================
echo.
echo   %url%
echo.
echo ========================================
echo   Feche esta janela para parar o tunel.
echo ========================================
echo.
