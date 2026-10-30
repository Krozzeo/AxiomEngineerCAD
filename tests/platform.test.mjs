import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
// Integration harness only: the installed, integrity-pinned provider runs its actual host.
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';
import {validateManifest} from '../node_modules/axiom-platform/packages/contracts/index.mjs';
import {ProductClient} from '../node_modules/axiom-platform/packages/sdk/client.mjs';
import manifest from '../platform/product.json' with {type:'json'};
import {http} from './helpers.mjs';

test('descriptor and SDK source are pinned and compatible; invalid descriptors rejected', async () => {
  assert.equal(validateManifest(manifest).productId, 'axiom.engineer-cad');
  assert.throws(() => validateManifest({...manifest, protocolVersion:2}), {code:'incompatibleVersion'});
  assert.throws(() => validateManifest({...manifest, capabilities:['project.open']}), {code:'unsupportedCapability'});
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url)));
  const sdk = lock.packages['node_modules/axiom-platform']; assert.equal(sdk.version, '0.1.12');
  assert.match(sdk.resolved, /6d240845cd77eb1879738d32c9f2b8fcfd7297c5$/); assert.match(sdk.integrity, /^sha512-/);
});

test('real Platform host create/edit/stale-save/cancel/save/close/reopen and origin denial', async t => {
  const base = await mkdtemp(join(tmpdir(), 'engineer-host-')), root = join(base, 'projects'); await mkdir(root);
  const host = await startHost({root, stateRoot:join(base, 'profile'), manifests:[resolve('platform/product.json')], checkReleases:false});
  t.after(async () => { await host.close(); await rm(base, {recursive:true, force:true}); }); await host.startup;
  const request = async data => {
    const res = await fetch(host.origin + '/v1/sessions', {method:'POST', headers:{Origin:host.origin, Authorization:'Bearer ' + host.token, 'Content-Type':'application/json'}, body:JSON.stringify({operationId:randomUUID(), ...data})});
    const value = await res.json(); if (!res.ok) throw Object.assign(Error(value.message), {code:value.code}); return value;
  };
  const created = await request({action:'create', productId:manifest.productId, name:'Hosted document'});
  assert.equal(created.state, 'ready'); const path = join(root, created.path), bytes = await readFile(path);
  const edit = await http(created.editorUrl, 'edit', {expectedRevision:0, metadata:{name:'Hosted edit', notes:'Real IPC adapter'}});
  assert.equal(edit.status, 200);
  const status = await request({action:'status', sessionId:created.sessionId}); assert.equal(status.status.dirty, true);
  await assert.rejects(request({action:'save', sessionId:created.sessionId, expectedRevision:0}), {code:'revisionConflict'});
  assert.deepEqual(await readFile(path), bytes);
  assert.equal((await http(created.editorUrl, 'close', {expectedRevision:1, decision:'discard'})).status, 403);
  const cancel = await request({action:'close', sessionId:created.sessionId, expectedRevision:1, decision:'cancel'}); assert.equal(cancel.cancelled, true);
  await request({action:'save', sessionId:created.sessionId, expectedRevision:1});
  await request({action:'close', sessionId:created.sessionId, expectedRevision:1, decision:'save'});
  const reopened = await request({action:'open', productId:manifest.productId, path:created.path});
  assert.equal(reopened.status.projectId, created.status.projectId); assert.equal(reopened.status.name, 'Hosted edit');
  await request({action:'close', sessionId:reopened.sessionId, expectedRevision:1, decision:'discard'});
});

test('actual product process rejects incompatible host; failed process never signals ready', async t => {
  const root = await mkdtemp(join(tmpdir(), 'engineer-process-'));
  const client = new ProductClient(resolve('platform/adapter.mjs'), {productId:manifest.productId, timeoutMs:2000});
  t.after(async () => { await client.stop(); await rm(root, {recursive:true, force:true}); });
  await assert.rejects(client.call('initialize', {platformVersion:'0.2.0', authorizedRoot:root}, randomUUID()), {code:'incompatibleVersion'});
  const broken = join(root, 'broken.mjs'); await writeFile(broken, 'process.exit(7);');
  const failed = new ProductClient(broken, {productId:manifest.productId, timeoutMs:2000});
  t.after(() => failed.stop());
  await assert.rejects(failed.call('initialize', {platformVersion:'0.1.12', authorizedRoot:root}, randomUUID()), error => ['resultUnknown','operationFailed'].includes(error.code));
});
