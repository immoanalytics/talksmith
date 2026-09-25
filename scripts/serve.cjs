// Tiny static file server. Two uses:
//   node scripts/serve.cjs         serve the repo root (Playwright tests;
//                                  file:// has no host and breaks baseURL)
//   node scripts/serve.cjs dist    serve the production build (npm start /
//                                  Railway, after npm run build)
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ROOT = path.resolve(REPO, process.argv[2] || '.');
const PORT = parseInt(process.env.PORT, 10) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.md':   'text/markdown; charset=utf-8',
};

// Build outputs carry a content hash (app.1a2b3c4d5e.js), so they never change
// under the same name and can be cached for good. Everything else (HTML) must
// revalidate so a deploy shows up on the next load.
const HASHED = /\.[0-9a-f]{10}\.(min\.)?js$/;

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); }
  catch { res.writeHead(400); res.end(); return; }
  const file = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': HASHED.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`talksmith static server: http://localhost:${PORT} (root: ${path.relative(REPO, ROOT) || '.'})`);
});
