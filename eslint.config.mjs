import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["eslint.config.mjs", "dist-electron/**"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
        Central: "readonly",
        apiFetch: "readonly",
        Toast: "readonly",
        Modal: "readonly",
        Data: "readonly",
        Settings: "readonly",
        Voice: "readonly",
        marked: "readonly",
        Clock: "readonly",
        News: "readonly",
        Notes: "readonly",
        Todo: "readonly",
        Calendar: "readonly",
        Links: "readonly",
        Habits: "readonly",
        TerminalModule: "readonly",
        Player: "readonly",
        AI: "readonly",
        Game: "readonly",
        Leitura: "readonly",
        Escrita: "readonly",
        Bot: "readonly",
        Pomodoro: "readonly",
        SpeechRecognition: "readonly",
        webkitSpeechRecognition: "readonly",
        google: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
];
