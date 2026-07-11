@echo off
title Central Pessoal — Mobile
cd /d "%~dp0"
cls
echo ========================================
echo   Central Pessoal — Modo Mobile
echo ========================================
echo.

:: Mata servidor antigo
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3456 "') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: Inicia servidor
echo [1/2] Iniciando servidor...
start /B node server.js > server.log 2>&1
timeout /t 3 /nobreak >nul

:: Inicia Cloudflare Tunnel em background
echo [2/2] Conectando ao Cloudflare...
echo.
del tunnel.log 2>nul
start /B cloudflared tunnel --url http://localhost:3456 > tunnel.log 2>&1

:: Aguarda a URL aparecer (ate 30s)
echo Aguardando tunel...
:waitloop
timeout /t 2 /nobreak >nul
powershell -Command "if (Select-String -Path tunnel.log -Pattern 'trycloudflare\.com' -Quiet) { exit 0 } else { exit 1 }" && goto found
goto waitloop

:found
cls
echo ========================================
echo   ✅ TUNEL ATIVO!
echo ========================================
echo.
for /f "delims=" %%a in ('powershell -Command "$l=Get-Content tunnel.log -Raw; [regex]::Match($l,'https://[\w-]+\.trycloudflare\.com').Value"') do set "url=%%a"
echo   Abra no celular:
echo.
echo   ╔══════════════════════════════════════╗
echo   ║                                      ║
echo   ║   %url%
echo   ║                                      ║
echo   ╚══════════════════════════════════════╝
echo.
echo ========================================
echo   Feche esta janela para parar o tunel.
echo ========================================
echo.
type tunnel.log | findstr /v "^$"
