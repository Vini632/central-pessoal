const TerminalModule = {
  term: null,
  ws: null,
  isRawMode: false,
  inputBuffer: '',
  _initialized: false,

  init() {
    document.getElementById('mod-terminal').innerHTML = `
      <div class="module-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          Terminal
        </h2>
        <div id="terminal-status">
          <div id="terminal-indicator" class="disconnected"></div>
          <span id="terminal-status-text">BACKEND</span>
        </div>
      </div>
      <div id="terminal-body">
        <div id="terminal-output"></div>
        <div id="terminal-input-line">
          <span id="terminal-prompt">$</span>
          <input id="terminal-input" type="text" spellcheck="false" autocomplete="off" placeholder="digite help">
        </div>
      </div>
    `;

    this.input = document.getElementById('terminal-input');
    this.output = document.getElementById('terminal-output');

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSubmit();
    });

    // Clique no corpo foca o input
    document.getElementById('terminal-body').addEventListener('click', () => {
      if (this.input) this.input.focus();
    });

    window.addEventListener('resize', () => {
      this.output.scrollTop = this.output.scrollHeight;
    });
  },

  activate() {
    setTimeout(() => {
      if (this.input) this.input.focus();
    }, 100);
    this.autoConnect();
  },

  autoConnect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const url = `${protocol}//${host}:${port}/terminal`;
    this.writeln(`Conectando a ${url}...`);
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.isRawMode = true;
        this.writeln('Conectado! Terminal vivo.');
        document.getElementById('terminal-indicator').className = 'connected';
        document.getElementById('terminal-status-text').textContent = 'LIVE';
      };
      this.ws.onmessage = (e) => {
        this.writeln(e.data.trim());
      };
      this.ws.onclose = () => {
        this.isRawMode = false;
        this.ws = null;
        document.getElementById('terminal-indicator').className = 'disconnected';
        document.getElementById('terminal-status-text').textContent = 'BACKEND';
      };
      this.ws.onerror = () => {
        this.writeln('Backend offline — modo local ativo.');
      };
    } catch (e) {
      this.writeln('Erro: ' + e.message);
    }
  },

  handleSubmit() {
    const cmd = this.input.value.trim();
    this.input.value = '';

    if (!cmd) return;

    this.writeln(`$ ${cmd}`);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(cmd + '\r\n');
    } else {
      this.execLocal(cmd);
    }
  },

  writeln(text) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.textContent = text;
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  },

  execLocal(cmd) {
    const parts = cmd.split(/\s+/);
    const c = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmds = {
      help: () => {
        this.writeln('  help       Comandos disponiveis');
        this.writeln('  clear      Limpa o terminal');
        this.writeln('  echo       Repete o texto');
        this.writeln('  date       Data e hora');
        this.writeln('  weather    Clima atual');
        this.writeln('  news       Ultimas noticias');
        this.writeln('  notes      Lista notas');
        this.writeln('  links      Lista links');
        this.writeln('  connect    Conecta ao backend');
      },
      clear: () => { this.output.innerHTML = ''; },
      echo: () => this.writeln(args.join(' ')),
      date: () => this.writeln(new Date().toLocaleString('pt-BR')),
      weather: () => {
        const t = document.getElementById('weather-temp')?.textContent || '--';
        const d = document.getElementById('weather-desc')?.textContent || '--';
        const c = document.getElementById('weather-city')?.textContent || '--';
        this.writeln(`${t} / ${d} / ${c}`);
      },
      news: () => {
        const cards = document.querySelectorAll('#news-list .news-card');
        if (cards.length === 0) { this.writeln('Nenhuma noticia.'); return; }
        cards.forEach((card, i) => {
          if (i >= 5) return;
          const t = card.querySelector('.news-title a')?.textContent || '';
          this.writeln(`  ${i + 1}. ${t}`);
        });
      },
      notes: () => {
        const store = Data.get('central_notes') || [];
        if (store.length === 0) { this.writeln('Nenhuma nota.'); return; }
        store.forEach((n, i) => {
          const p = n.content.substring(0, 50).replace(/\n/g, ' ');
          this.writeln(`  ${i + 1}. ${p || '(vazia)'}`);
        });
      },
      links: () => {
        const store = Data.get('central_links') || [];
        if (store.length === 0) { this.writeln('Nenhum link.'); return; }
        store.forEach((l, i) => this.writeln(`  ${i + 1}. ${l.title} -> ${l.url}`));
      },
      connect: () => {
        const url = args[0] || 'ws://localhost:3456/terminal';
        this.writeln(`Conectando a ${url}...`);
        try {
          this.ws = new WebSocket(url);
          this.ws.onopen = () => {
            this.isRawMode = true;
            this.writeln('Conectado! Digite comandos do sistema.');
            document.getElementById('terminal-indicator').className = 'connected';
            document.getElementById('terminal-status-text').textContent = 'LIVE';
          };
          this.ws.onmessage = (e) => { this.writeln(e.data.trim()); };
          this.ws.onclose = () => {
            this.isRawMode = false;
            this.ws = null;
            document.getElementById('terminal-indicator').className = 'disconnected';
            document.getElementById('terminal-status-text').textContent = 'BACKEND';
          };
          this.ws.onerror = () => { this.writeln('Falha ao conectar.'); };
        } catch (e) { this.writeln('Erro: ' + e.message); }
      },
    };

    if (cmds[c]) cmds[c]();
    else this.writeln(`Comando nao encontrado: ${c}`);
  },
};

window.TerminalApp = TerminalModule;
