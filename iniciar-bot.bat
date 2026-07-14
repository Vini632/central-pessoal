@echo off
title Satella Bot
set "BOT_DIR=C:\Users\vpers\OneDrive\Desktop\projetos\arquivados\bots\bots_dc\sattela_bot"

if not exist "%BOT_DIR%\server.py" (
    echo [ERRO] Diretorio do bot nao encontrado
    echo Caminho: %BOT_DIR%
    pause
    exit /b 1
)

echo Iniciando bot na porta 8000...
powershell -NoLogo -Command "Start-Process -FilePath 'uv' -ArgumentList 'run','python','server.py' -WorkingDirectory '%BOT_DIR%' -WindowStyle Normal"
echo.
