import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const rawPort = process.env.PORT ?? '4178';
if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535.');
}
const PORT = Number(rawPort);
const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'],
  ['.hdr', 'image/vnd.radiance'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
  ['.wav', 'audio/wav'], ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
]);
const HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

function reply(req, res, status, body, extra = {}) {
  res.writeHead(status, {
    ...HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extra,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const realRoot = await realpath(ROOT);
// Launchers must recognize this checkout, not another app or an old game copy
// which happens to occupy the same loopback port. Do not expose the folder path.
const rootId = createHash('sha256').update(realRoot.replaceAll('\\', '/').toLowerCase()).digest('hex');
const HEALTH = JSON.stringify({ app: 'colossus-wake-local', version: 1, rootId });
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      reply(req, res, 405, 'Method not allowed.\n', { Allow: 'GET, HEAD' });
      return;
    }
    const allowedHosts = [`${HOST}:${PORT}`, `localhost:${PORT}`];
    if (PORT === 80) allowedHosts.push(HOST, 'localhost');
    if (!allowedHosts.includes((req.headers.host ?? '').toLowerCase())) {
      reply(req, res, 403, 'Local host required.\n');
      return;
    }
    let requestPath;
    try {
      requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    } catch {
      reply(req, res, 400, 'Invalid path encoding.\n');
      return;
    }
    // Reject encoded separators, traversal, dotfiles, Windows device/ADS paths,
    // and double-encoded paths before mapping anything onto the filesystem.
    if (!requestPath.startsWith('/') || /[\\\x00-\x1f\x7f:%]/.test(requestPath)
      || requestPath.split('/').some((part) => part.startsWith('.') || /[. ]$/.test(part))) {
      reply(req, res, 403, 'Path not allowed.\n');
      return;
    }
    if (requestPath === '/health') {
      reply(req, res, 200, HEALTH, { 'Content-Type': 'application/json; charset=utf-8' });
      return;
    }
    if (requestPath === '/') requestPath = '/index.html';
    if (requestPath !== '/index.html' && !/^\/(src|vendor|assets)\//.test(requestPath)) {
      reply(req, res, 404, 'Not found.\n');
      return;
    }
    const mime = TYPES.get(path.extname(requestPath).toLowerCase());
    if (!mime || requestPath.endsWith('/')) {
      reply(req, res, 404, 'Not found.\n');
      return;
    }
    const candidate = path.resolve(ROOT, `.${requestPath}`);
    const relative = path.relative(ROOT, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      reply(req, res, 403, 'Path not allowed.\n');
      return;
    }
    let actual;
    let info;
    try {
      actual = await realpath(candidate);
      const realRelative = path.relative(realRoot, actual);
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative)
        || realRelative.split(path.sep).some((part) => part.startsWith('.'))
        || (realRelative !== 'index.html' && !/^(src|vendor|assets)[\\/]/.test(realRelative))) {
        reply(req, res, 403, 'Path not allowed.\n');
        return;
      }
      info = await stat(actual);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code)) {
        reply(req, res, 404, 'Not found.\n');
        return;
      }
      throw error;
    }
    if (!info.isFile() || !TYPES.has(path.extname(actual).toLowerCase())) {
      reply(req, res, 404, 'Not found.\n');
      return;
    }
    res.writeHead(200, { ...HEADERS, 'Content-Type': mime, 'Content-Length': info.size });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = createReadStream(actual);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    console.error('Request failed:', error.code ?? error.name);
    if (!res.headersSent) reply(req, res, 500, 'Local server error.\n');
    else res.destroy();
  }
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use. Stop its owner or choose another PORT.`
    : `Local server failed: ${error.message}`);
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log(`Colossus Wake local server: http://${HOST}:${PORT}/`);
  console.log(`Process ${process.pid}; press Ctrl+C to stop when running in a terminal.`);
});
