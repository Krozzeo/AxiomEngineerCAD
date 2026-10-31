export async function waitEditorIdle(page){
  await page.locator('body[data-workbench-ready=true]').waitFor();
  for(const shell of page.context().pages()){if(/\/editor\/axiom.engineer-cad\//.test(shell.url()))await shell.frameLocator('#product').locator('body[data-workbench-ready=true]').waitFor();}
  for(let i=0;i<300;i++){const state=await page.evaluate(async()=>{const headers={Authorization:'Bearer '+sessionStorage.getItem('engineer-token')},r=await fetch('/v1/document',{headers}),p=await fetch('/v1/proof/status',{headers});if(!r.ok||!p.ok)return {busy:true};const d=await r.json(),s=await p.json();return {busy:d.status.busy,proof:s.job?.state};});if(!state.busy&&state.proof!=='running')return;await page.waitForTimeout(50);}throw Error('Editor remained busy during readiness check.');
}
