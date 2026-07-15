const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const { API_TOKEN } = require('../middleware');

function setup(server) {
  const wss = new WebSocketServer({
    server,
    path: '/terminal',
    verifyClient: (info, cb) => {
      if (!API_TOKEN) { cb(true); return; }
      const params = new URL(info.req.url, 'http://localhost').searchParams;
      const token = params.get('token');
      cb(token === API_TOKEN);
    },
  });

  wss.on('connection', (ws) => {
    const shell = spawn('cmd.exe', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    shell.stdout.on('data', (data) => {
      if (ws.readyState === ws.OPEN) ws.send(data.toString());
    });

    shell.stderr.on('data', (data) => {
      if (ws.readyState === ws.OPEN) ws.send(data.toString());
    });

    shell.on('close', (code) => ws.close());

    ws.on('message', (data) => {
      const msg = data.toString();
      if (msg === '__resize__') return;
      shell.stdin.write(msg);
    });

    ws.on('close', () => shell.kill());
    ws.on('error', () => shell.kill());
  });
}

module.exports = { setup };
