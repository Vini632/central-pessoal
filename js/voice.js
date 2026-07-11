const Voice = {
  recognition: null,
  supported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,

  start(textarea, btn) {
    if (!this.supported) { alert('Reconhecimento de voz não suportado neste navegador.'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    btn.classList.add('recording');
    btn.textContent = '⋯';

    this.recognition.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      const start = textarea.selectionStart || textarea.value.length;
      const end = textarea.selectionEnd || textarea.value.length;
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    this.recognition.onerror = () => { this.stop(btn); };
    this.recognition.onend = () => { this.stop(btn); };
    this.recognition.start();
  },

  stop(btn) {
    try { this.recognition?.stop(); } catch {}
    this.recognition = null;
    if (btn) {
      btn.classList.remove('recording');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
    }
  }
};
