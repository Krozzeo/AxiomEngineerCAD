import './sketch-workbench.mjs';
import './feature-actions.mjs';
import './ribbon-sizes.mjs';
import {editorDocument as document} from './editor-document.mjs';
import {api,invoke,mutate as domainMutation,context} from './cad-commands.mjs';
import {modelRequest} from './model-owner.mjs';
import {icon} from './icons.mjs';
import {searchSelect} from './search-select.mjs';
import {pointRoles,referenceName} from '/sketch-references.mjs';
import {pointAt,suggestedRelations} from '/relation-kinds.mjs';

const panel=document.getElementById('parameters-content'),$=id=>document.getElementById(id);
let rows=[],dimensions=[],features=[],geometric=[],sourceGraph=null,editContext=null,draft=null,loading=false,working=false,refreshTask=null,selectedRow=null;
let diagnosticRevision=-1,diagnosticStates=new Map();
panel.innerHTML='<div class="parameter-body"><div class="parameter-heading"><h2>Parameter Manager</h2><button id="parameter-reload">Reload</button><button id="parameter-convert" hidden>Convert legacy document</button></div><label class="parameter-search-label">Search<input id="parameter-search" type="search" placeholder="Name, expression or description"></label><datalist id="parameter-completions"></datalist><section><h3>Parameters</h3><div class="parameter-table-scroll"><table id="parameter-table"><thead><tr><th>Name</th><th>Scope</th><th>Unit</th><th>Expression</th><th>Value</th><th>Description</th><th>Source</th></tr></thead><tbody></tbody></table></div></section><section><h3>Equation bindings</h3><div class="parameter-table-scroll"><table id="parameter-binding-table"><thead><tr><th>Parameter</th><th>Target</th><th>Value</th><th>Source</th></tr></thead><tbody></tbody></table></div></section><section><h3>Model dimensions</h3><div class="parameter-table-scroll"><table id="parameter-dimension-table"><thead><tr><th>Dimension</th><th>Unit</th><th>Value</th><th>Driver</th><th>Source</th></tr></thead><tbody></tbody></table></div></section><section><h3>Geometric constraints</h3><div class="parameter-table-scroll"><table id="parameter-constraint-table"><thead><tr><th>Sketch</th><th>Name</th><th>Relation</th><th>Target A</th><th>Target B</th><th>Value</th><th>Status</th><th>Source</th></tr></thead><tbody></tbody></table></div></section></div><footer class="parameter-footer" role="status" aria-live="polite" data-status="info"><span data-status-icon></span><p id="parameter-message"></p></footer>';
function message(text,state='info'){const footer=panel.querySelector('.parameter-footer');footer.dataset.status=state;footer.querySelector('[data-status-icon]').innerHTML=state==='error'?icon('error'):state==='success'?icon('success'):'';$('parameter-message').textContent=text;}
async function read(collection,ctx){let all=[],offset=0;do{const r=await invoke('parameter.inspect',{collection,offset,limit:25,maxBytes:14000},'ReadOnly',ctx);all.push(...r.items);offset=r.nextOffset;}while(offset!==null);return all;}
async function diagnostics(graph,ctx){
 if(diagnosticRevision!==ctx.expectedDocumentRevision){diagnosticStates=new Map();diagnosticRevision=ctx.expectedDocumentRevision;}
 for(const f of graph?.features??[]){if(!f.data?.constraints?.length||diagnosticStates.has(f.id))continue;const states=new Map();let offset=0;
  do{const result=await invoke('sketch.diagnostics',{sketchId:f.id,projection:'constraints',offset,limit:25,maxBytes:14000},'ReadOnly',ctx);for(const item of result.items)states.set(item.id,item.state);offset=result.nextOffset;}while(offset!==null);
  diagnosticStates.set(f.id,states);
 }
}
async function refresh({force=false,revision=null}={}){
 if(loading){await refreshTask;if(force||revision!==null&&editContext?.expectedDocumentRevision!==revision)return refresh({force});return;}
 if(draft&&!force){message('Your row draft is preserved. Press Enter to validate it or Escape to discard it.');return;}
 loading=true;panel.inert=true;panel.setAttribute('aria-busy','true');refreshTask=(async()=>{try{
  const source=await api('document'),ctx=await context(),next=await Promise.all(['parameters','dimensions','features','constraints'].map(c=>read(c,ctx)));
  if(panel.getBoundingClientRect().width)await diagnostics(source.document.native?.graph,ctx);
  if(draft&&!force)return;[rows,dimensions,features,geometric]=next;sourceGraph=source.document.native?.graph;editContext=ctx;draft=null;$('parameter-convert').hidden=source.document.formatVersion===1;render();
 }finally{loading=false;if(!working){panel.inert=false;panel.removeAttribute('aria-busy');}}})();return refreshTask;
}
function textCell(text){const td=document.createElement('td');td.textContent=text??'';return td;}
function field(row,key,{options,type='text',readOnly=false,placeholder='',searchable=false,onSelect}={}){
 const td=document.createElement('td');let input;
 if(searchable){const control=searchSelect({document,field:key,label:key,options:options.map(([value,label])=>({value,label})).filter(o=>o.value),value:row[key]??'',disabled:readOnly,onSelect});td.append(control.element);td.searchControl=control;return td;}
 input=document.createElement(options?'select':'input');if(options){for(const [value,label]of options)input.append(new Option(label,value));input.disabled=readOnly;}else{input.type=type;input.placeholder=placeholder;input.readOnly=readOnly;if(type==='number')input.step='any';}
 input.dataset.field=key;input.setAttribute('aria-label',key);input.value=key==='unit'&&row.unitMode==='auto'?'auto':row[key]??'';
 if(key==='expression'){input.maxLength=512;input.autocomplete='off';input.addEventListener('input',()=>complete(input));}td.append(input);return td;
}
function button(label,glyph,fn){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=icon(glyph);b.onclick=()=>run(fn);return b;}
async function run(fn){if(working)return false;working=true;panel.inert=true;panel.setAttribute('aria-busy','true');try{await fn();return true;}catch(error){message(error.message,'error');return false;}finally{working=false;panel.inert=false;panel.removeAttribute('aria-busy');}}
async function mutate(name,input,ctx){const result=await domainMutation(name,input,ctx);await modelRequest('refresh');return result;}
function sourceCell(row,remove){const td=textCell('');td.append(button('Go to source','separate',()=>modelRequest('source',row)));if(remove)td.append(button('Delete','delete',remove));return td;}
const rowKey=(kind,row)=>({kind,id:row.id??'new'});
function selected(tr){return Boolean(selectedRow&&selectedRow.kind===tr.dataset.rowKind&&selectedRow.id===tr.dataset.rowId);}
function paintSelection(){for(const tr of panel.querySelectorAll('tbody tr')){tr.classList.toggle('parameter-row-selected',selected(tr));tr.classList.toggle('parameter-source-highlight',selected(tr));}}
function clearSelection(){selectedRow=null;paintSelection();}
function cancelDraft(){draft=null;clearSelection();hideCompletions();render();message('Row edit discarded.');}
function selectRow(tr,kind,row){
 if(working)return;if(draft&&draft.tr!==tr){const wanted=rowKey(kind,row);run(commit).then(ok=>{if(!ok)return;const next=[...panel.querySelectorAll('tbody tr')].find(t=>t.dataset.rowKind===wanted.kind&&t.dataset.rowId===wanted.id);if(next){selectedRow=wanted;paintSelection();next.querySelector('input:not([type=hidden]),select:not([hidden])')?.focus();}});return;}
 selectedRow=rowKey(kind,row);paintSelection();
}
function watch(tr,kind,row){
 tr.dataset.rowKind=kind;tr.dataset.rowId=row.id??'new';tr.addEventListener('focusin',()=>selectRow(tr,kind,row));tr.addEventListener('click',()=>selectRow(tr,kind,row));
 tr.addEventListener('input',()=>{if(working)return;if(draft?.tr!==tr)draft={tr,kind,row:structuredClone(row),context:structuredClone(editContext)};selectedRow=rowKey(kind,row);tr.classList.add('parameter-draft');paintSelection();});
 tr.addEventListener('change',event=>{if(event.target.tagName==='SELECT')tr.dispatchEvent(new Event('input',{bubbles:false}));});
 tr.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelDraft();}else if(event.key==='Enter'){event.preventDefault();run(commit);}});
 tr.addEventListener('focusout',()=>setTimeout(()=>{if(working||tr.contains(tr.ownerDocument.activeElement))return;if(draft?.tr===tr)run(commit);else if(selected(tr))clearSelection();},0));
 return tr;
}
document.addEventListener('pointerdown',event=>{if(!selectedRow||working||event.target.closest?.('.search-select-menu,.parameter-completion-menu'))return;const tr=event.target.closest?.('tbody tr');if(tr&&panel.contains(tr))return;if(draft)run(commit);else clearSelection();},true);
const targetKey=t=>t.kind==='dimension'?'dimension:'+t.sketchId+':'+t.constraintId:'feature:'+t.featureId+':'+t.parameter;
const targets=()=>[...dimensions.filter(d=>d.driving).map(d=>({key:targetKey({kind:'dimension',sketchId:d.sketchId,constraintId:d.id}),label:d.name,target:{kind:'dimension',sketchId:d.sketchId,constraintId:d.id}})),...features.filter(f=>!f.readOnly).map(f=>({key:targetKey({kind:'feature',featureId:f.featureId,parameter:f.parameter}),label:(f.featureName??f.featureId)+' · '+f.name,target:{kind:'feature',featureId:f.featureId,parameter:f.parameter}}))];
async function commit(){
 if(!draft){clearSelection();return;}const current=draft,{tr,kind,row,context:ctx}=current,values=Object.fromEntries([...tr.querySelectorAll('[data-field]')].map(n=>[n.dataset.field,n.value]));
 if(kind==='parameter'){
  if(!row.id&&!values.name&&!values.expression){draft=null;clearSelection();return;}
  await mutate('parameter.set',{parameter:{id:row.id??'parameter-'+crypto.randomUUID(),name:values.name.trim(),definitionId:values.definitionId||null,unit:values.unit,expression:values.expression,description:values.description}},ctx);
 }else if(kind==='binding'){
  if(!values.parameterId||!values.target)throw Error('Choose both a parameter and a target.');const target=targets().find(t=>t.key===values.target)?.target;if(!target)throw Error('Choose an existing dimension.');
  await mutate('parameter.bind',{parameterId:values.parameterId,target,enabled:true,...(row.target?{previousParameterId:row.parameterId,previousTarget:row.target}:{})},ctx);
 }else if(kind==='geometric'){
  if(!values.sketchId||!values.type||!values.refA)throw Error('Choose a sketch, relation and its targets.');const refs=[values.refA,...(values.type==='fixed'?[]:[values.refB])].filter(Boolean).map(s=>JSON.parse(s));let value=null;
  if(values.type==='fixed'){value=values.value.trim().split(/[,\s]+/).map(Number);if(value.length!==2||!value.every(Number.isFinite))throw Error('Enter two fixed coordinates as X, Y.');}
  const constraint={...(row.constraint??{}),id:row.id??'relation-'+crypto.randomUUID(),type:values.type,refs,value,driving:true};if(values.name.trim())constraint.name=values.name.trim();else delete constraint.name;
  await mutate(row.id?'sketch.constraint.update':'sketch.constraint.add',{sketchId:values.sketchId,constraint},ctx);
 }else{
  const value=Number(values.value);if(!Number.isFinite(value)||!values.value.trim())throw Error('Enter a finite dimension.');
  if(row.sketchId)await mutate('sketch.constraint.update',{sketchId:row.sketchId,constraint:{...row.constraint,value}},ctx);else await mutate('feature.update',{featureId:row.featureId,parameter:row.parameter,quantity:{value,unit:row.unit}},ctx);
 }
 if(draft===current)draft=null;selectedRow=null;await refresh({force:true});message('Source validated and model refreshed. Save to persist.','success');
}
function stateOf(row){return diagnosticStates.get(row.sketchId)?.get(row.id)??row.status??'Valid';}
function diagnosticRow(tr,row){const state=stateOf(row);tr.dataset.constraintState=state;tr.classList.toggle('parameter-relation-missing',state==='LostReference');tr.classList.toggle('parameter-relation-conflict',state==='Inconsistent');return state==='LostReference'?'Missing reference':state==='Inconsistent'?'Conflict':state==='RedundantConsistent'?'Redundant':state;}
function render(){
 const search=$('parameter-search').value.toLowerCase(),matches=r=>JSON.stringify([r.name,r.expression,r.description,r.featureName,r.type,stateOf(r)]).toLowerCase().includes(search),body=$('parameter-table').tBodies[0];body.replaceChildren();
 const defs=(window.engineerSourceItems?.()??[]).filter(i=>i.kind==='definition'),scopes=[['','Document'],...defs.map(d=>[d.id,d.name])];
 for(const row of [...rows.filter(matches),{name:'',definitionId:null,unit:'auto',expression:'',description:''}]){
  const tr=watch(document.createElement('tr'),'parameter',row),ro=!!row.readOnly;
  for(const [key,options]of [['name',{}],['definitionId',{options:scopes}],['unit',{options:[['auto','Automatic'],['mm','mm'],['rad','rad'],['scalar','scalar']]}],['expression',{placeholder:row.id?'':'Add a parameter…'}]])tr.append(field(row,key,{...options,readOnly:ro}));
  tr.append(textCell(row.value),field(row,'description',{readOnly:ro}),row.id?sourceCell(row,ro?null:async()=>{await mutate('parameter.delete',{parameterId:row.id},editContext);selectedRow=null;await refresh({force:true});message('Parameter deleted.','success');}):textCell(''));body.append(tr);
 }
 const bindingBody=$('parameter-binding-table').tBodies[0];bindingBody.replaceChildren();const choices=targets(),bindings=rows.flatMap(p=>(p.targets??[]).map(t=>({id:p.id+':'+targetKey(t),parameterId:p.id,target:t,value:p.value,source:{...p,targets:[t]}})));
 for(const row of [...bindings,{}]){const tr=watch(document.createElement('tr'),'binding',row);tr.append(field(row,'parameterId',{searchable:true,options:rows.filter(p=>!p.readOnly).map(p=>[p.id,p.name])}),field({...row,target:row.target?targetKey(row.target):''},'target',{searchable:true,options:choices.map(t=>[t.key,t.label])}),textCell(row.value),row.id?sourceCell(row.source,async()=>{await mutate('parameter.bind',{parameterId:row.parameterId,target:row.target,enabled:false},editContext);selectedRow=null;await refresh({force:true});message('Equation binding removed.','success');}):textCell(''));bindingBody.append(tr);}
 const dimBody=$('parameter-dimension-table').tBodies[0];dimBody.replaceChildren();const sourceOrder=(window.engineerSourceItems?.()??[]).filter(i=>i.kind==='feature').map(f=>f.id),all=[...dimensions,...features].sort((a,b)=>sourceOrder.indexOf(a.sketchId??a.featureId)-sourceOrder.indexOf(b.sketchId??b.featureId));let group=null;
 for(const row of all.filter(matches)){const id=row.sketchId??row.featureId;if(group!==id){group=id;const header=document.createElement('tr'),td=textCell(row.featureName??id);td.colSpan=5;header.className='parameter-feature-group';header.append(td);dimBody.append(header);}const tr=watch(document.createElement('tr'),'dimension',row),parameter=rows.find(p=>p.id===row.parameterId),diagnostic=diagnosticRow(tr,row);tr.append(textCell(row.name+(diagnostic==='Missing reference'?' · Missing reference':diagnostic==='Conflict'?' · Conflict':'')),textCell(row.unit),field(row,'value',{type:'number',readOnly:row.readOnly||!!parameter}),textCell(parameter?.name??(row.driving===false?'Reference':'Literal')),sourceCell(row));dimBody.append(tr);}
 renderGeometric(matches);paintSelection();
}
function geometricRefs(sketchId){const f=sourceGraph?.features.find(f=>f.id===sketchId);return (f?.data.entities??[]).flatMap(e=>[...(e.type==='point'?[]:[{entityId:e.id,role:'entity'}]),...pointRoles(e).map(role=>({entityId:e.id,role}))].map(ref=>({value:JSON.stringify(ref),label:referenceName(f.data.entities,ref)})));}
function renderGeometric(matches){
 const body=$('parameter-constraint-table').tBodies[0];body.replaceChildren();const sketches=(sourceGraph?.features??[]).filter(f=>Array.isArray(f.data.constraints)),types=['coincident','horizontal','vertical','fixed','parallel','perpendicular','collinear','equal','concentric','coradial','tangent','point-on-line','point-on-circle','midpoint','horizontal-points','vertical-points','equal-curve-length'];
 for(const row of [...geometric.filter(matches),{}]){
  const c=row.constraint??{},tr=watch(document.createElement('tr'),'geometric',row),values={...row,name:c.name??'',type:c.type??'',refA:c.refs?.[0]?JSON.stringify(c.refs[0]):'',refB:c.refs?.[1]?JSON.stringify(c.refs[1]):'',value:Array.isArray(c.value)?c.value.join(', '):''};
  const refsFor=id=>{const options=geometricRefs(id);for(const ref of c.refs??[])if(!options.some(o=>o.value===JSON.stringify(ref)))options.push({value:JSON.stringify(ref),label:'Missing reference · '+referenceName([],ref)+' '+ref.entityId});return options;};
  const a=field(values,'refA',{searchable:true,options:refsFor(row.sketchId).map(o=>[o.value,o.label])}),b=field(values,'refB',{searchable:true,options:refsFor(row.sketchId).map(o=>[o.value,o.label])}),value=field(values,'value',{placeholder:'X, Y',readOnly:values.type!=='fixed'});
  const sketch=field(values,'sketchId',{searchable:true,readOnly:!!row.id,options:sketches.map(f=>[f.id,f.data.name]),onSelect:id=>{a.searchControl.setOptions(geometricRefs(id));b.searchControl.setOptions(geometricRefs(id));}});
  const type=field(values,'type',{searchable:true,options:types.map(t=>[t,t]),onSelect:kind=>{value.querySelector('input').readOnly=kind!=='fixed';b.searchControl.setDisabled(kind==='fixed');if(kind==='fixed')b.searchControl.setValue('');}});
  b.searchControl.setDisabled(values.type==='fixed');
  a.searchControl.select.addEventListener('change',()=>{if(type.searchControl.select.value!=='fixed')return;const id=sketch.searchControl.select.value,f=sourceGraph.features.find(f=>f.id===id),ref=a.searchControl.select.value;if(!ref)return;const p=pointAt(f.data.entities,JSON.parse(ref));if(p)value.querySelector('input').value=p.join(', ');});
  tr.append(sketch,field(values,'name'),type,a,b,value,textCell(row.id?diagnosticRow(tr,row):''),row.id?sourceCell(row,async()=>{await mutate('sketch.constraint.delete',{sketchId:row.sketchId,constraintId:row.id},editContext);selectedRow=null;await refresh({force:true});message('Constraint deleted.','success');}):textCell(''));body.append(tr);
 }
}

let completions=null,completionInput=null,completionRange=null,completionIndex=0;
function hideCompletions(){completions?.remove();completions=null;completionInput=null;}
function applyCompletion(token){if(!completionInput)return;const input=completionInput,{start,end}=completionRange;input.setRangeText(token,start,end,'end');hideCompletions();input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));hideCompletions();}
function complete(input){const text=input.value,caret=input.selectionStart??text.length,prefix=text.slice(0,caret).match(/[A-Za-z_][A-Za-z_0-9.]*$/)?.[0]??'',start=caret-prefix.length,end=caret+(text.slice(caret).match(/^[A-Za-z_0-9.]*/)?.[0].length??0),list=$('parameter-completions');hideCompletions();list.replaceChildren();if(!prefix)return;const scope=input.closest('tr').querySelector('[data-field=definitionId]')?.value||null,candidates=[];
for(const p of rows.filter(p=>p.profile&&(p.definitionId===null||p.definitionId===scope))){const token=prefix.includes('.')?(p.definitionId===null?'doc.':'local.')+p.name:p.name;if(token.toLowerCase().startsWith(prefix.toLowerCase()))candidates.push({token,label:p.name+' · '+p.value+' '+p.unit});}
for(const d of dimensions.filter(d=>d.expressionSymbol?.toLowerCase().startsWith(prefix.toLowerCase())))candidates.push({token:d.expressionSymbol,label:d.name+' · '+d.value+' '+d.unit});
if(!candidates.length||candidates.some(c=>c.token===prefix))return;completionInput=input;completionRange={start,end};completionIndex=0;completions=input.ownerDocument.createElement('div');completions.className='parameter-completion-menu';completions.setAttribute('role','listbox');const box=input.getBoundingClientRect();Object.assign(completions.style,{position:'fixed',left:box.left+'px',top:box.bottom+'px',zIndex:10050,background:'#142232',border:'1px solid #49617c',maxHeight:'220px',overflowY:'auto'});
for(const {token,label}of candidates.slice(0,20)){const option=input.ownerDocument.createElement('option');option.value=token;option.label=label;list.append(option);const button=input.ownerDocument.createElement('button');button.type='button';button.textContent=token;button.title=label;button.setAttribute('role','option');button.dataset.completion=token;Object.assign(button.style,{display:'block',width:'100%',textAlign:'left'});button.onpointerdown=event=>{event.preventDefault();applyCompletion(token);};completions.append(button);}input.ownerDocument.body.append(completions);}
panel.addEventListener('keydown',event=>{if(event.target!==completionInput||!completions)return;const buttons=[...completions.children];if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancelDraft();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();completionIndex=(completionIndex+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===completionIndex)));}else if(event.key==='Tab'||event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();applyCompletion(buttons[completionIndex].dataset.completion);}},true);
panel.addEventListener('focusout',()=>setTimeout(()=>{if(completionInput&&completionInput.ownerDocument.activeElement!==completionInput)hideCompletions();},100));
$('parameter-search').oninput=()=>{if(!draft)render();};$('parameter-reload').onclick=()=>run(()=>refresh({force:true}));$('parameter-convert').onclick=()=>run(async()=>{const source=await api('document');await api('native/convert',{operationId:crypto.randomUUID(),expectedRevision:source.document.revision});await refresh({force:true});});
async function open(parameterId){if(draft)await commit();if(parameterId){selectedRow={kind:'parameter',id:parameterId};$('parameter-search').value='';}window.engineerDock.openPanel('parameters');await refresh();if(parameterId){const tr=[...$('parameter-table').tBodies[0].rows].find(tr=>tr.dataset.rowId===parameterId);tr?.scrollIntoView({block:'center'});paintSelection();setTimeout(()=>{const input=tr?.querySelector('[data-field=expression]');input?.focus();input?.select();},0);}}
const tools=[...document.querySelectorAll('.wb-menubar > details')].find(d=>d.querySelector('summary')?.textContent==='Tools')?.querySelector('.wb-menu');if(tools){const b=document.createElement('button');b.id='open-parameter-manager';b.innerHTML=icon('parameters')+'Parameter Manager';b.onclick=()=>run(()=>open());tools.append(b);}
window.addEventListener('engineer-open-parameter',event=>run(()=>open(event.detail)));window.addEventListener('engineer-document-changed',event=>{if(!working&&panel.getBoundingClientRect().width)refresh({revision:event.detail.document.revision}).catch(error=>message(error.message,'error'));});window.engineerParameterManager={open};window.addEventListener('engineer-panel-ready',event=>{if(event.detail==='parameters')refresh().catch(error=>message(error.message,'error'));});

window.addEventListener('engineer-panel-activated',event=>{if(event.detail==='parameters')refresh().catch(error=>message(error.message,'error'));});await refresh().catch(error=>message(error.message,'error'));
