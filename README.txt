# Central Pessoal

<p align="center">
  <a href="https://github.com/Vini632/central-pessoal/actions/workflows/ci.yml">
    <img src="https://github.com/Vini632/central-pessoal/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

Hub pessoal completo com 16 módulos integrados, IA local via Ollama, terminal WebSocket, PWA, e deploy em nuvem.

## Arquitetura

```
projeto_sem_ideia/
├── server.js           # Entry point — carrega server/index.js
├── server/
│   ├── index.js        # HTTP server, roteamento, start
│   ├── db.js           # SQLite init + helpers
│   ├── middleware.js    # Auth (Bearer token) + rate limiting
│   ├── ollama.js       # Proxy e gerenciamento do Ollama
│   ├── routes/
│   │   ├── api-data.js      # /api/data GET/POST
│   │   ├── api-habits.js    # /api/habits
│   │   ├── api-ollama.js    # /api/ollama/*
│   │   ├── api-settings.js  # /api/settings/* (chaves sensíveis)
│   │   ├── api-escrita.js   # /api/escrita/* + AI
│   │   ├── api-ai.js        # /api/ai, /api/search, /api/metadata, /api/fetch
│   │   ├── api-youtube.js   # /api/youtube/*
│   │   └── static.js        # Arquivos estáticos (HTML/CSS/JS)
│   └── ws/
│       └── terminal.js      # WebSocket do terminal
├── js/
│   ├── data.js             # Toast, Modal, Data (localStorage + API)
│   ├── voice.js            # Web Speech API
│   ├── main.js             # Boot, navegação, lazy loading
│   ├── register-modules.js # Namespace window.Central
│   └── modules/            # 16 módulos (ver abaixo)
├── css/
│   ├── base.css            # Design tokens, reset, layout
│   ├── modules.css         # Estilos de todos os módulos
│   └── responsive.css      # Breakpoints mobile/tablet
├── test/
│   ├── *.test.js           # 399+ testes
│   └── helpers/load.js     # VM sandbox para testar módulos JS
└── Castelo Aurora/         # Projeto literário (Escrita)
    ├── lore/               # Contexto do mundo (só leitura)
    ├── personagens/        # Fichas de personagens (só leitura)
    ├── capitulos/          # Capítulos do livro (escrita)
    ├── cenas/              # Cenas soltas (escrita)
    └── rascunhos/          # Rascunhos (escrita)
```

## Módulos (JS Frontend — `js/modules/`)

| Módulo   | Arquivo       | Descrição                         |
| -------- | ------------- | --------------------------------- |
| Settings | `settings.js` | Tema, backup Drive, chaves de API |
| Clock    | `clock.js`    | Relógio, previsão do tempo        |
| News     | `news.js`     | Leitor de RSS                     |
| Notes    | `notes.js`    | Notas com markdown + imagens      |
| Todo     | `todo.js`     | Lista de tarefas                  |
| Calendar | `calendar.js` | Calendário com eventos            |
| Pomodoro | `pomodoro.js` | Timer foco/pausa                  |
| Links    | `links.js`    | Gerenciador de bookmarks          |
| Habits   | `habits.js`   | Rastreador de hábitos             |
| Terminal | `terminal.js` | Emulador via WebSocket            |
| Player   | `player.js`   | YouTube + sons ambientes          |
| AI       | `ai.js`       | Chat com IA (Ollama/OpenAI)       |
| Game     | `game.js`     | Jogo Ferreiro (idle/incremental)  |
| Leitura  | `leitura.js`  | Lista de leitura                  |
| Escrita  | `escrita.js`  | Editor literário com IA           |
| Bot      | `bot.js`      | Dashboard do bot Discord          |

Todos os módulos são registrados em `window.Central` (ex: `Central.Settings`, `Central.AI`).

## API REST

Todas as rotas `/api/*` requerem `Authorization: Bearer <token>` se `API_TOKEN` estiver configurado.

| Rota                          | Métodos   | Descrição                          |
| ----------------------------- | --------- | ---------------------------------- |
| `/api/data`                   | GET, POST | Backup completo dos dados (SQLite) |
| `/api/habits`                 | GET, POST | Hábitos e logs                     |
| `/api/ollama/status`          | GET       | Status do Ollama                   |
| `/api/ollama/models`          | GET       | Listar modelos                     |
| `/api/ollama/generate`        | POST      | Gerar texto                        |
| `/api/ollama/pull`            | POST      | Baixar modelo                      |
| `/api/ollama/start`           | POST      | Iniciar Ollama                     |
| `/api/ollama/set-url`         | POST      | URL customizada                    |
| `/api/settings/youtubeApiKey` | GET, POST | Chave do YouTube                   |
| `/api/settings/driveToken`    | GET, POST | Token do Google Drive              |
| `/api/ai/instructions`        | GET       | Instruções do sistema              |
| `/api/search`                 | POST      | DuckDuckGo                         |
| `/api/metadata`               | POST      | OG metadata                        |
| `/api/fetch`                  | POST      | Fetch + strip HTML                 |
| `/api/youtube/search`         | GET       | Buscar vídeos                      |
| `/api/youtube/playlist`       | GET       | Itens de playlist                  |
| `/api/youtube/validate`       | GET       | Validar key                        |
| `/api/escrita`                | GET, POST | Árvore + ler/escrever              |
| `/api/escrita/create`         | POST      | Criar arquivo                      |
| `/api/escrita/rename`         | POST      | Renomear                           |
| `/api/escrita/delete`         | POST      | Deletar                            |
| `/api/escrita/ai`             | POST      | Assistente de escrita              |
| `/api/weather`                | GET       | Previsão do tempo                  |
| `/api/stats`                  | GET       | Estatísticas agregadas             |
| `/api/bot/*`                  | GET, POST | Proxy Discord                      |
| `/api/pentest`                | POST      | Pentest de URL                     |

## Como Rodar

```bash
# Instalar dependências
npm install

# Criar .env (opcional)
echo API_TOKEN=sua_chave_aqui > .env
echo DISABLE_OLLAMA=true >> .env

# Iniciar
npm start
# ou: node server.js
```

Acessar: `http://localhost:3456`

### Testes

```bash
npm test
# 434 testes, 106 suites
```

## Deploy

- **Docker**: `docker build -t central-pessoal . && docker run -p 3456:3456 central-pessoal`
- **fly.io**: `fly deploy`
- **Railway**: Conectar repositório
- **Desktop**: `npm run build:exe` (Electron + NSIS installer)

## Stack

- **Backend**: Node.js, better-sqlite3 (WAL mode)
- **Frontend**: Vanilla JS, CSS custom properties, glassmorphism
- **IA**: Ollama (local) ou OpenAI-compatible
- **Terminal**: WebSocket + cmd.exe/bash
- **Mobile**: Capacitor
- **Desktop**: Electron
- **PWA**: Service Worker com cache offline
