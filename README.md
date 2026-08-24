# Central Pessoal

Sua central pessoal futurista — notas, hábitos, pomodoro, player de YouTube, IA de escrita (Castelo Aurora), terminal remoto e mais. Servidor Node.js + interface web, com app desktop opcional via Electron.

## Como rodar localmente

```bash
npm install
npm start
# abre em http://localhost:3456
```

Variáveis de ambiente (veja `.env.example`):

| Var | Descrição | Padrão |
|-----|-----------|--------|
| `PORT` | Porta do servidor | `3456` |
| `API_TOKEN` | Se definido, protege todas as rotas `/api/*` e o terminal WebSocket. Deixe vazio para modo dev aberto. | vazio |
| `DB_PATH` | Caminho do SQLite | `central.db` |
| `DISABLE_OLLAMA` | Desliga integração com Ollama (recomendado se não usar IA local) | vazio |
| `OLLAMA_URL` / `OLLAMA_MODEL` / `ESCRITA_MODEL` | Configuração do Ollama | — |
| `YOUTUBE_API_KEY` / `DRIVE_TOKEN` | APIs externas | — |

## Deploy 24/7 — Windows Service (sem cartão, sem nuvem)

Ideal para rodar 24/7 na sua própria máquina, sem pagar nada e sem host externo. O servidor sobe sozinho no logon e reinicia se cair.

> ⚠️ Use um caminho **fora do OneDrive** se quiser rodar como SYSTEM/startup. O script atual usa gatilho **no logon do usuário**, o que funciona mesmo dentro do OneDrive.

### 1. Criar o serviço
```powershell
pwsh deploy/setup-windows-service.ps1
```
O script:
- gera um `.env` com `API_TOKEN` forte e `DISABLE_OLLAMA=true` (se não existir)
- cria a tarefa agendada `CentralPessoal` (inicia no logon, reinicia em falha)
- já inicia o servidor

Acesse `http://localhost:3456`.

### 2. Gerenciar
```powershell
Get-ScheduledTask -TaskName CentralPessoal          # status
Stop-ScheduledTask  -TaskName CentralPessoal        # parar
Start-ScheduledTask -TaskName CentralPessoal        # iniciar
Unregister-ScheduledTask -TaskName CentralPessoal   # remover
```

---

## Acesso de fora (Cloudflare Tunnel, grátis, sem cartão)

Expõe o servidor local na internet sem abrir porta no roteador e com TLS automático.

**URL temporária** (sem conta, muda a cada reinício):
```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3456
```
Use a URL `https://*.trycloudflare.com` exibida.

**URL estável** (conta Cloudflare gratuita, sem cartão):
```powershell
cloudflared login            # autentica no navegador
cloudflared tunnel create central
cloudflared tunnel route dns central central.<seu-dominio-ou-sub>.trycloudflare.com
cloudflared tunnel run --url http://localhost:3456 central
```
Mais detalhes: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

> O terminal WebSocket (`/terminal`) exige `API_TOKEN`. Use sempre um token forte em produção.

---

## Deploy 24/7 — Koyeb (nuvem free, sem cartão)

Opção 100% gratuita **sem cartão de crédito** e 24/7 de verdade (2 serviços, 512 MB RAM por serviço). Usa o `Dockerfile` do projeto.

> ⚠️ O free tier do Koyeb tem **storage efêmero**: o SQLite (`/data/central.db`) é recriado se o container reiniciar. A maior parte dos dados (notas, hábitos, etc.) fica no `localStorage` do navegador, então o impacto é pequeno. Para persistência total, anexe um Volume ao serviço.

### 1. Criar o serviço (Dashboard Koyeb)
1. Acesse **app.koyeb.com** → crie conta (sem cartão)
2. **Create App → Deploy from GitHub** → escolha o repo `central-pessoal`
3. Builder: **Dockerfile** (usa o `Dockerfile` na raiz)
4. Port: `3456`
5. **Environment variables** (opcional mas recomendado):
   - `API_TOKEN` = um token forte (ex.: `openssl rand -hex 32`)
   - `DISABLE_OLLAMA` = `true`
6. **Deploy**

O Koyeb injeta `PORT` em runtime (nosso servidor já lê `process.env.PORT`), então funciona automaticamente. A URL pública aparece no dashboard (ex.: `https://seu-app.koyeb.app`).

### 2. Atualizar depois
A cada push no `master`, o Koyeb re-builda e re-deploya automaticamente (se habilitado o auto-deploy). Para forçar: botão **Redeploy** no dashboard.

### 3. Persistir o banco (opcional)
Em **Volumes**, crie um volume e monte em `/data` no serviço. O `DB_PATH` já aponta para `/data/central.db`.

---

## Deploy 24/7 — Oracle Cloud Free (Always Free, requer cartão)

Opção 100% gratuita e realmente 24/7 (VM Ampere ARM, 4 cores, 24 GB RAM, 10 TB/mês). **Requer cartão de crédito** na criação da conta (não cobra no free tier).

### 1. Criar a instância (Oracle Cloud Console)
- **Menu → Compute → Instances → Create instance**
- Image: **Ubuntu 22.04** (ou Oracle Linux 9)
- Shape: **VM.Standard.A1.Flex** → 4 OCPUs, 24 GB RAM (sempre dentro do free tier)
- Adicionar uma **SSH key** (gere ou cole a sua pública)
- Em **Networking**, anote o **VCN** criado

### 2. Abrir as portas no VCN (Security List)
Em **Networking → Virtual Cloud Networks → [seu VCN] → Security Lists → Default Security List → Add Ingress Rule**:
- **Porta 22** (SSH) — restrito ao seu IP se quiser
- **Porta 3456** (app) — de `0.0.0.0/0` se for acessar de qualquer lugar, ou do seu IP fixo

> Dica: reserve um **Public IP** (Networking → Public IPs → Reserve) para não mudar ao reiniciar.

### 3. Provisionar tudo num comando
SSH na instância e rode:

```bash
curl -fsSL https://raw.githubusercontent.com/Vini632/central-pessoal/master/deploy/setup-oracle.sh | bash
```

O script instala Docker, clona o repo, gera um `API_TOKEN` forte, cria o `.env` e sobe o container com `restart: unless-stopped` (sobe sozinho após reboot/crash).

Ao terminar, ele imprime o `API_TOKEN` e a URL pública. **Guarde o token.**

### 4. Atualizar depois
```bash
cd ~/central-pessoal
git pull
docker compose up -d --build
```

### Notas de segurança
- O terminal WebSocket (`/terminal`) roda shell do servidor. Ele **exige** `API_TOKEN` quando este está definido; se ficar vazio, fica aberto para qualquer um. Em produção, **sempre** defina `API_TOKEN`.
- Para uso puramente pessoal, restrinja a porta 3456 no VCN ao seu IP (ou use um túnel/VPN).
- Para usar a IA do Ollama no servidor, instale o Ollama na VM e ajuste `DISABLE_OLLAMA=false` no `.env`.

## Testes
```bash
npm test   # node --test test/*.test.js  (435 testes)
```
Requer `better-sqlite3` compilado para a versão do Node em uso (Node 22+ com toolchain C++17/20).
