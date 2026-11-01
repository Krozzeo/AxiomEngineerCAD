import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fixture} from './helpers.mjs';
import manifest from '../platform/product.json' with {type:'json'};
test('production Load Demos advertises only the current workbench and refuses historical demo generation',async t=>{const f=await fixture(t,{demoCatalog:manifest.demos});assert.deepEqual(manifest.demos.map(d=>d.id),['e1-m2-sketch']);await assert.rejects(f.call('project.demos',{demoIds:['e0-m2-lab'],destination:f.folder}),{code:'invalidRequest'});assert.deepEqual(await readdir(f.folder),[]);});
test('Origin is a stable exact canonical point reference and never adds a persisted native feature',async t=>{const f=await fixture(t);await f.call('project.create',{path:f.folder,name:'Origin'});const before=await readFile(f.adapter.doc.path),s=f.adapter.doc.proof;s.build({operationId:crypto.randomUUID(),expectedRevision:0,viewportOnly:true});await s.job.promise;assert.equal(s.job.state,'completed');const r=s.result(),origin=r.scene.datums.find(d=>d.role==='origin');assert.equal(origin.datumType,'point');const picked=s.pick({operationId:crypto.randomUUID(),expectedRevision:0,manifestId:r.manifestId,kind:'datum',selectionId:origin.selectionId});assert.deepEqual(picked.pointMm,[0,0,0]);assert.deepEqual(await readFile(f.adapter.doc.path),before);});
