import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {drawingEvidence,compareReprojection} from '../src/proof/drawing-evidence.mjs';
import {blank} from '../src/document.mjs';
import {upgrade,hash} from '../src/native/schema.mjs';
import {command} from '../src/commands/domain.mjs';
import {verifyCommand} from '../src/commands/worker.mjs';
import {buildProof} from '../src/proof/kernel.mjs';

const svg=await readFile(new URL('../app/e2-m4-drawing.svg',import.meta.url),'utf8');
test('SVG evidence asks for missing or conflicting dimensions and refuses active content',()=>{
 assert.throws(()=>drawingEvidence(svg.replace(/.*data-dimension="depth".*\r?\n/,'')),{code:'NeedsClarification'});
 assert.throws(()=>drawingEvidence(svg.replace('>48 mm</text>','>47 mm</text>')),{code:'NeedsClarification'});
 assert.throws(()=>drawingEvidence(svg.replace('</svg>','<script>alert(1)</script>\n</svg>')),{code:'UnsupportedCapability'});
 assert.throws(()=>drawingEvidence(' '.repeat(8193)),{code:'ResourceLimit'});
});
test('reconstruction preserves the vector source and creates a dimensionally editable exact part',async()=>{
 const before=upgrade(blank('SVG reconstruction')),candidate=command(before,'cad.drawing.reconstruct.v1',{svg});
 const verified=await verifyCommand({before,after:candidate});
 assert.equal(verified.reprojection.maxDeviationMm,0);
 assert.equal(verified.reprojection.sourceHash,hash(Buffer.from(svg)));
 assert.deepEqual(before.native.graph.features,[]);
 assert.equal(candidate.native.graph.features[0].data.constraints.filter(item=>item.driving).length>=6,true);
 assert.ok(Math.abs(verified.after.geometry.volumeMm3-(48*32-Math.PI*16)*12)<1e-6);
 const edited=command(candidate,'cad.feature.update.v1',{featureId:'drawing-extrusion',parameter:'depth',quantity:{value:15,unit:'mm'}});
 const {drawing}=await buildProof(edited);
 assert.equal(drawing.depthDimension.valueMm,15);
 assert.throws(()=>compareReprojection(drawing,drawingEvidence(svg)),{code:'InvalidGeometry'});
 await verifyCommand({before:candidate,after:edited});
 assert.throws(()=>command(candidate,'cad.drawing.reconstruct.v1',{svg}),{code:'UnsupportedCapability'});
});
