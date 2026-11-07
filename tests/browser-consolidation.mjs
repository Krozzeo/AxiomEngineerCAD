import {closedProfile} from '../src/extrusion/loops.mjs';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {createSketchFromSupport,selectSketchComponent,sketchCommit,sketchDocument,sketchScreen,sketchSettled} from './browser-sketch.mjs';
import {openParameters,addInlineParameter} from './browser-parameters.mjs';

export async function verifyConsolidationProjectUI({context,host,evidence,observe,report}){
 const demo=host.manager.catalog().recents.find(p=>p.name==='E2.M3 Drawing Proposal'),fixture=JSON.parse(await readFile(demo.path,'utf8'));
 fixture.documentId='engineer-document://'+crypto.randomUUID();fixture.native.versions=[];fixture.native.publications=[];fixture.metadata.name='E1.M5 Consolidation Acceptance';
 const folder=await mkdtemp(join(host.manager.root,'consolidation-')),path=join(folder,'project.engineer-provisional.json');await writeFile(path,JSON.stringify(fixture));
 const open=()=>host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:demo.productId,path});
 let session=await open(),p=await context.newPage();observe(p);await p.goto(session.editorUrl);await p.locator('body[data-sketch-ready=true]').waitFor();await p.waitForFunction(()=>window.engineerViewport?.proof?.exact?.volumeMm3>0);
 const stage=text=>{report.consolidationStage=text;console.log('CONSOLIDATION',text);};
 const tab=name=>p.locator('.ribbon-tabs').getByRole('tab',{name,exact:true}).click(),model=async()=>{await p.locator('#panels-menu > summary').click();await p.locator('[data-open-panel=model]').click();};
 stage('single-extrusion drawing exports a vector sheet');
 await tab('Drawing');await p.locator('#proof-show-sheet').click();
 await p.locator('#proof-sheet svg').waitFor();
 await p.waitForFunction(()=>window.engineerViewport.proof?.drawing?.depthDimension?.valueMm===10);
 const pdfDownload=p.waitForEvent('download');await p.locator('#proof-export').click();
 await (await pdfDownload).saveAs(join(evidence,'e2-m2-extrusion.pdf'));
 stage('local scripted agent proposes and human approves an associative drawing layout');
 await p.locator('.wb-menubar').getByText('Tools',{exact:true}).click();
 await p.locator('[data-wb-action=review]').click();
 await p.locator('#review-script-drawing').click();
 await p.locator('#review-status').filter({hasText:'Isolated proposal prepared'}).waitFor();
 assert.deepEqual((await sketchDocument(p)).native.graph.drawings,[]);
 await p.locator('#review-validate').click();
 await p.locator('#review-status').filter({hasText:'Proposal validated'}).waitFor();
 await p.locator('#review-open').click();
 const evidenceText=p.locator('#review-drawing-evidence');
 await evidenceText.waitFor();
 assert.match(await evidenceText.textContent(),/after: 297 .*210 mm; front .*2 hidden edges.*depth 10 mm/);
 assert.ok(await p.locator('#review-apply').isDisabled());
 await p.locator('#review-confirm').check();await p.locator('#review-apply').click();
 await p.locator('#review-status').filter({hasText:'Applied and saved'}).waitFor();
 await tab('Drawing');await p.locator('#proof-show-sheet').click();
 await p.waitForFunction(()=>window.engineerViewport.proof?.drawing?.layout?.orientation==='landscape');
 const proposalPdf=p.waitForEvent('download');await p.locator('#proof-export').click();
 await (await proposalPdf).saveAs(join(evidence,'e2-m3-proposal.pdf'));
 await tab('View');await p.locator('#proof-show-model').click();
 const click=async(x,y,opts)=>{const q=await sketchScreen(p,x,y);await p.mouse.click(q.x,q.y,opts);},move=async(x,y)=>{const q=await sketchScreen(p,x,y);await p.mouse.move(q.x,q.y);};
 const id=()=>p.evaluate(()=>window.engineerSketch.view()?.id),exit=async()=>{await p.locator('#edit-sketch-exit').click();await p.waitForFunction(()=>!window.engineerSketch.view());await sketchSettled(p);},gpu=await p.evaluate(()=>window.engineerViewport.renderer.info.state==='ready');
 await tab('Sketch');await createSketchFromSupport(p,'xy');await sketchSettled(p);const sketchId=await id(),data=async()=>(await sketchDocument(p)).native.graph.features.find(f=>f.id===sketchId).data;
 stage('outside click closes Model context menu during a sketch');
 await click(-22,-10,{button:'right'});const menu=p.locator('.cad-feature-menu').filter({has:p.getByRole('menuitem',{name:'Select another...'})});await menu.waitFor();await click(-30,-15);await menu.waitFor({state:'hidden'});
 if(gpu){
  stage('external edge preselection and Snap survive both construction clicks');
  await p.locator('[data-sketch-tool=line]').click();await move(8,0);await p.waitForFunction(()=>window.engineerHover?.kind==='edge');await p.locator('[data-sketch-snap=true]').waitFor();await click(8,0);await p.locator('[data-sketch-anchor=true]').waitFor();
  await move(40,18);await p.waitForFunction(()=>window.engineerHover?.kind==='edge');await p.locator('[data-sketch-snap=true]').waitFor();await sketchCommit(p,()=>click(40,18));const line=(await data()).entities.find(e=>e.type==='line'&&!e.referenceOnly);assert.equal((await data()).constraints.filter(c=>c.type==='point-on-line'&&c.refs[0].entityId===line.id).length,2);
  await p.keyboard.down('Control');await move(30,0);await p.waitForFunction(()=>window.engineerHover?.kind==='edge');await p.locator('[data-sketch-snap=true]').waitFor({state:'hidden'});await click(30,0);await p.locator('[data-sketch-anchor=true]').waitFor();await move(40,14);await sketchCommit(p,()=>click(40,14));await p.keyboard.up('Control');const free=(await data()).entities.findLast(e=>e.type==='line'&&!e.referenceOnly);assert.equal((await data()).constraints.some(c=>c.refs.some(r=>r.entityId===free.id)),false);
  stage('read-only references can seed Convert Entities and participate in mixed constraints');
  await p.locator('[data-sketch-tool=select]').click();await click(26,0);await p.waitForFunction(()=>{const s=window.engineerSketch.state;return s.items.find(e=>e.id===s.selected?.entityId)?.referenceOnly;});assert.equal(await p.locator('[data-add-relation]').count(),0);
  const stable=await sketchDocument(p);await p.locator('#sketch-external-reference').click();await p.locator('#convert-entities-inspector tbody tr').waitFor();assert.equal(await p.locator('#convert-entities-inspector tbody tr').count(),1);assert.deepEqual(await sketchDocument(p),stable);await p.locator('[data-convert-action=cancel]').click();
  await selectSketchComponent(p,free.id);await p.keyboard.down('Shift');await click(26,0);await p.keyboard.up('Shift');await p.locator('[data-add-relation=parallel]').waitFor();assert.equal(await p.locator('[data-add-relation=horizontal]').count(),0);
 }
 stage('fixed-center circle perimeter changes radius');
 await p.locator('[data-sketch-tool=circle]').click();await p.keyboard.down('Control');await click(-24,12);await p.locator('[data-sketch-anchor=true]').waitFor();await sketchCommit(p,()=>click(-20,12));await p.keyboard.up('Control');
 const circle=(await data()).entities.find(e=>e.type==='circle'&&!e.referenceOnly);await p.locator('[data-sketch-tool=select]').click();await selectSketchComponent(p,circle.id,'center');await sketchCommit(p,()=>p.locator('[data-add-relation=fixed]').click());
 await p.waitForFunction(id=>[0,1].every(i=>window.engineerSketch.state.diagnosis?.evidence?.coordinateStates?.[id+':center:'+i]==='FullyDefined'),circle.id);
 await move(-20,12);await p.mouse.down();await move(-16,12);await sketchCommit(p,()=>p.mouse.up());const resized=(await data()).entities.find(e=>e.id===circle.id);assert.deepEqual(resized.center,circle.center);assert.ok(Math.abs(resized.radius-8)<1e-5);
 stage('dimension source opens the literal row and the exact equation binding');
 await p.locator('#sketch-dimension-tool').click();await selectSketchComponent(p,circle.id);await sketchCommit(p,()=>p.locator('#sketch-dimension-input').press('Enter'));
 const dimensionId=await p.evaluate(()=>window.engineerSketch.state.selected.constraintId);await p.locator('#sketch-edit-expression').click();await p.locator('#parameter-dimension-table [data-row-id="'+dimensionId+'"].parameter-source-highlight').waitFor();await model();
 await p.locator('#edit-sketch-dimension-value').fill('StockHeight');await sketchCommit(p,()=>p.locator('#edit-sketch-dimension-value').press('Enter'));await p.locator('#sketch-edit-expression').click();await p.locator('#parameter-binding-table [data-row-id="stock-height:dimension:'+sketchId+':'+dimensionId+'"].parameter-source-highlight').waitFor();await model();await exit();
 stage('extrusion depth uses selected text, draft-only preview and atomic parameter binding');
 await openParameters(p);const driver=await addInlineParameter(p,'PadDepth','10 mm');await model();
 const baseVolume=await p.evaluate(async()=>{const v=window.engineerViewport;await v.selectSemantic(v.entities().find(e=>e.kind==='face'&&e.role==='top'));return v.proof.exact.volumeMm3;});await tab('Sketch');await createSketchFromSupport(p,'selection');await sketchSettled(p);const padSketchId=await id();
 await p.locator('[data-sketch-tool=rectangle]').click();await p.keyboard.down('Control');await click(0,0);await p.locator('[data-sketch-anchor=true]').waitFor();await sketchCommit(p,()=>click(10,10));await p.keyboard.up('Control');await exit();
 await p.locator('[data-source-id="'+padSketchId+'"]').click();await tab('Features');await p.locator('#cad-extrude-sketch').click();const focused=()=>p.waitForFunction(()=>{const n=document.querySelector('#extrusion-depth-value');return n&&n.ownerDocument.activeElement===n&&n.selectionStart===0&&n.selectionEnd===n.value.length;});await focused();
 const before=await sketchDocument(p),area=closedProfile(before.native.graph.features.find(f=>f.id===padSketchId).data).area;await p.keyboard.type('7');await p.keyboard.press('Enter');await focused();await p.waitForFunction(({volume,addition})=>window.engineerViewport.proof?.preview&&Math.abs(window.engineerViewport.proof.exact.volumeMm3-volume-addition)<1e-5,{volume:baseVolume,addition:area*7}).catch(async error=>{console.error('DEPTH PREVIEW',JSON.stringify({baseVolume,area,actual:await p.evaluate(()=>({preview:window.engineerViewport.proof?.preview,volume:window.engineerViewport.proof?.exact?.volumeMm3,layers:window.engineerViewport.proof?.scene?.previewLayers?.map(l=>[Math.min(...l.mesh.vertices.filter((_,i)=>i%3===2)),Math.max(...l.mesh.vertices.filter((_,i)=>i%3===2))]),hint:document.querySelector('#wb-hint').textContent,source:document.querySelector('#proof-status').textContent,depth:document.querySelector('#extrusion-depth-value').value}))}));throw error;});assert.deepEqual(await sketchDocument(p),before);
 await p.keyboard.type('PadDepth');await p.keyboard.press('Enter');await focused();await p.waitForFunction(({volume,addition})=>window.engineerViewport.proof?.preview&&Math.abs(window.engineerViewport.proof.exact.volumeMm3-volume-addition)<1e-5,{volume:baseVolume,addition:area*10});assert.deepEqual(await sketchDocument(p),before);
 await p.screenshot({path:join(evidence,'consolidated-depth-preview.png')});await sketchCommit(p,()=>p.locator('#feature-operation-form button[type=submit]').click());
 const pad=(await sketchDocument(p)).native.graph.features.find(f=>f.type==='sketch-extrusion'&&f.data.sketchId===padSketchId);assert.equal(pad.data.refined,true);assert.equal(pad.data.depthMm,10);
 await p.waitForFunction(id=>!window.engineerViewport.proof?.preview&&window.engineerViewport.proof?.scene?.occurrences[0]?.featureId===id,pad.id);assert.equal(await p.evaluate(()=>window.engineerViewport.proof.exact.validity.solids),1);
 await p.locator('#cad-undo:not([disabled])').waitFor();await sketchCommit(p,()=>p.locator('#cad-undo').click());assert.ok(!(await sketchDocument(p)).native.graph.features.some(f=>f.id===pad.id));await p.locator('#cad-redo-menu:not([disabled])').waitFor({state:'attached'});await p.locator('#proof-canvas').focus();await sketchCommit(p,()=>p.keyboard.press('Control+y'));
 await openParameters(p);const expr=p.locator('#parameter-table [data-row-id="'+driver.id+'"] [data-field=expression]');await expr.fill('11 mm');await sketchCommit(p,()=>expr.press('Enter'));const updated=await sketchDocument(p);assert.equal(updated.native.graph.features.find(f=>f.id===pad.id).data.depthMm,11);assert.equal(updated.native.graph.features.find(f=>f.id==='extrusion-plate').data.depthMm,10);
 stage('save and reopen the refined body and existing supports');
 const save=p.waitForResponse(r=>r.url().endsWith('/v1/save'));await p.locator('#save').click();const saved=await save;assert.equal(saved.status(),200,await saved.text());const source=await sketchDocument(p);p.on('dialog',d=>d.accept());await p.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:source.revision,decision:'discard'});session=await open();p=await context.newPage();observe(p);await p.goto(session.editorUrl);await p.locator('body[data-sketch-ready=true]').waitFor();await p.waitForFunction(id=>window.engineerViewport.proof?.scene?.occurrences[0]?.featureId===id,pad.id);assert.deepEqual(await sketchDocument(p),source);assert.equal(await p.evaluate(()=>window.engineerViewport.proof.exact.validity.solids),1);
 stage('download semantic evidence and hide a reference from Model');
 await p.evaluate(async()=>{
  const viewport=window.engineerViewport,face=viewport.entities().find(e=>e.kind==='face'&&e.role==='top');
  await viewport.selectId(face.id,face.kind);
 });
 const download=p.waitForEvent('download');await p.locator('#wb-capture').click();
 const image=await download;assert.match(image.suggestedFilename(),/^cad-face-revision-\d+\.svg$/);
 await image.saveAs(join(evidence,'e2-m1-face.svg'));
 if(gpu){
  await tab('View');await p.locator('#wb-datums').check();
  const point=await p.evaluate(()=>{
   const r=window.engineerViewport.renderer,{matrix}=r.presentedFrame,rect=r.canvas.getBoundingClientRect();
   return {x:rect.left+(matrix[12]/matrix[15]+1)*rect.width/2,y:rect.top+(1-matrix[13]/matrix[15])*rect.height/2};
  });
  await p.mouse.click(point.x,point.y,{button:'right'});
  await p.locator('#model-context-menu').getByRole('menuitem',{name:'Hide',exact:true}).click();
  await p.waitForFunction(()=>window.engineerVisibility('datum-origin')==='hide');
 }
 const downstream=p.locator('[data-source-id="'+pad.id+'"]'),downstreamSketch=p.locator('[data-source-id="'+padSketchId+'"]');
 stage('sketch edit disables downstream rows in the feature tree');
 await p.locator('[data-source-id=sketch-profile]').dblclick();
 await p.waitForFunction(ids=>ids.every(id=>document.querySelector('[data-source-id="'+id+'"]')?.getAttribute('aria-disabled')==='true'),[pad.id,padSketchId]);
 await exit();
 await p.waitForFunction(id=>document.querySelector('[data-source-id="'+id+'"]')?.getAttribute('aria-disabled')===null,pad.id);
 stage('earlier operation edit rolls back later geometry with and without preview');
 let rejectedPreview=false;
 const busyOnFirstEdit=async route=>{
  const operation=route.request().postDataJSON()?.previewOperation;
  if(!rejectedPreview&&operation?.name==='cad.extrusion.update.v1'){
   rejectedPreview=true;
   return route.fulfill({status:409,json:{code:'projectBusy',message:'Finish active work and apply pending fields first.'}});
  }
  await route.continue();
 };
 await p.route('**/v1/proof/build',busyOnFirstEdit);
 await p.locator('[data-source-id=extrusion-plate]').dblclick();
 const rolledBack=preview=>p.waitForFunction(({padSketchId,preview})=>{
  const proof=window.engineerViewport.proof;
  return proof?.operationEditId==='extrusion-plate'&&proof.preview===preview&&
   proof.scene.occurrences[0]?.featureId==='extrusion-plate'&&!proof.scene.sketches.some(s=>s.id===padSketchId);
 },{padSketchId,preview});
 await rolledBack(true);
 assert.equal(await downstream.getAttribute('aria-disabled'),'true');
 assert.equal(await downstreamSketch.getAttribute('aria-disabled'),'true');
 await downstream.click({button:'right',force:true});
 assert.equal(await p.getByRole('menuitem',{name:/^(Enable|Disable)$/}).count(),0);
 assert.equal(rejectedPreview,true);
 await p.unroute('**/v1/proof/build',busyOnFirstEdit);
 await p.locator('#feature-operation-preview').uncheck();
 await rolledBack(false);
 await p.locator('#feature-operation-done').click();
 await p.waitForFunction(id=>window.engineerViewport.proof?.scene.occurrences[0]?.featureId===id,pad.id);
 assert.deepEqual(await sketchDocument(p),source);
 assert.equal(await downstream.getAttribute('aria-disabled'),null);
 p.on('dialog',d=>d.accept());await p.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:source.revision,decision:'discard'});report.consolidation={passed:true,physicalExternalSnap:gpu,physicalExternalSelection:gpu,menuDismiss:true,radialDrag:true,sourceNavigation:true,depthDraftAndBinding:true,oneSolid:true,undoRedo:true,saveReopen:true};
}
