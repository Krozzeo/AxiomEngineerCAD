import {mkdtemp, mkdir, rm, realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {EngineerAdapter} from '../platform/adapter.mjs';
export async function fixture(t, options) {
  // Windows CI TEMP may use an 8.3 alias. Match Platform's canonical authorized paths.
  const base = await realpath(await mkdtemp(join(tmpdir(), 'engineer-e0-'))), root = join(base, 'projects');
  await mkdir(root); const folder = join(root, 'part'); await mkdir(folder);
  const adapter = new EngineerAdapter(options), sessionId = randomUUID();
  const call = (method, params = {}) => { const id = randomUUID(); return adapter.request({protocolVersion:1, requestId:id, correlationId:id, sessionId,
    productId:'axiom.engineer-cad', actor:{kind:'human', id:'acceptance'}, method, params:{operationId:randomUUID(), ...params}}); };
  t.after(async () => { await adapter.shutdown(); await rm(base, {recursive:true, force:true}); });
  await call('initialize', {authorizedRoot:root, platformVersion:'0.1.12'});
  return {base, root, folder, adapter, call};
}
export async function http(editorUrl, path, data, overrides = {}) {
  const url = new URL(editorUrl), token = new URLSearchParams(url.hash.slice(1)).get('token');
  const response = await fetch(url.origin + '/v1/' + path, {method:data ? 'POST' : 'GET',
    headers:{Origin:url.origin, Authorization:'Bearer ' + token, 'Content-Type':'application/json', ...overrides},
    body:data ? JSON.stringify({operationId:randomUUID(), ...data}) : undefined});
  return {status:response.status, value:await response.json()};
}
