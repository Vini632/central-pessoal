const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

let server = null;
let win = null;
let ready = false;

function startServer() {
  server = spawn(process.env.NODE || "node", [path.join(__dirname, "server.js")], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  server.stdout.on("data", (d) => console.log("[server]", d.toString().trim()));
  server.stderr.on("data", (d) => console.error("[server]", d.toString().trim()));
  server.on("error", (e) => console.error("[server] error:", e.message));
}

function pollServer(callback) {
  const req = http.get("http://localhost:3456/", (_res) => {
    callback(true);
  });
  req.on("error", () => callback(false));
  req.setTimeout(2000, () => {
    req.destroy();
    callback(false);
  });
}

function createLoadingHTML(progress) {
  const dots = ".".repeat(progress % 4);
  return `<!DOCTYPE html><html><head>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#0ff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1.5em;padding:2em}
.pulse{width:48px;height:48px;border:3px solid #0ff3;border-top-color:#0ff;border-radius:50%;animation:s 1s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.msg{font-size:1.1em;color:#0ff;text-align:center;min-height:1.5em}
.err{color:#f44;font-size:.9em;max-width:400px;text-align:center;display:none;margin-top:1em}
</style></head><body>
<div class="pulse"></div>
<div class="msg">Iniciando servidor${dots}</div>
<div class="err" id="err"></div>
<script>
let c=0;setInterval(()=>{document.querySelector('.msg').textContent='Iniciando servidor'+'.'.repeat(++c%4)},600);
setTimeout(()=>{document.getElementById('err').textContent='Servidor nao iniciou. Verifique se Node.js esta instalado.';document.getElementById('err').style.display='block'},30000)
</script>
</body></html>`;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Central Pessoal",
    icon: path.join(__dirname, "favicon.svg"),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    show: false,
  });

  let progress = 0;
  const loadingInterval = setInterval(() => {
    if (win && !ready) {
      win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(createLoadingHTML(progress++)));
    }
  }, 2000);

  const check = () => {
    pollServer((ok) => {
      if (ok && !ready) {
        ready = true;
        clearInterval(loadingInterval);
        win.loadURL("http://localhost:3456/");
      }
    });
  };

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(createLoadingHTML(0)));
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    win = null;
  });

  setInterval(check, 1000);

  const template = [
    {
      label: "Central Pessoal",
      submenu: [{ role: "reload", label: "Recarregar" }, { type: "separator" }, { role: "quit", label: "Sair" }],
    },
    {
      label: "Exibir",
      submenu: [
        { role: "togglefullscreen", label: "Tela Cheia" },
        { role: "toggleDevTools", label: "Ferramentas do Desenvolvedor" },
        { type: "separator" },
        { role: "zoomIn", label: "Aumentar Zoom" },
        { role: "zoomOut", label: "Diminuir Zoom" },
        { role: "resetZoom", label: "Resetar Zoom" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  startServer();
});
app.on("window-all-closed", () => {
  if (server) server.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  if (server) server.kill();
});
