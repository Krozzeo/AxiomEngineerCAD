import assert from 'node:assert/strict';
import {join} from 'node:path';
import {sketchDocument,sketchCommit,sketchSettled} from './browser-sketch.mjs';
import {waitEditorIdle} from './browser-support.mjs';
import {pngPixels} from './png-pixel.mjs';

export async function verifyOperationUX({context,host,observe,evidence,report}){
 const entry=host.manager.catalog().recents.find(p=>p.name==='E3.M2 Feature Construction');assert.ok(entry);
 let session,page;
 const open=async()=>{session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path});page=await context.newPage();observe(page);page.setDefaultTimeout(30000);await page.goto(session.editorUrl);await waitEditorIdle(page);};
 const close=async decision=>{const revision=(await sketchDocument(page)).revision;await page.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:revision,decision});session=null;};
 try{
  await open();await page.waitForFunction(()=>Math.abs((window.engineerViewport.proof?.exact?.volumeMm3??0)-14000)<1e-5);
  const form=page.locator('#feature-operation-form'),table=name=>form.locator('.operation-selection').filter({has:page.getByRole('table',{name,exact:true})});
  const end=async()=>{await page.locator('#cad-cancel-feature').click();await page.locator('#feature-operation-editor').waitFor({state:'hidden'});await waitEditorIdle(page);};
  const features=async()=>page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();
  assert.equal(await page.locator('[data-coordinate-system=datum-origin]').getAttribute('open'),'');
  await features();
  const first=await page.locator('[data-operations=Features]').evaluate(r=>r.firstElementChild.contains(document.querySelector('#proof-build')));assert.equal(first,true);
  await page.locator('[data-source-id=revolve-practice]').click();await page.locator('#cad-extrude-sketch').click();
  await table('Sketch').getByText('revolve-practice',{exact:true}).waitFor();
  await page.locator('#cad-feature-revolve').click();await table('Axis').waitFor();await page.waitForFunction(()=>document.querySelector('#feature-operation-editor>h3')?.textContent==='Revolve');
  assert.match(await table('Axis').getAttribute('class'),/active/);await table('Sketch').getByText('revolve-practice',{exact:true}).waitFor();
  await table('Sketch').getByRole('button',{name:'Clear sketch',exact:true}).click();assert.match(await table('Sketch').getAttribute('class'),/active/);
  await page.locator('[data-source-id=revolve-practice]').click();assert.match(await table('Axis').getAttribute('class'),/active/);
  await page.locator('[data-source-id=datum-y]').click();await page.locator('#extrusion-depth-value').fill('500');await page.locator('#extrusion-depth-value').press('Enter');
  assert.equal(await page.locator('#extrusion-depth-value').inputValue(),'360');
  assert.equal(await form.getByText('Angle (°)',{exact:true}).locator('visible=true').count(),0);
  await page.locator('#cad-feature-revolve').click();await page.locator('#feature-operation-editor').waitFor({state:'hidden'});await waitEditorIdle(page);
  await page.locator('[data-source-id=revolve-practice]').click();await page.locator('#cad-feature-revolve').click();await table('Axis').waitFor();assert.match(await table('Axis').getAttribute('class'),/active/);await end();
  await page.locator('#cad-extrude-sketch').click();assert.equal(await form.getByText('Value (mm)',{exact:true}).locator('visible=true').count(),0);await end();

  // Physical frontmost face with colon-based semantic role is a plane, not a point.
  await page.locator('#cad-feature-plane').click();
  const hit=await page.evaluate(async()=>{const v=window.engineerViewport,r=v.renderer,b=r.canvas.getBoundingClientRect();for(const m of r.scene.models)for(const f of m.mesh.faces.filter(f=>f.planeNormal&&f.role.includes(':'))){const p=r.point(f.centerOfAreaMm),pick=await r.pick(p[0],p[1]);const target=v.entities().find(e=>e.id===pick.selectionId);if(target?.kind==='face'&&target.role===f.role)return {x:b.x+p[0]*b.width/r.canvas.width,y:b.y+p[1]*b.height/r.canvas.height};}return null;});assert.ok(hit);await page.mouse.click(hit.x,hit.y);
  await table('Reference 1').getByText(/Face ·/).waitFor();assert.match(await table('Reference 2').getAttribute('class'),/active/);
  const relations=form.locator('.reference-relations').first();assert.equal(await relations.locator('button:visible svg').count(),5,'Every available relation has an actual SVG glyph.');assert.equal(await table('Reference 1').getByRole('table').evaluate(t=>t.scrollWidth<=t.clientWidth+1),true,'Long semantic face names must fit the table.');assert.deepEqual(await relations.locator('button:visible').evaluateAll(bs=>bs.map(b=>b.dataset.referenceRelation)),['coincident','parallel','perpendicular','offset','angle']);
  for(const kind of ['parallel','perpendicular','offset','angle','coincident']){await relations.locator('[data-reference-relation='+kind+']').click();assert.ok(await page.locator('#feature-reference-preview path').count()>0);assert.equal(await relations.locator('[data-reference-relation='+kind+']').getAttribute('aria-pressed'),'true');}
  if(evidence)await page.screenshot({path:join(evidence,'reference-relation-buttons.png')});
  await table('Reference 1').getByRole('button',{name:/Remove/}).click();assert.match(await table('Reference 1').getAttribute('class'),/active/);assert.equal(await relations.locator('button:visible').count(),0);await end();
  // Absolute presets are saved as ordinary canonical reference dependencies.
  for(const kind of ['plane','axis'])for(const axis of ['x','y','z']){
   await page.locator('#cad-feature-'+kind).click();await form.locator('[data-reference-definition='+axis+']').click();assert.equal(await form.locator('[data-feature-section=selection]').isVisible(),false);
   await sketchCommit(page,()=>form.getByRole('button',{name:'Apply',exact:true}).click());
   const f=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='reference-geometry').at(-1);assert.equal(f.data.definitionMode,axis);assert.equal(f.data.references[0].target.role,kind==='axis'?axis:{x:'yz',y:'xz',z:'xy'}[axis]);
  }
  await page.locator('#cad-feature-coordinate').click();await form.locator('[data-reference-definition=origin]').click();await sketchCommit(page,()=>form.getByRole('button',{name:'Apply',exact:true}).click());
  const cs=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='reference-geometry').at(-1),group=page.locator('[data-coordinate-system="'+cs.id+'"]');
  assert.equal(await group.getAttribute('open'),null);await group.locator('.coordinate-toggle').click();assert.equal(await group.locator(':scope > button[data-source-id]').count(),6);
  if(evidence)await page.screenshot({path:join(evidence,'coordinate-tree-expanded.png')});
  await page.locator('[data-source-id="'+cs.id+'-x"]').click();await page.locator('#proof-canvas').focus();await sketchCommit(page,()=>page.keyboard.press('Delete'));
  await page.locator('[data-source-id="'+cs.id+'-x"]').waitFor({state:'detached'});assert.equal(await group.locator(':scope > button[data-source-id]').count(),5);assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===cs.id).data.deletedRoles[0],'x');
  // The child plane is a real support, not just a tree entry.
  await page.locator('[data-source-id="'+cs.id+'-xy"]').click({button:'right'});await page.getByRole('menuitem',{name:'New Sketch',exact:true}).click();await page.locator('#new-sketch-create').click();await page.waitForFunction(()=>!!window.engineerSketch.view());await sketchSettled(page);
  const supportId=await page.evaluate(()=>window.engineerSketch.view().id);assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===supportId).data.plane.producerId,cs.id);
  await page.locator('[data-sketch-tool=line]').click();assert.equal(await page.locator('[data-sketch-tool=line]').getAttribute('aria-pressed'),'true');await page.locator('#edit-sketch-open').click();await page.waitForFunction(()=>!window.engineerSketch.view());await sketchSettled(page);
  assert.equal(await page.locator('[data-sketch-tool=line]').isDisabled(),true);assert.equal(await page.locator('[data-sketch-tool=line]').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#sketch-dimension-tool').isDisabled(),true);
  await page.locator('[data-source-id="'+supportId+'"]').click();await page.locator('#proof-canvas').focus();await sketchCommit(page,()=>page.keyboard.press('Delete'));
  await page.locator('[data-source-id="'+cs.id+'"]').click();await page.locator('#proof-canvas').focus();await sketchCommit(page,()=>page.keyboard.press('Delete'));
  assert.equal((await sketchDocument(page)).native.graph.features.some(f=>f.id===cs.id),false);await page.locator('[data-coordinate-system="'+cs.id+'"]').waitFor({state:'detached'});

  // A truly occluded exact edge must be colored, without changing the frontmost ID.
  await page.locator('#wb-clear').click();await page.locator('#proof-canvas').press('0');await page.waitForFunction(()=>!window.engineerViewport.renderer.animating);
  const hidden=await page.evaluate(async()=>{const v=window.engineerViewport,r=v.renderer;for(const m of r.scene.models){const o=r.scene.occurrences.find(o=>o.featureId===m.featureId);for(const edge of m.mesh.edges.filter(e=>!e.displayHidden&&e.points.length>=2)){const a=edge.points[0],b=edge.points.at(-1),mid=a.map((n,i)=>(n+b[i])/2),p=r.point(mid),hit=await r.pick(p[0],p[1]),entity=v.entities().find(e=>e.id===hit.selectionId);if(entity?.kind==='face'&&hit.selectionId!==o.edgeSelectionIds[edge.role]&&p[0]>15&&p[0]<r.canvas.width-15&&p[1]>15&&p[1]<r.canvas.height-15)return {feature:m.featureId,point:mid,pixel:p,id:hit.selectionId};}}return null;});assert.ok(hidden,'Find a physical edge occluded by a nearer face.');
  const shot=()=>page.locator('#proof-canvas').screenshot();
  const coords=await page.evaluate(p=>{const r=window.engineerViewport.renderer,b=r.canvas.getBoundingClientRect();return [p[0]*b.width/r.canvas.width,p[1]*b.height/r.canvas.height];},hidden.pixel);
  await page.locator('[data-source-id="'+hidden.feature+'"]').hover();await page.evaluate(()=>window.engineerViewport.renderer.serial);assert.ok(pngPixels(await shot()).near(...coords,[255,128,0]),'Preselection contour remains visible behind a face.');
  await page.locator('[data-source-id="'+hidden.feature+'"]').click();await page.evaluate(()=>window.engineerViewport.renderer.serial);assert.ok(pngPixels(await shot()).near(...coords,[121,121,255]),'Selected contour remains visible behind a face.');
  const front=await page.evaluate(async p=>{const r=window.engineerViewport.renderer;return (await r.pick(p[0],p[1])).selectionId;},hidden.pixel);assert.equal(front,hidden.id,'Through-depth feedback must not modify picking IDs.');
  if(evidence)await page.screenshot({path:join(evidence,'operation-ux-coordinate-contours.png')});
  assert.deepEqual(await page.evaluate(()=>window.engineerViewport.renderer.errors),[]);
  report.operationUX={passed:true,selectionButtonsActivate:true,toggleAndSwitch:true,compatibleSelectionTransfer:true,revolveClamp:true,automaticAxisTable:true,unlabelledLimitValues:true,buildControlsLeft:true,typedReferenceRelations:true,automaticReferenceAdvance:true,absolutePlanesAndAxes:true,coordinateChildren:true,childDelete:true,parentDelete:true,coordinatePlaneSupport:true,sketchToolsResetAndGated:true,occludedHoverAndSelectionPixels:true,pickIdsUnchanged:true};
 }catch(error){console.error('Operation UX state',await page?.evaluate(()=>({hint:document.querySelector('#wb-hint')?.textContent,fields:document.querySelector('#feature-operation-fields')?.textContent,heading:document.querySelector('#feature-operation-editor>h3')?.textContent})).catch(()=>null));if(evidence&&page)await page.screenshot({path:join(evidence,'operation-ux-failure.png')}).catch(()=>{});throw error;}
 finally{if(session)await close('discard');}
}
