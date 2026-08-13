const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || '0.0.0.0';
const DIST = path.join(__dirname, 'dist');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-cache'});
  res.end(body);
}

function serveFile(file, res) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(url.parse(req.url).pathname || '/');
  let requested = path.normalize(path.join(DIST, pathname));

  // Prevent path traversal.
  if (!requested.startsWith(DIST)) return send(res, 403, 'Forbidden');

  if (pathname === '/health' || pathname === '/healthz') {
    return send(res, 200, 'ok');
  }

  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return serveFile(requested, res);
  }

  // SPA fallback: product/deep links and client-side routes all receive index.html.
  const index = path.join(DIST, 'index.html');
  if (fs.existsSync(index)) return serveFile(index, res);

  return send(res, 503,
    'Your site is not built yet. Run "npm run build" first.',
    'text/plain; charset=utf-8'
  );
});

server.listen(PORT, HOST, () => {
  const publicHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log('');
  console.log('==============================================');
  console.log('  YOUR SITE IS LIVE');
  console.log(`  http://${publicHost}:${PORT}`);
  console.log('==============================================');
  console.log('');
});
