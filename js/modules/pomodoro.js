// eslint-disable-next-line no-unused-vars
const Pomodoro = {
  modes: {
    focus: { label: "Foco", duration: 25 },
    short: { label: "Pausa Curta", duration: 5 },
    long: { label: "Pausa Longa", duration: 15 },
  },
  mode: "focus",
  timeLeft: 25 * 60,
  running: false,
  timer: null,
  sessions: 0,

  init() {
    this.load();
    this.render();
    document.getElementById("pomo-focus").addEventListener("click", () => this.setMode("focus"));
    document.getElementById("pomo-short").addEventListener("click", () => this.setMode("short"));
    document.getElementById("pomo-long").addEventListener("click", () => this.setMode("long"));
    document.getElementById("pomo-toggle").addEventListener("click", () => this.toggle());
    document.getElementById("pomo-reset").addEventListener("click", () => this.reset());
  },

  load() {
    try {
      this.sessions = parseInt(localStorage.getItem("central_pomo_sessions")) || 0;
    } catch {
      this.sessions = 0;
    }
  },

  save() {
    try {
      Data.save("central_pomo_sessions", this.sessions);
    } catch (e) {
      console.warn("pomodoro: catch", e);
    }
  },

  setMode(mode) {
    if (this.running) return;
    this.mode = mode;
    this.timeLeft = this.modes[mode].duration * 60;
    this.render();
  },

  toggle() {
    if (this.running) {
      this.pause();
    } else {
      this.start();
    }
  },

  start() {
    if (this.running) return;
    this.running = true;
    document.getElementById("pomo-toggle").textContent = "PAUSAR";
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.complete();
        return;
      }
      this.updateDisplay();
    }, 1000);
  },

  pause() {
    this.running = false;
    clearInterval(this.timer);
    document.getElementById("pomo-toggle").textContent = "CONTINUAR";
  },

  reset() {
    this.running = false;
    clearInterval(this.timer);
    this.timeLeft = this.modes[this.mode].duration * 60;
    document.getElementById("pomo-toggle").textContent = "INICIAR";
    this.render();
  },

  complete() {
    this.running = false;
    clearInterval(this.timer);

    if (this.mode === "focus") {
      this.sessions++;
      this.save();
      // Auto-next to short break after 4 sessions, long break on 4th
      const next = this.sessions % 4 === 0 ? "long" : "short";
      this.mode = next;
      this.timeLeft = this.modes[next].duration * 60;
    } else {
      this.mode = "focus";
      this.timeLeft = this.modes.focus.duration * 60;
    }

    this.beep();
    this.render();

    if (Notification.permission === "granted") {
      new Notification("Pomodoro", {
        body: this.mode === "focus" ? "Hora de focar!" : "Pausa concluída!",
      });
    }
  },

  beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        osc2.connect(gain);
        osc2.frequency.value = 1000;
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.3);
      }, 250);
    } catch (e) {
      console.warn("pomodoro: catch", e);
    }
  },

  updateDisplay() {
    const m = String(Math.floor(this.timeLeft / 60)).padStart(2, "0");
    const s = String(this.timeLeft % 60).padStart(2, "0");
    document.getElementById("pomo-time").textContent = `${m}:${s}`;
    document.title = `(${m}:${s}) Central Pessoal`;
  },

  render() {
    this.updateDisplay();
    document.getElementById("pomo-sessions").textContent = `${this.sessions} sessões`;
    const statEl = document.getElementById("stat-pomo");
    if (statEl) statEl.textContent = this.sessions;

    document.querySelectorAll(".pomo-mode-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById(`pomo-${this.mode}`)?.classList.add("active");
  },
};

// Request notification permission on load
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
