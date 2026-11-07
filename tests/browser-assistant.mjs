import {waitEditorIdle} from './browser-support.mjs';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {sketchDocument} from './browser-sketch.mjs';

export async function verifyAssistantUI({context,host,observe,evidence}){
  let step=0;
  const output=[
    {type:'function_call',call_id:'plan',name:'propose_plan',arguments:'{"summary":"Reconstruct the attached plate."}'},
    {type:'function_call',call_id:'build',name:'cad_command',arguments:'{"name":"cad.drawing.reconstruct.v1","inputJson":"{}"}'},
    {type:'message',role:'assistant',content:[{type:'output_text',text:'The candidate is ready.'}]}
  ];
  const ai=host.manager.ai,old={provider:ai.provider,verified:ai.verified,defaults:ai.defaults};
  ai.provider={id:'openai',key:'synthetic-browser-test',config:{},async request(path,{body}){
    if(path==='/models')return {data:[{id:'gpt-5.6-luna'},{id:'experimental-model'},{id:'whisper-1'}]};
    assert.equal(path,'/responses');
    if(body.tool_choice==='none')return {status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'OK'}]}],usage:{total_tokens:2}};
    assert.equal(body.model,'gpt-5.6-luna');
    assert.equal(body.reasoning.effort,'medium');
    return {status:'completed',output:[output[step++]],usage:{total_tokens:10}};
  }};
  ai.verified=true;ai.defaults={model:'gpt-5.6-luna',reasoning:'medium'};ai.changed();
  const entry=host.manager.catalog().recents.find(item=>item.name==='E2.M4 Drawing Reconstruction');
  const folder=await mkdtemp(join(host.manager.root,'assistant-demo-')),path=join(folder,'project.engineer-provisional.json');
  const sampleProject=JSON.parse(await readFile(entry.path,'utf8'));
  sampleProject.documentId='engineer-document://'+crypto.randomUUID();
  sampleProject.metadata.name='Assistant browser acceptance fixture';
  await writeFile(path,JSON.stringify(sampleProject));
  const session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:entry.productId,path});
  const page=await context.newPage();observe(page);
  try{
    await page.goto(session.editorUrl);
    await page.locator('body[data-dock-ready=true]').waitFor();
    await waitEditorIdle(page);
    await page.locator('#panels-menu summary').click();
    await page.locator('[data-open-panel=api]').click();
    const geometry=await page.locator('.cad-api-index').evaluate(node=>({
      bottom:node.getBoundingClientRect().bottom,panelBottom:node.closest('#api-content').getBoundingClientRect().bottom,
      height:node.clientHeight,scrollHeight:node.scrollHeight
    }));
    assert.ok(geometry.height>200&&Math.abs(geometry.bottom-geometry.panelBottom)<2,JSON.stringify(geometry));
    if(evidence)await page.screenshot({path:join(evidence,'pre-e3-api-panel.png')});
    await page.getByRole('searchbox',{name:'Search API'}).fill('drawing.reconstruct');
    await page.getByRole('button',{name:'cad.drawing.reconstruct.v1',exact:true}).click();
    await page.getByRole('heading',{name:'Input schema'}).waitFor();
    await page.locator('#config-menu summary').click();
    await page.getByRole('button',{name:'Config AI assistant',exact:true}).click();
    await page.getByText(/Loaded 2 models/).waitFor();
    assert.equal(await page.locator('#ai-config-dialog option[value=whisper-1]').count(),0);
    assert.match(await page.locator('#ai-config-dialog option[value="experimental-model"]').textContent(),/untested/);
    await page.getByRole('button',{name:'Test selected model',exact:true}).click();
    await page.getByText('Selected model tested successfully.',{exact:true}).waitFor();
    await page.locator('[data-unlimited=maxSeconds]').check();
    await page.getByRole('button',{name:'Save project settings',exact:true}).click();
    await page.getByText('Project settings saved.',{exact:true}).waitFor();
    assert.equal(await page.locator('#ai-maxSeconds').isDisabled(),true);
    if(evidence)await page.screenshot({path:join(evidence,'pre-e3-ai-config.png')});
    await page.locator('dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('button',{name:'GitHub',exact:true}).click();
    await page.getByRole('heading',{name:'GitHub — CAD project'}).waitFor();
    assert.equal(await page.locator('#github-pending').isHidden(),true);
    assert.notEqual(await page.locator('.github-indicator').evaluate(node=>getComputedStyle(node,'::after').content),'none');
    const githubStatus=await page.evaluate(async()=>await (await fetch('/v1/github/status',{
      headers:{Authorization:'Bearer '+sessionStorage.getItem('engineer-token')}
    })).json());
    await page.locator('dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    let linked=false;
    const mockGit=route=>route.fulfill({json:{...githubStatus,connected:true,account:{id:42,login:'synthetic'},
      accountMatches:linked,settings:{...githubStatus.settings,repository:linked?'synthetic/cad':undefined}}});
    const mockRepositories=route=>route.fulfill({json:[]});
    await page.route('**/v1/github/status',mockGit);
    await page.route('**/v1/github/action',mockRepositories);
    for(const [state,color] of [['unlinked','rgb(237, 112, 112)'],['linked','rgb(99, 207, 145)']]){
      linked=state==='linked';
      await page.getByRole('button',{name:'GitHub',exact:true}).click();
      await page.getByText('Successfully connected as synthetic').waitFor();
      const dot=page.locator('#github-pending[data-state="'+state+'"]');
      assert.equal(await dot.evaluate(node=>getComputedStyle(node).backgroundColor),color);
      if(evidence&&!linked)await page.screenshot({path:join(evidence,'pre-e3-github-config.png')});
      await page.locator('dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    }
    await page.unroute('**/v1/github/status',mockGit);
    await page.unroute('**/v1/github/action',mockRepositories);
    await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
    const chat=page.locator('[data-dock=right] #assistant-content');
    await chat.waitFor();
    await chat.locator('.ai-task-details summary').click();
    await chat.getByRole('checkbox',{name:'Share current CAD context with the configured provider'}).check();
    const svg=await readFile(new URL('../app/e2-m4-drawing.svg',import.meta.url));
    await chat.locator('input[type=file]').setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:svg});
    await chat.locator('.ai-task-details summary').click();
    const input=chat.getByRole('textbox',{name:'Message to AI Assistant'});
    await input.fill('Reconstruct this drawing.');
    await input.press('Shift+Enter');
    assert.equal(await input.inputValue(),'Reconstruct this drawing.\n');
    assert.equal(step,0);
    await input.press('Enter');
    await chat.locator('.ai-message.user').filter({hasText:'Reconstruct this drawing.'}).waitFor();
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
    if(evidence){
      await page.screenshot({path:join(evidence,'pre-e3-assistant-chat-right.png')});
      await page.getByLabel('Dock assistant',{exact:true}).selectOption('center');
      const center=page.locator('[data-dock=center] #assistant-content');
      await center.waitFor();await page.screenshot({path:join(evidence,'pre-e3-assistant-chat.png')});
      await page.getByLabel('Dock assistant',{exact:true}).selectOption('right');
      await chat.waitFor();
    }
    await chat.getByRole('button',{name:'Review changes',exact:true}).click();
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
