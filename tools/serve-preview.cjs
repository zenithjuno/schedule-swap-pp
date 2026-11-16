#!/usr/bin/env node
/* Local static server:  node tools/serve-preview.cjs  →  http://127.0.0.1:8765/  (old app: /legacy/) */
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'), PORT=+process.env.PORT||8765;
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.png':'image/png'};
http.createServer((q,s)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT,path.normalize(p)); if(!f.startsWith(ROOT)){ s.writeHead(403); return s.end(); }
  fs.readFile(f,(e,b)=>{ if(e){ s.writeHead(404); return s.end('not found'); }
    s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}); s.end(b); });
}).listen(PORT,'127.0.0.1',()=>console.log('app: http://127.0.0.1:'+PORT+'/  ·  legacy: /legacy/'));
