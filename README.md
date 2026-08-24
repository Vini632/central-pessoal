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

## Deploy 24/7 — Oracle Cloud Free (Always Free)

Opção 100% gratuita e realmente 24/7 (VM Ampere ARM, 4 cores, 24 GB RAM, 10 TB/mês).

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
