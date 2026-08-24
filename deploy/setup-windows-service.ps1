#!/usr/bin/env pwsh
#
# Central Pessoal — serviço 24/7 no Windows (sem cartao, sem host externo)
# Cria uma tarefa agendada que roda `node server.js` no logon do usuario,
# reinicia sozinha se cair e fica acessivel em http://localhost:3456.
# Para acessar de fora, rode o Cloudflare Tunnel (ve README).
#
# Uso (como o teu usuario, nao precisa de admin para o agendamento simples,
#       mas admin ajuda a garantir permissoes):
#   pwsh deploy/setup-windows-service.ps1
$ErrorActionPreference = 'Stop'

# === Ajuste se o caminho do projeto for diferente ===
$ProjectDir = "C:\Users\vpers\OneDrive\Desktop\projetos\ativos\projeto_sem_ideia"
$TaskName   = "CentralPessoal"
$Port       = 3456

if (-not (Test-Path $ProjectDir)) {
  Write-Error "Projeto nao encontrado em: $ProjectDir`nAjuste a variavel `$ProjectDir no script."
  exit 1
}

# Garante um .env com token forte + ollama desligado (evita erro se nao usar IA local)
Push-Location $ProjectDir
try {
  if (-not (Test-Path .env)) {
    if (Test-Path .env.example) { Copy-Item .env.example .env }
    $token = (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes((New-Object byte[] 32)) *>&1
    $token = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })
    if (Test-Path .env) {
      (Get-Content .env) -replace '^# API_TOKEN=.*', "API_TOKEN=$token" `
                         -replace '^# DISABLE_OLLAMA=.*', 'DISABLE_OLLAMA=true' |
        Set-Content .env
      Write-Host "API_TOKEN gerado: $token  (guarde-o)"
    }
  }
} finally { Pop-Location }

# node no PATH
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Error 'node nao encontrado no PATH. Instale o Node.js e reinicie.'; exit 1 }

$action   = New-ScheduledTaskAction -Execute $node -Argument 'server.js' -WorkingDirectory $ProjectDir
$trigger  = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
              -RestartCount 5 `
              -RestartInterval (New-TimeSpan -Minutes 1) `
              -StartWhenAvailable `
              -RunOnlyIfNetworkAvailable:$false `
              -ExecutionTimeLimit (New-TimeSpan -Hours 0)

# Remove se ja existir e recria
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

# Inicia agora
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host ""
Write-Host "==========================================================="
Write-Host " Servico '$TaskName' registrado e iniciado (estado: $state)."
Write-Host " Acessivel em:  http://localhost:$Port"
Write-Host " Pro acesso externo, veja a secao 'Acesso de fora' no README."
Write-Host " Comandos:"
Write-Host "   Get-ScheduledTask -TaskName $TaskName          # status"
Write-Host "   Stop-ScheduledTask  -TaskName $TaskName        # parar"
Write-Host "   Start-ScheduledTask -TaskName $TaskName        # iniciar"
Write-Host "   Unregister-ScheduledTask -TaskName $TaskName   # remover"
Write-Host "==========================================================="
