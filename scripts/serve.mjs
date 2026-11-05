import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve, extname,sep} from 'node:path';
const dir=resolve('dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const port=Number(process.env.PORT)||4173;
createServer(async(req,res)=>{try{const path=decodeURIComponent((req.url||'/').split('?')[0]);const file=resolve(dir,'.'+(path==='/'?'/index.html':path));if(file!==dir&&!file.startsWith(dir+sep)){res.writeHead(403).end();return;}const info=await stat(file);if(!info.isFile())throw 0;res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(await readFile(file));}catch{res.writeHead(404).end('No encontrado')}}).listen(port,'127.0.0.1',()=>console.log(`Mi Finanzas disponible en http://localhost:${port}`));
