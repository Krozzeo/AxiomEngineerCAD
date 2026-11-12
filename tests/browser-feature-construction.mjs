import assert from 'node:assert/strict';
import {join} from 'node:path';
import {sketchCommit,sketchDocument,sketchSettled,sketchScreen} from './browser-sketch.mjs';
import {waitEditorIdle} from './browser-support.mjs';

export async function verifyFeatureConstructionUI({context,host,observe,evidence,report}){
 const entry=host.manager.catalog().recents.find(p=>p.name==='E3.M2 Feature Construction');assert.ok(entry);
 let session,page;
 const open=async()=>{session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path});page=await context.newPage();observe(page);page.on('response',async response=>{if(response.url().endsWith('/v1/cad/invoke')){const r=await response.json().catch(()=>null);if(r?.receipt?.error)console.error('Construction receipt',r.receipt.error);}});await page.goto(session.editorUrl);await waitEditorIdle(page);};
 const close=async()=>{const revision=(await sketchDocument(page)).revision;await page.close();await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:revision,decision:'discard'});session=null;};
 const volume=n=>page.waitForFunction(expected=>Math.abs((window.engineerViewport.proof?.exact?.volumeMm3??0)-expected)<1e-4,n);
 try{
  await open();await volume(14000);
  await page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();
  await page.locator('#cad-extrude-sketch').click();
  await page.locator('#feature-operation-editor:not([hidden])').waitFor();
  assert.equal(await page.locator('#cad-extrude-sketch').getAttribute('aria-pressed'),'true');
  const form=page.locator('#feature-operation-form'),source=form.locator('.operation-selection').filter({has:page.getByRole('table',{name:'Sketch',exact:true})});
  assert.match(await source.textContent(),/Select geometry/);
  await page.locator('[data-source-id=limit-practice]').click();
  await source.getByRole('table').getByText('limit-practice',{exact:true}).waitFor();
  await page.locator('[data-feature-boolean=none]').click();
  const start=form.locator('[data-limit-side=start]');await start.getByRole('button',{name:'Symmetric Value',exact:true}).click();
  await page.locator('#extrusion-start-value').fill('2');await page.locator('#extrusion-start-value').press('Enter');
  await page.waitForFunction(()=>window.engineerViewport.proof?.preview===true);
  await sketchCommit(page,()=>form.getByRole('button',{name:'Apply',exact:true}).click());
  await volume(14144);assert.equal(await page.evaluate(()=>window.engineerViewport.proof.exact.validity.solids),2);
  await page.locator('#cad-feature-plane').click();
  await page.locator('[data-source-id=datum-xy]').click();
  const relations=form.locator('select').filter({has:page.locator('option[value=offset]')});
  await relations.first().selectOption('offset');
  await page.locator('#reference-value-0').fill('7');await page.locator('#reference-value-0').press('Enter');
  await sketchCommit(page,()=>form.getByRole('button',{name:'Apply',exact:true}).click());
  const created=(await sketchDocument(page)).native.graph.features.filter(f=>f.type==='reference-geometry').at(-1);assert.equal(created.data.references[0].value,7);
  await page.locator('[data-source-id="'+created.id+'"]').click();
  await page.locator('.ribbon-tabs').getByRole('tab',{name:'Sketch',exact:true}).click();await page.locator('#edit-sketch-new').click();
  await page.locator('#new-sketch-create:not([disabled])').click();await page.waitForFunction(()=>!!window.engineerSketch?.state);await sketchSettled(page);
  assert.deepEqual(await page.evaluate(()=>window.engineerSketch.frame.origin),[0,0,7]);
  await page.locator('[data-sketch-tool=line]').click();
  const activeSketch=await page.evaluate(()=>window.engineerSketch.state.id),rapidStart=performance.now();
  let delayFirstPlacement=true;
  const delayPlacement=async route=>{
   if(delayFirstPlacement&&route.request().postDataJSON()?.toolName==='cad.sketch.entity.add.v1'){
    delayFirstPlacement=false;const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,250));await route.fulfill({response});
   }else await route.continue();
  };
  await page.route('**/v1/cad/invoke',delayPlacement);
  await page.keyboard.down('Control');
  for(let i=0;i<12;i++){
   const a=await sketchScreen(page,-20,-5+i*.6),b=await sketchScreen(page,-10,-5+i*.6);
   await page.mouse.click(a.x,a.y);await page.mouse.click(b.x,b.y);if(i===0)assert.ok(await page.locator('[data-sketch-entity=pending]').count(),'Provisional geometry must be visible before the delayed native response.');
  }
  await page.keyboard.up('Control');const inputDurationMs=performance.now()-rapidStart;
  await sketchSettled(page);await page.unroute('**/v1/cad/invoke',delayPlacement);
  assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===activeSketch).data.entities.length,12,'Rapid clicks must preserve every independent line.');
  await page.locator('#proof-canvas').focus();await sketchCommit(page,()=>page.keyboard.press('Control+z'));
  assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===activeSketch).data.entities.length,11);
  await page.locator('#proof-canvas').focus();await sketchCommit(page,()=>page.keyboard.press('Control+y'));
  assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===activeSketch).data.entities.length,12);

  const beforeInvalid=await sketchDocument(page),invalid=await sketchScreen(page,-22,8);
  await page.keyboard.down('Control');await page.mouse.click(invalid.x,invalid.y);await page.mouse.click(invalid.x,invalid.y);await page.keyboard.up('Control');await sketchSettled(page);
  assert.deepEqual(await sketchDocument(page),beforeInvalid,'A rejected queued entity must preserve the last confirmed document.');
  await page.locator('#edit-sketch-exit').click();await sketchSettled(page);
  await page.locator('.ribbon-tabs').getByRole('tab',{name:'Features',exact:true}).click();
  await page.locator('#cad-feature-mirror').click();await page.locator('#cad-cancel-feature').click();await page.locator('#feature-operation-editor').waitFor({state:'hidden'});
  assert.equal(await page.locator('#cad-feature-mirror').getAttribute('aria-pressed'),'false');
  await volume(14144);
  if(evidence)await page.screenshot({path:join(evidence,'feature-construction.png')});
  const saved=page.waitForResponse(r=>r.url().endsWith('/v1/save'));await page.locator('#save').click();assert.equal((await saved).status(),200);
  await close();await open();await volume(14144);
  assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id===created.id).data.references[0].value,7);
  report.featureConstruction={passed:true,openWithoutSelection:true,sharedSelectionTables:true,booleanNone:true,symmetricLimit:true,referencePlane:true,newSketchOnReference:true,cancelFeature:true,rapidLines:12,provisionalBeforeDelayedResponse:true,independentUndo:true,invalidQueuedEntityPreservesSource:true,inputDurationMs,saveReopen:true};
 }catch(error){console.error('Feature construction state',await page?.evaluate(()=>({hint:document.querySelector('#wb-hint')?.textContent,proof:document.querySelector('#proof-status')?.textContent,version:document.querySelector('.stage')?.textContent,fields:document.querySelector('#feature-operation-fields')?.textContent?.slice(0,250)})));if(evidence)await page?.screenshot({path:join(evidence,'feature-construction-failure.png')}).catch(()=>{});throw error;}finally{if(session)await close().catch(()=>page?.close().catch(()=>{}));}
}
