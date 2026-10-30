import {lstat, readdir, realpath, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {acquireLease} from 'axiom-platform/lease';
import {atomicJson} from 'axiom-platform/files';
import {blank, check, fail, FILENAME, readDocument, Document} from '../src/document.mjs';
import {authorized} from '../src/paths.mjs';
import {startEditor} from '../src/server.mjs';
import manifest from './product.json' with {type:'json'};
import {LabSession} from '../src/lab/session.mjs';
import {recipe,KERNEL} from '../src/lab/profile.mjs';

export class EngineerAdapter {
  constructor({start = startEditor} = {}) {
    this.start = start; this.receipts = new Map(); this.queue = Promise.resolve(); this.ended = false;
  }
  enqueue(action) { const result = this.queue.then(action); this.queue = result.catch(() => {}); return result; }
  request(message) { return this.enqueue(() => this.receive(message)); }
  async receive(m) {
    check(m?.protocolVersion === 1 && m.productId === manifest.productId && typeof m.requestId === 'string' &&
      m.requestId === m.correlationId && m.actor?.kind === 'human' && typeof m.actor.id === 'string' &&
      typeof m.sessionId === 'string' && m.sessionId.length > 0 && (!this.sessionId || m.sessionId === this.sessionId),
    'permissionDenied', 'Invalid product session envelope.');
    check(!m.projectId || m.projectId === this.doc?.value.documentId || m.projectId === this.closedProjectId,
      'permissionDenied', 'Foreign document identity.');
    check(m.params && typeof m.params === 'object' && !Array.isArray(m.params), 'invalidRequest', 'Parameters must be an object.');
    this.sessionId = m.sessionId;
    return this.execute(m.method, m.params);
  }
  async execute(method, params) {
    check(['initialize', ...manifest.capabilities, 'document.inspect', 'document.edit', 'document.buffer','lab.run','lab.inspect','lab.cancel','lab.apply'].includes(method),
      'unsupportedCapability', 'This build does not implement that operation.');
    // Buffer reports have their own monotonic client sequence; typing must not exhaust mutation receipts.
    const mutation = !['initialize','project.detect','project.status','document.inspect','document.buffer','lab.inspect'].includes(method);
    const key = JSON.stringify({method, params}), id = params.operationId;
    if (mutation) {
      check(typeof id === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(id), 'invalidRequest', 'A unique operationId is required.');
      const previous = this.receipts.get(id);
      if (previous) {
        check(previous.key === key, 'invalidRequest', 'Operation identity reused with different input.');
        if (previous.error) fail(previous.error.code, previous.error.message);
        return structuredClone(previous.result);
      }
      check(this.receipts.size < 256, 'projectBusy', 'Session operation limit reached. Close and reopen.');
    }
    try {
      const result = await this.handle(method, params);
      if (mutation) this.receipts.set(id, {key, result:structuredClone(result)});
      return result;
    } catch (error) {
      if (error.code === 'AX_PROJECT_0004') error.code = 'projectBusy';
      if (mutation) this.receipts.set(id, {key, error:{code:error.code ?? 'operationFailed', message:error.message}});
      throw error;
    }
  }
  async detect(path) {
    path = await authorized(this.root, path);
    if ((await lstat(path)).isDirectory()) path = await authorized(this.root, join(path, FILENAME));
    const doc = await readDocument(path);
    return {path, projectId:doc.documentId, name:doc.metadata.name, projectRevision:doc.revision,
      formatId:doc.formatId, formatVersion:doc.formatVersion};
  }
  async handle(method, p) {
    if (method === 'initialize') {
      check(!this.root && !this.ended && /^0\.1\.\d+$/.test(p.platformVersion), 'incompatibleVersion', 'Engineer requires Platform API 0.1 and one initialization.');
      const info = await lstat(p.authorizedRoot);
      check(info.isDirectory() && !info.isSymbolicLink(), 'permissionDenied', 'Authorize an ordinary project root.');
      if (p.platformOrigin) {
        const u = new URL(p.platformOrigin);
        check(u.origin === p.platformOrigin && u.protocol === 'http:' && u.hostname === '127.0.0.1', 'permissionDenied', 'Invalid host origin.');
      }
      this.root = await realpath(p.authorizedRoot); this.embeddingOrigin = p.platformOrigin;
      return {protocolVersion:1, productId:manifest.productId, productVersion:manifest.productVersion, capabilities:manifest.capabilities};
    }
    check(this.root && !this.ended, 'cancelled', 'Initialize a live session first.');
    if (method === 'project.detect') return this.detect(p.path);
    if (method === 'project.demos') {
      check(!this.doc&&Array.isArray(p.demoIds)&&p.demoIds.length===1&&p.demoIds[0]==='e0-m2-lab','invalidRequest','Choose the declared E0.M2 lab demo.');
      const destination=await authorized(this.root,p.destination);
      check((await readdir(destination)).length===0,'projectBusy','Demos require a fresh empty destination.');
      const folder=join(destination,'E0-M2-Geometry-Lab');await mkdir(folder);
      const value={...blank('E0.M2 Geometry & Sketch Lab'),provisional:'E0.M2',experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe()}};
      const path=join(folder,FILENAME);await atomicJson(path,value);
      return {productVersion:manifest.productVersion,projects:[{demoId:'e0-m2-lab',path,...await this.detect(path)}]};
    }
    if (method === 'project.create' || method === 'project.open') {
      check(!this.doc, 'projectBusy', 'A document is already open.');
      const create = method === 'project.create', detected = create ? null : await this.detect(p.path);
      const folder = create ? await authorized(this.root, p.path) : dirname(detected.path);
      check((await lstat(folder)).isDirectory(), 'invalidRequest', 'Choose a project folder.');
      const initial = create ? blank(p.name) : null;
      if (create) check((await readdir(folder)).length === 0, 'projectBusy', 'Create requires an empty folder.');
      try {
        this.release = await acquireLease(folder, this.sessionId);
        if (create) check((await readdir(folder)).every(n => n === '.axiom-platform-session.lock'), 'projectBusy', 'Project folder changed during creation.');
        const path = create ? join(folder, FILENAME) : detected.path;
        const value = create ? initial : await readDocument(await authorized(this.root, path));
        this.doc = new Document(path, value, {authorize:path => authorized(this.root, path)});
        this.doc.lab = new LabSession(this.doc);
        this.runtime = await this.start({adapter:this, embeddingOrigin:this.embeddingOrigin});
        check(!this.ended, 'cancelled', 'Session closed before document creation completed.');
        if (create) await atomicJson(path, value);
        return {path, status:this.doc.status(), editorUrl:this.runtime.url};
      } catch (error) { await this.cleanup(); throw error; }
    }
    check(this.doc, 'invalidRequest', 'Open a document first.');
    if (method === 'project.status') return {status:this.doc.status()};
    if (method === 'document.inspect') return this.doc.view();
    if (method === 'document.buffer') return this.doc.reportBuffer(p);
    if (method === 'document.edit') return this.doc.edit(p);
    if (method === 'lab.inspect') return this.doc.lab.view();
    if (method === 'lab.run') return this.doc.lab.start(p);
    if (method === 'lab.cancel') return this.doc.lab.cancel();
    if (method === 'lab.apply') return this.doc.lab.apply(p);
    if (method === 'project.save') return this.doc.save(p.expectedRevision);
    if (method === 'project.close') {
      this.doc.expect(p.expectedRevision);
      check(['save','discard','cancel'].includes(p.decision), 'invalidRequest', 'Choose Save, Discard or Cancel.');
      if (p.decision === 'cancel') return {closed:false, cancelled:true, status:this.doc.status()};
      if (p.decision === 'save') await this.doc.save(p.expectedRevision);
      const status = this.doc.status(); this.closedProjectId = status.projectId;
      this.ended = true;
      // HTTP close schedules cleanup after its response has been sent.
      if (!this.httpClosing) await this.cleanup();
      return {closed:true, status};
    }
  }
  async cleanup() {
    if (this.doc) this.doc.closed = true;
    await this.doc?.lab?.close();
    const runtime = this.runtime; this.runtime = null;
    try { await runtime?.close(); } finally { const release = this.release; this.release = null; await release?.(); this.doc = null; }
  }
  async shutdown() { this.ended = true; if (this.doc) this.doc.closed = true; return this.enqueue(() => this.cleanup()); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  check(process.send, 'permissionDenied', 'Use Platform or the direct CLI to launch Engineer.');
  const adapter = new EngineerAdapter();
  process.on('message', async message => {
    try { const result = await adapter.request(message); process.send?.({...message, params:undefined, ok:true, result}); }
    catch (error) { process.send?.({...message, params:undefined, ok:false, error:{code:error.code ?? 'operationFailed', message:error.message}}); }
  });
  process.on('disconnect', () => void adapter.shutdown().finally(() => process.exit(0)));
}
