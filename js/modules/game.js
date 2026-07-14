const Game = {
  state: null,

  data: {
    ferreiro: {
      name: 'Ferreiro', emoji: '🔨',
      desc: 'Forje armas e ferramentas, contrate ferreiros, ganhe fama.',
      money: 30, reputation: 0, influence: 0,
      customers: ['Guerreiro', 'Fazendeiro', 'Cavaleiro', 'Aventureiro', 'Guarda', 'Mercador'],
      inventory: { ferro: 4, carvao: 8, madeira: 2 },
      materials: {
        ferro: { name: 'Ferro', price: 4 }, carvao: { name: 'Carvão', price: 2 },
        madeira: { name: 'Madeira', price: 1 }, gemas: { name: 'Gemas', price: 15 },
      },
      recipes: [
        { id: 'adaga', name: 'Adaga', cost: { ferro: 1 }, price: 18, xp: 3, minLevel: 1, energy: 2 },
        { id: 'ferramenta', name: 'Ferramenta', cost: { ferro: 1, madeira: 1 }, price: 14, xp: 3, minLevel: 1, energy: 1 },
        { id: 'espada', name: 'Espada', cost: { ferro: 2, carvao: 1 }, price: 28, xp: 5, minLevel: 1, energy: 2 },
        { id: 'escudo', name: 'Escudo', cost: { ferro: 3, madeira: 1 }, price: 38, xp: 6, minLevel: 2, energy: 2 },
        { id: 'machado', name: 'Machado de Batalha', cost: { ferro: 3, carvao: 2, madeira: 1 }, price: 52, xp: 8, minLevel: 3, energy: 3 },
        { id: 'armadura', name: 'Armadura', cost: { ferro: 5, carvao: 2 }, price: 65, xp: 10, minLevel: 3, energy: 3 },
        { id: 'anel', name: 'Anel de Gema', cost: { gemas: 1, ferro: 1 }, price: 48, xp: 7, minLevel: 2, energy: 2 },
        { id: 'coroa', name: 'Coroa Ornamental', cost: { gemas: 3, ferro: 2 }, price: 90, xp: 12, minLevel: 4, energy: 4 },
      ],
      employees: [
        { id: 'aprendiz', name: 'Aprendiz', cost: 15, bonus: 1 },
        { id: 'ferreiro', name: 'Ferreiro', cost: 40, bonus: 3 },
        { id: 'artesao', name: 'Artesão', cost: 80, bonus: 5 },
        { id: 'mestre', name: 'Mestre Ferreiro', cost: 180, bonus: 8 },
      ],
      upgrades: [
        { id: 'forja', name: 'Forja Reforçada', cost: 80, desc: '+2 produção', icon: '🔥' },
        { id: 'balcao', name: 'Balcão Amplo', cost: 60, desc: '+1 cliente/dia', icon: '🪟' },
        { id: 'vitrine', name: 'Vitrine Elegante', cost: 120, desc: '+20% preço', icon: '✨' },
        { id: 'fornalha', name: 'Fornalha Dupla', cost: 150, desc: '+3 produção', icon: '🔥' },
        { id: 'estoque', name: 'Estoque Amplo', cost: 90, desc: '+50% capacidade', icon: '📦' },
      ],
    },
    bar: {
      name: 'Bar', emoji: '🍺',
      desc: 'Administre uma taverna, sirva bebidas, vire a noite.',
      money: 50, reputation: 0, influence: 0,
      customers: ['Viajante', 'Minerador', 'Mercador', 'Artista', 'Nobre', 'Marinheiro'],
      inventory: { cerveja: 8, vinho: 4, destilado: 2, petisco: 6 },
      materials: {
        cerveja: { name: 'Cerveja', price: 2 }, vinho: { name: 'Vinho', price: 4 },
        destilado: { name: 'Destilado', price: 6 }, petisco: { name: 'Petisco', price: 3 },
        importado: { name: 'Importado', price: 10 },
      },
      recipes: [
        { id: 'chope', name: 'Chope', cost: { cerveja: 1 }, price: 7, xp: 2, minLevel: 1, energy: 1 },
        { id: 'petisco_simples', name: 'Petisco Simples', cost: { petisco: 1 }, price: 6, xp: 2, minLevel: 1, energy: 1 },
        { id: 'vinho_taca', name: 'Taça de Vinho', cost: { vinho: 1 }, price: 11, xp: 3, minLevel: 1, energy: 1 },
        { id: 'combo', name: 'Comdo Petisco', cost: { petisco: 1, cerveja: 1 }, price: 14, xp: 4, minLevel: 2, energy: 2 },
        { id: 'taverna', name: 'Taverna Especial', cost: { cerveja: 2, destilado: 1 }, price: 20, xp: 5, minLevel: 2, energy: 2 },
        { id: 'destilado_puro', name: 'Destilado Puro', cost: { destilado: 1 }, price: 15, xp: 4, minLevel: 2, energy: 1 },
        { id: 'importado_taca', name: 'Taça Importada', cost: { importado: 1 }, price: 30, xp: 8, minLevel: 3, energy: 2 },
        { id: 'feast', name: 'Festim da Casa', cost: { petisco: 2, cerveja: 2, destilado: 1, importado: 1 }, price: 60, xp: 14, minLevel: 4, energy: 4 },
      ],
      employees: [
        { id: 'garcom', name: 'Garçom', cost: 20, bonus: 1 },
        { id: 'cozinheiro', name: 'Cozinheiro', cost: 50, bonus: 3 },
        { id: 'bartender', name: 'Bartender', cost: 80, bonus: 4 },
        { id: 'gerente', name: 'Gerente', cost: 160, bonus: 7 },
      ],
      upgrades: [
        { id: 'balcao', name: 'Balcão de Carvalho', cost: 80, desc: '+2 clientes/dia', icon: '🪟' },
        { id: 'cozinha', name: 'Cozinha Nova', cost: 100, desc: '+50% petiscos', icon: '🍳' },
        { id: 'jardim', name: 'Jardim Cerveja', cost: 150, desc: '+30% fama', icon: '🌿' },
        { id: 'som', name: 'Sistema de Som', cost: 120, desc: '+1 satisfação', icon: '🎵' },
        { id: 'adega', name: 'Adega Temperada', cost: 200, desc: '+40% preço vinho', icon: '🍷' },
      ],
    },
    mercado: {
      name: 'Mercado', emoji: '🏪',
      desc: 'Compre e venda produtos, negocie, expanda.',
      money: 60, reputation: 0, influence: 0,
      customers: ['Fazendeiro', 'Artesão', 'Estudante', 'Comerciante', 'Nobre', 'Peregrino'],
      inventory: { trigo: 8, tecido: 3, ferramentas: 2, livros: 1 },
      materials: {
        trigo: { name: 'Trigo', price: 2 }, tecido: { name: 'Tecido', price: 5 },
        ferramentas: { name: 'Ferramentas', price: 8 }, livros: { name: 'Livros', price: 12 },
        especiarias: { name: 'Especiarias', price: 10 },
      },
      recipes: [
        { id: 'venda_trigo', name: 'Vender Trigo (saco)', cost: { trigo: 1 }, price: 5, xp: 1, minLevel: 1, energy: 1 },
        { id: 'venda_tecido', name: 'Vender Tecido (rolo)', cost: { tecido: 1 }, price: 11, xp: 2, minLevel: 1, energy: 1 },
        { id: 'venda_ferramenta', name: 'Vender Ferramenta', cost: { ferramentas: 1 }, price: 18, xp: 3, minLevel: 1, energy: 1 },
        { id: 'venda_livro', name: 'Vender Livro', cost: { livros: 1 }, price: 24, xp: 4, minLevel: 2, energy: 1 },
        { id: 'venda_especiaria', name: 'Vender Especiarias', cost: { especiarias: 1 }, price: 22, xp: 4, minLevel: 2, energy: 1 },
        { id: 'pacote_campones', name: 'Pacote Camponês', cost: { trigo: 2, tecido: 1 }, price: 20, xp: 4, minLevel: 2, energy: 2 },
        { id: 'pacote_artesao', name: 'Pacote Artesão', cost: { ferramentas: 1, tecido: 2 }, price: 32, xp: 6, minLevel: 3, energy: 2 },
        { id: 'pacote_nobre', name: 'Pacote Nobre', cost: { livros: 1, especiarias: 2, tecido: 1 }, price: 65, xp: 12, minLevel: 4, energy: 3 },
      ],
      employees: [
        { id: 'vendedor', name: 'Vendedor', cost: 15, bonus: 1 },
        { id: 'negociante', name: 'Negociante', cost: 45, bonus: 3 },
        { id: 'fiscal', name: 'Fiscal', cost: 90, bonus: 4 },
        { id: 'contador', name: 'Contador', cost: 150, bonus: 7 },
      ],
      upgrades: [
        { id: 'estoque', name: 'Estoque Amplo', cost: 70, desc: '+50% capacidade', icon: '📦' },
        { id: 'placa', name: 'Placa Chamativa', cost: 90, desc: '+2 clientes/dia', icon: '🪧' },
        { id: 'balconista', name: 'Balconista Extra', cost: 140, desc: 'venda automática', icon: '🤖' },
        { id: 'registro', name: 'Registro Premium', cost: 130, desc: '+20% preço', icon: '📋' },
        { id: 'vitrine_mercado', name: 'Vitrine de Ofertas', cost: 180, desc: '+30% rotatividade', icon: '🪟' },
      ],
    },
  },

  achievements: [
    { id: 'first_money', name: 'Primeiro Lucro', check: s => s.stats.earned >= 50, icon: '💰' },
    { id: 'rich', name: 'Acumulador', check: s => s.stats.earned >= 500, icon: '💵' },
    { id: 'millionaire', name: 'Magnata', check: s => s.stats.earned >= 2000, icon: '👑' },
    { id: 'famous', name: 'Famoso', check: s => s.reputation >= 50, icon: '⭐' },
    { id: 'very_famous', name: 'Lenda Local', check: s => s.reputation >= 150, icon: '🌟' },
    { id: 'hard_worker', name: 'Dedicado', check: s => s.stats.crafted >= 50, icon: '🔨' },
    { id: 'served', name: 'Atendente', check: s => s.stats.served >= 30, icon: '👥' },
    { id: 'week', name: 'Sobrevivente', check: s => s.daysPlayed >= 7, icon: '📅' },
    { id: 'two_weeks', name: 'Veterano', check: s => s.daysPlayed >= 14, icon: '🗓️' },
    { id: 'hired_all', name: 'Equipe Completa', check: s => s.hired && s.hired.length >= 3, icon: '👥' },
    { id: 'upgraded', name: 'Melhorias', check: s => s.upgrades && s.upgrades.length >= 3, icon: '⬆️' },
    { id: 'loan_free', name: 'Livre de Dívidas', check: s => !s.loan || s.loan.owed <= 0, icon: '🆓' },
  ],

  init() {
    this.load();
    this.render();
  },

  load() {
    try {
      const raw = localStorage.getItem('central_game');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.type && p.hour !== undefined) { this.state = p; this.ensureDefaults(); return; }
      }
    } catch (e) { console.warn("game: catch", e); }
    this.state = null;
  },

  ensureDefaults() {
    const cfg = this.data[this.state.type];
    if (!cfg) return;
    if (this.state.maxEnergy === undefined) this.state.maxEnergy = 10;
    if (this.state.energy === undefined) this.state.energy = this.state.maxEnergy;
    if (this.state.level === undefined) this.state.level = 1;
    if (this.state.xp === undefined) this.state.xp = 0;
    if (this.state.satisfaction === undefined) this.state.satisfaction = 50;
    if (this.state.marketing === undefined) this.state.marketing = 0;
    if (this.state.achievements === undefined) this.state.achievements = [];
    if (!this.state.loan) this.state.loan = { amount: 0, owed: 0 };
    if (this.state.daysPlayed === undefined) this.state.daysPlayed = 0;
  },

  save() { try { Data.save('central_game', this.state); } catch (e) { console.warn("game: catch", e); } },

  startNew(type) {
    const cfg = this.data[type];
    if (!cfg) return;
    this.state = {
      type, money: cfg.money, reputation: 0, influence: 0,
      level: 1, xp: 0, energy: 10, maxEnergy: 10,
      hour: 8, day: 1, satisfaction: 50, marketing: 0,
      inventory: { ...cfg.inventory }, hired: [], upgrades: [],
      loan: { amount: 0, owed: 0 },
      achievements: [],
      stats: { earned: 0, spent: 0, served: 0, crafted: 0, daysPlayed: 0, tips: 0 },
      log: ['Bem-vindo(a)! O expediente começa.'],
    };
    this.save(); this.render();
  },

  newGame() {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Escolha seu negócio';
    document.getElementById('modal-body').innerHTML = Object.entries(this.data).map(([k, v]) => `
      <button class="game-choice-btn" data-type="${k}">
        <span class="gcb-emoji">${v.emoji}</span>
        <span><span class="gcb-name">${v.name}</span><span class="gcb-desc">${v.desc}</span></span>
      </button>
    `).join('');
    document.getElementById('modal-confirm').textContent = '';
    document.getElementById('modal-cancel').textContent = '';
    overlay.classList.remove('hidden');
    overlay.querySelectorAll('.game-choice-btn').forEach(b => {
      b.addEventListener('click', () => { overlay.classList.add('hidden'); this.startNew(b.dataset.type); });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); }, { once: true });
  },

  addLog(t) {
    this.state.log.push(`[${String(this.state.hour).padStart(2,'0')}:00] ${t}`);
    if (this.state.log.length > 80) this.state.log.splice(0, this.state.log.length - 80);
  },

  formatMoney(v) { return '$' + v; },
  timeStr() { return String(this.state.hour).padStart(2, '0') + ':00'; },

  addXp(amount) {
    this.state.xp += amount;
    const needed = this.state.level * 20;
    if (this.state.xp >= needed) {
      this.state.xp -= needed;
      this.state.level++;
      this.state.maxEnergy += 2;
      this.state.energy = Math.min(this.state.energy + 5, this.state.maxEnergy);
      this.addLog(`🎉 Subiu para nível ${this.state.level}! Energia restaurada!`);
    }
  },

  getLevelMod() { return 1 + (this.state.level - 1) * 0.1; },

  getPrice(recipe) {
    const base = recipe.price;
    const satMod = 1 + (this.state.satisfaction - 50) / 200;
    const levelMod = this.getLevelMod();
    const vitrineMod = this.state.upgrades.includes('vitrine') || this.state.upgrades.includes('vitrine_mercado') ? 1.2 : 1;
    const registroMod = this.state.upgrades.includes('registro') ? 1.2 : 1;
    const repMod = 1 + Math.floor(this.state.reputation / 50) * 0.05;
    return Math.round(base * satMod * levelMod * vitrineMod * registroMod * repMod);
  },

  getCustomerCount() {
    let base = 3 + Math.floor(this.state.reputation / 10);
    if (this.state.upgrades.includes('balcao') || this.state.upgrades.includes('balcao')) base += 1;
    if (this.state.upgrades.includes('placa') || this.state.upgrades.includes('jardim')) base += 1;
    base += this.state.marketing;
    if (this.state.hour < 8 || this.state.hour > 21) base = Math.floor(base * 0.3);
    if (this.state.hour >= 11 && this.state.hour <= 13) base = Math.floor(base * 1.3);
    return Math.max(0, base);
  },

  checkAchievements() {
    const s = this.state;
    for (const a of this.achievements) {
      if (!s.achievements.includes(a.id) && a.check(s)) {
        s.achievements.push(a.id);
        this.addLog(`🏆 Conquista: ${a.icon} ${a.name}!`);
      }
    }
  },

  async doAction(action) {
    const s = this.state;
    const cfg = this.data[s.type];
    if (!cfg || !s) return;

    switch (action) {
      case 'buy': {
        const overlay = document.getElementById('modal-overlay');
        document.getElementById('modal-title').textContent = 'Comprar Materiais';
        document.getElementById('modal-body').innerHTML = Object.entries(cfg.materials).map(([key, mat]) => `
          <div class="game-buy-row">
            <span>${mat.name}</span>
            <span class="game-buy-price">$${mat.price}</span>
            <div class="game-buy-controls">
              <button class="game-buy-minus" data-mat="${key}">-</button>
              <span class="game-buy-qty" id="buy-qty-${key}">0</span>
              <button class="game-buy-plus" data-mat="${key}" data-price="${mat.price}">+</button>
            </div>
          </div>
        `).join('');
        document.getElementById('modal-cancel').textContent = 'CANCELAR';
        document.getElementById('modal-confirm').textContent = 'COMPRAR';
        overlay.classList.remove('hidden');

        const qtys = {};
        overlay.querySelectorAll('.game-buy-plus').forEach(btn => {
          btn.addEventListener('click', () => {
            const key = btn.dataset.mat;
            qtys[key] = (qtys[key] || 0) + 1;
            document.getElementById('buy-qty-' + key).textContent = qtys[key];
          });
        });
        overlay.querySelectorAll('.game-buy-minus').forEach(btn => {
          btn.addEventListener('click', () => {
            const key = btn.dataset.mat;
            if ((qtys[key] || 0) > 0) qtys[key]--;
            document.getElementById('buy-qty-' + key).textContent = qtys[key] || 0;
          });
        });

        const buyHandler = () => {
          let total = 0;
          for (const [key, qty] of Object.entries(qtys)) {
            if (qty > 0) total += qty * cfg.materials[key].price;
          }
          if (total > s.money) { Toast.warn('Dinheiro insuficiente!'); return; }
          if (total === 0) { overlay.classList.add('hidden'); return; }
          s.money -= total; s.stats.spent += total;
          for (const [key, qty] of Object.entries(qtys)) {
            if (qty > 0) { s.inventory[key] = (s.inventory[key] || 0) + qty; }
          }
          this.addLog(`Comprou materiais ($${total})`);
          overlay.classList.add('hidden');
          document.getElementById('modal-confirm').onclick = null;
          this.save(); this.render();
        };
        document.getElementById('modal-confirm').onclick = buyHandler;
        document.getElementById('modal-cancel').onclick = () => { overlay.classList.add('hidden'); document.getElementById('modal-confirm').onclick = null; };
        document.getElementById('modal-close').onclick = () => { overlay.classList.add('hidden'); document.getElementById('modal-confirm').onclick = null; };
        return;
      }
      case 'work': {
        if (s.energy < 2) { this.addLog('⚠️ Sem energia! Descanse (Avançar para 08:00).'); return; }
        const bonus = s.hired.reduce((sum, eid) => { const e = cfg.employees.find(ee => ee.id === eid); return sum + (e ? e.bonus : 0); }, 0);
        const forgeBonus = s.upgrades.includes('forja') ? 2 : s.upgrades.includes('fornalha') ? 3 : 0;
        const mats = Object.keys(cfg.materials);
        const count = Math.ceil(1 + Math.random() * 2 + bonus * 0.3 + forgeBonus * 0.3);
        const logParts = [];
        for (let i = 0; i < count; i++) {
          const key = mats[Math.floor(Math.random() * mats.length)];
          const qty = Math.ceil(Math.random() * 2);
          s.inventory[key] = (s.inventory[key] || 0) + qty;
          logParts.push(`${cfg.materials[key].name}+${qty}`);
        }
        s.energy -= 2;
        s.stats.crafted += count;
        this.addLog(`Produziu: ${logParts.join(', ')}`);
        this.addXp(2);
        s.hour++;
        this.checkEndOfDay();
        break;
      }
      case 'serve': {
        if (s.hour < 6 || s.hour > 22) { this.addLog('Estabelecimento fechado.'); return; }
        if (s.energy < 1) { this.addLog('⚠️ Sem energia!'); return; }
        const custCount = this.getCustomerCount();
        if (custCount <= 0) { this.addLog('Nenhum cliente hoje.'); s.hour++; this.checkEndOfDay(); return; }
        const customers = cfg.customers || ['Cliente'];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const available = cfg.recipes.filter(r => r.minLevel <= s.level);
        const recipe = available[Math.floor(Math.random() * available.length)];
        const can = Object.entries(recipe.cost).every(([m, q]) => (s.inventory[m] || 0) >= q);
        if (!can) { this.addLog(`${customer} pediu ${recipe.name}, mas faltam materiais.`); s.hour++; this.checkEndOfDay(); return; }
        for (const [m, q] of Object.entries(recipe.cost)) s.inventory[m] -= q;
        const price = this.getPrice(recipe);
        const tip = Math.random() > 0.6 ? Math.round(price * 0.1) : 0;
        s.money += price + tip;
        s.stats.earned += price + tip;
        s.stats.served++;
        if (tip > 0) s.stats.tips += tip;
        const satBonus = s.upgrades.includes('som') ? 1 : 0;
        const repGain = recipe.xp + satBonus + Math.floor(Math.random() * 3);
        s.reputation += repGain;
        s.satisfaction = Math.min(100, s.satisfaction + 1);
        this.addLog(`${customer} pediu ${recipe.name} → $${price}${tip ? ' (+$'+tip+' gorjeta)' : ''} ⭐+${repGain}`);
        this.addXp(recipe.xp);
        s.energy -= 1;
        s.hour++;
        this.checkEndOfDay();
        break;
      }
      case 'rest': {
        const restored = s.maxEnergy - s.energy;
        if (restored === 0) { this.addLog('Energia já está cheia.'); return; }
        s.energy = s.maxEnergy;
        this.addLog(`Descansou. Energia restaurada (${restored}).`);
        s.hour += 2;
        this.checkEndOfDay();
        break;
      }
      case 'market': {
        const overlay = document.getElementById('modal-overlay');
        document.getElementById('modal-title').textContent = 'Marketing';
        document.getElementById('modal-body').innerHTML = `
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">Gaste dinheiro para atrair mais clientes.</p>
          <div class="game-buy-row"><span>Panfletos</span><span style="color:var(--text-tertiary)">$10 → +1 cliente (3 dias)</span><button id="mkt-panfletos" class="game-craft-btn">$${10}</button></div>
          <div class="game-buy-row"><span>Anúncio Local</span><span style="color:var(--text-tertiary)">$30 → +3 clientes (5 dias)</span><button id="mkt-anuncio" class="game-craft-btn">$${30}</button></div>
          <div class="game-buy-row"><span>Campanha</span><span style="color:var(--text-tertiary)">$80 → +8 clientes (7 dias)</span><button id="mkt-campanha" class="game-craft-btn">$${80}</button></div>
        `;
        document.getElementById('modal-cancel').textContent = 'FECHAR';
        document.getElementById('modal-confirm').textContent = '';
        overlay.classList.remove('hidden');
        const close = () => { overlay.classList.add('hidden'); document.getElementById('modal-confirm').onclick = null; };
        document.getElementById('modal-cancel').onclick = close;
        document.getElementById('modal-close').onclick = close;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });

        const buyMkt = (cost, bonus, days) => {
          if (s.money < cost) { Toast.warn('Dinheiro insuficiente!'); return; }
          s.money -= cost; s.stats.spent += cost;
          s.marketing += bonus * days;
          this.addLog(`Campanha de marketing ativada! (+${bonus} clientes por ${days} dias)`);
          close(); this.save(); this.render();
        };
        document.getElementById('mkt-panfletos').addEventListener('click', () => buyMkt(10, 1, 3));
        document.getElementById('mkt-anuncio').addEventListener('click', () => buyMkt(30, 3, 5));
        document.getElementById('mkt-campanha').addEventListener('click', () => buyMkt(80, 8, 7));
        return;
      }
      case 'loan': {
        const overlay = document.getElementById('modal-overlay');
        document.getElementById('modal-title').textContent = 'Empréstimo';
        document.getElementById('modal-body').innerHTML = `
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">${s.loan.owed > 0 ? `Dívida atual: $${s.loan.owed} (original: $${s.loan.amount})` : 'Sem dívidas ativas.'}</p>
          <div class="game-buy-row"><span>Pequeno ($50 + juros 20%)</span><button id="loan-small" class="game-craft-btn">Pegar</button></div>
          <div class="game-buy-row"><span>Médio ($120 + juros 25%)</span><button id="loan-med" class="game-craft-btn">Pegar</button></div>
          ${s.loan.owed > 0 ? `<div class="game-buy-row"><span>Pagar dívida ($${s.loan.owed})</span><button id="loan-pay" class="game-craft-btn">Pagar</button></div>` : ''}
        `;
        document.getElementById('modal-cancel').textContent = 'FECHAR';
        document.getElementById('modal-confirm').textContent = '';
        overlay.classList.remove('hidden');
        const close = () => { overlay.classList.add('hidden'); document.getElementById('modal-confirm').onclick = null; };
        document.getElementById('modal-cancel').onclick = close;
        document.getElementById('modal-close').onclick = close;

        const takeLoan = (amount, interest) => {
          if (s.loan.owed > 0) { Toast.warn('Já tem um empréstimo ativo!'); return; }
          s.money += amount;
          s.loan.amount = amount;
          s.loan.owed = Math.round(amount * (1 + interest));
          this.addLog(`Pegou empréstimo de $${amount} (pagar: $${s.loan.owed})`);
          close(); this.save(); this.render();
        };
        document.getElementById('loan-small').addEventListener('click', () => takeLoan(50, 0.2));
        document.getElementById('loan-med').addEventListener('click', () => takeLoan(120, 0.25));
        const payBtn = document.getElementById('loan-pay');
        if (payBtn) payBtn.addEventListener('click', () => {
          if (s.money < s.loan.owed) { Toast.warn('Dinheiro insuficiente!'); return; }
          s.money -= s.loan.owed;
          this.addLog(`Dívida de $${s.loan.owed} paga!`);
          s.loan.amount = 0; s.loan.owed = 0;
          s.reputation += 5;
          close(); this.save(); this.render();
        });
        return;
      }
      case 'advance': {
        s.hour++;
        if (s.marketing > 0) s.marketing--;
        this.checkEndOfDay();
        break;
      }
      case 'advance_day': {
        const hours = (24 - s.hour) + 8;
        for (let i = 0; i < hours; i++) {
          s.hour++;
          if (s.marketing > 0) s.marketing--;
          this.checkEndOfDay();
        }
        return;
      }
      case 'quit': {
        if (!await Modal.confirm('Tem certeza? O progresso será perdido.')) return;
        localStorage.removeItem('central_game');
        Data.remove('central_game');
        this.state = null;
        this.save();
        this.render();
        return;
      }
    }
    this.save();
    this.checkAchievements();
    this.render();
  },

  checkEndOfDay() {
    const s = this.state;
    if (s.hour >= 24) {
      s.hour = 0;
      s.day++;
      s.stats.daysPlayed++;
      s.energy = Math.min(s.energy + 4, s.maxEnergy);
      // Loan interest
      if (s.loan.owed > 0) {
        s.loan.owed = Math.round(s.loan.owed * 1.05);
        if (s.loan.owed > s.loan.amount * 3) {
          this.addLog('⚠️ Dívida muito alta! A reputação caiu.');
          s.reputation = Math.max(0, s.reputation - 5);
        }
      }
      // Daily reputation bonus
      const bonus = Math.floor(s.reputation / 8);
      if (bonus > 0) {
        s.money += bonus;
        this.addLog(`Fim do dia ${s.day-1}. Bônus de reputação: $${bonus}`);
      }
      // Random events
      if (Math.random() > 0.5) this.randomEvent();
      this.save();
    }
  },

  randomEvent() {
    const s = this.state;
    const cfg = this.data[s.type];
    const events = [
      { text: 'Cliente pagou a mais! +$8', fn: () => { s.money += 8; s.reputation += 1; } },
      { text: 'Furtaram mercadorias... -$12', fn: () => { s.money = Math.max(0, s.money - 12); s.reputation = Math.max(0, s.reputation - 2); } },
      { text: 'Carregamento extra chegou!', fn: () => { Object.keys(s.inventory).forEach(k => s.inventory[k] = (s.inventory[k] || 0) + 3); } },
      { text: '⭐ Fama cresceu na região! +5', fn: () => { s.reputation += 5; } },
      { text: 'Cliente reclamou no guia. -2 ⭐', fn: () => { s.reputation = Math.max(0, s.reputation - 2); s.satisfaction = Math.max(0, s.satisfaction - 3); } },
      { text: 'Um andarilho ofereceu informação. +📈', fn: () => { s.influence += 2; } },
      { text: 'Dia de festival! +50% movimento', fn: () => { s.money += Math.floor(Math.random() * 20) + 5; this.addLog('(movimento extra rendeu grana!)'); } },
      { text: 'Equipamento quebrou. -$15 reparo', fn: () => { s.money = Math.max(0, s.money - 15); } },
      { text: '⭐ Cliente influente elogiou! +3', fn: () => { s.reputation += 3; s.influence += 1; } },
      { text: '💰 Achou uma bolsa com dinheiro! +$20', fn: () => { s.money += 20; } },
    ];
    const evt = events[Math.floor(Math.random() * events.length)];
    evt.fn();
    this.addLog(evt.text);
    this.checkAchievements();
  },

  craft(recipeId) {
    const cfg = this.data[this.state.type];
    const recipe = cfg.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    if (this.state.level < recipe.minLevel) { this.addLog(`Nível ${recipe.minLevel} necessário para ${recipe.name}.`); this.render(); return; }
    if (this.state.energy < (recipe.energy || 1)) { this.addLog('⚠️ Sem energia!'); this.render(); return; }
    const can = Object.entries(recipe.cost).every(([m, q]) => (this.state.inventory[m] || 0) >= q);
    if (!can) { this.addLog('Materiais insuficientes!'); this.render(); return; }
    for (const [m, q] of Object.entries(recipe.cost)) this.state.inventory[m] -= q;
    const price = this.getPrice(recipe);
    this.state.money += price;
    this.state.stats.earned += price;
    this.state.stats.crafted++;
    this.state.reputation += recipe.xp;
    this.state.energy -= recipe.energy || 1;
    this.addLog(`Fabricou ${recipe.name}! +$${price} ⭐+${recipe.xp}`);
    this.addXp(recipe.xp);
    this.save();
    this.checkAchievements();
    this.render();
  },

  hire(employeeId) {
    const cfg = this.data[this.state.type];
    const emp = cfg.employees.find(e => e.id === employeeId);
    if (!emp || this.state.hired.includes(emp.id)) return;
    if (this.state.money < emp.cost) { this.addLog(`Dinheiro insuficiente para contratar ${emp.name}`); this.render(); return; }
    this.state.money -= emp.cost;
    this.state.hired.push(emp.id);
    this.state.stats.spent += emp.cost;
    this.addLog(`Contratou ${emp.name} por $${emp.cost}`);
    this.save();
    this.render();
  },

  buyUpgrade(upgradeId) {
    const cfg = this.data[this.state.type];
    const upg = cfg.upgrades.find(u => u.id === upgradeId);
    if (!upg || this.state.upgrades.includes(upg.id)) return;
    if (this.state.money < upg.cost) { this.addLog(`Dinheiro insuficiente para ${upg.name}`); this.render(); return; }
    this.state.money -= upg.cost;
    this.state.upgrades.push(upg.id);
    this.state.stats.spent += upg.cost;
    this.addLog(`Comprou: ${upg.icon || '⬆'} ${upg.name}`);
    this.save();
    this.checkAchievements();
    this.render();
  },

  // Render
  render() {
    const section = document.getElementById('mod-game');
    if (!this.state) {
      section.innerHTML = `
        <div class="module-header"><h2><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Jogo</h2>
          <button id="game-new-btn" class="btn-primary" style="padding:8px 14px;font-size:11px">NOVO JOGO</button>
        </div>
        <div class="game-empty"><div class="game-empty-icon">🎮</div><p>Nenhum jogo salvo</p><button id="game-start-btn" class="btn-primary" style="margin-top:16px">NOVO JOGO</button></div>`;
      section.querySelector('#game-new-btn')?.addEventListener('click', () => this.newGame());
      section.querySelector('#game-start-btn')?.addEventListener('click', () => this.newGame());
      return;
    }

    const s = this.state;
    const cfg = this.data[s.type];
    if (!cfg) { section.innerHTML = '<div class="module-header"><h2>Jogo</h2></div><div class="game-empty"><p>Erro: dados do jogo corrompidos.</p><button id="game-reset-btn" class="btn-primary" style="margin-top:16px">REINICIAR</button></div>'; section.querySelector('#game-reset-btn')?.addEventListener('click', () => { Data.remove('central_game'); this.state = null; this.render(); }); return; }
    const nextLevel = s.level * 20;

    section.innerHTML = `
      <div class="module-header">
        <h2>${cfg.emoji} ${cfg.name} <span class="game-level">Lv.${s.level}</span></h2>
        <div class="game-header-stats">
          <span class="game-stat" title="Dinheiro">💰${s.money}</span>
          <span class="game-stat" title="Fama">⭐${s.reputation}</span>
          <span class="game-stat" title="Influencia">📈${s.influence}</span>
          <span class="game-stat" title="Energia">⚡${s.energy}/${s.maxEnergy}</span>
          <span class="game-stat" title="Satisfacao">😊${s.satisfaction}%</span>
          <span class="game-stat" title="Hora">${this.timeStr()}</span>
          <span class="game-stat" title="Dia">📅 Dia ${s.day}</span>
        </div>
        <div class="game-xp-bar"><div class="game-xp-fill" style="width:${Math.min(100, s.xp / nextLevel * 100)}%"></div></div>
      </div>
      <div class="game-body">
        <div class="game-left">
          <div class="game-log">
            <div class="game-log-title">Registro</div>
            <div class="game-log-entries">${s.log.slice(-8).map(l => `<div class="game-log-entry">${l}</div>`).join('')}</div>
          </div>
          <div class="game-tabs">
            <button class="game-tab active" data-tab="actions">Ações</button>
            <button class="game-tab" data-tab="inventory">Estoque</button>
            <button class="game-tab" data-tab="employees">Equipe</button>
            <button class="game-tab" data-tab="upgrades">Melhorias</button>
            <button class="game-tab" data-tab="stats">Status</button>
          </div>
          <div class="game-panels">
            <div class="game-panel active" id="game-panel-actions">
              <div class="game-panel-title">O que fazer?</div>
              <button class="game-action-btn" data-action="work">${cfg.emoji} Trabalhar (produzir materiais)</button>
              <div class="game-panel-subtitle">Comprar / Vender</div>
              <button class="game-action-btn" data-action="buy">🛒 Comprar materiais</button>
              ${s.hour >= 6 && s.hour <= 22 ? '<button class="game-action-btn" data-action="serve">👥 Atender clientes</button>' : '<div class="game-action-disabled">👥 Fechado (06h-22h)</div>'}
              <div class="game-panel-subtitle">Gerenciamento</div>
              <button class="game-action-btn" data-action="rest">😴 Descansar (+${s.maxEnergy - s.energy} energia)</button>
              <button class="game-action-btn" data-action="market">📢 Marketing (${s.marketing > 0 ? s.marketing + ' restantes' : 'inativo'})</button>
              <button class="game-action-btn" data-action="loan">🏦 Empréstimo${s.loan.owed > 0 ? ' (dívida: $' + s.loan.owed + ')' : ''}</button>
              <div class="game-panel-subtitle">Tempo</div>
              <button class="game-action-btn" data-action="advance">⏭ Avançar 1 hora</button>
              <button class="game-action-btn" data-action="advance_day">🌙 Avançar até amanhã (08:00)</button>
              <div class="game-panel-subtitle" style="border-top-color:var(--border-accent);margin-top:16px;color:var(--text-muted)">Jogo</div>
              <button class="game-action-btn" data-action="quit" style="color:var(--text-muted);font-size:11px">🚪 Sair do jogo (voltar ao menu)</button>
            </div>
            <div class="game-panel" id="game-panel-inventory">
              <div class="game-panel-title">Materiais</div>
              ${Object.entries(cfg.materials).map(([k, m]) => `<div class="game-inv-row"><span>${m.name}</span><span class="game-inv-qty">${s.inventory[k] || 0}</span><span class="game-inv-price">$${m.price}</span></div>`).join('')}
              <div class="game-panel-title" style="margin-top:12px">Receitas</div>
              ${cfg.recipes.filter(r => r.minLevel <= s.level).map(r => {
                const canMake = Object.entries(r.cost).every(([m, q]) => (s.inventory[m] || 0) >= q);
                return `<div class="game-recipe-row ${canMake ? '' : 'disabled'}">
                  <span>${r.name} ${s.level < r.minLevel ? '<span style="color:var(--text-muted);font-size:10px">(Lv.'+r.minLevel+')</span>' : ''}</span>
                  <span class="game-recipe-cost">${Object.entries(r.cost).map(([m, q]) => `${cfg.materials[m].name}x${q}`).join(' ')}</span>
                  <span class="game-recipe-price">~$${this.getPrice(r)}</span>
                  ${canMake ? `<button class="game-craft-btn" data-recipe="${r.id}">Fazer</button>` : ''}
                </div>`;
              }).join('')}
              ${cfg.recipes.some(r => r.minLevel > s.level) ? `<div class="game-empty-small">Receitas de níveis mais altos serão desbloqueadas ao subir de nível.</div>` : ''}
            </div>
            <div class="game-panel" id="game-panel-employees">
              <div class="game-panel-title">Contratar</div>
              ${cfg.employees.map(e => {
                const has = s.hired.includes(e.id);
                return `<div class="game-emp-row ${has ? 'hired' : ''}"><span>${e.name}</span><span class="game-emp-bonus">+${e.bonus} produção</span>
                  ${has ? '<span class="game-emp-status">Contratado</span>' : `<button class="game-hire-btn" data-employee="${e.id}">Contratar $${e.cost}</button>`}
                </div>`;
              }).join('')}
            </div>
            <div class="game-panel" id="game-panel-upgrades">
              <div class="game-panel-title">Melhorias</div>
              ${cfg.upgrades.map(u => {
                const has = s.upgrades.includes(u.id);
                return `<div class="game-upg-row ${has ? 'owned' : ''}"><span>${u.icon||'⬆'} ${u.name}</span><span class="game-upg-desc">${u.desc}</span>
                  ${has ? '<span class="game-upg-owned">✔</span>' : `<button class="game-buy-upg-btn" data-upgrade="${u.id}">$${u.cost}</button>`}
                </div>`;
              }).join('')}
            </div>
            <div class="game-panel" id="game-panel-stats">
              <div class="game-panel-title">Estatísticas</div>
              <div class="game-inv-row"><span>💰 Total ganho</span><span class="game-inv-qty">$${s.stats.earned}</span></div>
              <div class="game-inv-row"><span>💸 Total gasto</span><span class="game-inv-qty">$${s.stats.spent}</span></div>
              <div class="game-inv-row"><span>👥 Clientes atendidos</span><span class="game-inv-qty">${s.stats.served}</span></div>
              <div class="game-inv-row"><span>🔨 Itens fabricados</span><span class="game-inv-qty">${s.stats.crafted}</span></div>
              <div class="game-inv-row"><span>💰 Gorjetas recebidas</span><span class="game-inv-qty">$${s.stats.tips||0}</span></div>
              <div class="game-inv-row"><span>📅 Dias jogados</span><span class="game-inv-qty">${s.stats.daysPlayed}</span></div>
              <div class="game-panel-title" style="margin-top:12px">🏆 Conquistas (${s.achievements.length}/${this.achievements.length})</div>
              ${s.achievements.length === 0 ? '<div class="game-empty-small">Nenhuma conquista ainda</div>' :
                this.achievements.filter(a => s.achievements.includes(a.id)).map(a =>
                  `<div class="game-inv-row"><span>${a.icon} ${a.name}</span><span class="game-emp-status">✔</span></div>`
                ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    section.querySelectorAll('.game-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        section.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
        section.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById('game-panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
    section.querySelectorAll('.game-action-btn').forEach(b => b.addEventListener('click', () => this.doAction(b.dataset.action)));
    section.querySelectorAll('.game-craft-btn').forEach(b => b.addEventListener('click', () => this.craft(b.dataset.recipe)));
    section.querySelectorAll('.game-hire-btn').forEach(b => b.addEventListener('click', () => this.hire(b.dataset.employee)));
    section.querySelectorAll('.game-buy-upg-btn').forEach(b => b.addEventListener('click', () => this.buyUpgrade(b.dataset.upgrade)));
  },
};
