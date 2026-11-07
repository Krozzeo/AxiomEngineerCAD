import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {sketchDocument} from './browser-sketch.mjs';

export async function verifyAssistantUI({context,host,observe}){
  let step=0;
  const output=[
    {type:'function_call',call_id:'plan',name:'propose_plan',arguments:'{"summary":"Reconstruct the attached plate."}'},
    {type:'function_call',call_id:'build',name:'cad_command',arguments:'{"name":"cad.drawing.reconstruct.v1","inputJson":"{}"}'},
    {type:'message',role:'assistant',content:[{type:'output_text',text:'The candidate is ready.'}]}
  ];
  const ai=host.manager.ai,old={provider:ai.provider,verified:ai.verified,defaults:ai.defaults};
  ai.provider={id:'openai',key:'synthetic-browser-test',config:{},async request(path,{body}){
    assert.equal(path,'/responses');
    assert.equal(body.model,'gpt-5.6-luna');
    assert.equal(body.reasoning.effort,'medium');
    return {status:'completed',output:[output[step++]],usage:{total_tokens:10}};
  }};
  ai.verified=true;ai.defaults={model:'gpt-5.6-luna',reasoning:'medium'};ai.changed();
  const entry=host.manager.catalog().recents.find(item=>item.name==='E2.M4 Drawing Reconstruction');
  const folder=await mkdtemp(join(host.manager.root,'assistant-demo-')),path=join(folder,'project.engineer-provisional.json');
  const sampleProject=JSON.parse(await readFile(entry.path,'utf8'));
  sampleProject.documentId='engineer-document://'+crypto.randomUUID();
  await writeFile(path,JSON.stringify(sampleProject));
  const session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path});
  const page=await context.newPage();observe(page);
  try{
    await page.goto(session.editorUrl);
    await page.locator('body[data-dock-ready=true]').waitFor();
    await page.locator('#panels-menu summary').click();
    await page.locator('[data-open-panel=api]').click();
    await page.getByRole('searchbox',{name:'Search API'}).fill('drawing.reconstruct');
    await page.getByRole('button',{name:'cad.drawing.reconstruct.v1',exact:true}).click();
    await page.getByRole('heading',{name:'Input schema'}).waitFor();
    await page.locator('#config-menu summary').click();
    await page.getByRole('button',{name:'Config AI assistant',exact:true}).click();
    await page.getByRole('button',{name:'Save project settings',exact:true}).click();
    await page.getByText('Project settings saved.',{exact:true}).waitFor();
    await page.locator('dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'GitHub',exact:true}).click();
    await page.getByRole('heading',{name:'Config GitHub'}).waitFor();
    await page.locator('dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
    const chat=page.locator('[data-dock=right] #assistant-content');
    await chat.waitFor();
    await chat.getByRole('checkbox',{name:'Share current CAD context with the configured provider'}).check();
    const svg=await readFile(new URL('../app/e2-m4-drawing.svg',import.meta.url));
    await chat.locator('input[type=file]').setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:svg});
    await chat.getByRole('textbox',{name:'Message to AI Assistant'}).fill('Reconstruct this drawing.');
    await chat.getByRole('button',{name:'Send',exact:true}).click();
    await chat.getByRole('button',{name:'Apruebo',exact:true}).waitFor();
    assert.equal((await sketchDocument(page)).native.graph.features.length,0);
    await chat.getByRole('button',{name:'Apruebo',exact:true}).click();
    await chat.getByRole('button',{name:'Preview',exact:true}).click();
    await page.waitForFunction(()=>window.engineerViewport.proof?.proposalId&&window.engineerViewport.proof.exact?.volumeMm3>0);
    await page.locator('[data-source-id=drawing-extrusion]').waitFor();
    await chat.getByRole('button',{name:'Drawing',exact:true}).click();
    await page.waitForFunction(()=>window.engineerViewport.proof?.drawing?.dimension?.valueMm===48);
    await chat.getByRole('button',{name:'MAIN',exact:true}).click();
    await page.waitForFunction(()=>window.engineerViewport.proof&&!window.engineerViewport.proof.proposalId&&!window.engineerViewport.proof.exact);
    await chat.getByRole('button',{name:'Review / Apply',exact:true}).click();
    await page.locator('#review-drawing-evidence').filter({hasText:'Maximum deviation 0.000000 mm'}).waitFor();
    await page.locator('#review-confirm').check();
    await page.locator('#review-apply').click();
    await page.locator('#review-dialog').waitFor({state:'hidden'});
    assert.equal((await sketchDocument(page)).native.graph.features.length,2);
  }finally{
    const revision=JSON.parse(await readFile(path,'utf8')).revision;
    await page.close();
    await host.manager.execute({operationId:crypto.randomUUID(),action:'close',sessionId:session.sessionId,expectedRevision:revision,decision:'discard'});
    Object.assign(ai,old);ai.changed();
  }
}
