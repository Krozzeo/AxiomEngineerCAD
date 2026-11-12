import {constructReference} from '/reference/geometry.mjs';
import {operationSelection,operationValue} from './operation-inspector.mjs';
import {searchSelect} from './search-select.mjs';
import {icon} from './icons.mjs';

const vector=(a,b)=>a.map((n,i)=>n-b[i]);
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const unit=a=>{const length=Math.hypot(...a);return a.map(n=>n/length);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function featureChoices(graph,scene){
 const choices=[],push=(name,target,geometry=null)=>choices.push({value:JSON.stringify(target),label:name,target,...(geometry?{geometry}:{})});
 for(const datum of scene?.datums??[])push(datum.name,datum,datum.datumType==='point'?{kind:'point',origin:datum.originMm}:datum.datumType==='axis'?{kind:'line',origin:datum.originMm,direction:datum.direction}:{kind:'plane',...datum.planeFrame,origin:datum.originMm,normal:datum.normal,u:datum.u??(['xz','xy'].includes(datum.role)?[1,0,0]:[0,1,0]),v:datum.planeFrame?.v??(datum.role==='xy'?[0,1,0]:[0,0,1])});
 for(const feature of graph.features){
  if(feature.type==='sketch-primitives'){
   const sketch=scene?.sketches?.find(s=>s.id===feature.id);
   const target={kind:'sketch',producerId:feature.id,definitionId:feature.definitionId,role:'result',occurrencePath:[feature.definitionId]};
   push(feature.data.name,target);
   for(const e of feature.data.entities){
    const base=feature.data.name+' Ã‚Â· '+(e.name??e.id);
    const frame=sketch?.frame,world=p=>frame&&p?frame.origin.map((n,i)=>n+frame.u[i]*p[0]+frame.v[i]*p[1]):null;
    if(e.type==='line')push(base,{...target,role:e.id},frame?{kind:'line',origin:world(e.a),direction:unit(vector(world(e.b),world(e.a)))}:null);
    for(const role of e.type==='point'?['point']:e.type==='circle'?['center']:e.type==='line'?['a','b','midpoint']:e.type==='arc'?['a','b','center']:[])
     push(base+' Ã‚Â· '+role,{...target,role:e.id+':'+role},frame?{kind:'point',origin:world(role==='midpoint'?e.a.map((n,i)=>(n+e.b[i])/2):e[role])}:null);
   }
  }else if(feature.type==='sketch-extrusion')push(feature.data.name,{kind:'feature',producerId:feature.id,definitionId:feature.definitionId,role:'result',occurrencePath:[feature.definitionId]});
 }
 for(const model of scene?.models??[]){
  const base={producerId:model.featureId,definitionId:model.definitionId,occurrencePath:[model.definitionId]};
  push('Model body',{...base,kind:'body',role:'solid'});for(const [i,body]of(model.mesh.bodies??[]).entries())push('Body '+(i+1),{...base,kind:'body',role:body.role});
  for(const face of model.mesh.faces??[])if(face.planeNormal&&['ResolvedStable','ResolvedReidentified'].includes(face.resolution)){
   const normal=face.planeNormal,right=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],u=unit(right.map((n,i)=>n-normal[i]*dot(right,normal)));
   push('Face Ã‚Â· '+face.role,{...base,kind:'face',role:face.role},{kind:'plane',origin:face.centerOfAreaMm,normal,u,v:cross(normal,u)});
  }
  for(const edge of model.mesh.edges??[])if(edge.points.length===2&&!edge.curve&&!edge.displayHidden&&edge.resolution==='ResolvedStable')
   push('Edge Ã‚Â· '+edge.role,{...base,kind:'edge',role:edge.role},{kind:'line',origin:edge.points[0],direction:unit(vector(edge.points[1],edge.points[0]))});
  for(const point of model.mesh.exactVertices??[])if(!point.displayHidden&&point.resolution==='ResolvedStable')push('Vertex Ã‚Â· '+point.role,{...base,kind:'vertex',role:point.role},{kind:'point',origin:point.pointMm});
 }
 return choices.map(choice=>({...choice,target:Object.fromEntries(['kind','producerId','definitionId','role','occurrencePath'].map(key=>[key,choice.target[key]])),value:JSON.stringify(Object.fromEntries(['kind','producerId','definitionId','role','occurrencePath'].map(key=>[key,choice.target[key]])))}));
}
const same=(a,b)=>a?.target.producerId===b?.target.producerId&&a?.target.role===b?.target.role&&a?.target.kind===b?.target.kind;
const reference=choice=>({target:structuredClone(choice.target),...(choice.geometry?{geometry:structuredClone(choice.geometry)}:{})});

export function featureFields({document,host,owner,graph,scene,onChange,status,onSelectTable,highlight}){
 const settings=structuredClone(owner.create?owner.input:owner.data),referenceKind=owner.referenceKind;
 const state={...settings,limits:structuredClone(settings.limits??{start:{mode:'value',value:0},end:{mode:'value',value:settings.form==='revolve'?settings.angleDeg:settings.depthMm}})};
 let active=null,limitsChanged=!!settings.limits;
 const editIndex=owner.item?graph.features.findIndex(f=>f.id===owner.item.id):-1,allowed=c=>c.target.producerId==='reference-frame'||editIndex<0||graph.features.findIndex(f=>f.id===c.target.producerId)<editIndex;
 const choices=featureChoices(graph,scene).filter(allowed),tables=[],fields=new Map(),limitPanels=new Map();
 const name=document.createElement('label'),nameInput=document.createElement('input');name.textContent='Name';nameInput.dataset.extrusionName='true';nameInput.value=settings.name;nameInput.maxLength=128;name.append(nameInput);host.append(name);
 const form=settings.form,repeating=form==='repeat',revolve=form==='revolve';if(repeating)owner.depth={};
 function value(key,title,number,unitName,parameterId,onCommit){
  const options=graph.parameters.filter(p=>p.unit===unitName||unitName==='mm'&&p.unitMode==='auto'&&!p.targets?.length).map(p=>({value:p.id,label:p.name,number:unitName==='rad'?p.value*180/Math.PI:p.value,depth:p.value}));
  const field=operationValue(document,{field:key,label:title,options,value:number,id:parameterId,
   onChange:(number,id,focus)=>{if(!Number.isFinite(number)){status('Enter a number or select a parameter.');return;}onCommit(number,id);if(!id)field.control.setLiteral(number);if(focus){field.control.input.focus({preventScroll:true});field.control.input.select();}onChange();},
   onSource:()=>{const id=field.control.select.value;if(owner.item&&key==='extrusion-depth-value')window.dispatchEvent(new CustomEvent('engineer-open-dimension-source',{detail:{parameterId:id||null,featureId:owner.item.id,parameter:'depth'}}));else if(id)window.dispatchEvent(new CustomEvent('engineer-open-parameter',{detail:id}));else{field.control.input.focus();field.control.input.select();}}
  });fields.set(key,field);return field;
 }
 function selection(title,rows,valid,{multiple=false,changed=()=>{}}={}){
  const selected=rows.filter(Boolean).map(row=>choices.find(c=>same(c,row))??{...row,label:row.name??row.target.role});
  const table=operationSelection(document,{title,activate:()=>activate(table),remove:item=>{selected.splice(selected.indexOf(item),1);paint();changed();onChange();}});
  const search=searchSelect({document,field:'feature-selection-'+tables.length,label:'Select '+title.toLowerCase(),options:choices.filter(valid),value:'',onSelect:id=>pick(choices.find(c=>c.value===id),table)});
  table.element.append(search.element);Object.assign(table,{selected,valid,multiple,changed,search});tables.push(table);host.append(table.element);return table;
 }
 function activate(table){active=table;for(const t of tables)t.paint(t.selected.map(c=>Object.assign(c,{name:c.label})),t===active);onSelectTable?.();highlight?.(active.selected);}
 function paint(){for(const t of tables)t.paint(t.selected.map(c=>Object.assign(c,{name:c.label})),t===active);highlight?.(active?.selected??[]);}
 function pick(choice,table=active){
  if(!choice||!table||!table.valid(choice)){status('Choose a valid reference for the active table.');return false;}
  const old=table.selected.findIndex(c=>same(c,choice));
  if(table.multiple){if(old>=0)table.selected.splice(old,1);else table.selected.push(choice);}else table.selected.splice(0,table.selected.length,choice);
  table.changed();paint();onChange();return true;
 }
 const plane=c=>c.target.kind==='face'||c.target.kind==='datum'&&(c.target.role==='plane'||['xy','xz','yz'].includes(c.target.role));
 const line=c=>c.geometry?.kind==='line'||c.target.kind==='sketch'&&!c.target.role.includes(':')&&c.target.role!=='result'||c.target.kind==='datum'&&['axis','x','y','z'].includes(c.target.role);
 let sourceTable,axisTable,referenceTables=[];
 if(referenceKind){
  for(let index=0;index<3;index++){
   const entry=settings.references?.[index],table=selection('Reference '+(index+1),entry?[entry]:[],c=>c.target.kind!=='body'&&c.target.kind!=='feature'&&c.target.role!=='result');
   const label=document.createElement('label'),relation=document.createElement('select');label.textContent='Relation';
   for(const type of ['coincident','parallel','perpendicular','offset','angle','midplane'])relation.append(new Option(type,type));relation.value=entry?.relation??'coincident';label.append(relation);host.append(label);
   const distance=value('reference-value-'+index,'Distance / angle',entry?.value??0,entry?.relation==='angle'?'rad':'mm',entry?.parameterId,()=>{});host.append(distance.title,distance.row);
   const update=()=>{distance.title.hidden=distance.row.hidden=!['offset','angle'].includes(relation.value);onChange();};relation.onchange=()=>{distance.control.setOptions(graph.parameters.filter(p=>p.unit===(relation.value==='angle'?'rad':'mm')).map(p=>({value:p.id,label:p.name,number:relation.value==='angle'?p.value*180/Math.PI:p.value})));distance.control.setLiteral(0);update();};table.changed=()=>{const c=table.selected[0],point=c?.geometry?.kind==='point'||c?.target.role.includes(':')||c?.target.role==='origin',planar=c&&plane(c);const allowed=point?['coincident']:referenceKind==='coordinate'?['coincident','parallel']:referenceKind==='axis'?['coincident','parallel','perpendicular']:planar?['coincident','parallel','perpendicular','offset','angle','midplane']:['coincident','parallel','perpendicular'];for(const option of relation.options)option.disabled=!allowed.includes(option.value);if(!allowed.includes(relation.value))relation.value='coincident';update();};table.changed();
   referenceTables.push({table,relation,distance});
  }
 }else if(repeating){
  sourceTable=selection('Features',(settings.repeat.sourceFeatureIds??[settings.repeat.sourceFeatureId]).filter(Boolean).map(id=>({target:{producerId:id,kind:'feature',role:'result'}})),c=>c.target.kind==='feature',{multiple:true});
  const old=settings.repeat.reference,axis=settings.repeat.axis??'x';
  axisTable=selection(settings.repeat.kind==='mirror'?'Mirror plane':settings.repeat.kind==='linear'?'Direction':'Axis',old?[old]:[{target:{kind:'datum',producerId:'reference-frame',role:settings.repeat.kind==='mirror'?{x:'yz',y:'xz',z:'xy'}[axis]:axis}}],settings.repeat.kind==='mirror'?plane:line);
  for(const [key,title,number,units]of [['count','Instances including source',settings.repeat.count,'scalar'],['offsetMm',settings.repeat.kind==='mirror'?'Plane offset (mm)':'Step (mm)',settings.repeat.offsetMm,'mm'],['angleDeg','Angular step (Ã‚Â°)',settings.repeat.angleDeg,'rad']]){
   if(key==='count'&&settings.repeat.kind==='mirror'||key==='angleDeg'&&settings.repeat.kind!=='circular'||key==='offsetMm'&&settings.repeat.kind==='circular')continue;
   const field=value('feature-'+key,title,number,units,settings.repeat[key+'ParameterId'],(n,id)=>{state.repeat[key]=n;if(id)state.repeat[key+'ParameterId']=id;else delete state.repeat[key+'ParameterId'];});
   field.control.input.dataset.featureSetting=key;host.append(field.title,field.row);
  }
 }else{
  sourceTable=selection('Sketch',[settings.sketchId?{target:{kind:'sketch',producerId:settings.sketchId,role:'result'}}:null],c=>c.target.kind==='sketch'&&c.target.role==='result');
  if(revolve)axisTable=selection('Axis',settings.axisReference?[settings.axisReference]:settings.axisId?[{target:{kind:'sketch',producerId:settings.sketchId,role:settings.axisId}}]:[],line);
  const boolean=document.createElement('section'),heading=document.createElement('h4');heading.textContent='Boolean';boolean.className='feature-boolean';boolean.append(heading);
  for(const [mode,title,glyph]of [['none','None','boolean-none'],['add','Unite','boolean-unite'],['cut','Subtract','boolean-subtract'],['intersect','Intersect','boolean-intersect']]){
   const button=document.createElement('button');button.type='button';button.title=title;button.setAttribute('aria-label',title);button.dataset.featureBoolean=mode;button.innerHTML=icon(glyph);
   button.disabled=!settings.baseFeatureId&&mode!=='none';button.setAttribute('aria-pressed',String((state.operation==='new-body'?'none':state.operation)===mode));
   button.onclick=()=>{state.operation=mode==='none'&&!settings.baseFeatureId?'new-body':mode;for(const b of boolean.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));onChange();};boolean.append(button);
  }host.append(boolean);
  const limitsTitle=document.createElement('h4');limitsTitle.textContent='Limits';host.append(limitsTitle);
  for(const side of ['start','end']){
   const region=document.createElement('section'),title=document.createElement('h5'),modes=document.createElement('div');region.dataset.limitSide=side;title.textContent=side==='start'?'From':'To';modes.className='feature-limit-modes';region.append(title,modes);host.append(region);
   const limit=state.limits[side];
   const field=value(side==='end'?'extrusion-depth-value':'extrusion-start-value',revolve?'Angle (Ã‚Â°)':'Value (mm)',limit.value,revolve?'rad':'mm',limit.parameterId??(side==='end'&&!revolve?graph.parameters.find(p=>p.targets?.some(t=>t.featureId===owner.item?.id&&t.parameter==='depth'))?.id:null),(number,id)=>{
    limit.value=number;if(id)limit.parameterId=id;else delete limit.parameterId;if(side==='end'&&!revolve){state.depthMm=number;owner.depth.depthMm=number;owner.depth.parameterId=id;}limitsChanged=true;
   });
   if(side==='end'){
    field.control.input.dataset.parameter='depth';owner.depth={depthMm:settings.depthMm,parameterId:field.control.select.value||null,options:[],control:field.control};
   }
   const reverse=document.createElement('button');reverse.type='button';reverse.title='Reverse direction';reverse.setAttribute('aria-label','Reverse direction');reverse.dataset.extrusionReverse=side;reverse.innerHTML=icon('rotate');reverse.setAttribute('aria-pressed',String(!!state.reverse));reverse.onclick=()=>{state.reverse=!state.reverse;for(const b of host.querySelectorAll('[data-extrusion-reverse]'))b.setAttribute('aria-pressed',String(state.reverse));onChange();};field.row.append(reverse);
   region.append(field.title,field.row);
   const table=selection((side==='start'?'From':'To')+' reference',limit.reference?[limit.reference]:[],c=>plane(c)||['body','feature'].includes(c.target.kind));region.append(table.element);
   const update=()=>{
    field.title.hidden=field.row.hidden=!['value','symmetric','offset'].includes(limit.mode);table.element.hidden=!['selected','offset'].includes(limit.mode);
    for(const button of modes.children)button.setAttribute('aria-pressed',String(button.dataset.limitMode===limit.mode));
    const end=limitPanels.get('end');if(end)end.hidden=state.limits.start.mode==='symmetric';
   };
   for(const [mode,label,glyph]of [['value','Value','dimension'],['symmetric','Symmetric Value','mirror'],['next','Until Next','limit-next'],['selected','Until Selected','face'],['offset','Offset from Selected','limit-offset'],['all','Through All','limit-all']]){
    if(mode==='symmetric'&&side==='end')continue;
    const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.dataset.limitMode=mode;button.innerHTML=icon(glyph);button.disabled=['next','all'].includes(mode)&&!settings.baseFeatureId;
    button.onclick=()=>{limit.mode=mode;limitsChanged=true;update();onChange();};modes.append(button);
   }
   limitPanels.set(side,region);update();Object.assign(region,{table,field,update});
  }
  limitPanels.get('start').update();
 }
 function readNumber(field){const text=field.control.input.value.trim();if(field.control.select.value)return null;if(text&&!Number.isNaN(Number(text)))return Number(text);throw Error('Select a parameter or enter a numeric value.');}
 function read({draft=false}={}){
  if(referenceKind)return {featureId:settings.featureId??owner.item?.id??settings.id,name:nameInput.value,kind:referenceKind,...(owner.item?{replace:true}:{}),references:referenceTables.filter(({table})=>table.selected.length).map(({table,relation,distance})=>({...reference(table.selected[0]),relation:relation.value,value:readNumber(distance)??0,...(distance.control.select.value?{parameterId:distance.control.select.value}:{})}))};
  if(!sourceTable.selected.length)throw Error('Select '+(repeating?'one or more features.':'a source sketch.'));
  const selected=sourceTable.selected[0],sketchId=repeating?graph.features.find(f=>f.id===selected.target.producerId).data.sketchId:selected.target.producerId;
  const input={name:nameInput.value,sketchId,depthMm:state.depthMm,reverse:state.reverse,operation:state.operation,...(settings.baseFeatureId?{baseFeatureId:settings.baseFeatureId}:{})};
  if(repeating){if(!axisTable.selected.length)throw Error('Select the operation reference.');if(owner.create){const source=graph.features.find(f=>f.id===selected.target.producerId);input.operation=['new-body','none'].includes(source.data.operation)?'none':source.data.operation;}input.repeat={...state.repeat,sourceFeatureId:selected.target.producerId,sourceFeatureIds:sourceTable.selected.map(c=>c.target.producerId),reference:reference(axisTable.selected[0])};return input;}
  if(revolve){if(!axisTable.selected.length)throw Error('Select a revolution axis.');input.axisReference=reference(axisTable.selected[0]);input.axisId=settings.axisId??axisTable.selected[0].target.role;input.angleDeg=state.angleDeg;}
  for(const [side,region]of limitPanels){
   const limit=state.limits[side];
   if(draft&&['value','symmetric','offset'].includes(limit.mode)){const n=readNumber(region.field);if(n!==null&&n!==limit.value){limit.value=n;limitsChanged=true;}}
   if(['selected','offset'].includes(limit.mode)){if(!region.table.selected.length)throw Error('Select the '+side+' limit reference.');limit.reference=reference(region.table.selected[0]);}
  }
  if(limitsChanged){input.limits=structuredClone(state.limits);if(!revolve&&input.limits.end.mode==='value')input.depthMm=Math.max(.001,Math.abs(input.limits.end.value-input.limits.start.value));}
  if(!revolve){input.replaceDepthBinding=true;const id=limitPanels.get('end').field.control.select.value;if(id&&state.limits.end.mode==='value'&&state.limits.start.mode==='value'&&state.limits.start.value===0)input.depthParameterId=id;}
  return input;
 }
 activate(tables.find(t=>!t.selected.length&&!t.element.hidden)??tables[0]);
 return {read,pick,choices,refreshScene(scene){const next=featureChoices(graph,scene).filter(allowed);if(JSON.stringify(next)===JSON.stringify(choices))return;choices.splice(0,choices.length,...next);for(const table of tables)table.search.setOptions(choices.filter(table.valid));paint();},preview(){if(!referenceKind)return null;const entries=read().references;return {kind:referenceKind,frame:constructReference(referenceKind,entries.map(e=>({...e,value:e.parameterId?(graph.parameters.find(p=>p.id===e.parameterId)?.value??0)*(e.relation==='angle'?180/Math.PI:1):e.value,geometry:referenceTables.find(r=>r.table.selected.some(c=>same(c,e)))?.table.selected[0].geometry})))};},cancel(){highlight?.([]);},focus(){const field=fields.get('extrusion-depth-value');if(field&&!field.row.hidden){field.control.input.focus({preventScroll:true});field.control.input.select();}}};
}
