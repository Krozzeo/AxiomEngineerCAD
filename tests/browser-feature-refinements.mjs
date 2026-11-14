import assert from 'node:assert/strict';
import {sketchDocument,sketchCommit} from './browser-sketch.mjs';
import {waitEditorIdle} from './browser-support.mjs';
import {join} from 'node:path';

export async function verifyFeatureRefinementsUI({context,host,observe,evidence,report}){
 const entry=host.manager.catalog().recents.find(p=>p.name==='E3.M2 Feature Construction');assert.ok(entry);
 const session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path});
 const page=await context.newPage();observe(page);page.setDefaultTimeout(30000);
 const form=page.locator('#feature-operation-form'),apply=form.getByRole('button',{name:'Apply',exact:true}),cancel=page.locator('#cad-cancel-feature');
 const table=name=>form.locator('.operation-selection').filter({has:page.getByRole('table',{name,exact:true})});
 const mode=(side,name)=>form.locator('[data-limit-side='+side+']').getByRole('button',{name,exact:true});
 const number=async(side,value)=>{const field=page.locator(side==='start'?'#extrusion-start-value':'#extrusion-depth-value');await field.fill(String(value));await field.press('Enter');};
 const current=async expected=>{await page.waitForFunction(expected=>{const p=window.engineerViewport.proof;if(!p?.preview||!p.operationState?.inputSignature)return false;const input=JSON.parse(p.operationState.inputSignature);return Object.entries(expected).every(([key,value])=>key==='start'||key==='end'?input.limits?.[key]?.value===value:key==='startMode'||key==='endMode'?input.limits?.[key==='startMode'?'start':'end']?.mode===value:input[key]===value);},expected);await page.waitForFunction(()=>!document.querySelector('#feature-operation-form button[type=submit]').disabled);};
 const clickWorld=async point=>{const p=await page.evaluate(w=>{const r=window.engineerViewport.renderer,b=r.canvas.getBoundingClientRect(),m=r.presentedFrame.matrix,q=Array.from({length:4},(_,i)=>m[i]*w[0]+m[i+4]*w[1]+m[i+8]*w[2]+m[i+12]);return {x:b.x+(q[0]/q[3]+1)*b.width/2,y:b.y+(1-q[1]/q[3])*b.height/2};},point);await page.mouse.click(p.x,p.y);};
 const endDraft=async()=>{await cancel.click();await page.locator('#feature-operation-editor').waitFor({state:'hidden'});await waitEditorIdle(page);};
 try{
  await page.goto(session.editorUrl);await waitEditorIdle(page);await page.waitForFunction(()=>Math.abs((window.engineerViewport.proof?.exact?.volumeMm3??0)-14000)<1e-5);
  const original=await sketchDocument(page);
  // No initial axisId: selecting a reference axis must be a complete input.
  await page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();await page.locator('#cad-feature-revolve').click();
  await page.locator('[data-source-id=limit-practice]').click();await table('Axis').click();await page.locator('[data-source-id=datum-y]').click();await current({});
  assert.equal(await page.evaluate(()=>Object.hasOwn(JSON.parse(window.engineerViewport.proof.operationState.inputSignature),'axisId')),false);
  await page.locator('[data-feature-boolean=none]').click();await current({operation:'none'});await endDraft();

  // The preferred Boolean survives automatic None in each material mode.
  for(const operation of ['add','cut','intersect']){
   await page.locator('#cad-extrude-sketch').click();await page.locator('[data-source-id=limit-practice]').click();await current({});
   await page.locator('[data-feature-boolean='+operation+']').click();await number('start',30);await number('end',40);await current({operation,start:30,end:40});
   assert.equal(await page.locator('[data-feature-boolean=none]').getAttribute('aria-pressed'),'true');
   for(const other of ['add','cut','intersect'])assert.equal(await page.locator('[data-feature-boolean='+other+']').isDisabled(),true);
   await number('start',0);await number('end',5);await current({operation,start:0,end:5});
   assert.equal(await page.locator('[data-feature-boolean='+operation+']').getAttribute('aria-pressed'),'true');
   for(const other of ['add','cut','intersect'])assert.equal(await page.locator('[data-feature-boolean='+other+']').isDisabled(),false);
   await endDraft();
  }
  assert.deepEqual(await sketchDocument(page),original,'All contact and Boolean changes so far are read-only previews.');

  // Applying automatic None retains the preferred mode when reopening the editor.
  await page.locator('#cad-extrude-sketch').click();await page.locator('[data-source-id=limit-practice]').click();await page.locator('[data-feature-boolean=cut]').click();await number('start',30);await number('end',40);await current({operation:'cut',start:30,end:40});
  await sketchCommit(page,()=>apply.click());const remembered=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='sketch-extrusion').at(-1);assert.equal(remembered.data.operation,'none');assert.equal(remembered.data.booleanPreference,'cut');
  await page.locator('[data-source-id="'+remembered.id+'"]').dblclick();await current({operation:'cut'});assert.equal(await page.locator('[data-feature-boolean=none]').getAttribute('aria-pressed'),'true');
  await number('start',0);await number('end',5);await current({operation:'cut',start:0,end:5});assert.equal(await page.locator('[data-feature-boolean=cut]').getAttribute('aria-pressed'),'true');await endDraft();
  await sketchCommit(page,()=>page.locator('#cad-undo').click());assert.deepEqual((await sketchDocument(page)).native.graph,original.native.graph);

  // Build and edit reversed limits; choose exact faces of the previous model.
  await page.locator('#cad-extrude-sketch').click();await page.locator('[data-source-id=limit-practice]').click();await page.locator('[data-feature-boolean=none]').click();
  await number('start',10);await number('end',-10);await current({start:10,end:-10});
  assert.ok(Math.abs(await page.evaluate(()=>window.engineerViewport.proof.exact.volumeMm3)-14720)<1e-5);
  const layout=await form.evaluate(form=>{const section=n=>form.querySelector('[data-feature-section='+n+']');const boolean=section('boolean'),from=form.querySelector('[data-limit-side=start] .feature-limit-heading');return {selection:!!section('selection')?.querySelector('table'),weight:getComputedStyle(section('selection').querySelector('h4')).fontWeight,booleanDelta:Math.abs(boolean.querySelector('h4').getBoundingClientRect().y+boolean.querySelector('h4').getBoundingClientRect().height/2-(boolean.querySelector('button').getBoundingClientRect().y+16)),fromDelta:Math.abs(from.querySelector('h5').getBoundingClientRect().y+from.querySelector('h5').getBoundingClientRect().height/2-(from.querySelector('button').getBoundingClientRect().y+from.querySelector('button').getBoundingClientRect().height/2)),fromBorder:getComputedStyle(from.parentElement).borderTopWidth};});
  assert.equal(layout.selection,true);assert.ok(Number(layout.weight)>=600);assert.ok(layout.booleanDelta<4&&layout.fromDelta<4,JSON.stringify(layout));assert.equal(layout.fromBorder,'0px');
  await sketchCommit(page,()=>apply.click());const edited=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='sketch-extrusion').at(-1);
  await page.locator('[data-source-id="'+edited.id+'"]').dblclick();await current({});
  assert.equal(await page.evaluate(()=>window.engineerViewport.renderer.scene.models[0].featureId),'unite-bridge');
  await number('start',0);await mode('end','Until Selected').click();await page.waitForFunction(()=>window.engineerViewport.proof?.preview===false);
  await clickWorld([22,20,10]);await table('To reference').getByRole('table').getByText(/Face ·/).waitFor();await current({endMode:'selected'});
  await mode('end','Offset from Selected').click();await number('end',2);await current({endMode:'offset',end:2});
  assert.ok(Math.abs(await page.evaluate(()=>window.engineerViewport.proof.exact.volumeMm3)-14432)<1e-5);
  await sketchCommit(page,()=>apply.click());const updated=(await sketchDocument(page)).native.graph.features.find(f=>f.id===edited.id);assert.equal(updated.data.limits.end.reference.target.producerId,'unite-bridge');assert.equal(updated.data.limits.end.mode,'offset');
  await page.locator('[data-source-id="'+edited.id+'"]').dblclick();await current({});await mode('end','Offset from Selected').click();await table('To reference').getByRole('button',{name:/Clear to reference/}).click();await page.waitForFunction(()=>window.engineerViewport.proof?.preview===false);await clickWorld([22,20,10]);await current({endMode:'offset',end:2});await endDraft();

  // A Model sketch line is a selectable analytic axis, alongside B-Rep edges.
  await page.locator('#cad-feature-revolve').click();await table('Sketch').click();await page.locator('[data-source-id=revolve-practice]').click();await table('Axis').click();await page.locator('[data-source-id=datum-y]').click();await page.locator('[data-feature-boolean=none]').click();await current({operation:'none'});
  await page.evaluate(()=>window.engineerViewport.renderer.normal([0,0,-1]));await page.locator('#proof-filter').selectOption('edge');await page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();await table('Axis').click();await clickWorld([0,15,0]);await table('Axis').getByRole('table').getByText(/Edge ·/).waitFor();await current({operation:'none'});
  await page.locator('#proof-filter').selectOption('auto');await page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();await table('Axis').click();await clickWorld([65,8,0]);await table('Axis').getByRole('table').getByText(/practice-axis/).waitFor();await current({operation:'none'});
  const axisInput=await page.evaluate(()=>JSON.parse(window.engineerViewport.proof.operationState.inputSignature));assert.equal(axisInput.axisReference.target.kind,'sketch');assert.equal(axisInput.axisId,'practice-axis');
  await sketchCommit(page,()=>apply.click());
  const revolved=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='sketch-extrusion').at(-1);assert.equal(revolved.data.form,'revolve');assert.equal(revolved.data.axisReference.target.role,'practice-axis');
  if(evidence)await page.screenshot({path:join(evidence,'feature-refinements.png')});
  assert.deepEqual(await page.evaluate(()=>window.engineerViewport.renderer.errors),[]);
  report.featureRefinements={passed:true,editFaceLimit:true,editOffsetFaceLimit:true,invertedBounds:true,booleanMemory:true,persistedBooleanPreference:true,inlineSectionHeaders:true,externalAxisWithoutLegacyId:true,modelEdgeAxis:true,modelSketchLineAxis:true};
 }catch(error){console.error('Refinement state',await page.evaluate(()=>({hint:document.querySelector('#wb-hint')?.textContent,fields:document.querySelector('#feature-operation-fields')?.textContent,proof:window.engineerViewport.proof?.operationState,renderer:window.engineerViewport.renderer.info,errors:window.engineerViewport.renderer.errors})).catch(()=>null));if(evidence)await page.screenshot({path:join(evidence,'feature-refinements-failure.png')}).catch(()=>{});throw error;}
 finally{const revision=(await sketchDocument(page)).revision;await page.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:revision,decision:'discard'});}
}
