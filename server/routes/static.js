const fs = require('fs');
const path = require('path');
const { API_TOKEN } = require('../middleware');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function handle(req, res, url) {
  if (url.startsWith('/api/')) return false;

  let rawPath = url === '/' ? 'index.html' : url.split('?')[0];
  let filePath = path.join(__dirname, '..', '..', rawPath);
  if (!filePath.startsWith(path.resolve(__dirname, '..', '..') + path.sep) && filePath !== path.resolve(__dirname, '..', '..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403');
    return true;
  }
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    if (ext === '.html') {
      data = data.toString().replace('__API_TOKEN__', API_TOKEN);
    }
    const cacheControl = ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache, no-store, must-revalidate' : 'max-age=0, must-revalidate';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl });
    res.end(data);
  });

  return true;
}

module.exports = { handle };
