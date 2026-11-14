import {datumSegments} from './datum-geometry.mjs';
import {project} from './cad-camera.mjs';
import {featureFields} from './feature-fields.mjs';
import {commandColumn} from './ribbon-sizes.mjs';
import {operationPanel} from './operation-inspector.mjs';
import {previewRequests} from './preview-requests.mjs';
import './interaction-workbench.mjs';
import {editorDocument as document} from './editor-document.mjs';
import {api,invoke,mutate,context} from './cad-commands.mjs';
import {icon} from './icons.mjs';
const $=id=>document.getElementById(id),v=window.engineerViewport,visibility=new Map();let visibilityRevision=-1;const ctx=await context().catch(error=>{$('wb-hint').textContent='Feature connection unavailable. Reload the editor to reconnect. '+error.message;return null;}),visibilityChannel=ctx?new BroadcastChannel('engineer-visibility-'+ctx.scope.sessionId):null;function applyVisibility(value){if(value.revision<visibilityRevision)return;visibilityRevision=value.revision;visibility.clear();for(const e of value.entries)visibility.set(e.id,e.state);window.dispatchEvent(new CustomEvent('engineer-visibility-changed'));}async function changeVisibility(changes){const before=await api('ui/visibility'),value=await api('ui/visibility/save',{operationId:crypto.randomUUID(),expectedVisibilityRevision:before.revision,changes});applyVisibility(value);visibilityChannel?.postMessage(value.revision);}if(visibilityChannel)visibilityChannel.onmessage=event=>{if(Number.isSafeInteger(event.data)&&event.data>visibilityRevision)api('ui/visibility').then(applyVisibility).catch(()=>{});};window.addEventListener('pagehide',()=>visibilityChannel?.close(),{once:true});
window.engineerVisibility=id=>visibility.get(id)??'default';
window.engineerHideModelSource=async id=>{await changeVisibility([{id,state:'hide'}]);await v.clear();};
const notify=text=>{$('wb-hint').textContent=text;};
const run=fn=>event=>{try{Promise.resolve(fn(event)).catch(e=>notify(e.message));}catch(e){notify(e.message);}};
const menu=document.createElement('div');menu.className='cad-feature-menu';menu.setAttribute('role','menu');menu.hidden=true;document.body.append(menu);
const {element:editor,heading:featureHeading,actions:featureActions}=operationPanel(document,$('inspector-content'),'feature-operation-editor');
const featureForm=document.createElement('form');featureForm.id='feature-operation-form';featureForm.innerHTML='<div id="feature-operation-fields"></div>';
featureActions.innerHTML='<button type="submit">Apply</button><button type="button" id="feature-operation-done">Cancel</button>';featureForm.append(featureActions);editor.append(featureHeading,featureForm);
let editing=null,historyBusy=false,operationBusy=false,operationStarting=false,constructionKind=null,carriedSelections=null,pendingConstructionPicks=[],startingSelection=null;
window.engineerFeatureConstruction=()=>!!editing||operationStarting||operationBusy;
window.engineerOperationAcceptsId=id=>{if(operationStarting||!editing?.fields)return true;const target=v.entities().find(e=>e.id===id);return !!target&&editing.fields.accepts(target);};
async function startFeature(kind,action,{toggle=false}={}){
 if(operationBusy||operationStarting)return;
 if(window.engineerSketch?.operationActive)throw Error('Finish the sketch operation before starting a feature.');
 operationStarting=true;pendingConstructionPicks=[];startingSelection={sourceId:window.engineerSketch?.view()?.id??v.selection?.producerId??deleteSourceSelection?.id,target:v.selection??deleteSourceSelection};
 try{
  if(editing){const same=constructionKind===kind;carriedSelections=editing.fields?.selections();highlightFeature(toggle&&same?null:kind);await closeFeature({nextKind:toggle&&same?null:kind});if(toggle&&same)return;}
  highlightFeature(kind);$('cad-cancel-feature').disabled=true;return await action();
 }finally{carriedSelections=null;startingSelection=null;operationStarting=false;const picks=pendingConstructionPicks.splice(0);if(editing?.fields)for(const target of picks)editing.fields.pickTarget(target);if(!editing)highlightFeature(null);else $('cad-cancel-feature').disabled=false;}
}
async function edit(item){if(item.type==='sketch-primitives')return window.engineerSketch.open(item.id);return startFeature(item.referenceFeature?(item.datumType==='point'?'coordinate':item.datumType):'extrude',()=>editSource(item));}
window.engineerOperationRollback=()=>editing?.item&&(editing.item.type==='sketch-extrusion'||editing.referenceKind)?editing.item.id:null;
function operationAction(fn){return run(async event=>{if(operationBusy||operationStarting){event.preventDefault();return;}operationBusy=true;editor.inert=true;editor.setAttribute('aria-busy','true');try{return await fn(event);}finally{operationBusy=false;editor.inert=false;editor.removeAttribute('aria-busy');}});}
async function editSource(item){menu.hidden=true;if(window.engineerFeatureRolledBack?.(item.id))return;if(item.referenceFeature)return beginReference(item.datumType==='point'?'coordinate':item.datumType,item);if(item.type==='sketch-primitives')return window.engineerSketch.open(item.id);if(!['geometry-probe','sketch-extrusion'].includes(item.type))throw Error('This retained source feature has no operation editor in this milestone.');if(window.engineerSketch.view())await window.engineerSketch.exit({build:false});const ctx=await context(),data=await invoke('feature.inspect',{featureId:item.id},'ReadOnly',ctx);editing={item,ctx,data};window.engineerOperationFeature=item.id;window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));editor.hidden=false;$('edit-sketch-inspector').hidden=true;document.querySelector('.proof-inspector').hidden=true;$('feature-operation-fields').replaceChildren();if(item.type==='sketch-extrusion'){await extrusionFields(data);schedulePreview();}else for(const [parameter,q]of Object.entries(data.dimensions)){if(parameter==='count'&&!['holes','pattern'].includes(data.scenario))continue;if(parameter==='radius'&&data.scenario==='extrude')continue;const label=document.createElement('label'),input=document.createElement('input');label.textContent=parameter+' ('+q.unit+')';input.type='number';input.step='any';input.value=q.value;input.dataset.parameter=parameter;input.dataset.original=q.value;label.append(input);$('feature-operation-fields').append(label);}window.engineerDock?.openPanel('model');window.engineerDock?.openPanel('inspector');}
$('feature-operation-form').addEventListener('submit',operationAction(async event=>{event.preventDefault();if(!editing)return;if(editing.referenceKind){const input=editing.fields.read({draft:true});await mutate('reference.set',input,editing.ctx);await closeFeature();return;}if(editing.create||editing.item.type==='sketch-extrusion'){await stopOperationPreview();await mutate(editing.create?'extrusion.create':'extrusion.update',operationInput({draft:true}),editing.ctx);editor.hidden=true;editing?.fields?.cancel();editing=null;highlightFeature(null);window.engineerOperationFeature=null;window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));document.querySelector('.proof-inspector').hidden=false;await v.build({reuseCurrent:true});return;}const changed=[...$('feature-operation-fields').querySelectorAll('input')].filter(i=>i.value!==i.dataset.original);if(changed.length!==1)throw Error('Change one driving dimension per validated operation.');const input=changed[0],camera=structuredClone(v.renderer.camera);await mutate('feature.update',{featureId:editing.item.id,parameter:input.dataset.parameter,quantity:{value:input.valueAsNumber,unit:editing.data.dimensions[input.dataset.parameter].unit}},editing.ctx);const item=editing.item;await editSource(item);await v.build();const restore=()=>{Object.assign(v.renderer.camera,camera);v.renderer.render();};window.addEventListener('engineer-proof-built',restore,{once:true});}));
$('feature-operation-done').addEventListener('click',operationAction(async()=>{await stopOperationPreview();editor.hidden=true;editing?.fields?.cancel();editing=null;highlightFeature(null);window.engineerOperationFeature=null;window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));document.querySelector('.proof-inspector').hidden=false;await v.build();}));
function dismissOperationOnSelection(){
 if(editing||operationStarting)return;
 const previous=editing;
 editor.hidden=true;editing?.fields?.cancel();editing=null;highlightFeature(null);window.engineerOperationFeature=null;
 window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));
 if(previous?.item?.type==='sketch-extrusion'&&!operationBusy){
  stopOperationPreview().then(()=>{if(!editing)return v.build({reuseCurrent:true});}).catch(error=>notify(error.message));
 }
}
window.addEventListener('engineer-feature-selected',dismissOperationOnSelection);
window.addEventListener('engineer-sketch-selection',dismissOperationOnSelection);
async function refreshSourcePresentation(){
 for(let attempt=0;;attempt++){
  try{return await v.build({reuseCurrent:true});}
  catch(error){
   if(!error.message.startsWith('projectBusy:')||attempt===9)throw error;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
 }
}
async function deleteSource(item){if(item.referenceFeature){await mutate('feature.delete',{featureId:item.producerId,...(item.parentId?{referenceRole:item.role}:{})});await refreshSourcePresentation();return;}const freezeHidden=(v.renderer.scene?.occurrences.length&&!v.renderer.showDatums?(window.engineerSourceItems?.()??[]).filter(i=>i.kind==='datum'&&(visibility.get(i.id)??'default')==='default').map(i=>({id:i.id,state:'hide'})):[]);if(item.kind==='datum'){await changeVisibility([item,...(item.coordinateSystem?(window.engineerSourceItems?.()??[]).filter(i=>i.parentId===item.id):[])].map(i=>({id:i.id,state:'delete'}))); await v.clear();notify('Reference display entry removed. View → Restore reference entries restores the canonical frame. Sketch supports retain their definition frame.');return;}if(item.kind!=='feature')throw Error('This item is not an editable feature. Delete dependent features before removing source structure.');if(window.engineerSketch.view()?.id===item.id)await window.engineerSketch.exit({build:false});await mutate(item.type==='sketch-primitives'?'sketch.delete':'feature.delete',item.type==='sketch-primitives'?{sketchId:item.id}:{featureId:item.id});if(freezeHidden.length)await changeVisibility(freezeHidden);await refreshSourcePresentation();}
window.engineerDeleteSource=deleteSource;
function show(event,item){event.preventDefault();menu.hidden=true;if(window.engineerFeatureRolledBack?.(item.id))return;const owner=event.target.ownerDocument,view=owner.defaultView;if(menu.ownerDocument!==owner)owner.body.append(menu);menu.replaceChildren();const add=(label,glyph,fn)=>{const b=document.createElement('button');b.setAttribute('role','menuitem');b.innerHTML=icon(glyph)+'<span></span>';b.querySelector('span').textContent=label;b.addEventListener('click',run(async()=>{menu.hidden=true;await fn();}));menu.append(b);};if(item.referenceFeature)add('Edit','edit',()=>edit(item));if(item.kind==='datum'&&item.datumType==='plane')add('New Sketch','sketch',()=>window.engineerSketch.newSketch(item));if(['sketch-primitives','geometry-probe','sketch-extrusion'].includes(item.type))add('Edit','edit',()=>edit(item));if(item.kind==='datum'||item.type==='sketch-primitives'){add((visibility.get(item.id)??(item.type==='sketch-primitives'?'reveal':'default'))==='reveal'?'Hide':'Reveal',(visibility.get(item.id)??(item.type==='sketch-primitives'?'reveal':'default'))==='reveal'?'hide':'reveal',()=>{return changeVisibility([{id:item.id,state:(visibility.get(item.id)??(item.type==='sketch-primitives'?'reveal':'default'))==='reveal'?'hide':'reveal'}]);});}
 if(item.kind==='feature'&&['sketch-primitives','sketch-extrusion','geometry-probe'].includes(item.type)&&(!item.disabled||(item.explicitlyDisabled??true)))add(item.disabled?'Enable':'Disable',item.disabled?'enable':'disable',async()=>{await mutate('feature.enable',{featureId:item.id,enabled:!!item.disabled});await refreshSourcePresentation();});
 if(item.kind==='feature'){add('Move earlier','up',async()=>{await mutate('feature.reorder',{featureId:item.id,direction:'earlier'});await refreshSourcePresentation();});add('Move later','down',async()=>{await mutate('feature.reorder',{featureId:item.id,direction:'later'});await refreshSourcePresentation();});}
 if(item.referenceFeature&&!item.parentId&&(!item.disabled||item.explicitlyDisabled))add(item.disabled?'Enable':'Disable',item.disabled?'enable':'disable',async()=>{await mutate('feature.enable',{featureId:item.producerId,enabled:!!item.disabled});await refreshSourcePresentation();});
 add('Delete','delete',()=>deleteSource(item));
menu.hidden=false;const box=menu.getBoundingClientRect();menu.style.left=Math.max(0,Math.min(event.clientX,view.innerWidth-box.width-8))+'px';menu.style.top=Math.max(0,Math.min(event.clientY,view.innerHeight-box.height-8))+'px';menu.querySelector('button')?.focus();}
document.addEventListener('contextmenu',event=>{const id=event.target.closest?.('[data-source-id]')?.dataset.sourceId,item=window.engineerSourceItems?.().find(i=>i.id===id);if(item)show(event,item);});document.addEventListener('dblclick',run(event=>{const id=event.target.closest?.('[data-source-id]')?.dataset.sourceId,item=window.engineerSourceItems?.().find(i=>i.id===id);if(item&&(item.referenceFeature||['sketch-primitives','geometry-probe','sketch-extrusion'].includes(item.type)))return edit(item);}));document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.hidden=true;});document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.hidden=true;});
const file=document.querySelector('.wb-menubar details:first-child .wb-menu'),top=document.createElement('button');top.id='cad-undo';top.innerHTML=icon('undo');top.title='Undo · Ctrl+Z';top.setAttribute('aria-label','Undo');document.querySelector('.topbar').insertBefore(top,document.querySelector('.stage'));
const buttons={};for(const action of ['undo','redo']){const b=document.createElement('button');b.id='cad-'+action+'-menu';b.innerHTML=icon(action)+'<span>'+action[0].toUpperCase()+action.slice(1)+'</span><kbd>Ctrl+'+(action==='undo'?'Z':'Y')+'</kbd>';file.append(b);buttons[action]=b;b.addEventListener('click',run(()=>history(action)));}top.addEventListener('click',run(()=>history('undo')));
async function updateHistory(){const s=await api('cad/status');for(const a of ['undo','redo'])buttons[a].disabled=historyBusy||!s.history?.[a==='undo'?'canUndo':'canRedo'];top.disabled=buttons.undo.disabled;}
async function history(action){if(historyBusy)return;historyBusy=true;top.dataset.historyBusy='true';top.disabled=true;for(const button of Object.values(buttons))button.disabled=true;try{const sketch=window.engineerSketch.view();await mutate('history.'+action,{});const source=await api('document');if(sketch&&source.document.native?.graph.features.some(f=>f.id===sketch.id))await window.engineerSketch.open(sketch.id,{upgrade:false,focus:false,alignView:false});else await v.build();notify((action==='undo'?'Undo':'Redo')+' applied to a new working revision. Save to persist.');}finally{historyBusy=false;try{await updateHistory();}finally{delete top.dataset.historyBusy;}}}
document.addEventListener('keydown',run(event=>{if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){if(event.target.closest?.('input,textarea')&&!event.target.readOnly)return;event.preventDefault();return history(event.key.toLowerCase()==='y'?'redo':'undo');}}));
const view=document.querySelector('.wb-menubar details:nth-child(3) .wb-menu'),restore=document.createElement('button');restore.textContent='Restore reference entries';restore.addEventListener('click',run(async()=>{const changes=[...visibility].filter(([,state])=>state==='delete').map(([id])=>({id,state:'default'}));if(changes.length)await changeVisibility(changes);}));view.append(restore);window.addEventListener('engineer-document-changed',()=>updateHistory().catch(()=>{}));setInterval(()=>updateHistory().catch(()=>{}),800);for(const button of Object.values(buttons))button.disabled=true;top.disabled=true;await updateHistory().catch(error=>notify('History connection unavailable. Reload the editor to reconnect. '+error.message));try{applyVisibility(await api('ui/visibility'));}catch(error){notify(error.message);}

let deleteSourceSelection=null;window.addEventListener('engineer-feature-selected',event=>deleteSourceSelection=event.detail);window.addEventListener('engineer-sketch-selection',()=>deleteSourceSelection=null);window.addEventListener('engineer-selection-changed',event=>{if(!event.detail)return;const value=event.detail;deleteSourceSelection=window.engineerSourceItems?.().find(i=>value.kind==='datum'?i.kind==='datum'&&i.producerId===value.producerId&&i.role===value.role:i.id===value.producerId)??null;});
document.addEventListener('keydown',run(async event=>{if(editing?.fields)return;if(event.key!=='Delete'||event.target.closest?.('input,textarea,select,[contenteditable=true]'))return;const sketch=window.engineerSketch;if(sketch?.view()?.selected){event.preventDefault();return sketch.removeSelection();}if(deleteSourceSelection){event.preventDefault();await deleteSource(deleteSourceSelection);deleteSourceSelection=null;}}));

const previewRequestsInFlight=previewRequests();
let previewTimer=null,previewSequence=0,previewChain=Promise.resolve();
window.engineerOperationPreviewState=()=>({pending:previewRequestsInFlight.pending,closing:previewRequestsInFlight.closing,sequence:previewSequence,operationBusy,operationStarting,pendingSelections:pendingConstructionPicks.length});
 async function retirePreview(){
  let state=await api('proof/status');if(state.job?.state!=='running')return;
  const id=state.job.id;if(state.job.previewHash)await api('proof/cancel',{operationId:crypto.randomUUID()});
  for(let i=0;i<300;i++){state=await api('proof/status');if(state.job?.id!==id||state.job.state!=='running')return;await new Promise(resolve=>setTimeout(resolve,16));}
  throw Error('The previous preview is still stopping. Try updating Depth again.');
 }
 async function stopOperationPreview(){clearTimeout(previewTimer);previewSequence++;return previewRequestsInFlight.settle(retirePreview);}
 function operationInput({draft=false,preview=false}={}){
 const fields=editing.fields.read({draft,preview});
 const input={...(editing.create?{...editing.input}:{featureId:editing.item.id}),...fields};if(input.axisReference&&!fields.axisId)delete input.axisId;return input;
}

function schedulePreview(){
 clearTimeout(previewTimer);const sequence=++previewSequence,owner=editing;
 if(previewRequestsInFlight.closing||!owner?.depth)return;let incomplete=null;try{owner.fields.read();}catch(error){incomplete=error;}$('feature-operation-form').querySelector('button[type=submit]').disabled=true;
 const active=()=>editing===owner&&sequence===previewSequence&&!previewRequestsInFlight.closing;
 previewTimer=setTimeout(()=>{
   const task=previewChain.then(async()=>{
    if(!active())return;
    const options=!incomplete
      ?{previewOperation:{name:owner.create?'cad.extrusion.create.v1':'cad.extrusion.update.v1',inputs:operationInput({preview:true})}}
      :{operationEditId:owner.item?.id};
    for(let attempt=0;active();attempt++){
     await retirePreview();if(!active())return;
     try{await previewRequestsInFlight.run(()=>v.build({...options,reuseCurrent:!!incomplete}));if(incomplete&&active())notify(incomplete.message);return;}
     catch(error){
      if(!error.message.startsWith('projectBusy:')||attempt===9)throw error;
      // A competing model build can start after the status read.
      await new Promise(resolve=>setTimeout(resolve,100));
     }
    }
   });
   previewChain=task.catch(error=>{if(active())notify('Preview: '+error.message);});
 },16);
 }
 function highlightFeature(kind){constructionKind=kind;document.body.classList.toggle('constructing-feature',!!kind);const cancel=$('cad-cancel-feature');if(cancel)cancel.disabled=!kind;for(const b of featureButtons)b.setAttribute('aria-pressed',String(b.dataset.featureKind===kind));paintReferencePreview();}
 function selectedReferences(rows){
  const ids=rows.flatMap(row=>row.target.kind==='sketch'&&row.target.role!=='result'?['sketch:'+row.target.role.split(':')[0]]:v.entities().filter(e=>e.producerId===row.target.producerId&&(row.target.kind==='feature'||e.role===row.target.role)&&e.kind===(row.target.kind==='sketch'?'feature':row.target.kind)).map(e=>e.id));
  window.engineerSketchReferences?.(ids);
 }
 async function extrusionFields(data){
  const owner=editing,{document:source}=await api('document');if(editing!==owner)return;
  if(!owner.create)owner.data={...source.native.graph.features.find(f=>f.id===owner.item.id).data,...data,depthMm:data.dimensions?.depth.value??data.depthMm};
  owner.fields=featureFields({document,host:$('feature-operation-fields'),owner,graph:source.native.graph,scene:v.renderer.scene,onChange:schedulePreview,status:notify,highlight:selectedReferences});
  owner.fields.restoreSelections(carriedSelections);
  const label=document.createElement('label'),preview=document.createElement('input'),heading=document.createElement('h4');label.className='feature-section feature-preview-toggle';label.dataset.featureSection='preview';heading.textContent='Preview';preview.type='checkbox';preview.id='feature-operation-preview';preview.checked=true;label.append(heading,preview);$('feature-operation-fields').append(label);
  const kind=owner.referenceKind??(data.form==='finish'?data.finishing.kind:data.form==='repeat'?data.repeat.kind:data.form==='revolve'?'revolve':'extrude');highlightFeature(kind);featureHeading.textContent=['fillet','chamfer'].includes(kind)?kind[0].toUpperCase()+kind.slice(1):kind==='extrude'?'Extrude':kind==='revolve'?'Revolve':kind==='mirror'?'Mirror Feature':kind==='linear'?'Linear Feature Pattern':'Circular Feature Pattern';
  requestAnimationFrame(()=>{if(editing===owner&&!editor.hidden)owner.fields.focus();});
 }
 async function closeFeature({nextKind=null}={}){await stopOperationPreview();editor.hidden=true;editing?.fields?.cancel();editing=null;highlightFeature(nextKind);window.engineerOperationFeature=null;window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));document.querySelector('.proof-inspector').hidden=false;await v.build({reuseCurrent:true});}
 document.addEventListener('click',event=>{
  if(!editing?.fields&&!operationStarting)return;const node=event.target.closest?.('[data-source-id]');if(!node)return;
  const item=window.engineerSourceItems?.().find(i=>i.id===node.dataset.sourceId);if(!item)return;
  const target={...item,kind:item.type==='sketch-primitives'?'sketch':item.kind,role:item.type==='sketch-primitives'?'result':item.role};
  if(operationStarting){pendingConstructionPicks.push(target);event.preventDefault();event.stopImmediatePropagation();document.querySelector('.proof-inspector').hidden=true;return;}
  const choice=editing.fields.choices.find(c=>c.target.producerId===target.producerId&&c.target.kind===target.kind&&c.target.role===target.role);
  if(choice){event.preventDefault();event.stopImmediatePropagation();editing.fields.pick(choice);}
 },true);
 window.addEventListener('engineer-selection-changed',event=>{
  if(!event.detail||!editing?.fields&&!operationStarting)return;const selected=event.detail;
  if(operationStarting){pendingConstructionPicks.push(selected);event.stopImmediatePropagation();document.querySelector('.proof-inspector').hidden=true;return;}
  if(editing.fields.pickTarget(selected)){event.stopImmediatePropagation();document.querySelector('.proof-inspector').hidden=true;editor.hidden=false;}
 },true);
$('feature-operation-fields').addEventListener('change',event=>{if(event.target.matches('[data-extrusion-name],#feature-operation-preview'))schedulePreview();});
$('feature-operation-form').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.target.closest('button')){event.preventDefault();event.stopPropagation();if(event.target.id!=='extrusion-depth-value')schedulePreview();}});
function cancelOperation(event){if(!editing)return;if(event.type==='keydown'&&event.key!=='Escape')return;event.preventDefault();event.stopImmediatePropagation();$('feature-operation-done').click();}
document.addEventListener('keydown',cancelOperation,true);v.renderer.canvas.parentElement.addEventListener('contextmenu',cancelOperation,true);
const referencePreview=document.createElementNS('http://www.w3.org/2000/svg','svg');referencePreview.id='feature-reference-preview';
Object.assign(referencePreview.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'4'});v.renderer.canvas.parentElement.append(referencePreview);
function paintReferencePreview(){
 referencePreview.replaceChildren();let preview;try{preview=editing?.referenceKind?editing.fields?.preview():null;}catch{return;}
 const presented=v.renderer.presentedFrame;if(!preview||!presented)return;
 referencePreview.setAttribute('viewBox',`0 0 ${presented.width} ${presented.height}`);
 const extent=presented.camera.span*.13,frame=preview.frame,p=point=>project(point,presented.matrix,presented.width,presented.height);
 const segment=(a,b,color='#ddc720')=>{const x=p(a),y=p(b);if(x[2]<0||y[2]<0)return;const path=document.createElementNS(referencePreview.namespaceURI,'path');path.setAttribute('d',`M${x[0]} ${x[1]}L${y[0]} ${y[1]}`);path.setAttribute('stroke',color);path.setAttribute('stroke-width','2');path.setAttribute('fill','none');referencePreview.append(path);};
 if(preview.kind==='coordinate')for(const [i,direction]of [frame.u,frame.v,frame.normal].entries())segment(frame.origin,frame.origin.map((n,k)=>n+direction[k]*extent),['#e74848','#32bd5b','#3279ed'][i]);
 else for(const [a,b]of datumSegments({datumType:preview.kind,originMm:frame.origin,normal:frame.normal,u:frame.u,direction:frame.normal},extent))segment(a,b);
}
window.engineerOperationPreviewVisible=()=>!editing?.fields||!!$('feature-operation-preview')?.checked;
window.addEventListener('engineer-proof-built',event=>{
 const owner=editing;if(!owner?.fields)return;let signature;try{signature=JSON.stringify(operationInput({preview:true}));}catch{}owner.fields.refreshScene(v.renderer.scene);
 const info=event.detail.operationState;if(!info||info.featureId!==(owner.item?.id??owner.input?.featureId))return;
 try{if(info.inputSignature!==signature)return;owner.fields.setOperationState(info);$('feature-operation-form').querySelector('button[type=submit]').disabled=false;}catch{}
});
for(const event of ['engineer-camera-presented','engineer-proof-built','resize'])window.addEventListener(event,paintReferencePreview);
const featuresRibbon=document.querySelector('[data-operations=Features]');
async function beginFeature(kind,title){
 await stopOperationPreview();
 const {document:source}=await api('document'),g=source.native?.graph;
 if(!g)throw Error('Convert this study first.');
 const selectedId=startingSelection?startingSelection.sourceId:window.engineerSketch.view()?.id??v.selection?.producerId??deleteSourceSelection?.id;
 const features=g.features.filter(f=>f.type==='sketch-extrusion'),tip=features.find(f=>!features.some(x=>x.data.baseFeatureId===f.id));
 const repeating=['mirror','linear','circular'].includes(kind),revolve=kind==='revolve',finishing=['fillet','chamfer'].includes(kind);if(finishing&&!tip)throw Error('Create a model before finishing its edges.');
 const seed=repeating?features.find(f=>f.id===selectedId):null;
 const sketch=g.features.find(f=>f.id===(seed?.data.sketchId??selectedId)&&f.type==='sketch-primitives');
 if(window.engineerSketch.view())await window.engineerSketch.exit();
 const input={featureId:'extrusion-'+crypto.randomUUID(),sketchId:sketch?.id??'',name:title+' '+(features.length+1),depthMm:10,reverse:false,operation:seed?(['new-body','none'].includes(seed.data.operation)?'none':seed.data.operation):tip?'add':'new-body',...(tip?{baseFeatureId:tip.id}:{})};
 if(finishing)Object.assign(input,{form:'finish',sketchId:tip.data.sketchId,operation:'none',finishing:{kind,radiusMm:1,references:[]}});
 if(revolve)Object.assign(input,{form:'revolve',...(sketch?.data.entities.find(e=>e.type==='line'&&e.construction)?{axisId:sketch.data.entities.find(e=>e.type==='line'&&e.construction).id}:{}),angleDeg:360});
 if(repeating)Object.assign(input,{form:'repeat',repeat:{kind,sourceFeatureId:seed?.id??'',axis:'x',count:kind==='mirror'?2:3,offsetMm:kind==='mirror'?0:10,angleDeg:90}});
 editing={create:true,ctx:await context(),input};window.engineerOperationFeature=sketch?.id??null;
 window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));
 $('feature-operation-fields').replaceChildren();await extrusionFields(input);
 editor.hidden=false;$('edit-sketch-inspector').hidden=true;document.querySelector('.proof-inspector').hidden=true;
 window.engineerDock.openPanel('model');window.engineerDock.openPanel('inspector');schedulePreview();
}
async function beginReference(kind,item=null){
 await stopOperationPreview();const {document:source}=await api('document');
 const previous=item?source.native.graph.features.find(f=>f.id===item.producerId):null;
 kind=previous?.data.kind??kind;const input=previous?{...previous.data,featureId:previous.id}:{featureId:'reference-'+crypto.randomUUID(),name:({plane:'Reference plane',axis:'Reference axis',coordinate:'Coordinate system'}[kind]),references:[]};
 editing={create:!previous,item:previous?{...item,id:previous.id}:null,referenceKind:kind,ctx:await context(),input,data:input};window.engineerOperationFeature=previous?.id??null;window.dispatchEvent(new CustomEvent('engineer-feature-edit-changed'));
 $('feature-operation-fields').replaceChildren();editor.hidden=false;document.querySelector('.proof-inspector').hidden=true;$('edit-sketch-inspector').hidden=true;
 editing.fields=featureFields({document,host:$('feature-operation-fields'),owner:editing,graph:source.native.graph,scene:v.renderer.scene,onChange:paintReferencePreview,status:notify,highlight:selectedReferences});
 editing.fields.restoreSelections(carriedSelections);featureHeading.textContent={plane:'Reference Plane',axis:'Reference Axis',coordinate:'Coordinate System'}[kind];highlightFeature(kind);if(!previous&&!carriedSelections?.some(row=>row.title.startsWith('Reference ')&&row.selected.length)){const selected=startingSelection?startingSelection.target:v.selection??deleteSourceSelection,choice=editing.fields.choices.find(c=>c.target.producerId===selected?.producerId&&c.target.role===selected?.role&&c.target.kind===selected?.kind);if(choice)editing.fields.pick(choice);}$('feature-operation-form').querySelector('button[type=submit]').disabled=false;window.engineerDock.openPanel('inspector');
}
const featureButtons=[['fillet','Fillet','fillet'],['chamfer','Chamfer','chamfer'],['extrude','Extrude','extrude'],['revolve','Revolve','revolve'],['mirror','Mirror Feature','mirror'],['linear','Linear Feature Pattern','pattern'],['circular','Circular Feature Pattern','circular-pattern'],['plane','Reference Plane','plane'],['axis','Reference Axis','axis'],['coordinate','Coordinate System','origin']].map(([kind,title,glyph])=>{
 const b=document.createElement('button');b.type='button';b.id=kind==='extrude'?'cad-extrude-sketch':'cad-feature-'+kind;b.dataset.featureKind=kind;b.dataset.commandSize=['extrude','revolve'].includes(kind)?'large':'medium';b.innerHTML=icon(glyph)+'<span>'+title+'</span>';
 b.onclick=run(()=>startFeature(kind,()=>['plane','axis','coordinate'].includes(kind)?beginReference(kind):beginFeature(kind,title),{toggle:true}));return b;
});
const cancelFeature=document.createElement('button');cancelFeature.type='button';cancelFeature.id='cad-cancel-feature';cancelFeature.dataset.commandSize='large';cancelFeature.disabled=true;cancelFeature.innerHTML=icon('close')+'<span>Cancel feature</span>';cancelFeature.onclick=run(closeFeature);
$('proof-build').innerHTML=icon('feature')+'<span>Build from model</span>';$('proof-cancel').innerHTML=icon('close')+'<span>Cancel build</span>';
const buildColumn=commandColumn(['proof-build','proof-cancel','proof-source'].map(id=>$(id)?.closest('label')??$(id)));
buildColumn.classList.add('feature-build-column');const sourceLabel=buildColumn.querySelector('#proof-source')?.closest('label');sourceLabel?.insertAdjacentHTML('afterbegin',icon('history'));sourceLabel?.setAttribute('data-command-size','medium');
featuresRibbon.prepend(...featureButtons.filter(b=>['extrude','revolve'].includes(b.dataset.featureKind)),commandColumn(featureButtons.filter(b=>['fillet','chamfer'].includes(b.dataset.featureKind))),commandColumn(featureButtons.filter(b=>['mirror','linear','circular'].includes(b.dataset.featureKind))),commandColumn(featureButtons.filter(b=>['plane','axis','coordinate'].includes(b.dataset.featureKind))));
featuresRibbon.prepend(buildColumn);featuresRibbon.append(cancelFeature);
