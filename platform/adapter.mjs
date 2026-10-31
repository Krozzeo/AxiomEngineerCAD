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
import {assemblyFixture} from '../src/assembly/fixtures.mjs';
import {NativeSession,createVersion} from '../src/native/session.mjs';
import {runWorker} from '../src/lab/jobs.mjs';
import {integratedDemo} from '../src/integration/demo.mjs';
import {readState} from '../src/native/storage.mjs';
import {nativeDemo} from '../src/native/demo.mjs';
import {CommandSession} from '../src/commands/session.mjs';
import {reviewDemo} from '../src/commands/demo.mjs';
import {proofDemo} from '../src/proof/demo.mjs';
import {ProofSession} from '../src/proof/session.mjs';

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
    if(method.startsWith('proof.')){check(this.doc&&!this.ended,'cancelled','Open a live study first.');const name=method.slice(6);check(['catalog','status','result','build','cancel','pick','export','preflight'].includes(name),'unsupportedCapability','Unknown proof operation.');const reads=['catalog','status','result'];if(reads.includes(name))return this.doc.proof[name]();const id=params.operationId,key=JSON.stringify({method,params});check(typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id),'invalidRequest','Use a unique bounded operation identity.');const old=this.receipts.get(id);if(old){check(old.key===key,'invalidRequest','Operation identity reused.');if(old.error)fail(old.error.code,old.error.message);return structuredClone(old.result);}check(this.receipts.size<256,'projectBusy','Receipt budget reached.');try{const result=await this.doc.proof[name](params);this.receipts.set(id,{key,result:structuredClone(result)});return result;}catch(e){this.receipts.set(id,{key,error:{code:e.code??'operationFailed',message:e.message}});throw e;}}
    if(['cad.catalog','cad.context','cad.status','cad.invoke','cad.grant','cad.revoke','cad.cancel'].includes(method)){check(this.doc&&!this.ended,'cancelled','Open a live study first.');return this.handle(method,params);}
    check(['initialize', ...manifest.capabilities, 'document.inspect', 'document.edit', 'document.buffer','lab.run','lab.inspect','lab.cancel','lab.apply','lab.fixture','native.inspect','native.convert','native.graph','native.snapshot','native.publish','native.restore','native.refresh','native.attach','native.adopt','native.recover','native.removeVersion'].includes(method),
      'unsupportedCapability', 'This build does not implement that operation.');
    // Buffer reports have their own monotonic client sequence; typing must not exhaust mutation receipts.
    const mutation = !['initialize','project.detect','project.status','document.inspect','document.buffer','lab.inspect','lab.fixture','native.inspect','native.refresh'].includes(method);
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
    if ((await lstat(path)).isDirectory()) path = join(path, FILENAME);
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
      check(!this.doc&&Array.isArray(p.demoIds)&&p.demoIds.length>0&&p.demoIds.length<=manifest.demos.length&&new Set(p.demoIds).size===p.demoIds.length&&p.demoIds.every(id=>manifest.demos.some(d=>d.id===id)),'invalidRequest','Choose the declared version-owned demos.');
      const destination=await authorized(this.root,p.destination);
      check((await readdir(destination)).length===0,'projectBusy','Demos require a fresh empty destination.');
      const projects=[];let nativePaths;if(p.demoIds.some(id=>id.startsWith('e0-m4-')||id==='e0-m5-review')){const docs=await nativeDemo();nativePaths={};for(const [id,key,folderName]of [['e0-m4-source','source','E0-M4-Source'],['e0-m4-native','consumer','E0-M4-Native']]){const folder=join(destination,folderName);await mkdir(folder);const path=join(folder,FILENAME);await atomicJson(path,docs[key]);nativePaths[id]=path;}if(p.demoIds.includes('e0-m5-review')){const folder=join(destination,'E0-M5-Review');await mkdir(folder);const path=join(folder,FILENAME);await atomicJson(path,await reviewDemo(docs.consumer));nativePaths['e0-m5-review']=path;}}
      for(const demoId of p.demoIds){if(demoId==='e0-m7-integrated'){const folder=join(destination,'E0-M7-Integrated');await mkdir(folder);const path=join(folder,FILENAME),value=integratedDemo(),proof=(await runWorker('native-verify',{document:value})).result,version=createVersion(value,proof);value.native.versions.push(version);value.native.graph.drawings.push({id:'drawing-history',revision:0,sheets:[{id:'sheet-history',size:'A4',views:[{id:'view-history',model:{documentId:value.documentId,definitionId:value.native.graph.primaryDefinitionId,versionId:version.id}}],notes:[{id:'note-history',viewId:'view-history',text:'Initial integrated width40/depth10; retained immutable source.'}]}]});await atomicJson(path,value);projects.push({demoId,path,...await this.detect(path)});continue;}if(demoId==='e0-m6-drawing-gpu'){const folder=join(destination,'E0-M6-Drawing-GPU');await mkdir(folder);const path=join(folder,FILENAME);await atomicJson(path,proofDemo());projects.push({demoId,path,...await this.detect(path)});continue;}if(nativePaths?.[demoId]){projects.push({demoId,path:nativePaths[demoId],...await this.detect(nativePaths[demoId])});continue;}const spatial=demoId==='e0-m3-mates',folder=join(destination,spatial?'E0-M3-Spatial-Lab':'E0-M2-Geometry-Lab');await mkdir(folder);
        const value=spatial?{...blank('E0.M3 Spatial Mate Lab'),provisional:'E0.M3',assembly:assemblyFixture('coaxial')}:{...blank('E0.M2 Geometry & Sketch Lab'),provisional:'E0.M2',experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe()}};
        const path=join(folder,FILENAME);await atomicJson(path,value);projects.push({demoId,path,...await this.detect(path)});}
      return {productVersion:manifest.productVersion,projects};
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
        const state=create?{value:initial}:await readState(path),value=state.value;
        this.doc = new Document(path, value, {authorize:path => authorized(this.root, path),diskHash:state.diskHash,recovery:state.recovery});
        this.doc.native = new NativeSession(this.doc,this.root);
        this.doc.lab = new LabSession(this.doc);
        this.doc.proof = new ProofSession(this.doc,this.root);
        this.doc.commands = new CommandSession(this.doc,{sessionId:this.sessionId,root:this.root});await this.doc.commands.load();
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
    if(method==='cad.catalog')return this.doc.commands.catalog();
    if(method==='cad.context')return this.doc.commands.context();
    if(method==='cad.status')return this.doc.commands.status();
    if(method==='cad.invoke')return this.doc.commands.invoke(p);
    if(method==='cad.grant')return this.doc.commands.grant();
    if(method==='cad.revoke')return this.doc.commands.revoke();
    if(method==='cad.cancel')return this.doc.commands.cancelJob();
    if (method === 'lab.inspect') return this.doc.lab.view();
    if (method === 'lab.fixture') return {assembly:assemblyFixture(p.fixture)};
    if (method === 'lab.run') return this.doc.lab.start(p);
    if (method === 'lab.cancel') return this.doc.lab.cancel();
    if (method === 'lab.apply') return this.doc.lab.apply(p);
    if(method==='native.inspect')return this.doc.native.inspect();
    if(method==='native.convert')return this.doc.native.convert(p);
    if(method==='native.graph')return this.doc.native.editGraph(p);
    if(method==='native.snapshot')return this.doc.native.snapshot(p);
    if(method==='native.publish')return this.doc.native.publish(p);
    if(method==='native.restore')return this.doc.native.restore(p);
    if(method==='native.refresh')return this.doc.native.refresh();
    if(method==='native.attach')return this.doc.native.attach(p);
    if(method==='native.adopt')return this.doc.native.adopt(p);
    if(method==='native.recover')return this.doc.native.recover(p);
    if(method==='native.removeVersion')fail('ReferencedVersion','Immutable versions are append-only; deletion/garbage collection is unsupported.');
    if (method === 'project.save') {if(this.doc.recovery?.state==='Committed'&&this.doc.recovery.operationId===p.operationId&&p.expectedRevision===this.doc.value.revision)return {status:this.doc.status(),receiptConfirmed:true};return this.doc.save(p.expectedRevision,p.operationId);}
    if (method === 'project.close') {
      this.doc.expect(p.expectedRevision,{allowRecovery:p.decision!=='save'});
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
    await this.doc?.proof?.close();
    await this.doc?.commands?.close();
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
