import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {extractRelease} from '../node_modules/axiom-platform/services/local-files/release-zip.mjs';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';

const folder = resolve(process.argv[2] ?? '.axiom/release');
const manifest = JSON.parse(await readFile(join(folder, 'axiom-release.json'), 'utf8'));
assert.equal(manifest.productId, 'axiom.engineer-cad');
const artifact = manifest.artifacts.find(a => a.platform === 'win32' && a.arch === 'x64');
assert.ok(artifact && /^[\w.-]+\.zip$/.test(artifact.name));
const archive = await readFile(join(folder, artifact.name));
assert.equal(archive.length, artifact.bytes);
assert.equal(createHash('sha256').update(archive).digest('hex'), artifact.sha256);
const base = await mkdtemp(join(tmpdir(), 'engineer-prepared-'));
const installation = join(base, 'relocated product with spaces'), root = join(base, 'projects');
await mkdir(installation); await mkdir(root); let host;
try {
  await extractRelease(archive, installation);
  host = await startHost({root, stateRoot:join(base, 'profile'), manifests:[join(installation, 'platform/product.json')], checkReleases:false});
  await host.startup;
  const call = data => host.manager.execute({operationId:randomUUID(), ...data});
  const created = await call({action:'create', productId:manifest.productId, name:'Prepared milestone acceptance'});
  assert.equal(created.state, 'ready');
  const url = new URL(created.editorUrl), token = new URLSearchParams(url.hash.slice(1)).get('token');
  const response = await fetch(url.origin + '/v1/edit', {method:'POST', headers:{Origin:url.origin, Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
    body:JSON.stringify({operationId:randomUUID(), expectedRevision:0, metadata:{name:'Prepared milestone acceptance', notes:'Edited from extracted installation'}})});
  assert.equal(response.status, 200);
  await call({action:'save', sessionId:created.sessionId, expectedRevision:1});
  await call({action:'close', sessionId:created.sessionId, expectedRevision:1, decision:'save'});
  const reopened = await call({action:'open', productId:manifest.productId, path:created.path});
  assert.equal(reopened.status.projectId, created.status.projectId); assert.equal(reopened.status.revision, 1);
  assert.equal(JSON.parse(await readFile(join(root, reopened.path))).metadata.notes, 'Edited from extracted installation');
  await call({action:'close', sessionId:reopened.sessionId, expectedRevision:1, decision:'discard'});
  const report = {passed:true, productId:manifest.productId, version:manifest.version, build:manifest.build ?? null,
    sha256:artifact.sha256, bytes:artifact.bytes, runtime:process.version, os:process.platform,
    scope:'Relocated prepared ZIP, pinned real Platform host, IPC create/edit/save/close/reopen; no user profile/provider or CAD geometry claims'};
  await writeFile(join(folder, 'package-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await host?.close(); await rm(base, {recursive:true, force:true}); }
