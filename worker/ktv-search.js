// KTV 的搜尋轉送（Cloudflare Worker）：讓 GitHub Pages 上的 KTV 也能搜尋 YouTube。
// 瀏覽器不能直接呼叫 YouTube 的搜尋，這裡把網頁送來的內容原封不動交給 YouTube，結果也原封不動送回去，
// 跟 server.js 的 /api/yt/search 做一樣的事。部署方式見 README「在 GitHub Pages 上搜尋」。

// 只讓這些網站的網頁用（別的網站拿不到結果）；localhost 一律可以，方便在自己電腦上測。
// 換了網址（例如 fork 到別的帳號）記得改這裡。
const ALLOWED_ORIGINS = ['https://chyhhwen.github.io'];
const YT_SEARCH = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';

function allowed(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch { return false; }
}

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') || '';
    if (!allowed(origin)) return new Response('Forbidden', { status: 403 });
    // X-KTV-Relay 讓網頁知道這裡會轉送；跨網域時要列在 Expose-Headers，網頁才讀得到
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'X-KTV-Relay',
      'Vary': 'Origin',
      'X-KTV-Relay': '1',
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors, 'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400',
        },
      });
    }
    const h = { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    if (req.method === 'GET') return new Response('{"relay":true}', { headers: h });   // 網頁開啟時用來確認能不能搜尋
    if (req.method !== 'POST') return new Response('{}', { status: 405, headers: h });
    const body = await req.text();
    if (body.length > 64 * 1024) return new Response('{}', { status: 413, headers: h });
    try {
      const r = await fetch(YT_SEARCH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      return new Response(r.body, { status: r.status, headers: h });
    } catch (e) {
      return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 502, headers: h });
    }
  },
};
