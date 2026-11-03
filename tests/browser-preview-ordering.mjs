import assert from 'node:assert/strict';
import {sketchDocument} from './browser-sketch.mjs';

export async function verifyPreviewOrderingUI({page:p,report}){
 const current=await sketchDocument(p);
 await p.locator('#proof-status').filter({hasText:'Built from revision '+current.revision}).waitFor();
 const evidence=[];
 for(const phase of ['status','result']){
  let release,entered,arrivalTimer,held=false,previous;
  const gate=new Promise(resolve=>release=resolve),arrived=new Promise(resolve=>entered=resolve);
  const delayed=async route=>{
   if(held){await route.continue();return;}held=true;
   // APIRequest cloning needs the same authorized origin as the browser request.
   const response=await route.fetch({headers:{...route.request().headers(),Origin:new URL(p.url()).origin}});
   previous={status:response.status(),body:await response.json()};entered();await gate;await route.fulfill({response});
  };
  const pattern='**/v1/proof/'+phase;
  async function disable(){await p.locator('[data-source-id=extrusion-plate]').click({button:'right'});await p.getByRole('menuitem',{name:'Disable',exact:true}).click();}
  if(phase==='status'){await disable();await p.waitForFunction(()=>window.engineerViewport.proof?.exact===null);}
  await p.route(pattern,delayed);
  try{
   // Deliver a genuine completed old response after the next build is accepted.
   // Domain source and geometry are never substituted or mocked.
   if(phase==='result')await disable();
   await Promise.race([arrived,new Promise((_,reject)=>{arrivalTimer=setTimeout(()=>reject(Error('Expected old preview '+phase+' response was not requested.')),10000);})]);clearTimeout(arrivalTimer);assert.equal(previous.status,200,JSON.stringify(previous.body));
   await p.locator('[data-source-id=extrusion-plate].feature-disabled').waitFor();
   const built=p.waitForResponse(r=>r.url().endsWith('/v1/proof/build')&&r.request().method()==='POST');built.catch(()=>{});
   await p.locator('[data-source-id=extrusion-plate]').click({button:'right'});
   await p.getByRole('menuitem',{name:'Enable',exact:true}).click();
   const response=await built;assert.equal(response.status(),200,await response.text());const next=await response.json();
   await p.locator('#proof-status').filter({hasText:'Building exact geometry and current semantic selection'}).waitFor();
   await p.evaluate(()=>{window.previewPresentedRevisions=[];window.previewOrderingListener=event=>window.previewPresentedRevisions.push(event.detail?.revision);window.addEventListener('engineer-proof-built',window.previewOrderingListener);});
   release();const source=await sketchDocument(p);
   assert.ok((phase==='status'?previous.body.job.baseRevision:previous.body.revision)<source.revision);assert.equal(next.job.baseRevision,source.revision);
   try{await p.waitForFunction(revision=>window.engineerViewport.proof?.revision===revision&&window.engineerViewport.proof.exact?.volumeMm3>11000,source.revision);await p.locator('#proof-status').filter({hasText:'Built from revision '+source.revision}).waitFor();}
   catch(error){throw Error('Delayed preview '+phase+' lost the newer build: '+JSON.stringify(await p.evaluate(()=>({hint:document.querySelector('#wb-hint').textContent,status:document.querySelector('#proof-status').textContent,proof:window.engineerViewport.proof&&{revision:window.engineerViewport.proof.revision,exact:window.engineerViewport.proof.exact}}))),{cause:error});}
   const shown=await p.evaluate(()=>window.previewPresentedRevisions);assert.ok(shown.length);assert.ok(shown.every(revision=>revision===source.revision),JSON.stringify(shown));
   assert.equal(source.native.graph.features.find(f=>f.id==='extrusion-plate').disabled,undefined);evidence.push({phase,oldRevision:phase==='status'?previous.body.job.baseRevision:previous.body.revision,currentRevision:source.revision,onlyCurrentRevisionPresented:true});
  }finally{clearTimeout(arrivalTimer);release();await p.unroute(pattern,delayed);await p.evaluate(()=>{if(window.previewOrderingListener)window.removeEventListener('engineer-proof-built',window.previewOrderingListener);});}
 }
 report.previewOrdering={realServerResponses:true,oldStatusAndResultHeldAcrossEnable:true,newerBuildPresented:true,staleResultNotPublished:true,evidence};
}
