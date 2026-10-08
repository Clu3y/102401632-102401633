/**
 * server.js — 零依赖静态服务器（Node 内置模块）
 * 本服务器仅托管静态文件，数据全部保存在浏览器 localStorage，无需启动任何后端 / 数据库。
 * 用法：node server.js [端口]，默认 8090
 * 启动后浏览器访问 http://localhost:8090
 * （也可以直接用浏览器打开 index.html；个别浏览器对 file:// 有限制时推荐用本服务器）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2]) || 8090;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // 前端是 hash 路由，任何非静态资源路径都回退到 index.html
  let filePath = path.join(ROOT, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('校园失物招领已启动：');
  console.log('  本机访问：http://localhost:' + PORT);
  console.log('  数据保存在浏览器本地（localStorage），无需后端与数据库');
});
