import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.json':'application/json', '.txt':'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 4173);
http.createServer((req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const resolved = path.resolve(root, '.' + pathname);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    let file = resolved;
    if (pathname === '/') file = path.join(root, 'index.html');
    // Development-only viewport harness; omitted from deployment build output.
    if (pathname === '/__qa.html') file = path.resolve('../../work/qa.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404);res.end('Não encontrado');return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400);res.end('Requisição inválida'); }
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
