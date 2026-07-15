document.addEventListener('DOMContentLoaded', () => {
  const bootLines = [
    { text: 'Initializing system kernel...', status: 'ok', delay: 200 },
    { text: 'Loading core modules...', status: 'ok', delay: 400 },
    { text: 'Calibrating neural interface...', status: 'working', delay: 700 },
    { text: 'Establishing secure channels...', status: 'working', delay: 1100 },
    { text: 'Synchronizing data streams...', status: 'working', delay: 1500 },
    { text: 'Running diagnostic checks...', status: 'working', delay: 1900 },
    { text: 'Loading user profile...', status: 'working', delay: 2300 },
    { text: 'Finalizing boot sequence...', status: 'working', delay: 2700 },
  ];

  const container = document.getElementById('loading-lines');
  const progressFill = document.getElementById('loading-progress-fill');
  const statusEl = document.getElementById('loading-status');
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');

  const statusTexts = [
    'INITIALIZING...', 'LOADING...', 'CONNECTING...', 'SYNCING...',
    'PROCESSING...', 'OPTIMIZING...', 'FINALIZING...', 'READY',
  ];

  let currentLine = 0;
  let lazyModules;

  function addLine(lineData) {
    const line = document.createElement('div');
    line.className = 'loading-line';
    line.innerHTML = `
      <span class="prompt">></span>
      <span class="text">${lineData.text}</span>
      <span class="status-${lineData.status === 'ok' ? 'ok' : 'working'}">
        ${lineData.status === 'ok' ? '[OK]' : '[··]'}
      </span>
    `;

    container.appendChild(line);
    container.scrollTop = container.scrollHeight;

    if (lineData.status !== 'ok') {
      setTimeout(() => {
        const statusSpan = line.querySelector('.status-working');
        if (statusSpan) {
          statusSpan.textContent = '[OK]';
          statusSpan.className = 'status-done';
        }
        line.querySelector('.text').style.color = 'var(--cyan)';
      }, 1200 + Math.random() * 800);
    }

    currentLine++;
    const progress = Math.min((currentLine / bootLines.length) * 100, 95);
    progressFill.style.width = progress + '%';

    if (currentLine < statusTexts.length) {
      statusEl.textContent = statusTexts[currentLine];
    }
  }

  function showGlitch() {
    const lines = container.querySelectorAll('.loading-line .text');
    if (lines.length > 0) {
      const randomLine = lines[Math.floor(Math.random() * lines.length)];
      randomLine.classList.add('loading-glitch');
      setTimeout(() => randomLine.classList.remove('loading-glitch'), 300);
    }
  }

  function bootSequence() {
    let delay = 0;

    bootLines.forEach((line) => {
      setTimeout(() => {
        addLine(line);
        if (Math.random() > 0.6) setTimeout(showGlitch, 100);
      }, delay);
      delay += line.delay + Math.random() * 300;
    });

    const totalTime = delay + 600;

    setTimeout(() => {
      progressFill.style.width = '100%';
      statusEl.textContent = 'READY';
    }, totalTime - 400);

    setTimeout(() => {
      const lastLine = document.createElement('div');
      lastLine.className = 'loading-line';
      lastLine.style.animationDelay = '0s';
      lastLine.innerHTML = `
        <span class="prompt">></span>
        <span class="text" style="color:var(--cyan)">System ready. Welcome back.</span>
        <span class="status-done">[DONE]</span>
      `;
      container.appendChild(lastLine);

      setTimeout(async () => {
        await Data.load();
        loadingScreen.classList.add('hidden');
        app.classList.add('visible');
        initModules();
      }, 600);
    }, totalTime + 200);
  }

  function navigateTo(moduleName) {
    // Lazy-init module on first navigation (avoids 15 inits on boot)
    if (lazyModules && lazyModules[moduleName]) {
      try {
        lazyModules[moduleName]();
      } catch(e) {
        console.error('Lazy init error: '+moduleName, e);
      }
      delete lazyModules[moduleName];
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

    const navBtn = document.querySelector(`.nav-btn[data-module="${moduleName}"]`);
    if (navBtn) {
      navBtn.classList.add('active');
    } else {
      console.warn('navigateTo: nav button not found for', moduleName);
    }

    const target = document.getElementById(`mod-${moduleName}`);
    if (target) {
      target.classList.add('active');
    } else {
      console.error('navigateTo: module not found for', `mod-${moduleName}`);
    }

    if (moduleName === 'terminal') {
      TerminalModule.activate();
    }
  }

  function initModules() {
    // Boot essentials: Settings (theme) + Clock (dashboard)
    try { Central.Settings.init(); } catch(e) { console.error('Init error: Settings', e); }
    try { Central.Clock.init(); } catch(e) { console.error('Init error: Clock', e); }

    // Lazy modules — inited on first navigation via navigateTo()
    lazyModules = {
      player:    () => Central.Player.init(),
      ai:        () => Central.AI.init(),
      notes:     () => Central.Notes.init(),
      todo:      () => Central.Todo.init(),
      calendar:  () => Central.Calendar.init(),
      pomodoro:  () => Central.Pomodoro.init(),
      links:     () => Central.Links.init(),
      habits:    () => Central.Habits.init(),
      terminal:  () => { Central.TerminalModule.init(); },
      game:      () => Central.Game.init(),
      news:      () => Central.News.init(),
      leitura:   () => Central.Leitura.init(),
      escrita:   () => Central.Escrita.init(),
      bot:       () => Central.Bot.init(),
    };

    // Sidebar navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.module) {
        btn.addEventListener('click', () => navigateTo(btn.dataset.module));
      } else {
        console.warn('nav-btn without data-module:', btn.id || btn);
      }
    });

    // Menu cards navigation
    document.querySelectorAll('.menu-card[data-module]').forEach(card => {
      card.addEventListener('click', () => navigateTo(card.dataset.module));
    });

    // Search
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    function doSearch(query) {
      if (!query || query.length < 2) { searchResults.classList.remove('open'); return; }
      const q = query.toLowerCase();
      const groups = [];

      // Notes
      const notes = Data.get('central_notes') || [];
      const noteHits = notes.filter(n => n.content.toLowerCase().includes(q)).slice(0, 5);
      if (noteHits.length) groups.push({ label: 'Notas', module: 'notes', items: noteHits.map(n => ({ text: n.content.substring(0, 80), id: n.id })) });

      // Todos
      const todos = Data.get('central_todo') || [];
      const todoHits = todos.filter(t => t.text.toLowerCase().includes(q)).slice(0, 5);
      if (todoHits.length) groups.push({ label: 'Tarefas', module: 'todo', items: todoHits.map(t => ({ text: t.text.substring(0, 80), id: t.id })) });

      // Links
      const links = Data.get('central_links') || [];
      const linkHits = links.filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)).slice(0, 5);
      if (linkHits.length) groups.push({ label: 'Links', module: 'links', items: linkHits.map(l => ({ text: l.title, id: l.id })) });

      // AI conversations
      const convs = Data.get('central_ai_conversations') || [];
      const msgHits = [];
      for (const c of convs) {
        if (c.messages) {
          for (const m of c.messages) {
            if (m.content && m.content.toLowerCase().includes(q)) {
              msgHits.push({ text: m.content.substring(0, 80), id: '' });
              if (msgHits.length >= 5) break;
            }
          }
        }
        if (msgHits.length >= 5) break;
      }
      if (msgHits.length) groups.push({ label: 'Conversas IA', module: 'ai', items: msgHits });

      if (!groups.length) {
        searchResults.innerHTML = '<div class="search-empty">Nenhum resultado</div>';
        searchResults.classList.add('open');
        return;
      }

      searchResults.innerHTML = groups.map(g => `
        <div class="search-group-label">${g.label}</div>
        ${g.items.map(item => `
          <div class="search-result-item" data-module="${g.module}">
            <span class="sri-text">${item.text.replace(/</g, '&lt;')}</span>
            <span class="sri-module">${g.module}</span>
          </div>
        `).join('')}
      `).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          searchInput.value = '';
          searchResults.classList.remove('open');
          navigateTo(el.dataset.module);
        });
      });
      searchResults.classList.add('open');
    }

    searchInput.addEventListener('input', () => doSearch(searchInput.value));

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { searchInput.value = ''; searchResults.classList.remove('open'); searchInput.blur(); }
      if (e.key === 'Enter') {
        const first = searchResults.querySelector('.search-result-item');
        if (first) { first.click(); }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-box')) searchResults.classList.remove('open');
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Hamburger menu for mobile
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
      });
    });

    // Export / Import
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('central_')) data[key] = JSON.parse(localStorage.getItem(key));
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `central-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-input').click();
    });
    document.getElementById('import-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          let count = 0;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('central_')) {
              localStorage.setItem(key, JSON.stringify(value));
              // Sync to API
              try { await apiFetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }); } catch (e) { console.warn("main: catch", e); }
              count++;
            }
          }
          Toast.success(`${count} dados importados. Recarregue a pagina.`);
          setTimeout(() => location.reload(), 1500);
        } catch {
          Toast.error('Arquivo invalido.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Fullscreen toggle
    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
          document.getElementById('fs-icon-enter').style.display = 'none';
          document.getElementById('fs-icon-exit').style.display = 'block';
        } else {
          document.exitFullscreen?.();
          document.getElementById('fs-icon-enter').style.display = 'block';
          document.getElementById('fs-icon-exit').style.display = 'none';
        }
      });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          document.getElementById('fs-icon-enter').style.display = 'block';
          document.getElementById('fs-icon-exit').style.display = 'none';
        }
      });
    }

    // Keyboard shortcuts modal
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        showShortcuts();
      }
    });

    function showShortcuts() {
      const overlay = document.getElementById('modal-overlay');
      document.getElementById('modal-title').textContent = 'Atalhos de Teclado';
      document.getElementById('modal-body').innerHTML = `
        <div class="shortcuts-list">
          <div class="shortcut-row"><kbd>Ctrl+K</kbd><span>Busca global</span></div>
          <div class="shortcut-row"><kbd>/</kbd><span>Focar na busca</span></div>
          <div class="shortcut-row"><kbd>?</kbd><span>Este modal de atalhos</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd><span>Fechar modal / busca</span></div>
          <div class="shortcut-row"><kbd>Enter</kbd><span>Confirmar / enviar</span></div>
          <div class="shortcut-row"><kbd>F11</kbd><span>Tela cheia (navegador)</span></div>
        </div>
      `;
      document.getElementById('modal-confirm').textContent = 'FECHAR';
      document.getElementById('modal-cancel').textContent = '';
      document.getElementById('modal-cancel').style.display = 'none';
      overlay.classList.remove('hidden');

      const close = () => {
        overlay.classList.add('hidden');
        document.getElementById('modal-cancel').style.display = '';
      };

      document.getElementById('modal-confirm').onclick = close;
      document.getElementById('modal-close').onclick = close;

      const kh = (ev) => { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', kh); } };
      document.addEventListener('keydown', kh);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Add ripple effect to buttons and cards
    addRippleEffect();
  }

  // Set greeting based on time
  function setGreeting() {
    const h = new Date().getHours();
    let msg = 'Bem-vindo';
    if (h >= 5 && h < 12) msg = 'Bom dia';
    else if (h >= 12 && h < 18) msg = 'Boa tarde';
    else if (h >= 18 || h < 5) msg = 'Boa noite';
    document.getElementById('greeting-text').textContent = msg;
  }

  // Ripple effect for interactive elements
  function addRippleEffect() {
    const interactiveElements = document.querySelectorAll('.menu-card, .nav-btn, .btn-primary, .btn-secondary, .btn-icon');
    interactiveElements.forEach(el => {
      el.addEventListener('click', function(e) {
        try {
          if (typeof this.getBoundingClientRect !== 'function') return;
          if (!this.isConnected) return;
          const rect = this.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;

          const ripple = document.createElement('span');
          ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
            border-radius: 50%;
            transform: scale(0);
            animation: rippleAnim 0.6s ease-out forwards;
            pointer-events: none;
            z-index: 10;
          `;

          this.style.position = this.style.position || 'relative';
          this.appendChild(ripple);
          setTimeout(() => ripple.remove(), 700);
        } catch { /* ripple is cosmetic, fail silently */ }
      });
    });

    // Add the ripple animation
    if (!document.getElementById('ripple-style')) {
      const style = document.createElement('style');
      style.id = 'ripple-style';
      style.textContent = `
        @keyframes rippleAnim {
          to { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  setGreeting();
  bootSequence();
});

// =============== ANIMATED BACKGROUND: MESH GRADIENT + PARTICLES ===============
(function initBackgrounds() {
  // Main background canvas (persistent)
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) {
    const ctx = bgCanvas.getContext('2d');
    let w, h;
    const orbs = [];
    const NUM_ORBS = 5;

    function resize() {
      w = bgCanvas.width = window.innerWidth;
      h = bgCanvas.height = window.innerHeight;
    }

    class Orb {
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.radius = Math.random() * 300 + 150;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        const colors = [
          'rgba(255, 255, 255, 0.03)',
          'rgba(200, 200, 200, 0.02)',
          'rgba(150, 150, 150, 0.02)',
          'rgba(100, 100, 100, 0.015)',
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -this.radius) this.x = w + this.radius;
        if (this.x > w + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = h + this.radius;
        if (this.y > h + this.radius) this.y = -this.radius;
      }

      draw() {
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
      }
    }

    function animateBg() {
      ctx.clearRect(0, 0, w, h);
      for (const orb of orbs) {
        orb.update();
        orb.draw();
      }
      requestAnimationFrame(animateBg);
    }

    resize();
    for (let i = 0; i < NUM_ORBS; i++) orbs.push(new Orb());
    animateBg();
    window.addEventListener('resize', resize);
  }

  // Loading screen particle canvas
  const loadingCanvas = document.getElementById('loading-canvas');
  if (loadingCanvas) {
    const ctx = loadingCanvas.getContext('2d');
    let w, h;
    const particles = [];
    const MAX_PARTICLES = 100;

    function resize() {
      w = loadingCanvas.width = window.innerWidth;
      h = loadingCanvas.height = window.innerHeight;
    }

    class Particle {
      constructor() { this.reset(); }

      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 1.5 + 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
        // Tint particles with monochrome colors
        const tints = ['255, 255, 255', '200, 200, 200', '150, 150, 150'];
        this.tint = tints[Math.floor(Math.random() * tints.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;

        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h || this.life > this.maxLife) {
          this.reset();
        }

        this.currentOpacity = this.opacity * (Math.sin(this.life * 0.02) * 0.3 + 0.7);
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.tint}, ${this.currentOpacity})`;
        ctx.fill();
      }
    }

    function connectParticles() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const opacity = (1 - dist / 120) * 0.1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) { p.update(); p.draw(); }
      connectParticles();
      requestAnimationFrame(animate);
    }

    resize();
    for (let i = 0; i < MAX_PARTICLES; i++) particles.push(new Particle());
    animate();
    window.addEventListener('resize', resize);

    // Fade out loading canvas when screen hides
    const screen = document.getElementById('loading-screen');
    if (screen) {
      const observer = new MutationObserver(() => {
        if (screen.classList.contains('hidden')) {
          loadingCanvas.style.transition = 'opacity 0.6s ease';
          loadingCanvas.style.opacity = '0';
          setTimeout(() => { loadingCanvas.style.display = 'none'; observer.disconnect(); }, 600);
        }
      });
      observer.observe(screen, { attributeFilter: ['class'] });
    }
  }
})();
