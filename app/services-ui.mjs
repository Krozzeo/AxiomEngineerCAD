import {api} from './cad-commands.mjs';
import {mountApiPanel} from './api-panel.mjs';
import {renderChatText} from './chat-format.mjs';
import {mountTaskInfo} from './assistant-task-info.mjs';
import {aiConfigMarkup,githubMarkup,chatMarkup,paintTokenMeter} from './services-markup.mjs';

export function mountServices({document,dock,menu,header,assistant,apiPanel}){
  mountApiPanel(document,apiPanel);
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const button=(text,click)=>{const node=make('button',text);node.type='button';node.onclick=click;return node;};
  const dialog=(id,title,markup,headingActions=[])=>{
    const node=document.createElement('dialog');node.id=id;
    if(id.startsWith('gh-')||id==='github-dialog')node.className='github-dialog';
    node.setAttribute('aria-label',title);
    node.innerHTML='<div class="actions gh-heading service-heading"><h2></h2></div>'+markup;
    node.querySelector('h2').textContent=title;
    const close=button('Close',()=>node.close());close.className='icon-button';close.setAttribute('aria-label','Close');
    close.innerHTML='<img src="/icons/close.svg" alt="">';
    node.querySelector('.service-heading').append(...headingActions,close);
    document.body.append(node);return node;
  };
  const config=dialog('ai-config-dialog','Config AI assistant',aiConfigMarkup);
  for(const [value,label] of [['platform','Same as Hub'],['default','Model default'],['none','None'],['minimal','Minimal'],['low','Low'],['medium','Medium'],['high','High'],['xhigh','Extra high'],['max','Maximum']]){
    const option=make('option',label);option.value=value;config.querySelector('[name=reasoning]').append(option);
  }
  const historyDialog=dialog('gh-history-dialog','Project GitHub history','<ol data-history></ol>');
  const changesDialog=dialog('gh-changes-dialog','Saved changes','<ul id="gh-files"></ul>');
  const github=dialog('github-dialog','GitHub — CAD project',githubMarkup,[button('History',()=>historyDialog.showModal())]);
  assistant.className='cad-assistant';
  assistant.insertAdjacentHTML('beforeend',chatMarkup);
  const form=assistant.querySelector('form'),log=assistant.querySelector('[role=log]'),chatStatus=assistant.querySelector('#ai-chat-error');
  const input=form.elements.message,submit=form.querySelector('[type=submit]'),cancel=form.querySelector('[data-stop]');
  const taskInfo=mountTaskInfo({document,prefix:'ai',api,onError:error=>{chatStatus.textContent=error.message;}});
  const cq=selector=>config.querySelector(selector),chat=selector=>assistant.querySelector(selector);
  let aiState,gitState,reviewPlan,focus='model',viewing=false,changing=false,branchKey;
  window.addEventListener('engineer-panel-activated',event=>{if(event.detail!=='assistant')focus=event.detail;});
  document.addEventListener('pointerdown',event=>{const panel=event.target.closest?.('.dock-body')?.querySelector(':scope > [id]:not([hidden])');if(panel?.id&&panel.id!=='assistant-content')focus=panel.id==='workbench-labs'?'diagnostics':panel.id.replace(/-content$/,'');});
  const indicator=(name,className,markup)=>{
    const node=button(name,()=>{});node.className=className+' disconnected';node.setAttribute('aria-label',name);
    node.innerHTML=markup;header.insertBefore(node,header.querySelector('#cad-undo,.stage'));return node;
  };
  const gitIcon=indicator('GitHub','github-indicator','<img src="/icons/github.svg" alt=""><span id="github-pending" hidden></span>');
  const aiIcon=indicator('AI Assistant','ai-indicator','<span>AI</span><img src="/icons/ai-off.svg" alt="">');
  const toolbar=make('div','');toolbar.className='cad-branch-toolbar';toolbar.hidden=true;header.insertBefore(toolbar,gitIcon);
  const run=(node,action)=>async event=>{event?.preventDefault();try{await action();}catch(error){node.textContent=error.message;}};
  const tellHub=(state,section,target)=>{
    if(!state?.platformOrigin){target.textContent='Open this project through Axiom Platform to manage the account.';return;}
    if(window.parent!==window)window.parent.postMessage({kind:'axiom.platform.settings',section},state.platformOrigin);
    else window.open(state.platformOrigin+'/settings/'+section,'_blank','noopener');
  };
  const planButtons=assistant.querySelector('[data-plan]');
  let applying=false,viewedProposal=null;
  function setPreview(id){
    viewedProposal=id;viewing=!!id;document.body.dataset.aiPreview=String(viewing);
    for(const selector of ['.command-ribbon','#history-content','#parameters-content','#properties-content','#workbench-labs','#inspector-content','#save','#cad-undo']){
      const node=document.querySelector(selector);if(node)node.inert=viewing;
    }
    paintBranches();
  }
  async function presentBranch(id){
    const viewport=window.engineerViewport;
    try{return await viewport.switchProposal(id,true);}
    catch(error){if(!/UnsupportedCapability|LostReference|IncompatibleVersion/.test(error.message))throw error;return viewport.switchProposal(id);}
  }
  async function switchBranch(id,panel=focus==='drawing'?'drawing':'model'){
    if(window.engineerSketch?.view()||window.engineerOperationFeature)throw Error('Finish the current edit before switching branches.');
    if(changing)return;
    changing=true;paintBranches();
    try{
      const proof=await presentBranch(id);
      setPreview(id);
      if(proof.drawing)dock.openPanel('drawing');
      dock.openPanel(panel==='drawing'&&proof.drawing?'drawing':'model');
    }catch(error){
      if(id){setPreview(null);await presentBranch(null).catch(()=>{});}
      throw error;
    }finally{changing=false;paintBranches();}
  }
  async function review(){await window.engineerReviewProposal(aiState.proposal);}
  async function apply(){
    const id=viewedProposal;
    if(!id||id!==aiState?.proposal||applying||changing)return;
    applying=true;paintBranches();
    const panel=focus==='drawing'?'drawing':'model';
    try{
      const proof=window.engineerViewport.proof;
      if(proof?.proposalId!==id)throw Error('Open the current preview before applying.');
      const result=await window.engineerApplyProposal(id);
      setPreview(null);
      const source=await api('document');
      window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:source}));
      try{await switchBranch(null,panel);}
      catch(error){throw Error('Revision '+result.revision+' was saved. The view could not reload: '+error.message);}
      chatStatus.textContent='Applied and saved · revision '+result.revision;
    }finally{applying=false;paintBranches();await refreshAI().catch(()=>{});}
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
    const ready=!!aiState?.proposal&&!sending&&!aiState?.busy&&!applying&&!changing;
    for(const key of ['review','preview','discard'])chat('[data-'+key+']').disabled=!ready;
    chat('[data-apply]').disabled=!ready||viewedProposal!==aiState.proposal;
    const previewLabel=viewing?'Exit preview':'Preview';
    chat('[data-preview]').textContent=previewLabel;
    const key=JSON.stringify([aiState?.proposal,viewing,ready]);if(key===branchKey)return;branchKey=key;
    toolbar.hidden=!aiState?.proposal&&!viewing;toolbar.replaceChildren();
    if(toolbar.hidden)return;
    const preview=button(previewLabel,run(chatStatus,()=>switchBranch(viewing?null:aiState.proposal)));preview.disabled=!ready;
    const commit=button('Apply',run(chatStatus,apply));commit.disabled=!ready||!viewing;
    toolbar.append(preview,button('Review changes',run(chatStatus,review)),commit,button('Discard',run(chatStatus,discard)));
    for(const control of toolbar.querySelectorAll('button'))if(!ready)control.disabled=true;
  }
  for(const [id,action] of Object.entries({review,apply,discard,preview:()=>switchBranch(viewing?null:aiState.proposal)}))
    chat('[data-'+id+']').onclick=run(chatStatus,action);
  window.addEventListener('engineer-document-changed',()=>{if(viewing&&!applying)void run(chatStatus,()=>switchBranch(null))();});
  let sending=false,logKey,planKey,lastTaskId,models=[],untestedModels=[];
  const updateComposer=()=>{
    const css=window.getComputedStyle(input),line=parseFloat(css.lineHeight)||20,extra=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom)+2;
    input.style.height='auto';const max=line*10+extra;
    input.style.height=Math.min(input.scrollHeight+2,max)+'px';input.style.overflowY=input.scrollHeight+2>max?'auto':'hidden';
    submit.disabled=!input.value.trim()||!aiState?.connected||sending||aiState.busy;
    cancel.disabled=!sending&&!aiState?.busy;
  };
  let composerWidth;
  const composerResize=new ResizeObserver(([entry])=>{
    const width=entry.contentRect.width;if(width===composerWidth)return;
    composerWidth=width;if(width)updateComposer();
  });
  composerResize.observe(form);
  input.addEventListener('input',updateComposer);
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();if(!submit.disabled)form.requestSubmit();}
  });
  async function turn(data){
    if(data.action==='stop'){paintAI(await api('assistant/turn',data));return;}
    if(sending)return;
    const previousProposal=aiState?.proposal;
    sending=true;chatStatus.textContent='';
    if(data.action==='message')paintAI({...aiState,messages:[...aiState.messages,{role:'user',text:data.text}],busy:true,pending:null});
    else paintAI({...aiState,busy:true,pending:null});
    try{
      const next=await api('assistant/turn',data);paintAI(next);
      if(next.proposal&&next.proposal!==previousProposal){
        const prefersDrawing=next.task?.steps.some(step=>step.tool==='cad.drawing.layout.set.v1'&&step.status==='completed');
        try{await switchBranch(next.proposal,prefersDrawing?'drawing':'model');}
        catch(error){chatStatus.textContent='Proposal ready. Preview could not open: '+error.message;}
      }
    }
    catch(error){await refreshAI().catch(()=>{});throw error;}
    finally{sending=false;updateComposer();paintBranches();}
  }
  function paintAI(next){
    aiState=next;
    aiIcon.classList.toggle('disconnected',!next.connected);
    aiIcon.querySelector('img').src=next.connected?'/icons/ai-on.svg':'/icons/ai-off.svg';
    aiIcon.title=next.connected?'Open AI Assistant · '+next.model:'Configure AI Assistant';
    form.elements.confirm.checked=next.settings.requireConfirmation;
    form.elements.confirm.disabled=next.busy;
    const currentKey=JSON.stringify([next.messages,next.busy]);
    if(logKey!==currentKey){
      const nearEnd=log.scrollHeight-log.scrollTop-log.clientHeight<100;logKey=currentKey;
      log.replaceChildren(...next.messages.map(item=>{
        const card=make('article','');card.className='ai-message '+item.role;
        const author=make('strong',item.role==='user'?'You':'AI Assistant'),content=make(item.role==='user'?'p':'div',item.text);
        if(item.role!=='user')renderChatText(document,content,item.text);
        card.append(author,content);return card;
      }));
      if(next.busy){
        const pending=make('div','');pending.className='ai-typing';pending.setAttribute('aria-label','AI Assistant is working');
        for(let i=0;i<3;i++)pending.append(make('span',''));log.append(pending);
      }
      if(nearEnd)log.scrollTop=log.scrollHeight;
    }
    if(planKey!==next.pending?.id){
      planKey=next.pending?.id;planButtons.hidden=!next.pending;planButtons.replaceChildren();
      if(next.pending)planButtons.append(button('Apruebo',run(chatStatus,()=>turn({action:'approve',id:next.pending.id}))),
        button('Desapruebo',run(chatStatus,()=>turn({action:'reject',id:next.pending.id}))));
    }
    if(next.task?.id!==lastTaskId){lastTaskId=next.task?.id;taskInfo.select(lastTaskId);}
    taskInfo.paint(next.tasks??[],{limits:next.settings});
    for(const scope of [assistant,config])paintTokenMeter(scope.querySelector('.ai-token-meter'),next.reportedTokens,next.settings.maxProjectTokens);
    const limit=next.settings.maxProjectTokens;
    cq('[data-usage]').textContent='Project total: '+next.reportedTokens.toLocaleString()+' tokens · Limit: '+(limit?limit.toLocaleString():'Limitless')+
      (limit?' · Remaining: '+Math.max(0,limit-next.reportedTokens).toLocaleString():'');
    updateComposer();paintBranches();
  }
  async function refreshAI(){paintAI(await api('assistant/status'));}
  function paintModels(selected){
    const picker=cq('[name=model]'),hub=make('option','Same as Hub'+(aiState.defaultModel?' · '+aiState.defaultModel:''));hub.value='';
    picker.replaceChildren(hub,...[...new Set([...models,...(selected?[selected]:[])])].map(id=>{const option=make('option',id+(untestedModels.includes(id)?' (untested)':''));option.value=id;option.classList.toggle('untested',untestedModels.includes(id));return option;}));
    picker.value=selected;picker.classList.toggle('untested',untestedModels.includes(selected));
  }
  async function openAI(){
    await refreshAI();
    cq('[data-account]').textContent=aiState.connected?'Connected through Axiom Platform. Effective: '+aiState.model+' · '+aiState.effectiveReasoning+'. Project overrides take precedence over Same as Hub.':'Connect an AI account and select a model in Axiom Platform.';
    const hub=cq('[data-hub]');if(aiState.platformOrigin)hub.href=aiState.platformOrigin+'/settings/ai';
    paintModels(aiState.settings.model);
    for(const node of config.querySelectorAll('[name]:not([name=model])'))node.value=aiState.settings[node.name];
    for(const toggle of config.querySelectorAll('[data-unlimited]')){
      const field=cq('[name="'+toggle.dataset.unlimited+'"]');
      toggle.checked=aiState.settings[field.name]===0;field.disabled=toggle.checked;if(toggle.checked)field.value='';
      toggle.onchange=()=>{field.disabled=toggle.checked;if(!toggle.checked&&!field.value)field.value=field.min;};
    }
    if(!config.open)config.showModal();
    if(aiState.connected&&!models.length)await loadModels();
  }
  const configStatus=cq('[data-status]');
  async function loadModels(){
    configStatus.textContent='Loading models…';
    const selected=cq('[name=model]').value;
    ({models,untestedModels}=await api('assistant/models'));paintModels(selected);
    configStatus.textContent='Loaded '+models.length+' models; known incompatible models excluded, unknown models marked untested. Listing uses no generation tokens.';
  }
  cq('[name=model]').onchange=event=>event.target.classList.toggle('untested',untestedModels.includes(event.target.value));
  cq('[data-models]').onclick=run(configStatus,loadModels);
  cq('[data-save]').onclick=run(configStatus,async()=>{
    const settings=Object.fromEntries([...cq('form').querySelectorAll('[name]')].map(node=>[node.name,node.type==='number'?(node.disabled?0:node.valueAsNumber):node.value]));
    if(!cq('form').reportValidity()||Object.values(settings).some(Number.isNaN))return;
    paintAI(await api('assistant/configure',settings));configStatus.textContent='Project settings saved.';
  });
  cq('[data-instructions]').onclick=run(configStatus,async()=>{
    paintAI(await api('assistant/configure',{instructions:cq('[name=instructions]').value}));configStatus.textContent='Instructions saved.';
  });
  cq('[data-test]').onclick=run(configStatus,async()=>{
    configStatus.textContent='Testing selected model…';
    const next=await api('assistant/test',{model:cq('[name=model]').value,reasoning:cq('[name=reasoning]').value});
    paintAI(next);configStatus.textContent='Selected model tested successfully.';
  });
  cq('[data-reset-usage]').onclick=run(configStatus,async()=>{
    if(!window.confirm('Reset the token counter for this project?'))return;
    paintAI(await api('assistant/configure',{resetUsage:true}));configStatus.textContent='Project token counter reset.';
  });
  cq('[data-hub]').onclick=run(configStatus,()=>tellHub(aiState,'ai',configStatus));
  form.elements.confirm.onchange=run(chatStatus,async()=>{paintAI(await api('assistant/configure',{requireConfirmation:form.elements.confirm.checked}));});
  const svg=form.elements.svg;
  function paintAttachment(){
    const box=chat('[data-attachments]');box.replaceChildren();
    if(!svg.files.length)return;
    const chip=make('span',svg.files[0].name),remove=button('Remove',()=>{svg.value='';paintAttachment();});
    remove.setAttribute('aria-label','Remove attachment');chip.append(remove);box.append(chip);
  }
  svg.onchange=paintAttachment;
  chat('[data-attach]').onclick=()=>svg.click();
  form.onsubmit=run(chatStatus,async()=>{
    if(submit.disabled)return;
    const text=input.value.trim(),file=svg.files[0];
    if(file&&file.size>8192)throw Error('The SVG exceeds 8 KiB.');
    const share=form.elements.share.checked,selection=window.engineerViewport.selection,layout=dock.value();
    if(file&&!share){chat('.ai-task-details').open=true;throw Error('Enable CAD context sharing to use the attached drawing.');}
    const data={action:'message',text,share,focus,tabs:layout.order.filter(id=>!layout.closed.includes(id)),
      requireConfirmation:form.elements.confirm.checked,selection:selection?selection.kind+' '+selection.role:null,
      svg:file?await file.text():null};
    if(submit.disabled)return;
    input.value='';updateComposer();input.focus();
    try{await turn(data);if(svg.files[0]===file){svg.value='';paintAttachment();}}
    catch(error){if(!input.value)input.value=text;throw error;}
    finally{updateComposer();}
  });
  cancel.onclick=run(chatStatus,()=>turn({action:'stop'}));
  async function talk(){dock.openPanel('assistant');await refreshAI();input.focus();updateComposer();}
  aiIcon.onclick=run(chatStatus,async()=>{await refreshAI();await (aiState.connected?talk():openAI());});
  const gq=selector=>github.querySelector(selector),ghStatus=gq('[data-error]');
  const gh=(action,fields={})=>api('github/action',{action,...fields});
  const ghField=name=>gq('[name="'+name+'"]');
  let destination='create',repositories=[],ghWorking=false;
  function paintGit(){
    if(!gitState)return;
    const {connected,settings}=gitState,linked=connected&&gitState.accountMatches&&!!settings.repository;
    gitIcon.classList.toggle('disconnected',!connected);
    gitIcon.dataset.connection=!connected?'disconnected':linked?'linked':'unlinked';
    gitIcon.title=!connected?'Connect GitHub':linked?'GitHub connected · '+settings.repository:'GitHub connected · configure this project repository';
    const dot=gitIcon.querySelector('#github-pending');dot.hidden=!connected;dot.dataset.state=linked?'linked':'unlinked';
    gq('[data-account]').textContent=(connected?'Connected as '+gitState.account.login:'Disconnected')+
      (linked?' · '+settings.repository+' / '+settings.branch:' · Choose a destination');
    gq('[data-account-detail]').textContent=connected?'Successfully connected as '+gitState.account.login:'';
    gq('.gh-account').hidden=!connected;
    if(gitState.platformOrigin)gq('[data-hub]').href=gitState.platformOrigin+'/settings/github';
    gq('fieldset').disabled=ghWorking||!connected;
    gq('[data-reconcile]').hidden=!settings.pending;
    gq('[data-review]').disabled=!linked||!!settings.pending||ghWorking||gitState.dirty;
    gq('[data-review]').textContent=reviewPlan?'Publish changes':'Review saved changes';
    gq('[data-review-details]').hidden=!reviewPlan;
    for(const tab of github.querySelectorAll('[data-mode]')){
      const mode=tab.dataset.mode;tab.setAttribute('aria-pressed',String(mode===destination));
      gq('[data-destination="'+mode+'"]').hidden=mode!==destination;
    }
    historyDialog.querySelector('[data-history]').replaceChildren(...settings.history.map(item=>make('li','Revision '+item.revision+' · '+item.sha+' · '+item.at)));
  }
  async function refreshGit(){
    gitState=await api('github/status');paintGit();
  }
  async function listRepositories(){
    repositories=await gh('repositories');
    const placeholder=make('option','Choose a repository');placeholder.value='';
    ghField('repositories').replaceChildren(placeholder,...repositories.map(repo=>{const option=make('option',repo.name+(repo.private?' · private':' · public'));option.value=repo.name;return option;}));
    ghField('repositories').value=ghField('repository').value;
  }
  function clearReview(){
    reviewPlan=null;gq('[data-preview-summary]').textContent='';paintGit();
  }
  const gitAction=action=>run(ghStatus,async()=>{
    if(ghWorking)return;
    ghWorking=true;ghStatus.textContent='';paintGit();
    try{await action();}catch(error){clearReview();throw error;}
    finally{ghWorking=false;await refreshGit().catch(()=>paintGit());}
  });
  async function openGit(){
    await refreshGit();
    const settings=gitState.settings;
    destination=settings.repository?'existing':'create';
    ghField('repository').value=settings.repository??'';ghField('branch').value=settings.branch;
    if(!ghField('newName').value)ghField('newName').value=('Axiom-CAD-'+gitState.projectName).normalize('NFKD').replace(/[^A-Za-z0-9_.-]+/g,'-').slice(0,100);
    paintGit();
    if(!github.open)github.showModal();
    if(gitState.connected)await listRepositories();
  }
  gitIcon.onclick=gitAction(openGit);
  gq('[data-hub]').onclick=run(ghStatus,()=>tellHub(gitState,'github',ghStatus));
  gq('[data-list]').onclick=gitAction(listRepositories);
  gq('[data-refresh]').onclick=gitAction(listRepositories);
  for(const tab of github.querySelectorAll('[data-mode]'))tab.onclick=()=>{destination=tab.dataset.mode;clearReview();};
  async function saveDestination(){
    await gh('configure',{repository:ghField('repository').value,branch:ghField('branch').value,createBranch:ghField('createBranch').checked});
    destination='existing';clearReview();await refreshGit();
  }
  ghField('repositories').onchange=gitAction(async()=>{
    const repo=repositories.find(item=>item.name===ghField('repositories').value);
    if(!repo)return;
    ghField('repository').value=repo.name;ghField('branch').value=repo.branch;await saveDestination();
  });
  gq('[data-create]').onclick=gitAction(async()=>{
    const result=await gh('create',{name:ghField('newName').value,private:ghField('private').checked});
    ghField('repository').value=result.name;ghField('branch').value=result.branch;
    destination='existing';paintGit();
    await saveDestination();await listRepositories();gq('[data-preview-summary]').textContent='Repository created and connected: '+result.name;
  });
  gq('[data-save]').onclick=gitAction(saveDestination);
  gq('[data-review]').onclick=gitAction(async()=>{
    if(reviewPlan){
      const result=await gh('publish',{id:reviewPlan.id,message:ghField('message').value});
      clearReview();gq('[data-preview-summary]').textContent='Published '+result.sha;return;
    }
    reviewPlan=await gh('review');
    const summary=reviewPlan.change+' saved revision '+reviewPlan.revision+' · '+reviewPlan.repository+' / '+reviewPlan.branch;
    gq('[data-preview-summary]').textContent=summary;
    changesDialog.querySelector('#gh-files').replaceChildren(make('li',summary),make('li',reviewPlan.file+' · '+reviewPlan.bytes+' bytes'));
  });
  gq('[data-review-details]').onclick=()=>changesDialog.showModal();
  gq('[data-reconcile]').onclick=gitAction(async()=>{
    const result=await gh('reconcile');gq('[data-preview-summary]').textContent=result.published?'Published '+result.sha:result.message;
  });
  const configMenu=make('details','');configMenu.id='config-menu';const choices=make('div','');choices.className='wb-menu';
  for(const [label,action] of [['Config AI assistant',openAI],['Talk to AI assistant',talk],['Config GitHub',gitAction(openGit)]]){
    choices.append(button(label,run(chatStatus,async()=>{configMenu.open=false;await action();})));
  }
  configMenu.append(make('summary','Config'),choices);menu.insertBefore(configMenu,menu.querySelector('#panels-menu'));
  void run(chatStatus,refreshAI)();void run(ghStatus,refreshGit)();
  const timer=setInterval(()=>{if(document.hidden)return;void refreshAI().catch(()=>{});},2500);
  const gitTimer=setInterval(()=>{if(!document.hidden&&!ghWorking)void refreshGit().catch(()=>{});},4000);
  window.addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(gitTimer);composerResize.disconnect();},{once:true});
}
