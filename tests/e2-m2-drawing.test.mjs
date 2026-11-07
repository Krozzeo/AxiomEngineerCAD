import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers.mjs';
import {extrusionDemo} from '../src/extrusion/demo.mjs';
import {command} from '../src/commands/domain.mjs';
import {buildProof} from '../src/proof/kernel.mjs';

test('exact HLR draws a circular opening, hidden silhouette and bound dimensions',async()=>{
 const document=await extrusionDemo(),drawing=(await buildProof(document)).drawing,[top,front]=drawing.views;
 const hole=top.visible.find(edge=>edge.kind==='circle');
 assert.ok(Math.abs(hole.radius-3)<1e-6);
 assert.equal(top.hidden.length,0);
 assert.deepEqual(front.hidden.map(edge=>edge.a[0]).sort((a,b)=>a-b),[17,23]);
 assert.equal(drawing.dimension.valueMm,40);
 assert.equal(drawing.depthDimension.parameterId,'stock-depth');
 assert.equal(drawing.depthDimension.valueMm,10);
 assert.equal(drawing.vector.images,0);
 const pdf=Buffer.from(drawing.pdfBase64,'base64').toString();
 assert.match(pdf,/^%PDF/);
 assert.match(pdf,/40\.000 mm/);
 assert.match(pdf,/10\.000 mm/);
 assert.doesNotMatch(pdf,/\/Subtype \/Image/);

 const parameter={id:'stock-depth',name:'StockDepth',definitionId:null,unit:'mm',expression:'17 mm'};
 const edited=command(document,'cad.parameter.set.v1',{parameter});
 const rebuilt=(await buildProof(edited)).drawing;
 assert.notEqual(rebuilt.source.contentHash,drawing.source.contentHash);
 assert.equal(rebuilt.depthDimension.valueMm,17);
 assert.ok(rebuilt.views[1].hidden.every(edge=>Math.abs(edge.a[1]-edge.b[1])===17));
 assert.equal((await buildProof(edited,{viewportOnly:true})).drawing,null);
});

test('drawing export rejects a stale manifest after a working revision changes',async t=>{
 const f=await fixture(t),d=await f.call('project.demos',{demoIds:['e2-m2-associative-drawing'],destination:f.folder});
 await f.call('project.open',{path:d.projects[0].path});
 const adapter=f.adapter,s=adapter.doc.proof,revision=adapter.doc.value.revision;
 s.build({expectedRevision:revision,operationId:randomUUID()});
 await s.job.promise;
 assert.equal(s.job.state,'completed',JSON.stringify(s.job.error));
 const manifestId=s.result().manifestId;
 await f.call('document.edit',{expectedRevision:revision,metadata:{name:'Updated drawing source',notes:''}});
 await assert.rejects(s.export({operationId:randomUUID(),expectedRevision:adapter.doc.value.revision,manifestId,confirmation:'DownloadLocalPDF'}),{code:'RevisionConflict'});
});
