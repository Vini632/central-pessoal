$root = "C:\Users\vpers\OneDrive\Desktop\projetos\ativos\projeto_sem_ideia"
$botDir = "C:\Users\vpers\OneDrive\Desktop\projetos\arquivados\bots\bots_dc\sattela_bot"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Iniciando Central Pessoal + Bot" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Iniciando Satella Bot (porta 8000)..." -ForegroundColor Yellow
$botJob = Start-Job -ScriptBlock {
  param($dir)
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
  Set-Location $dir
  uv run python server.py
} -ArgumentList $botDir

Start-Sleep -Seconds 4

Write-Host "[2/2] Iniciando Central Pessoal (porta 3456)..." -ForegroundColor Yellow
Write-Host "  Pressione Ctrl+C para parar ambos`n" -ForegroundColor DarkGray
Set-Location $root
try {
  node server.js
} finally {
  Write-Host "`nParando Satella Bot..." -ForegroundColor Yellow
  Stop-Job $botJob -ErrorAction SilentlyContinue
  Remove-Job $botJob -ErrorAction SilentlyContinue
  Write-Host "Ambos servidores encerrados." -ForegroundColor Cyan
}
