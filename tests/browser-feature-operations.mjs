import assert from 'node:assert/strict';
import {join} from 'node:path';
import {sketchCommit,sketchDocument} from './browser-sketch.mjs';
import {waitEditorIdle} from './browser-support.mjs';

const initial=Math.PI*(8**2*26+35**2*6-4*2**2*6-(8**2-6**2)*4);
export async function verifyFeatureOperationsUI({context,host,evidence,observe,report}){
 const entry=host.manager.catalog().recents.find(item=>item.name==='E3.M2 Shaft and Flange');
 assert.ok(entry,'The current E3.M2 demo is missing.');
 const open=()=>host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path:entry.path});
 let session=await open(),page=await context.newPage();
 const checkVolume=expected=>page.waitForFunction(value=>Math.abs((window.engineerViewport.proof?.exact?.volumeMm3??0)-value)<1e-5,expected);
 const close=async()=>{
  const doc=await sketchDocument(page);
  await page.close();
  await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:doc.revision,decision:'discard'});
  session=null;
 };
 try{
  observe(page);await page.goto(session.editorUrl);await waitEditorIdle(page);await checkVolume(initial);
  if(evidence)await page.screenshot({path:join(evidence,'e3-m2-shaft-flange.png')});
  await page.locator('[data-source-id=linear-holes]').dblclick();
  const field=page.locator('[data-feature-setting=count]');await field.fill('3');await field.press('Enter');
  await page.waitForFunction(()=>window.engineerViewport.proof?.preview===true);
  await sketchCommit(page,()=>page.locator('#feature-operation-form').getByRole('button',{name:'Apply',exact:true}).click());
  const expected=initial-Math.PI*2**2*6;
  await checkVolume(expected);
  assert.equal((await sketchDocument(page)).native.graph.features.find(f=>f.id==='linear-holes').data.repeat.count,3);
  const saved=page.waitForResponse(r=>r.url().endsWith('/v1/save'));await page.locator('#save').click();assert.equal((await saved).status(),200);
  await close();
  session=await open();page=await context.newPage();observe(page);await page.goto(session.editorUrl);await waitEditorIdle(page);await checkVolume(expected);
  report.featureOperations={passed:true,initialVolumeMm3:initial,editedVolumeMm3:expected,associativeCount:true,saveReopen:true};
 }finally{
  if(session){await close().catch(()=>page.close().catch(()=>{}));}
 }
}
