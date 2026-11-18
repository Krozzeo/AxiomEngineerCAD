import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waitEditorIdle} from './browser-support.mjs';

export async function verifyStartupRecovery({context,host,observe,report}){
 const session=await host.manager.execute({operationId:crypto.randomUUID(),action:'create',productId:'axiom.engineer-cad',name:'Editor startup recovery acceptance'});
 const entry=host.manager.catalog().recents.find(p=>p.name==='Editor startup recovery acceptance'),original=await readFile(entry.path),page=await context.newPage();observe(page);
 let blocked=0;const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const denyModule=route=>{blocked++;return route.abort('failed');};
 try{
  let releaseModule,moduleSeen;const gate=new Promise(resolve=>releaseModule=resolve),seen=new Promise(resolve=>moduleSeen=resolve);const delayModule=async route=>{moduleSeen();await gate;await route.continue();};await page.route('**/parameter-manager.mjs',delayModule);const navigation=page.goto(session.editorUrl);
  try{await seen;assert.equal(await page.evaluate(()=>document.body.inert),true);await page.evaluate(()=>{window.__startupClicks=0;document.querySelector('#panels-menu > summary').addEventListener('click',()=>window.__startupClicks++);});const click=page.locator('#panels-menu > summary').click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>window.__startupClicks),0);releaseModule();await navigation;await click;assert.equal(await page.evaluate(()=>window.__startupClicks),1);await page.locator('#panels-menu > summary').click();await waitEditorIdle(page);}finally{releaseModule();await page.unroute('**/parameter-manager.mjs',delayModule);}
  await page.route('**/interaction-workbench.mjs',denyModule);await page.reload();
  await page.getByRole('alert').filter({hasText:'The editor could not finish loading'}).waitFor();
  assert.equal(blocked,1);assert.equal(await page.evaluate(()=>[...document.body.children].filter(n=>n.id!=='editor-startup-error').every(n=>n.inert)),true);assert.equal(await page.evaluate(()=>document.body.dataset.editorReady),'false');assert.deepEqual(errors,[]);assert.deepEqual(await readFile(entry.path),original);
  await page.unroute('**/interaction-workbench.mjs',denyModule);
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Reload editor',exact:true}).click()]);
  await waitEditorIdle(page);assert.equal(await page.locator('#editor-startup-error').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(await readFile(entry.path),original);
  report.startupRecovery={earlyControlsWaitForCompleteBootstrap:true,realModuleFetchDenied:true,visibleFailure:true,partialEditorLocked:true,notMarkedReadyOnFailure:true,noUnhandledRejection:true,reloadRestoresEditor:true,nativeFilePreserved:true};
 }finally{
  page.on('dialog',d=>d.accept());await page.close();const current=await host.manager.execute({operationId:crypto.randomUUID(),action:'status',sessionId:session.sessionId});
  await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:current.status.revision,decision:'discard'});
 }
}
