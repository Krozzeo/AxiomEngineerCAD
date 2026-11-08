import {operationPanel,operationSelection,operationValue} from './operation-inspector.mjs';
import {sketchTransform,transformSketchEntity,patternStep,MAX_SKETCH_ENTITIES} from '/curves.mjs';
import {pointAt,splineHandleRoles} from '/relation-kinds.mjs';
import {icon} from './icons.mjs';

const same=(a,b)=>a?.entityId===b?.entityId&&a?.role===b?.role;
export function sketchTransforms({document,host,ribbon,getState,selected,selectMode,label,mutate,parameters,openInspector,redraw,status,onActive}){
 const buttons=new Map(),{element:panel,heading,actions}=operationPanel(document,host,'sketch-transform');
 const values=document.createElement('div'),reverse=document.createElement('button'),independent=document.createElement('input'),independentLabel=document.createElement('label');
 independent.type='checkbox';independentLabel.append(independent,document.createTextNode(' Independent'));
 reverse.type='button';reverse.innerHTML=icon('rotate');reverse.setAttribute('aria-label','Reverse direction');reverse.title='Reverse direction';
 let draft=null,working=false;
 const sources=operationSelection(document,{title:'Entities',activate:()=>selectTable(0),remove:ref=>{draft.sources=draft.sources.filter(r=>!same(r,ref));paint();}});
 const target=operationSelection(document,{title:'Reference',activate:()=>selectTable(1),remove:()=>{draft.target=null;paint();}});
 const apply=document.createElement('button'),cancelButton=document.createElement('button');
 apply.type=cancelButton.type='button';apply.textContent='Apply';cancelButton.textContent='Cancel';actions.append(apply,cancelButton);
 panel.append(heading,sources.element,target.element,values,actions);
 function selectTable(index){if(!draft||draft.table===index)return;draft.table=index;paint();}
 function shape(ref){return getState()?.items.find(e=>e.id===ref?.entityId);}
 function validSource(ref){const e=shape(ref);return !!e&&!e.external&&e.type!=='equation-curve'&&!splineHandleRoles(ref.role);}
 function validTarget(ref){const e=shape(ref);return draft?.mode==='circular'?!!pointAt(getState().items,ref):e?.type==='line';}
 function paint(){
  if(!draft)return;
  const title=draft.mode==='mirror'?'Mirror Entities':draft.mode==='linear'?'Linear Sketch Pattern':'Circular Sketch Pattern';
  heading.textContent=title;
  target.element.querySelector('h4').textContent=draft.mode==='mirror'?'Mirror reference':draft.mode==='linear'?'Direction':'Center';
  sources.paint(draft.sources.map(ref=>({...ref,name:label(ref)})),draft.table===0);
  target.paint(draft.target?[{...draft.target,name:label(draft.target)}]:[],draft.table===1);
  reverse.setAttribute('aria-pressed',String(draft.reverse));
  apply.disabled=working||!draft.sources.length||!validTarget(draft.target)||exceedsCapacity();
  redraw();
 }
 function exceedsCapacity(){return draft.mode!=='mirror'&&(draft.count-1)*draft.sources.length>MAX_SKETCH_ENTITIES-getState().items.length+(draft.previous??0);}
 function cancel(){
  if(!draft||working)return;
  draft=null;panel.hidden=true;for(const button of buttons.values())button.setAttribute('aria-pressed','false');
  onActive(false);redraw();
 }
 async function open(mode,operation=null){
  if(!operation&&draft?.mode===mode){cancel();return;}
  const state=getState();if(!state||working)return;
  const seed=(operation?operation.entityIds.map(entityId=>({entityId,role:'entity'})):selected()).filter(validSource),ids=new Set(seed.map(r=>r.entityId));
  const initial=[...ids].map(entityId=>({entityId,role:'entity'}));
  const axes=state.items.filter(e=>e.type==='line'&&e.construction&&!e.referenceOnly&&!ids.has(e.id));
  selectMode();draft={mode,id:'transform-'+crypto.randomUUID(),owner:state.id,context:state.context,sources:initial,
    target:mode==='mirror'&&axes.length===1?{entityId:axes[0].id,role:'entity'}:null,table:initial.length?1:0,
    count:3,spacing:mode==='circular'?360:10,distribution:mode==='circular'?'total':'step',countParameterId:null,spacingParameterId:null,reverse:false};
  if(operation){
   const angle=mode==='circular'?180/Math.PI:1;
   Object.assign(draft,{id:operation.id,replacing:true,target:operation.reference??{entityId:operation.axisId,role:'entity'},
    count:operation.count??2,spacing:operation.spacing===undefined?10:operation.spacing*angle,
    countParameterId:operation.countParameterId,spacingParameterId:operation.spacingParameterId,
    distribution:operation.distribution??'step',reverse:!!operation.reverse,previous:operation.generated?.length??0});
  }
  const active=draft;independent.checked=false;independentLabel.lastChild.textContent=mode==='mirror'?' Independent mirroring':' Independent pattern';values.replaceChildren(independentLabel);
  for(const [name,button]of buttons)button.setAttribute('aria-pressed',String(name===mode||name==='linear'&&mode==='circular'));
  panel.hidden=false;onActive(true);openInspector();paint();(draft.table?target:sources).element.focus({preventScroll:true});
  if(mode!=='mirror'){
   const available=await parameters();if(draft!==active)return;
   const distribution=document.createElement('div');distribution.className='pattern-distribution';
   const captions=mode==='circular'?['Angular spacing between instances','Total angular range']:['Spacing between instances','Total distance'];
   for(const [index,key] of ['step','total'].entries()){
    const button=document.createElement('button');button.type='button';button.dataset.distribution=key;
    button.innerHTML=icon(mode==='circular'?(index?'arc':'rotate'):(index?'dimension':'pattern'));
    button.title=captions[index];button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-pressed',String(draft.distribution===key));
    button.onclick=()=>{draft.distribution=key;for(const option of distribution.children)option.setAttribute('aria-pressed',String(option===button));paint();};
    distribution.append(button);
   }
   values.append(reverse,distribution);
   for(const [key,unit,caption] of [['count','scalar','Count'],['spacing',mode==='circular'?'rad':'mm',mode==='circular'?'Angular spacing (°)':'Spacing (mm)']]){
    const choices=available.filter(p=>p.unit===unit).map(p=>({value:p.id,label:p.name,number:unit==='rad'?p.value*180/Math.PI:p.value}));
    const driver=choices.find(choice=>choice.value===draft[key+'ParameterId']);if(driver)draft[key]=driver.number;
    const field=operationValue(document,{field:'sketch-pattern-'+key,label:caption,options:choices,value:draft[key],id:draft[key+'ParameterId'],emptyMessage:false,
     onChange:(n,id,focus)=>{
      if(!Number.isFinite(n)||(key==='count'?(!Number.isSafeInteger(n)||n<2):n<=0)){status('Enter a supported '+caption.toLowerCase()+'.');field.control.setLiteral(draft[key]);return;}
      draft[key]=n;draft[key+'ParameterId']=id;if(!id)field.control.setLiteral(n);if(focus)field.control.input.select();paint();
     },
     onSource:()=>{const id=draft[key+'ParameterId'];if(id)window.dispatchEvent(new CustomEvent('engineer-open-parameter',{detail:id}));else{field.control.input.focus();field.control.input.select();}}
    });
    values.append(field.title,field.row);
   }
   paint();
  }
 }
 for(const [mode,title,glyph]of [['mirror','Mirror Entities','mirror'],['linear','Sketch Pattern','pattern'],['circular','Circular Sketch Pattern','circular-pattern']]){
  const button=document.createElement('button');button.id=mode==='mirror'?'sketch-mirror':mode==='linear'?'sketch-pattern':'sketch-circular-pattern';
  button.innerHTML=icon(glyph)+' '+title;button.onclick=()=>open(mode).catch(error=>status(error.message));ribbon.append(button);buttons.set(mode,button);
 }
 reverse.onclick=()=>{draft.reverse=!draft.reverse;paint();};
 cancelButton.onclick=cancel;
 apply.onclick=async()=>{
  if(!draft||working||apply.disabled)return;
  const state=getState(),{owner,id,mode,context,sources,target,count,spacing,distribution,reverse,countParameterId,spacingParameterId,replacing}=draft;
  if(owner!==state?.id){cancel();return;}
  const fields={sketchId:owner,id,entityIds:sources.map(ref=>ref.entityId),...(replacing?{replace:true}:{}),...(independent.checked?{independent:true}:{})};
  working=true;paint();
  try{
   if(mode==='mirror')await mutate('sketch.mirror',{...fields,axisId:target.entityId},context);
   else await mutate('sketch.pattern',{...fields,mode,count,spacing:mode==='circular'?spacing*Math.PI/180:spacing,distribution,reverse,reference:target,
    ...(countParameterId?{countParameterId}:{}),...(spacingParameterId?{spacingParameterId}:{})},context);
   working=false;cancel();
  }catch(error){working=false;paint();status(error.message);}
 };
 document.addEventListener('keydown',event=>{
  if(!draft||working||(event.key!=='Escape'&&event.target.closest?.('input,select,textarea')))return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}
  else if(event.key==='Tab'&&(panel.contains(event.target)||event.target.closest?.('#model-content'))){
   event.preventDefault();selectTable(draft.table?0:1);(draft.table?target:sources).element.focus();
  }
 },true);
 return {get active(){return !!draft;},get highlighted(){return draft?(draft.table===0?draft.sources:draft.target?[draft.target]:[]):[];},edit:operation=>open(operation.mode??'mirror',operation),cancel,consume(value){
  if(!draft)return false;if(working||!value)return true;
  const refs=value.kind==='components'?value.refs:[value];
  for(const ref of refs){
   if(draft.table===1){if(validTarget(ref))draft.target={entityId:ref.entityId,role:draft.mode==='circular'?ref.role:'entity'};else status('Choose a valid '+(draft.mode==='circular'?'center point.':'straight reference.'));}
   else if(validSource(ref)&&ref.entityId!==draft.target?.entityId){
    const index=draft.sources.findIndex(r=>r.entityId===ref.entityId);
    if(index>=0)draft.sources.splice(index,1);else if(draft.sources.length<16)draft.sources.push({entityId:ref.entityId,role:'entity'});
   }
  }
  paint();return true;
 },preview(){
  if(!draft?.sources.length||!validTarget(draft.target)||exceedsCapacity())return [];
  const {mode,count,spacing,distribution,reverse}=draft,axis=shape(draft.target),center=mode==='circular'?pointAt(getState().items,draft.target):null;
  return Array.from({length:(mode==='mirror'?2:count)-1},(_,i)=>{
   const map=sketchTransform(mode,{axis,center,spacing:patternStep(mode,distribution,mode==='circular'?spacing*Math.PI/180:spacing,count),reverse},i+1);
   return draft.sources.map(shape).filter(Boolean).map(e=>transformSketchEntity(e,map,{mirror:mode==='mirror'}));
  }).flat();
 }};
}
