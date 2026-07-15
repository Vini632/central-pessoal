const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

function handleInstructions(req, res, url) {
  if (url !== '/api/ai/instructions') return false;
  const instPath = path.join(__dirname, '..', '..', 'IA_INSTRUCOES.md');
  fs.readFile(instPath, 'utf8', (err, data) => {
    res.writeHead(err ? 404 : 200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ content: err ? '' : data }));
  });
  return true;
}

function handleSearch(req, res, url) {
  if (url !== '/api/search' || req.method !== 'POST') return false;
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { q } = JSON.parse(body);
      if (!q) throw new Error('Query required');
      const ddgReq = https.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const result = JSON.parse(data);
            let text = '';
            if (result.AbstractText) text += result.AbstractText + '\n';
            if (result.Results) {
              for (const r of result.Results.slice(0, 5)) {
                if (r.Text) text += r.Text + '\n';
              }
            }
            if (!text) {
              text = result.Abstract || result.Definition || '';
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ content: text.slice(0, 4000), source: 'DuckDuckGo' }));
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: '', source: 'DuckDuckGo' }));
          }
        });
      });
      ddgReq.setTimeout(10000, () => { ddgReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
      ddgReq.on('error', (e) => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  return true;
}

function handleMetadata(req, res, url) {
  if (url !== '/api/metadata' || req.method !== 'POST') return false;
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { url: targetUrl } = JSON.parse(body);
      if (!targetUrl) throw new Error('URL required');
      const metaReq = http.get(targetUrl, (targetRes) => {
        let data = '';
        targetRes.on('data', (chunk) => { data += chunk; });
        targetRes.on('end', () => {
          const title = data.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
          const desc = data.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || '';
          const icon = data.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)?.[1] || '';
          const fullIcon = icon ? (icon.startsWith('http') ? icon : new URL(icon, targetUrl).href) : '';
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ title, description: desc, icon: fullIcon }));
        });
      });
      metaReq.setTimeout(10000, () => { metaReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
      metaReq.on('error', (e) => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  return true;
}

function handleFetch(req, res, url) {
  if (url !== '/api/fetch' || req.method !== 'POST') return false;
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { url: targetUrl } = JSON.parse(body);
      if (!targetUrl) throw new Error('URL required');
      const fetchReq = http.get(targetUrl, (targetRes) => {
        let data = '';
        targetRes.on('data', (chunk) => { data += chunk; });
        targetRes.on('end', () => {
          const text = data
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ content: text, title: data.match(/<title>([^<]*)<\/title>/i)?.[1] || '' }));
        });
      });
      fetchReq.setTimeout(10000, () => { fetchReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
      fetchReq.on('error', (e) => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  return true;
}

function handle(req, res, url) {
  if (handleInstructions(req, res, url)) return true;
  if (handleSearch(req, res, url)) return true;
  if (handleMetadata(req, res, url)) return true;
  if (handleFetch(req, res, url)) return true;
  return false;
}

module.exports = { handle };
