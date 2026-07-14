@echo off
title Central Pessoal
echo Iniciando Central Pessoal...
echo.

:: Inicia Satella Bot
if exist "iniciar-bot.bat" (
    echo Iniciando Satella Bot...
    call iniciar-bot.bat
)

start http://localhost:3456
node server.js
pause
