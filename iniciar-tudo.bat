@echo off
title Central Pessoal + Bot
cd /d "%~dp0"
cls
echo ========================================
echo   Central Pessoal + Satella Bot
echo ========================================
echo.

:: Mata servidor antigo se existir
echo Limpando processos anteriores...
powershell -NoLogo -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul

:: Inicia o bot (janela separada)
set "BOT_DIR=C:\Users\vpers\OneDrive\Desktop\projetos\arquivados\bots\bots_dc\sattela_bot"
if exist "%BOT_DIR%\server.py" (
    echo [1/3] Iniciando Satella Bot ^(porta 8000^)...
    powershell -NoLogo -Command "Start-Process -FilePath 'uv' -ArgumentList 'run','python','server.py' -WorkingDirectory '%BOT_DIR%' -WindowStyle Normal"
    timeout /t 5 /nobreak >nul
) else (
    echo [1/3] Bot nao encontrado em %BOT_DIR%
)

:: Inicia o servidor
echo [2/3] Iniciando servidor ^(porta 3456^)...
start /B node server.js > nul 2>&1
timeout /t 3 /nobreak >nul

:: Abre o navegador
echo [3/3] Abrindo navegador...
start http://localhost:3456

echo.
echo ========================================
echo   Tudo pronto!
echo   Central: http://localhost:3456
echo   Bot API: http://localhost:8000
echo ========================================
echo.
echo Pressione qualquer tecla para parar tudo.
pause >nul

:: Para tudo
echo Encerrando...
powershell -NoLogo -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
taskkill /f /fi "WINDOWTITLE eq Satella Bot" >nul 2>&1
echo Finalizado.
timeout /t 2 /nobreak >nul
