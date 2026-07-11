@echo off
title Central Pessoal - Setup GitHub + Railway
cd /d "%~dp0"

:: Check Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado. Instale em: https://git-scm.com/
    pause
    exit /b 1
)

:: Check if already a git repo
if exist ".git" (
    echo Ja existe repositorio Git. Pulando...
) else (
    echo [1/4] Inicializando Git...
    git init
    git add -A
    git commit -m "Initial commit - Central Pessoal"
)

:: Ask for GitHub repo
echo.
echo [2/4] Criar repositorio no GitHub:
echo   1. Abra https://github.com/new
echo   2. Nome: central-pessoal  (ou qualquer nome)
echo   3. Marque PRIVADO (recomendado) ou Publico
echo   4. NAO marque nada (README, .gitignore, license)
echo   5. Clique em "Create repository"
echo.
set /p "repo_url=Cole a URL do seu novo repositorio (ex: https://github.com/seuusuario/central-pessoal.git): "

if "%repo_url%"=="" (
    echo URL vazia. Tente novamente depois com: git remote add origin ^<url^>
    pause
    exit /b 1
)

git remote add origin "%repo_url%"

echo.
echo [3/4] Enviando para GitHub...
git push -u origin master
if %errorlevel% neq 0 (
    git branch -M main
    git push -u origin main
)
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao enviar para GitHub.
    echo Verifique se a URL esta correta e se o repositorio existe.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ENVIADO PARA GITHUB COM SUCESSO!
echo ========================================
echo.
echo [4/4] Agora va em:
echo.
echo   1. https://railway.app/new
echo   2. Clique em "Deploy from GitHub repo"
echo   3. Selecione o repositorio: central-pessoal
echo   4. O deploy vai comecar automaticamente!
echo.
echo   APOS O DEPLOY:
echo   - Entre em Project ^> Variables e anote a URL gerada
echo   - Vai em Project ^> Volumes ^> Add Volume
echo   - Tamanho: 256MB, Montagem: /data
echo.
echo   UptimeRobot (opcional, pra manter acordado):
echo   https://uptimerobot.com - crie monitor GET pra URL do Railway
echo.
pause
