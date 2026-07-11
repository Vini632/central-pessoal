@echo off
title Central Pessoal - Deploy Railway
echo ========================================
echo  Central Pessoal - Deploy no Railway
echo ========================================
echo.
echo Railway NAO precisa de cartao de credito!
echo Apenas login com GitHub.
echo.
echo ========================================
echo  METODO 1 - Pelo navegador (recomendado)
echo ========================================
echo.
echo 1. Crie um repositorio no GitHub com esses arquivos
echo 2. Acesse https://railway.app/new
echo 3. Conecte com GitHub e selecione o repositorio
echo 4. Pronto! O deploy e automatico
echo.
echo ========================================
echo  METODO 2 - Pelo CLI
echo ========================================
echo.
echo Se preferir pela linha de comando:
echo.
echo 1. Instalar Railway CLI:
echo    npm install -g @railway/cli
echo.
echo 2. Fazer login:
echo    railway login
echo.
echo 3. Criar projeto e fazer deploy:
echo    railway init
echo    railway up
echo.
echo ========================================
echo  VOLUME PERSISTENTE (opcional)
echo ========================================
echo.
echo Para manter o SQLite ativo entre deploys:
echo   - No dashboard do Railway, va em Project ^> Volumes
echo   - Crie um volume de 256MB montado em /data
echo   - O banco de dados sera salvo la
echo.
echo ========================================
echo  MANTER ACORDADO (caso durma)
echo ========================================
echo.
echo Railway nao dorme na free tier (desde 2025),
echo mas se quiser garantir, use UptimeRobot:
echo   https://uptimerobot.com  (50 monitores gratis)
echo.
echo Crie um monitor HTTP GET apontando pra:
echo   https://seu-app.railway.app/
echo Intervalo: 5 minutos
echo.
pause
