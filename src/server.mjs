import {apiReference} from './workbench/api-reference.mjs';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {listenLoopback} from 'axiom-platform/loopback';
import {check} from './document.mjs';

export async function startEditor({adapter, embeddingOrigin}) {
  const token = randomBytes(32).toString('base64url'); let origin;
  const headers = {
    'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors " + (embeddingOrigin ?? "'none'"),
    'Cross-Origin-Opener-Policy':'same-origin', 'Cross-Origin-Embedder-Policy':'require-corp',
    'Cross-Origin-Resource-Policy':embeddingOrigin ? 'cross-origin' : 'same-origin',
    'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-store'
  };
  const respond = (res, status, value) => { res.writeHead(status, {...headers, 'Content-Type':'application/json'}); res.end(JSON.stringify(value)); };
  const routes = {'/v1/document':'document.inspect', '/v1/edit':'document.edit', '/v1/buffer':'document.buffer', '/v1/save':'project.save',
    '/v1/ui/visibility':'ui.visibility.get','/v1/ui/visibility/save':'ui.visibility.save', '/v1/ui/layout':'ui.layout.get','/v1/ui/layout/save':'ui.layout.save', '/v1/lab':'lab.inspect','/v1/lab/run':'lab.run','/v1/lab/cancel':'lab.cancel','/v1/lab/apply':'lab.apply','/v1/lab/fixture':'lab.fixture'};
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
        if(req.method==='GET'&&url.pathname==='/v1/api/reference')return respond(res,200,apiReference(url.searchParams.get('id')));
        if(url.pathname.startsWith('/v1/assistant/')||url.pathname.startsWith('/v1/github/')){
          const [service,action]=url.pathname.slice(4).split('/');
          const reads=service==='assistant'?['status','models','history']:['status'];
          const writes=service==='assistant'?['configure','turn','test']:['action'];
          check(adapter.doc&&!adapter.doc.closed&&(req.method==='GET'&&reads.includes(action)||req.method==='POST'&&writes.includes(action)),'permissionDenied','Unknown service action.');
          let input={};
          if(req.method==='POST'){
            let size=0;const chunks=[];
            for await(const chunk of req){size+=chunk.length;check(size<=32768,'InvalidInput','Request exceeds 32 KiB.');chunks.push(chunk);}
            input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
            check(input&&typeof input==='object'&&!Array.isArray(input),'InvalidInput','Expected request fields.');
          }
          const peer=adapter[service];
          const result=service==='github'&&action==='action'?await peer.execute(input):await peer[action](input);
          return respond(res,200,result);
        }
        const close = url.pathname === '/v1/close';
        check(!close || !embeddingOrigin, 'permissionDenied', 'Close this hosted session from Axiom Platform.');
        const method = routes[url.pathname] ?? (close ? 'project.close' : null);
        const reads=['document.inspect','lab.inspect','native.inspect','cad.catalog','cad.context','cad.status','proof.catalog','proof.status','proof.result','ui.layout.get','ui.visibility.get'];
        check(method && (req.method === 'GET' && reads.includes(method) || req.method === 'POST' && !reads.includes(method)), 'unsupportedCapability', 'Unknown endpoint or HTTP method.');
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; check(bytes <= (url.pathname.startsWith('/v1/native/')?131072:32768), 'invalidRequest', 'Request exceeds its bounded body limit.'); chunks.push(chunk); }
        let params = {};if(method==='cad.status'&&url.searchParams.has('jobId'))params.jobId=url.searchParams.get('jobId');
        if (req.method === 'POST') { try { params = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { check(false, 'invalidRequest', 'Invalid JSON request.'); } }
        check(params && typeof params === 'object' && !Array.isArray(params), 'invalidRequest', 'Parameters must be an object.');
        const result = await adapter.enqueue(async () => {
          adapter.httpClosing = close;
          try { return await adapter.execute(method, params); } finally { adapter.httpClosing = false; }
        });
        if (result.closed) res.once('finish', () => { void adapter.shutdown(); });
        return respond(res, 200, (method.startsWith('cad.')||method.startsWith('proof.')||method.startsWith('ui.'))?result:{...result, hosted:!!embeddingOrigin});
      }
      const solverAssets={'/solver-core.mjs':'sketch/solver-core.mjs','/sketch-entities.mjs':'sketch/entities.mjs','/relation-kinds.mjs':'sketch/relation-kinds.mjs','/solver-profile.mjs':'lab/profile.mjs','/errors.mjs':'errors.mjs'};
      const vendorFiles=['index.js','sketch/sketch_primitive.js','sketch/sketch_index.js','sketch/geom_params.js','sketch/gcs_wrapper.js','sketch/emsc_vectors.js','planegcs_dist/planegcs.wasm','planegcs_dist/planegcs.js','planegcs_dist/id.js','planegcs_dist/enums.js','planegcs_dist/constraint_param_index.js','planegcs_dist/constraints.js'];
      const vendor=vendorFiles.find(name=>url.pathname==='/solver-vendor/'+name),shared=solverAssets[url.pathname];
      if(req.method==='GET'&&(vendor||shared)){res.writeHead(200,{...headers,'Content-Type':vendor?.endsWith('.wasm')?'application/wasm':'text/javascript; charset=utf-8'});return res.end(await readFile(new URL(vendor?'../node_modules/@salusoft89/planegcs/dist/'+vendor:'./'+shared,import.meta.url)));}
      const assets = {'/':['index.html','text/html'], '/app.mjs':['app.mjs','text/javascript'], '/styles.css':['styles.css','text/css'], '/lab.mjs':['lab.mjs','text/javascript'], '/assembly.mjs':['assembly.mjs','text/javascript'], '/native.mjs':['native.mjs','text/javascript'], '/review.mjs':['review.mjs','text/javascript'], '/proof.mjs':['proof.mjs','text/javascript'], '/gpu-view.mjs':['gpu-view.mjs','text/javascript'], '/cad-camera.mjs':['cad-camera.mjs','text/javascript'], '/integration.mjs':['integration.mjs','text/javascript'], '/workbench.mjs':['workbench.mjs','text/javascript'], '/workbench.css':['workbench.css','text/css']};
      for(const name of ['sketch-snap.mjs','convert-entities.mjs','selection-menu.mjs','sketch-picking.mjs','model-candidates.mjs','operation-preview.mjs','sketch-external.mjs','preview-requests.mjs','search-select.mjs','sketch-targets.mjs','parameter-manager.mjs','sketch-dimensions.mjs','sketch-manager.mjs','sketch-solver-worker.mjs','sketch-solver-client.mjs','cad-commands.mjs','feature-actions.mjs','gpu-highlights.mjs','sketch-workbench.mjs','presentation.mjs','interaction-workbench.mjs','panel-channel.mjs','editor-document.mjs','icons.mjs','dock-layout.mjs','dock-workbench.mjs','api-panel.mjs','services-ui.mjs','services-markup.mjs','chat-format.mjs','assistant-task-info.mjs','assistant-history-format.mjs'])assets['/'+name]=[name,'text/javascript'];assets['/dock.css']=['dock.css','text/css'];for(const name of ['close','save','reload','scene','settings','folder','folder-open','lock','unlock','chevron-down','chevron-up','download','plus','open-tabs','github','ai-off','ai-on','attachment'])assets['/icons/'+name+'.svg']=['icons/'+name+'.svg','image/svg+xml'];assets['/interaction.css']=['interaction.css','text/css'];assets['/sketch.css']=['sketch.css','text/css'];assets['/parameters.css']=['parameters.css','text/css'];assets['/product.json']=['../platform/product.json','application/json'];assets['/favicon.svg']=['favicon.svg','image/svg+xml'];assets['/e2-m4-drawing.svg']=['e2-m4-drawing.svg','image/svg+xml'];assets['/soft-drag.mjs']=['../src/sketch/soft-drag.mjs','text/javascript'];assets['/model-owner.mjs']=['model-owner.mjs','text/javascript'];assets['/reference-anchors.mjs']=['../src/sketch/reference-anchors.mjs','text/javascript'];assets['/external-geometry.mjs']=['../src/sketch/external-geometry.mjs','text/javascript'];assets['/sketch-references.mjs']=['../src/sketch/references.mjs','text/javascript'];assets['/dimension-intent.mjs']=['../src/sketch/dimension-intent.mjs','text/javascript'];assets['/ribbon-sizes.mjs']=['ribbon-sizes.mjs','text/javascript'];assets['/services.css']=['services.css','text/css'];const asset = assets[url.pathname];
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
