import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {listenLoopback} from 'axiom-platform/loopback';
import {check} from './document.mjs';

export async function startEditor({adapter, embeddingOrigin}) {
  const token = randomBytes(32).toString('base64url'); let origin;
  const headers = {
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors " + (embeddingOrigin ?? "'none'"),
    'Cross-Origin-Opener-Policy':'same-origin', 'Cross-Origin-Embedder-Policy':'require-corp',
    'Cross-Origin-Resource-Policy':embeddingOrigin ? 'cross-origin' : 'same-origin',
    'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-store'
  };
  const respond = (res, status, value) => { res.writeHead(status, {...headers, 'Content-Type':'application/json'}); res.end(JSON.stringify(value)); };
  const routes = {'/v1/document':'document.inspect', '/v1/edit':'document.edit', '/v1/buffer':'document.buffer', '/v1/save':'project.save',
    '/v1/lab':'lab.inspect','/v1/lab/run':'lab.run','/v1/lab/cancel':'lab.cancel','/v1/lab/apply':'lab.apply','/v1/lab/fixture':'lab.fixture'};
  for(const name of ['inspect','convert','graph','snapshot','publish','restore','refresh','attach','adopt','recover','removeVersion'])routes['/v1/native/'+name]='native.'+name;
  for(const name of ['catalog','context','status','invoke','grant','revoke','cancel'])routes['/v1/cad/'+name]='cad.'+name;
  for(const name of ['catalog','status','result','build','cancel','pick','export','preflight'])routes['/v1/proof/'+name]='proof.'+name;
  const server = createServer(async (req, res) => {
    try {
      check(req.headers.host === new URL(origin).host, 'permissionDenied', 'Invalid local host.');
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/v1/')) {
        check(req.headers.origin === origin || !req.headers.origin && req.headers['sec-fetch-site'] === 'same-origin', 'permissionDenied', 'Invalid request origin.');
        if(url.pathname.startsWith('/v1/cad/agent/')){
          const actor=adapter.doc?.commands.agent((req.headers.authorization??'').replace(/^Bearer /,'')),name=url.pathname.slice('/v1/cad/agent/'.length);check(actor&&['catalog','context','status','invoke','cancel'].includes(name),'permissionDenied','Unknown automation operation.');
          check(req.method===(['catalog','context','status'].includes(name)?'GET':'POST'),'unsupportedCapability','Wrong automation method.');let size=0,body=[];for await(const chunk of req){size+=chunk.length;check(size<=32768,'invalidRequest','Automation request exceeds 32 KiB.');body.push(chunk);}const params=body.length?JSON.parse(Buffer.concat(body).toString()):{};
          const value=await adapter.enqueue(()=>{adapter.doc.commands.agent((req.headers.authorization??'').replace(/^Bearer /,''));if(name==='catalog')return adapter.doc.commands.catalog();if(name==='context')return adapter.doc.commands.context(actor);if(name==='status')return adapter.doc.commands.status(actor);if(name==='cancel'){check(adapter.doc.commands.job?.owner===actor.id,'permissionDenied','Only owned jobs can be cancelled.');return adapter.doc.commands.cancelJob();}return adapter.doc.commands.invoke(params,actor);});return respond(res,200,value);
        }
        check(req.headers.authorization === 'Bearer ' + token, 'permissionDenied', 'Authenticate this editor session.');
        const close = url.pathname === '/v1/close';
        check(!close || !embeddingOrigin, 'permissionDenied', 'Close this hosted session from Axiom Platform.');
        const method = routes[url.pathname] ?? (close ? 'project.close' : null);
        const reads=['document.inspect','lab.inspect','native.inspect','cad.catalog','cad.context','cad.status','proof.catalog','proof.status','proof.result'];
        check(method && (req.method === 'GET' && reads.includes(method) || req.method === 'POST' && !reads.includes(method)), 'unsupportedCapability', 'Unknown endpoint or HTTP method.');
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; check(bytes <= (url.pathname.startsWith('/v1/native/')?131072:32768), 'invalidRequest', 'Request exceeds its bounded body limit.'); chunks.push(chunk); }
        let params = {};
        if (req.method === 'POST') { try { params = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { check(false, 'invalidRequest', 'Invalid JSON request.'); } }
        check(params && typeof params === 'object' && !Array.isArray(params), 'invalidRequest', 'Parameters must be an object.');
        const result = await adapter.enqueue(async () => {
          adapter.httpClosing = close;
          try { return await adapter.execute(method, params); } finally { adapter.httpClosing = false; }
        });
        if (result.closed) res.once('finish', () => { void adapter.shutdown(); });
        return respond(res, 200, (method.startsWith('cad.')||method.startsWith('proof.'))?result:{...result, hosted:!!embeddingOrigin});
      }
      const assets = {'/':['index.html','text/html'], '/app.mjs':['app.mjs','text/javascript'], '/styles.css':['styles.css','text/css'], '/lab.mjs':['lab.mjs','text/javascript'], '/assembly.mjs':['assembly.mjs','text/javascript'], '/native.mjs':['native.mjs','text/javascript'], '/review.mjs':['review.mjs','text/javascript'], '/proof.mjs':['proof.mjs','text/javascript'], '/gpu-view.mjs':['gpu-view.mjs','text/javascript'], '/cad-camera.mjs':['cad-camera.mjs','text/javascript'], '/integration.mjs':['integration.mjs','text/javascript']};
      const asset = assets[url.pathname];
      if (req.method !== 'GET' || !asset) return respond(res, 404, {code:'unsupportedCapability', message:'Not found.'});
      res.writeHead(200, {...headers, 'Content-Type':asset[1] + '; charset=utf-8'});
      res.end(await readFile(new URL('../app/' + asset[0], import.meta.url)));
    } catch (error) {
      respond(res, ['permissionDenied','PermissionDenied'].includes(error.code) ? 403 : 409, {code:error.code ?? 'operationFailed',
        message:['ENOENT','EACCES','EPERM'].includes(error.code) ? 'The document is missing or unavailable. Saved data was preserved.' : error.code ? error.message : 'The operation failed. Inspect the saved document before retrying.'});
    }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await listenLoopback(server); origin = 'http://127.0.0.1:' + server.address().port;
  return {origin, token, url:origin + '/#token=' + token, close:() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })};
}
