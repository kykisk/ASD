const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../apps/mobile/dist');
const port = 8081;

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

const server = http.createServer((req, res) => {
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
