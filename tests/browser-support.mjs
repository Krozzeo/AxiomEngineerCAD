// Retain the submitted frame while DevTools awaits it; GC can otherwise report a false navigation.
export async function waitViewportFrame(page){const frame=await page.evaluateHandle(()=>({completion:window.engineerViewport.renderer.serial}));try{await frame.evaluate(async retained=>{await retained.completion;});}finally{await frame.dispose();}}
export async function waitEditorIdle(page){
  await page.evaluate(()=>window.engineerSketch?.transition??null);
  await page.locator('body[data-interaction-ready=true][data-workbench-ready=true]').waitFor();
  for(let i=0;i<300;i++){const state=await page.evaluate(async()=>{const headers={Authorization:'Bearer '+sessionStorage.getItem('engineer-token')},r=await fetch('/v1/document',{headers}),p=await fetch('/v1/proof/status',{headers});if(!r.ok||!p.ok)return {busy:true};const d=await r.json(),s=await p.json();return {busy:d.status.busy,proof:s.job?.state};});if(!state.busy&&state.proof!=='running')return;await page.waitForTimeout(50);}throw Error('Editor remained busy during readiness check.');
}

export async function createFirstPart(page,name){
 await page.waitForFunction(()=>!!window.engineerProjectBrowser);await page.locator('.wb-menubar details').filter({has:page.getByText('Create',{exact:true})}).locator('summary').click();await page.getByRole('button',{name:'New part/assembly',exact:true}).click();await page.locator('#project-icons .inline-name').fill(name);await Promise.all([page.waitForEvent('load'),page.locator('#project-icons .inline-name').press('Enter')]);await page.waitForFunction(()=>window.engineerWorkspace&&!window.engineerWorkspace.empty&&!!window.engineerViewport?.presentedManifest);await waitEditorIdle(page);
}
