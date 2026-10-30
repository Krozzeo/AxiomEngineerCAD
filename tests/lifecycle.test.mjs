import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, readdir, mkdir, symlink, link} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fixture, http} from './helpers.mjs';
import {blank, Document, FILENAME} from '../src/document.mjs';
import {EngineerAdapter} from '../platform/adapter.mjs';

test('native lifecycle: read-only detect, edit/save, duplicate receipt, cancel/discard, reopen', async t => {
  const {folder, adapter, call} = await fixture(t);
  const request = {path:folder, name:'Bracket study', operationId:randomUUID()};
  const created = await call('project.create', request);
  assert.deepEqual(await call('project.create', request), created);
  const before = await readFile(created.path); assert.equal(created.status.revision, 0);
  const detected = await call('project.detect', {path:folder});
  assert.equal(detected.projectId, created.status.projectId); assert.deepEqual(await readFile(created.path), before);
  const change = {metadata:{name:'Renamed study', notes:'Mounting constraints to investigate'}, expectedRevision:0, operationId:randomUUID()};
  const edited = await call('document.edit', change); assert.equal(edited.status.revision, 1);
  assert.deepEqual(await call('document.edit', change), edited);
  await assert.rejects(call('document.edit', {...change, metadata:{name:'Other', notes:''}}), {code:'invalidRequest'});
  await assert.rejects(call('project.save', {expectedRevision:0}), {code:'revisionConflict'});
  assert.deepEqual(await readFile(created.path), before);
  assert.equal((await call('project.close', {decision:'cancel', expectedRevision:1})).closed, false);
  assert.equal((await call('project.save', {expectedRevision:1})).status.dirty, false);
  const saved = JSON.parse(await readFile(created.path)); assert.equal(saved.metadata.name, 'Renamed study');
  await call('document.edit', {expectedRevision:1, metadata:{name:'Discard this', notes:''}});
  const closing = {decision:'discard', expectedRevision:2, operationId:randomUUID()};
  assert.equal((await call('project.close', closing)).closed, true);
  assert.equal((await call('project.close', closing)).closed, true);
  await assert.rejects(call('document.edit', {expectedRevision:2, metadata:{name:'Late', notes:''}}), {code:'cancelled'});
  assert.deepEqual(JSON.parse(await readFile(created.path)), saved);
  const second = new EngineerAdapter(); t.after(() => second.shutdown()); second.sessionId = randomUUID();
  await second.execute('initialize', {authorizedRoot:adapter.root, platformVersion:'0.1.12'});
  const reopened = await second.execute('project.open', {path:folder, operationId:randomUUID()});
  assert.equal(reopened.status.projectId, created.status.projectId); assert.equal(reopened.status.revision, 1);
});

test('pending fields block Save and Save-close; Cancel preserves; Discard releases lease', async t => {
  const {folder, call} = await fixture(t); await call('project.create', {path:folder, name:'Buffers'});
  const clientId = randomUUID();
  await call('document.buffer', {clientId, sequence:2, dirty:true});
  await call('document.buffer', {clientId, sequence:1, dirty:false});
  assert.equal((await call('project.status')).status.pendingBuffers, true);
  await assert.rejects(call('project.save', {expectedRevision:0}), {code:'projectBusy'});
  await assert.rejects(call('project.close', {decision:'save', expectedRevision:0}), {code:'projectBusy'});
  assert.equal((await call('project.close', {decision:'cancel', expectedRevision:0})).cancelled, true);
  await call('project.close', {decision:'discard', expectedRevision:0});
  assert.deepEqual(await readdir(folder), [FILENAME]);
});

test('external document edits cannot be overwritten', async t => {
  const {folder, call} = await fixture(t); const created = await call('project.create', {path:folder, name:'Original'});
  await call('document.edit', {expectedRevision:0, metadata:{name:'Local', notes:''}});
  const external = {...blank('External'), revision:5}; const bytes = JSON.stringify(external); await writeFile(created.path, bytes);
  await assert.rejects(call('project.save', {expectedRevision:1}), {code:'revisionConflict'});
  assert.equal(await readFile(created.path, 'utf8'), bytes);
});

test('failed persistence leaves working edit dirty and saved original intact', async t => {
  const {folder} = await fixture(t); const path = join(folder, FILENAME), value = blank('Saved'); await writeFile(path, JSON.stringify(value));
  const doc = new Document(path, value, {write:async () => { throw Error('Injected storage failure'); }});
  doc.edit({expectedRevision:0, metadata:{name:'Working', notes:''}});
  await assert.rejects(doc.save(1), /Injected storage failure/);
  assert.equal(doc.status().savedRevision, 0); assert.equal(doc.status().dirty, true);
  assert.deepEqual(JSON.parse(await readFile(path)), value);
});

for (const [label, value, code] of [
  ['unknown format', {...blank('Future'), formatVersion:99}, 'incompatibleVersion'],
  ['missing experimental marker', {...blank('Future'), provisional:undefined}, 'incompatibleVersion'],
  ['invalid revision', {...blank('Bad'), revision:-1}, 'invalidRequest'],
  ['unexpected domain fields', {...blank('Bad'), bodies:[]}, 'invalidRequest'],
  ['invalid JSON', '{bad', 'invalidRequest']
]) test(label + ' is rejected without a write or lease residue', async t => {
  const {folder, call} = await fixture(t), path = join(folder, FILENAME);
  const bytes = typeof value === 'string' ? value : JSON.stringify(value); await writeFile(path, bytes);
  await assert.rejects(call('project.open', {path:folder}), {code});
  assert.equal(await readFile(path, 'utf8'), bytes); assert.deepEqual(await readdir(folder), [FILENAME]);
});

test('unauthorized locations, symlink directories and hardlinked files are denied', async t => {
  const {base, root, folder, call} = await fixture(t), outside = join(base, 'outside'); await mkdir(outside);
  await assert.rejects(call('project.create', {path:outside, name:'Denied'}), {code:'permissionDenied'});
  assert.deepEqual(await readdir(outside), []);
  const alias = join(root, 'alias'); await symlink(outside, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(call('project.create', {path:alias, name:'Denied'}), {code:'permissionDenied'});
  const original = join(outside, 'original.json'); await writeFile(original, JSON.stringify(blank('Linked')));
  await link(original, join(folder, FILENAME));
  await assert.rejects(call('project.open', {path:folder}), {code:'permissionDenied'});
});

test('two independent sessions cannot own the same project', async t => {
  const {folder, root, call} = await fixture(t); await call('project.create', {path:folder, name:'Owned'});
  const other = new EngineerAdapter(); t.after(() => other.shutdown()); other.sessionId = randomUUID();
  await other.execute('initialize', {authorizedRoot:root, platformVersion:'0.1.12'});
  await assert.rejects(other.execute('project.open', {path:folder, operationId:randomUUID()}), {code:'projectBusy'});
  assert.equal((await call('project.status')).status.name, 'Owned');
});

test('editor-start failure rolls back lease and creates no document', async t => {
  const {folder, call} = await fixture(t, {start:async () => { throw Error('Injected startup failure'); }});
  await assert.rejects(call('project.create', {path:folder, name:'No phantom ready'}), /Injected startup failure/);
  assert.deepEqual(await readdir(folder), []);
});

test('session shutdown during startup cannot publish a late document', async t => {
  let resume, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pause = new Promise(resolve => { resume = resolve; });
  const {folder, adapter, call} = await fixture(t, {start:async () => {
    entered(); await pause; return {url:'http://127.0.0.1:50000/', close:async () => {}};
  }});
  const creating = call('project.create', {path:folder, name:'Cancelled startup'});
  const rejected = assert.rejects(creating, {code:'cancelled'});
  await started; const closing = adapter.shutdown(); resume();
  await rejected; await closing;
  assert.deepEqual(await readdir(folder), []);
});

test('HTTP auth, origin, method and malformed inputs preserve document', async t => {
  const {folder, call} = await fixture(t); const result = await call('project.create', {path:folder, name:'HTTP'});
  assert.equal((await http(result.editorUrl, 'document')).status, 200);
  assert.equal((await http(result.editorUrl, 'document', undefined, {Authorization:'Bearer wrong'})).status, 403);
  assert.equal((await http(result.editorUrl, 'document', undefined, {Origin:'https://outside.invalid'})).status, 403);
  assert.equal((await http(result.editorUrl, 'edit', {expectedRevision:0, metadata:{name:'', notes:''}})).status, 409);
  assert.equal((await call('project.status')).status.revision, 0);
  const edited = await http(result.editorUrl, 'edit', {expectedRevision:0, metadata:{name:'HTTP edit', notes:'Shared authority'}});
  assert.equal(edited.value.status.revision, 1); assert.equal((await call('project.status')).status.name, 'HTTP edit');
});

test('IPC identity and unsupported capabilities cannot mutate state', async t => {
  const {folder, adapter, call} = await fixture(t); await call('project.create', {path:folder, name:'IPC'});
  await assert.rejects(adapter.request({protocolVersion:1, productId:'axiom.other', requestId:'x', correlationId:'x', sessionId:'foreign', actor:{kind:'human', id:'test'}, method:'project.save', params:{}}), {code:'permissionDenied'});
  await assert.rejects(call('cad.feature.create', {}), {code:'unsupportedCapability'});
  assert.equal((await call('project.status')).status.revision, 0);
});
