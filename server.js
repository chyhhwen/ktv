// KTV 的本機伺服器：放出這個資料夾裡的網頁，並幫網頁轉送 YouTube 搜尋。
// 瀏覽器不能直接呼叫 YouTube 的搜尋（會被擋），伴唱版要靠這裡轉送才能自動找。
// 用法：node server.js（start.cmd 會幫你執行），再打開 http://localhost:8766/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8766;
const ROOT = __dirname;
const YT_SEARCH = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

if (typeof fetch !== 'function') {
  console.error(`Node.js 版本太舊（${process.version}），請更新到 18 以上。`);
  process.exit(1);
}

function send(res, status, body = '', headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

// 網頁送來的搜尋內容原封不動交給 YouTube，結果也原封不動送回去（解析在 index.html 裡做）。
// X-KTV-Relay 讓網頁知道這個伺服器會轉送；用別的伺服器開的話就沒有這個標頭。
async function relaySearch(req, res) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'X-KTV-Relay': '1' };
  if (req.method === 'GET') return send(res, 200, '{"relay":true}', h);   // 網頁開啟時用來確認能不能搜尋
  if (req.method !== 'POST') return send(res, 405, '{}', h);
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 64 * 1024) return send(res, 413, '{}', h);
    chunks.push(c);
  }
  try {
    const r = await fetch(YT_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(15000),
    });
    send(res, r.status, Buffer.from(await r.arrayBuffer()), h);
  } catch (e) {
    send(res, 502, JSON.stringify({ error: String((e && e.message) || e) }), h);
  }
}

function serveFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405);
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return send(res, 400); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  // 只放出這個資料夾裡的檔案，隱藏檔（.git 之類）不放
  const parts = path.relative(ROOT, file).split(path.sep);
  if (!file.startsWith(ROOT + path.sep) || parts.some((p) => p.startsWith('.'))) {
    return send(res, 404, 'Not found');
  }
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    send(res, 200, req.method === 'HEAD' ? '' : data, { 'Content-Type': type });
  });
}

const server = http.createServer((req, res) => {
  // 只接受用 localhost 打開的網頁，別的網站借道這台電腦送來的請求一律擋掉
  const host = String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, 'Forbidden');
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400); }
  if (url.pathname === '/api/yt/search') {
    relaySearch(req, res).catch(() => { try { send(res, 500); } catch { /* 連線已經斷了 */ } });
    return;
  }
  serveFile(req, res, url.pathname);
});

server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE'
    ? `埠號 ${PORT} 已經被占用，可能 KTV 已經開著了，直接打開 http://localhost:${PORT}/ 試試。`
    : e.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`KTV 開在 http://localhost:${PORT}/ ，唱完關掉這個視窗就好。`);
});
