// Minimal static file server for local testing
// Serves the repository root on http://localhost:5173 by default
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5173);
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(ROOT, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      // fallback: serve root index.html for unknown paths
      const fallback = path.join(ROOT, 'index.html');
      if (fs.existsSync(fallback)) {
        const html = fs.readFileSync(fallback);
        return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
      }
      return send(res, 404, 'Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const body = fs.readFileSync(filePath);
    return send(res, 200, body, { 'Content-Type': type });
  } catch (e) {
    return send(res, 500, 'Server error');
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Static server ready on http://localhost:${PORT}`);
});
