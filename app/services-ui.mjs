import {api} from './cad-commands.mjs';
import {mountApiPanel} from './api-panel.mjs';

export function mountServices({document,dock,menu,header,assistant,apiPanel}){
  mountApiPanel(document,apiPanel);
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const button=(text,click)=>{const node=make('button',text);node.type='button';node.onclick=click;return node;};
  const dialog=(title,markup)=>{
    const node=document.createElement('dialog');node.className='cad-service-dialog';
    node.innerHTML='<header><h2></h2></header>'+markup;
    node.querySelector('h2').textContent=title;
    node.querySelector('header').append(button('Close',()=>node.close()));document.body.append(node);return node;
  };
  const config=dialog('Config AI assistant',`
    <p data-account></p><button type="button" data-hub>Manage account in Axiom Platform</button>
    <fieldset><legend>Project model</legend>
      <label>Model <input name="model" list="cad-ai-models" placeholder="Same as Platform"></label>
      <datalist id="cad-ai-models"></datalist><button type="button" data-models>Reload available models</button>
      <label>Reasoning effort <select name="reasoning"></select></label>
      <label>Assistant instructions <textarea name="instructions" maxlength="4000" rows="4"></textarea></label>
      <label>Require confirmation <input type="checkbox" name="requireConfirmation"></label>
    </fieldset>
    <fieldset><legend>Task limits</legend>
      <label>Requests <input name="maxRequests" type="number" min="2" max="50"></label>
      <label>Tool calls <input name="maxTools" type="number" min="1" max="60"></label>
      <label>Output tokens / request <input name="maxOutputTokens" type="number" min="512" max="16384"></label>
      <label>Project tokens (0 = unlimited) <input name="maxProjectTokens" type="number" min="0" max="1000000000"></label>
      <label>Tokens / task (0 = unlimited) <input name="maxTaskTokens" type="number" min="0" max="1000000000"></label>
      <label>Seconds <input name="maxSeconds" type="number" min="15" max="300"></label>
    </fieldset>
    <div class="cad-service-actions"><button type="button" data-save>Save project settings</button><button type="button" data-reset-usage>Reset project token counter</button></div><p data-status role="status"></p>`);
  for(const effort of ['platform','default','none','minimal','low','medium','high','xhigh','max']){
    const option=make('option',effort==='platform'?'Same as Platform':effort);option.value=effort;config.querySelector('select').append(option);
  }
  const github=dialog('Config GitHub',`
    <p data-account></p><button type="button" data-hub>Manage account in Axiom Platform</button>
    <fieldset><legend>Destination</legend>
      <label>Available repositories <select name="repositories"><option value="">Choose a repository</option></select></label>
      <button type="button" data-list>Refresh repositories</button>
      <label>Owner / repository <input name="repository" placeholder="owner/repository"></label>
      <label>Publication branch <input name="branch" value="axiom-publication"></label>
      <label>Create branch if needed <input name="createBranch" type="checkbox"></label>
      <button type="button" data-save>Save destination</button>
      <details><summary>Create repository</summary><label>Name <input name="newName" maxlength="100"></label>
        <label>Private repository <input name="private" type="checkbox" checked></label><button type="button" data-create>Create repository</button></details>
    </fieldset>
    <fieldset><legend>Publication</legend>
      <label>Commit summary <input name="message" maxlength="120"></label>
      <div class="cad-service-actions"><button type="button" data-review>Review saved changes</button>
      <button type="button" data-publish disabled>Publish reviewed snapshot</button><button type="button" data-reconcile hidden>Check pending publication</button></div>
      <details><summary>Publication history</summary><ol data-history></ol></details>
    </fieldset><p data-status role="status"></p>`);
  assistant.className='cad-assistant';
  assistant.insertAdjacentHTML('beforeend',`<div class="cad-assistant-log" role="log" aria-live="polite"></div><p class="cad-assistant-status" role="status"></p>
    <div class="cad-service-actions" data-plan hidden></div><div class="cad-service-actions" data-branch hidden></div>
    <form><textarea name="message" rows="3" maxlength="8000" aria-label="Message to AI Assistant" placeholder="Ask about CAD or request a change…"></textarea>
      <label>Orthographic SVG <input name="svg" type="file" accept=".svg,image/svg+xml"></label>
      <label><input name="share" type="checkbox"> Share current CAD context with the configured provider</label>
      <label><input name="confirm" type="checkbox" checked> Require confirmation</label>
      <div class="cad-service-actions"><button type="submit">Send</button><button type="button" data-stop>Stop</button></div></form>`);
  const form=assistant.querySelector('form'),log=assistant.querySelector('[role=log]'),chatStatus=assistant.querySelector('[role=status]');
  let aiState,gitState,reviewPlan,focus='model',viewing=false,changing=false;
  window.addEventListener('engineer-panel-activated',event=>{if(event.detail!=='assistant')focus=event.detail;});
  document.addEventListener('pointerdown',event=>{const panel=event.target.closest?.('.dock-body')?.querySelector(':scope > [id]:not([hidden])');if(panel?.id&&panel.id!=='assistant-content')focus=panel.id==='workbench-labs'?'diagnostics':panel.id.replace(/-content$/,'');});
  const indicator=(name,image)=>{
    const node=button(name,()=>{});node.className='cad-service-indicator';node.setAttribute('aria-label',name);
    const img=make('img','');img.alt='';img.src='/icons/'+image+'.svg';node.replaceChildren(img);
    header.insertBefore(node,header.querySelector('#cad-undo,.stage'));return node;
  };
  const aiIcon=indicator('AI Assistant','ai-off'),gitIcon=indicator('GitHub','github');
  const toolbar=make('div','');toolbar.className='cad-branch-toolbar';toolbar.hidden=true;header.insertBefore(toolbar,aiIcon);
  const run=(node,action)=>async event=>{event?.preventDefault();try{await action();}catch(error){node.textContent=error.message;}};
  const tellHub=(state,section,target)=>{
    if(!state?.platformOrigin){target.textContent='Open this project through Axiom Platform to manage the account.';return;}
    if(window.parent!==window)window.parent.postMessage({kind:'axiom.platform.settings',section},state.platformOrigin);
    else window.open(state.platformOrigin+'/settings/'+section,'_blank','noopener');
  };
  const planButtons=assistant.querySelector('[data-plan]'),chatBranch=assistant.querySelector('[data-branch]');
  async function switchBranch(id,panel=focus==='drawing'?'drawing':'model'){
    const viewport=window.engineerViewport;
    if(window.engineerSketch?.view()||window.engineerOperationFeature)throw Error('Finish the current edit before switching branches.');
    if(changing)return;
    changing=true;
    try{
      if(!id&&panel==='drawing'){
        const {document:main}=await api('document');
        if(!main.experiment&&main.native?.graph.features.filter(feature=>feature.type==='sketch-extrusion'&&!feature.disabled).length!==1)panel='model';
      }
      await viewport.switchProposal(id,panel==='drawing');
      dock.openPanel(panel);
      viewing=!!id;document.body.dataset.aiPreview=String(viewing);
      for(const selector of ['.command-ribbon','#history-content','#parameters-content','#properties-content','#workbench-labs','#inspector-content','#save','#cad-undo']){
        const node=document.querySelector(selector);if(node)node.inert=viewing;
      }
      paintBranches();
    }finally{changing=false;}
  }
  async function review(){
    if(viewing)await switchBranch(null);
    await window.engineerReviewProposal(aiState.proposal);
  }
  async function discard(){
    const id=aiState.proposal,proposal=(await api('cad/status')).proposals.find(item=>item.id===id);
    if(!proposal)throw Error('The proposal has closed.');
    const {context,invoke}=await import('./cad-commands.mjs'),ctx=await context();
    await invoke('proposal.cancel',{proposalId:id},'LocalProposal',{...ctx,scope:{...ctx.scope,workspace:'proposal',proposalId:id},expectedProposalRevision:proposal.revision});
    if(viewing)await switchBranch(null);
    paintAI(await api('assistant/status'));
  }
  function paintBranches(){
    for(const target of [toolbar,chatBranch]){
      target.hidden=!aiState?.proposal&&!viewing;target.replaceChildren();
      if(target.hidden)continue;
      target.append(button(viewing?'MAIN':'Preview',run(chatStatus,()=>switchBranch(viewing?null:aiState.proposal))));
      if(viewing)target.append(button('Model',run(chatStatus,()=>switchBranch(aiState.proposal,'model'))),button('Drawing',run(chatStatus,()=>switchBranch(aiState.proposal,'drawing'))));
      if(aiState?.proposal)target.append(button('Review / Apply',run(chatStatus,review)),button('Discard',run(chatStatus,discard)));
    }
  }
  window.addEventListener('engineer-document-changed',()=>{if(viewing)void run(chatStatus,()=>switchBranch(null))();});
  async function turn(data){
    const next=await api('assistant/turn',data);paintAI(next);
  }
  function paintAI(next){
    const old=JSON.stringify(aiState?.messages);
    aiState=next;
    aiIcon.dataset.connection=next.connected?'linked':'disconnected';
    aiIcon.querySelector('img').src=next.connected?'/icons/ai-on.svg':'/icons/ai-off.svg';
    aiIcon.title=next.connected?'Open AI Assistant · '+next.model:'Configure AI Assistant';
    form.elements.confirm.checked=next.settings.requireConfirmation;
    if(old!==JSON.stringify(next.messages)){
      log.replaceChildren(...next.messages.map(item=>{const p=make('p',item.text);p.dataset.role=item.role;return p;}));log.scrollTop=log.scrollHeight;
    }
    planButtons.hidden=!next.pending;planButtons.replaceChildren();
    if(next.pending)planButtons.append(button('Apruebo',run(chatStatus,()=>turn({action:'approve',id:next.pending.id}))),
      button('Desapruebo',run(chatStatus,()=>turn({action:'reject',id:next.pending.id}))));
    chatStatus.textContent=next.busy?'Working…':next.connected?next.model+' · '+next.reportedTokens+' reported tokens'+(next.unreportedRequests?' · '+next.unreportedRequests+' unreported requests':''):'Connect an AI model in Platform Settings.';
    paintBranches();
  }
  async function refreshAI(){paintAI(await api('assistant/status'));}
  async function openAI(){
    await refreshAI();
    config.querySelector('[data-account]').textContent=(aiState.connected?'Connected · '+aiState.provider:'Disconnected')+' · Platform model: '+(aiState.defaultModel||'—');
    for(const node of config.querySelectorAll('[name]')){
      if(node.type==='checkbox')node.checked=aiState.settings[node.name];else node.value=aiState.settings[node.name];
    }
    if(!config.open)config.showModal();
  }
  config.querySelector('[data-models]').onclick=run(config.querySelector('[data-status]'),async()=>{
    const models=await api('assistant/models');config.querySelector('datalist').replaceChildren(...models.map(model=>{const option=make('option','');option.value=model;return option;}));
  });
  config.querySelector('[data-save]').onclick=run(config.querySelector('[data-status]'),async()=>{
    const settings=Object.fromEntries([...config.querySelectorAll('[name]')].map(node=>[node.name,node.type==='number'?node.valueAsNumber:node.type==='checkbox'?node.checked:node.value]));
    paintAI(await api('assistant/configure',settings));config.querySelector('[data-status]').textContent='Project settings saved.';
  });
  config.querySelector('[data-reset-usage]').onclick=run(config.querySelector('[data-status]'),async()=>{
    paintAI(await api('assistant/configure',{resetUsage:true}));config.querySelector('[data-status]').textContent='Project token counter reset.';
  });
  config.querySelector('[data-hub]').onclick=()=>tellHub(aiState,'ai',config.querySelector('[data-status]'));
  form.elements.confirm.onchange=run(chatStatus,async()=>{paintAI(await api('assistant/configure',{requireConfirmation:form.elements.confirm.checked}));});
  form.onsubmit=run(chatStatus,async()=>{
    const text=form.elements.message.value.trim(),file=form.elements.svg.files[0];
    if(!text)return;
    if(file&&file.size>8192)throw Error('The SVG exceeds 8 KiB.');
    const share=form.elements.share.checked,selection=window.engineerViewport.selection,layout=dock.value();
    const data={action:'message',text,share,focus,tabs:layout.order.filter(id=>!layout.closed.includes(id)),
      selection:selection?selection.kind+' '+selection.role:null,svg:share&&file?await file.text():null};
    if(file&&!share)throw Error('Enable CAD context sharing to use the attached drawing.');
    const submit=form.querySelector('[type=submit]');submit.disabled=true;chatStatus.textContent='Working…';
    try{await turn(data);form.elements.message.value='';}finally{submit.disabled=false;}
  });
  assistant.querySelector('[data-stop]').onclick=run(chatStatus,()=>turn({action:'stop'}));
  async function talk(){dock.openPanel('assistant');await refreshAI();form.elements.message.focus();}
  aiIcon.onclick=run(chatStatus,async()=>{await refreshAI();await (aiState.connected?talk():openAI());});
  const ghStatus=github.querySelector('[data-status]'),gh=(action,fields={})=>api('github/action',{action,...fields});
  const ghField=name=>github.querySelector('[name="'+name+'"]');
  async function refreshGit(open=false){
    gitState=await api('github/status');
    gitIcon.dataset.connection=!gitState.connected?'disconnected':gitState.accountMatches&&gitState.settings.repository?'linked':'unlinked';
    gitIcon.title=!gitState.connected?'Connect GitHub':gitState.settings.repository??'GitHub connected · choose a repository';
    github.querySelector('[data-account]').textContent=gitState.connected?'Connected as '+gitState.account.login:'Disconnected';
    github.querySelector('[data-reconcile]').hidden=!gitState.settings.pending;
    github.querySelector('[data-history]').replaceChildren(...(gitState.settings.history??[]).map(item=>make('li','Revision '+item.revision+' · '+item.sha+' · '+item.at)));
    if(open){ghField('repository').value=gitState.settings.repository??'';ghField('branch').value=gitState.settings.branch;if(!github.open)github.showModal();}
  }
  gitIcon.onclick=run(ghStatus,()=>refreshGit(true));
  github.querySelector('[data-hub]').onclick=()=>tellHub(gitState,'github',ghStatus);
  github.querySelector('[data-list]').onclick=run(ghStatus,async()=>{
    const items=await gh('repositories');ghField('repositories').replaceChildren(make('option','Choose a repository'),...items.map(repo=>{const option=make('option',repo.name);option.value=repo.name;return option;}));
  });
  ghField('repositories').onchange=()=>{ghField('repository').value=ghField('repositories').value;};
  github.querySelector('[data-create]').onclick=run(ghStatus,async()=>{
    const result=await gh('create',{name:ghField('newName').value,private:ghField('private').checked});ghField('repository').value=result.name;ghField('branch').value=result.branch;ghStatus.textContent='Repository created. Save the destination to link it.';
  });
  github.querySelector('[data-save]').onclick=run(ghStatus,async()=>{
    await gh('configure',{repository:ghField('repository').value,branch:ghField('branch').value,createBranch:ghField('createBranch').checked});
    reviewPlan=null;github.querySelector('[data-publish]').disabled=true;await refreshGit();ghStatus.textContent='Destination saved.';
  });
  github.querySelector('[data-review]').onclick=run(ghStatus,async()=>{
    reviewPlan=await gh('review');github.querySelector('[data-publish]').disabled=false;
    ghStatus.textContent=reviewPlan.change+' saved revision '+reviewPlan.revision+' · '+reviewPlan.repository+' / '+reviewPlan.branch+' · '+reviewPlan.file+' · '+reviewPlan.bytes+' bytes.';
  });
  github.querySelector('[data-publish]').onclick=run(ghStatus,async()=>{
    if(!reviewPlan)return;
    github.querySelector('[data-publish]').disabled=true;
    try{const result=await gh('publish',{id:reviewPlan.id,message:ghField('message').value});ghStatus.textContent='Published '+result.sha;}
    finally{reviewPlan=null;await refreshGit();}
  });
  github.querySelector('[data-reconcile]').onclick=run(ghStatus,async()=>{
    const result=await gh('reconcile');ghStatus.textContent=result.published?'Published '+result.sha:result.message;await refreshGit();
  });
  const configMenu=make('details','');configMenu.id='config-menu';const choices=make('div','');choices.className='wb-menu';
  for(const [label,action] of [['Config AI assistant',openAI],['Talk to AI assistant',talk],['Config GitHub',()=>refreshGit(true)]]){
    choices.append(button(label,run(chatStatus,async()=>{configMenu.open=false;await action();})));
  }
  configMenu.append(make('summary','Config'),choices);menu.insertBefore(configMenu,menu.querySelector('#panels-menu'));
  void run(chatStatus,refreshAI)();void run(ghStatus,refreshGit)();
  window.addEventListener('engineer-proof-built',event=>{
    if(viewing&&event.detail.proposalId!==aiState?.proposal)void run(chatStatus,()=>switchBranch(null,'model'))();
  });
  const timer=setInterval(()=>{if(document.hidden)return;void refreshAI().catch(()=>{});void refreshGit().catch(()=>{});},4000);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
