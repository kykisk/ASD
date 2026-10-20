const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../apps/mobile/dist');
const port = 8081;
// /v1 요청은 API 로 프록시 → 앱이 상대 경로(/v1)로 호출하므로 SSH 터널·Tailscale 어느 주소로 접속해도 동작
const apiPort = Number(process.env.API_PORT || 3100);

const mime = {
  html: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  json: 'application/json',
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
};

function proxyToApi(req, res) {
  const upstream = http.request(
    { host: '127.0.0.1', port: apiPort, path: req.url, method: req.method, headers: req.headers, timeout: 120000 },
    (apiRes) => {
      res.writeHead(apiRes.statusCode || 502, apiRes.headers);
      apiRes.pipe(res);
    },
  );
  upstream.on('timeout', () => upstream.destroy(new Error('upstream timeout')));
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('API 서버에 연결할 수 없습니다');
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  if (req.url === '/v1' || req.url.startsWith('/v1/')) {
    proxyToApi(req, res);
    return;
  }
  let filePath = path.join(dir, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(dir, 'index.html');
  }
  const ext = path.extname(filePath).slice(1);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Mobile web server ready: http://0.0.0.0:${port}`);
});
