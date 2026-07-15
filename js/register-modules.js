(function () {
  var ns = (window.Central = window.Central || {});
  var modules = {
    Toast: typeof Toast !== "undefined" ? Toast : null,
    Modal: typeof Modal !== "undefined" ? Modal : null,
    Data: typeof Data !== "undefined" ? Data : null,
    Voice: typeof Voice !== "undefined" ? Voice : null,
    Settings: typeof Settings !== "undefined" ? Settings : null,
    Clock: typeof Clock !== "undefined" ? Clock : null,
    News: typeof News !== "undefined" ? News : null,
    Notes: typeof Notes !== "undefined" ? Notes : null,
    Todo: typeof Todo !== "undefined" ? Todo : null,
    Calendar: typeof Calendar !== "undefined" ? Calendar : null,
    Pomodoro: typeof Pomodoro !== "undefined" ? Pomodoro : null,
    Links: typeof Links !== "undefined" ? Links : null,
    Habits: typeof Habits !== "undefined" ? Habits : null,
    TerminalModule: typeof TerminalModule !== "undefined" ? TerminalModule : null,
    Player: typeof Player !== "undefined" ? Player : null,
    AI: typeof AI !== "undefined" ? AI : null,
    Game: typeof Game !== "undefined" ? Game : null,
    Leitura: typeof Leitura !== "undefined" ? Leitura : null,
    Escrita: typeof Escrita !== "undefined" ? Escrita : null,
    Bot: typeof Bot !== "undefined" ? Bot : null,
  };
  for (var key in modules) {
    if (modules[key] !== null) ns[key] = modules[key];
  }
})();
