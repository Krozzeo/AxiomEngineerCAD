// Observe completion inside the page: DevTools awaits weak Promise handles and GC can report a false navigation.
export async function waitViewportFrame(page){const id=crypto.randomUUID();await page.evaluate(id=>{const waits=window.__engineerFrameWaits??=new Map(),state={done:false,error:null};waits.set(id,state);window.engineerViewport.renderer.serial.then(()=>{state.done=true;},error=>{state.error=String(error);state.done=true;});},id);try{await page.waitForFunction(id=>window.__engineerFrameWaits.get(id)?.done,id);const error=await page.evaluate(id=>window.__engineerFrameWaits.get(id).error,id);if(error)throw Error('Viewport frame failed: '+error);}finally{await page.evaluate(id=>window.__engineerFrameWaits.delete(id),id);}}
export async function waitEditorIdle(page){
  await page.waitForFunction(()=>document.body.dataset.editorReady==='true'||!!document.getElementById('editor-startup-error'));
  if(await page.locator('#editor-startup-error').count())throw Error((await page.locator('#editor-startup-error').textContent())+' '+(await page.locator('#editor-startup-error').getAttribute('data-error')??''));
  await page.evaluate(()=>window.engineerSketch?.transition??null);
  await page.locator('body[data-interaction-ready=true][data-workbench-ready=true]').waitFor();
  for(let i=0;i<300;i++){const state=await page.evaluate(async()=>{try{const headers={Authorization:'Bearer '+sessionStorage.getItem('engineer-token')},r=await fetch('/v1/document',{headers}),p=await fetch('/v1/proof/status',{headers});if(!r.ok||!p.ok)return {busy:true};const d=await r.json(),s=await p.json();return {busy:d.status.busy,proof:s.job?.state};}catch(error){if(error.name==='AbortError')return {busy:true};throw error;}});if(!state.busy&&state.proof!=='running')return;await page.waitForTimeout(50);}throw Error('Editor remained busy during readiness check.');
}

export async function createFirstPart(page,name){
 await waitEditorIdle(page);
 await page.waitForFunction(()=>!!window.engineerProjectBrowser);await page.locator('.wb-menubar details').filter({has:page.getByText('Create',{exact:true})}).locator('summary').click();await page.getByRole('button',{name:'New part/assembly',exact:true}).click();await page.locator('#project-icons .inline-name').fill(name);await page.locator('#project-icons .inline-name').press('Enter');await page.waitForFunction(()=>window.engineerWorkspace&&!window.engineerWorkspace.empty&&!!window.engineerViewport?.presentedManifest);await waitEditorIdle(page);
}

// Version refresh/acknowledgement can advance the document while a view is building.
// Compare against the live revision instead of capturing a superseded revision once.
export async function waitCurrentViewport(page){
 await waitEditorIdle(page);
 await page.waitForFunction(async()=>{
  const state=window.engineerComponentVersionState?.();
  if(window.engineerWorkspaceTransition||state?.busy||state?.loading)return false;
  try{const {api}=await import('/cad-commands.mjs'),doc=(await api('document')).document,v=window.engineerViewport;
   const settled=window.engineerComponentVersionState?.();
   return !window.engineerWorkspaceTransition&&!settled?.busy&&!settled?.loading&&doc.documentId===window.engineerWorkspace?.activeDocumentId&&v?.proof?.revision===doc.revision&&v.presentedManifest===v.proof.manifestId&&!v.requestState.job;
  }catch(error){if(error.name==='AbortError')return false;throw error;}
 });
}

// A successful save response precedes the automatic rebuild. Positive UI flows
// wait for the editor's completion signal and worker idleness before more work.
export async function saveAndWait(page){
 await waitEditorIdle(page);
 const owner=typeof page.page==='function'?page.page():page,response=owner.waitForResponse(r=>r.url().endsWith('/v1/save'));
 await page.locator('#save').click();const result=await response;
 if(result.status()!==200)throw Error('Save rejected: '+await result.text());
 await page.waitForFunction(()=>document.querySelector('#message')?.textContent==='Document saved locally.');
 await waitEditorIdle(page);return result;
}
