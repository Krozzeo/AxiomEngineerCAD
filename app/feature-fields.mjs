import {patternDistribution} from './pattern-controls.mjs';
import {arcPoint} from '/curves.mjs';
import {constructReference,referenceRelations,inferReferenceRelations} from '/reference/geometry.mjs';
import {operationSelection,operationValue} from './operation-inspector.mjs';
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
    const base=feature.data.name+' · '+(e.name??e.id);
    const frame=sketch?.frame,world=p=>frame&&p?frame.origin.map((n,i)=>n+frame.u[i]*p[0]+frame.v[i]*p[1]):null;
    if(e.type==='line')push(base,{...target,role:e.id},frame?{kind:'line',origin:world(e.a),a:world(e.a),b:world(e.b),direction:unit(vector(world(e.b),world(e.a)))}:null);
    if(frame&&['circle','arc'].includes(e.type)){const a=e.type==='arc'?e.a:[e.center[0]+e.radius,e.center[1]],b=e.type==='arc'?e.b:a;push(base,{...target,role:e.id},{kind:'circle',origin:world(e.center),normal:frame.normal,direction:frame.normal,radius:e.radius,a:world(a),b:world(b),point:world(e.type==='arc'?arcPoint(e,.5):a),full:e.type==='circle'});}
    for(const role of e.type==='point'?['point']:e.type==='circle'?['center']:e.type==='line'?['a','b','midpoint']:e.type==='arc'?['a','b','center']:[])
     push(base+' · '+role,{...target,role:e.id+':'+role},frame?{kind:'point',origin:world(role==='midpoint'?e.a.map((n,i)=>(n+e.b[i])/2):e[role])}:null);
   }
  }else if(feature.type==='sketch-extrusion')push(feature.data.name,{kind:'feature',producerId:feature.id,definitionId:feature.definitionId,role:'result',occurrencePath:[feature.definitionId]});
 }
 for(const model of scene?.models??[]){
  const base={producerId:model.featureId,definitionId:model.definitionId,occurrencePath:[model.definitionId]};
  push('Model body',{...base,kind:'body',role:'solid'});for(const [i,body]of(model.mesh.bodies??[]).entries())push('Body '+(i+1),{...base,kind:'body',role:body.role});
  for(const face of model.mesh.faces??[])if((face.planeNormal||face.referenceGeometry)&&['ResolvedStable','ResolvedReidentified'].includes(face.resolution)){
   if(face.referenceGeometry){push('Face',{...base,kind:'face',role:face.role},face.referenceGeometry);continue;}
   const normal=face.planeNormal,right=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],u=unit(right.map((n,i)=>n-normal[i]*dot(right,normal)));
   push('Face',{...base,kind:'face',role:face.role},{kind:'plane',origin:face.centerOfAreaMm,normal,u,v:cross(normal,u)});
  }
  for(const edge of model.mesh.edges??[])if(edge.points.length===2&&!edge.curve&&!edge.displayHidden&&edge.resolution==='ResolvedStable')
   push('Edge',{...base,kind:'edge',role:edge.role},{kind:'line',origin:edge.points[0],a:edge.points[0],b:edge.points[1],direction:unit(vector(edge.points[1],edge.points[0]))});
  for(const edge of model.mesh.edges??[])if(edge.curve&&!edge.displayHidden&&edge.resolution==='ResolvedStable')push('Circular Edge',{...base,kind:'edge',role:edge.role},{kind:'circle',origin:edge.curve.centerMm,normal:edge.curve.normal,direction:edge.curve.normal,radius:edge.curve.radiusMm,a:edge.points[0],b:edge.points.at(-1),point:edge.points[Math.floor(edge.points.length/2)],full:!!edge.curve.full});
  for(const point of model.mesh.exactVertices??[])if(!point.displayHidden&&point.resolution==='ResolvedStable')push('Vertex',{...base,kind:'vertex',role:point.role},{kind:'point',origin:point.pointMm});
 }
 return choices.map(choice=>({...choice,target:Object.fromEntries(['kind','producerId','definitionId','role','occurrencePath'].map(key=>[key,choice.target[key]])),value:JSON.stringify(Object.fromEntries(['kind','producerId','definitionId','role','occurrencePath'].map(key=>[key,choice.target[key]])))}));
}
const same=(a,b)=>a?.target.producerId===b?.target.producerId&&a?.target.role===b?.target.role&&a?.target.kind===b?.target.kind;
const reference=choice=>({target:structuredClone(choice.target),...(choice.geometry?{geometry:structuredClone(choice.geometry)}:{})});

export function featureFields({document,host,owner,graph,scene,onChange,status,onSelectTable,highlight}){
 const settings=structuredClone(owner.create?owner.input:owner.data),referenceKind=owner.referenceKind;
 const state={...settings,operation:settings.baseFeatureId?(settings.booleanPreference??settings.operation):settings.operation,limits:structuredClone(settings.limits??{start:{mode:'value',value:0},end:{mode:'value',value:settings.form==='revolve'?settings.angleDeg:settings.depthMm}})};
 let booleanTouched=!owner.create;let booleanAvailable=settings.booleanPreference&&settings.operation==='none'&&settings.booleanPreference!=='none'?{none:true,add:false,cut:false,intersect:false}:null;const effectiveOperation=()=>booleanAvailable&&!booleanAvailable[state.operation]?'none':state.operation;
 let active=null,limitsChanged=!!settings.limits;
 const editIndex=owner.item?graph.features.findIndex(f=>f.id===owner.item.id):-1,allowed=c=>c.target.producerId==='reference-frame'||editIndex<0||graph.features.findIndex(f=>f.id===c.target.producerId)<editIndex;
 const choices=featureChoices(graph,scene).filter(allowed),tables=[],expressionDrafts=new Map(),fields=new Map(),limitPanels=new Map();
 const name=document.createElement('label'),nameInput=document.createElement('input');name.textContent='Name';nameInput.dataset.extrusionName='true';nameInput.value=settings.name;nameInput.maxLength=128;name.append(nameInput);host.append(name);
 const selectionRegion=document.createElement('section'),selectionHeading=document.createElement('h4');selectionRegion.className='feature-section feature-source-selection';selectionRegion.dataset.featureSection='selection';selectionHeading.textContent='Selection';selectionRegion.append(selectionHeading);host.append(selectionRegion);
 const form=settings.form,repeating=form==='repeat',revolve=form==='revolve',finishing=form==='finish';if(repeating||finishing)owner.depth={};
 if(repeating){if(!settings.repeat.explicitBoolean){const operation=graph.features.find(f=>f.id===settings.repeat.sourceFeatureId)?.data.operation;state.operation=operation==='new-body'?'none':operation??state.operation;}state.repeat.explicitBoolean=true;}
 if(repeating&&settings.repeat.kind==='mirror'&&!settings.repeat.reference&&settings.repeat.axis==='y')state.repeat.offsetMm=-settings.repeat.offsetMm;
 function value(key,title,number,unitName,parameterId,onCommit){
  const options=graph.parameters.filter(p=>p.unit===unitName||unitName==='mm'&&p.unitMode==='auto'&&!p.targets?.length).map(p=>({value:p.id,label:p.name,number:unitName==='rad'?p.value*180/Math.PI:p.value,depth:p.value}));
  const field=operationValue(document,{field:key,label:title,options,value:number,id:parameterId,parameters:graph.parameters,unit:unitName,definitionId:graph.primaryDefinitionId,onExpression:source=>{if(source)expressionDrafts.set(key,source);else expressionDrafts.delete(key);onChange();},
   onChange:(number,id,focus)=>{if(!Number.isFinite(number)){status('Enter a number or select a parameter.');return;}field.number=number;const committed=onCommit(number,id);if(!id)field.control.setLiteral(committed??number);if(focus){field.control.input.focus({preventScroll:true});field.control.input.select();}onChange();},
   onSource:()=>{const id=field.control.select.value;if(owner.item&&key==='extrusion-depth-value')window.dispatchEvent(new CustomEvent('engineer-open-dimension-source',{detail:{parameterId:id||null,featureId:owner.item.id,parameter:'depth'}}));else if(id)window.dispatchEvent(new CustomEvent('engineer-open-parameter',{detail:id}));else{field.control.input.focus();field.control.input.select();}}
  });fields.set(key,field);return field;
 }
 function selection(title,rows,valid,{multiple=false,changed=()=>{}}={}){
  const selected=rows.filter(Boolean).map(row=>choices.find(c=>same(c,row))??{...row,label:row.name??(row.target.kind==='edge'?'Edge':row.target.kind==='face'?'Face':row.target.kind==='vertex'?'Vertex':row.target.kind)});
  const table=operationSelection(document,{title,activate:()=>activate(table),hover:item=>highlight?.(item?[item]:active?.selected??[]),remove:item=>{selected.splice(selected.indexOf(item),1);paint();table.changed();onChange();}});
  Object.assign(table,{title,selected,valid,multiple,changed});tables.push(table);selectionRegion.append(table.element);return table;
 }
 function activate(table){active=table;for(const t of tables)t.paint(t.selected.map(c=>Object.assign(c,{name:c.label})),t===active);onSelectTable?.();highlight?.(active?.selected??[]);}
 function paint(){for(const t of tables)t.paint(t.selected.map(c=>Object.assign(c,{name:c.label})),t===active);highlight?.(active?.selected??[]);}
 function pick(choice,table=active){
  if(!choice||!table||!table.valid(choice)){status('Choose a valid reference for the active table.');return false;}
  const old=table.selected.findIndex(c=>same(c,choice));
  if(table.multiple){if(old>=0)table.selected.splice(old,1);else table.selected.push(choice);}else table.selected.splice(0,table.selected.length,choice);
  table.changed();paint();if(referenceKind){const next=referenceTables.findIndex(r=>r.table===table)+1;if(next>0&&next<referenceTables.length)activate(referenceTables[next].table);}else if(revolve&&table===sourceTable)activate(axisTable);onChange();return true;
 }
 const plane=c=>c.geometry?.kind==='plane';
 const line=c=>c.geometry?.kind==='line';
 let sourceTable,axisTable,referenceTables=[];
 function booleanSection(){
  const boolean=document.createElement('section'),heading=document.createElement('h4');heading.textContent='Boolean';boolean.className='feature-section feature-boolean';boolean.dataset.featureSection='boolean';boolean.append(heading);
  for(const [mode,title,glyph]of [['none','None','boolean-none'],['add','Unite','boolean-unite'],['cut','Subtract','boolean-subtract'],['intersect','Intersect','boolean-intersect']]){
   const button=document.createElement('button');button.type='button';button.title=title;button.setAttribute('aria-label',title);button.dataset.featureBoolean=mode;button.innerHTML=icon(glyph);
   button.disabled=mode!=='none'&&(!settings.baseFeatureId||booleanAvailable?.[mode]===false);button.setAttribute('aria-pressed',String((effectiveOperation()==='new-body'?'none':effectiveOperation())===mode));
   button.onclick=()=>{booleanTouched=true;state.operation=mode==='none'&&!settings.baseFeatureId?'new-body':mode;paintBoolean();onChange();};boolean.append(button);
  }host.append(boolean);
 }
 let definitionMode='references',definitionButtons=[],coordinateOrientation=structuredClone(settings.orientation??{primaryAxis:'x',reverse:false,quarterTurns:0});
 const absoluteReference=mode=>({target:{kind:'datum',producerId:'reference-frame',definitionId:graph.primaryDefinitionId,occurrencePath:[graph.primaryDefinitionId],role:referenceKind==='plane'?{x:'yz',y:'xz',z:'xy'}[mode]:referenceKind==='axis'?mode:'origin'},relation:'coincident',value:0});
 function referenceEntries(){return definitionMode==='references'?referenceTables.filter(({table})=>table.selected.length).map(({table,relation,distance})=>({...reference(table.selected[0]),relation:relation.value,...(relation.value==='angle'?{angleAxis:relation.angleAxis??'u'}:{}),value:readNumber(distance)??0,...(distance.control.select.value?{parameterId:distance.control.select.value}:{})})):[absoluteReference(definitionMode)];}
 if(referenceKind){
  const modes=document.createElement('div');modes.className='reference-definition-modes';modes.setAttribute('aria-label','Definition method');name.after(modes);
  definitionMode=settings.definitionMode??'references';
  for(const mode of ['references',...(referenceKind==='coordinate'?['origin']:['x','y','z'])]){
   const b=document.createElement('button');b.type='button';b.dataset.referenceDefinition=mode;b.title=mode==='references'?'Define by references':mode==='origin'?'Absolute origin':referenceKind==='plane'?mode.toUpperCase()+' = 0':'Absolute '+mode.toUpperCase()+' axis';b.setAttribute('aria-label',b.title);b.innerHTML=mode==='references'?icon('reference-three'):mode==='origin'?icon('origin'):'<span>'+mode.toUpperCase()+'</span>';
   b.onclick=()=>{definitionMode=mode;paintDefinition();onChange();};modes.append(b);definitionButtons.push(b);
  }
  function paintDefinition(){selectionRegion.hidden=definitionMode!=='references';for(const b of definitionButtons)b.setAttribute('aria-pressed',String(b.dataset.referenceDefinition===definitionMode));if(definitionMode==='references')activate(referenceTables.find(r=>!r.table.selected.length)?.table??referenceTables[0]?.table);else activate(null);}
  function refreshRelations(manualIndex=null,type=null){
   const entries=referenceTables.map(r=>({relation:r.relation.value,value:Number(r.distance.control.input.value)||0,geometry:r.table.selected[0]?.geometry}));
   const inferred=inferReferenceRelations(referenceKind,entries,{manualIndex,relation:type});
   for(const [index,r]of referenceTables.entries()){
    if(inferred[index].relation==='angle'&&entries[index].relation!=='angle'&&Number.isFinite(inferred[index].value))r.distance.control.setLiteral(inferred[index].value);r.relation.value=inferred[index].relation;const allowed=referenceRelations(referenceKind,inferred,index);
    for(const b of r.buttons){b.hidden=!allowed.includes(b.dataset.referenceRelation);b.setAttribute('aria-pressed',String(b.dataset.referenceRelation===r.relation.value));}
    r.distance.title.hidden=true;r.distance.row.hidden=!['offset','angle'].includes(r.relation.value);r.axisToggle.hidden=r.relation.value!=='angle';
   }
  }
  if(referenceKind==='coordinate'){
   const controls=document.createElement('div');controls.className='reference-orientation';controls.setAttribute('aria-label','Coordinate directions');modes.after(controls);
   const paint=()=>{for(const b of controls.querySelectorAll('[data-coordinate-primary]'))b.setAttribute('aria-pressed',String(b.dataset.coordinatePrimary===coordinateOrientation.primaryAxis));for(const b of controls.querySelectorAll('[data-coordinate-turn]'))b.setAttribute('aria-pressed',String(Number(b.dataset.coordinateTurn)===coordinateOrientation.quarterTurns));controls.querySelector('[data-coordinate-reverse]').setAttribute('aria-pressed',String(coordinateOrientation.reverse));};
   for(const axis of ['x','y','z']){const b=document.createElement('button');b.type='button';b.textContent=axis.toUpperCase();b.dataset.coordinatePrimary=axis;b.title='Use selected direction as '+axis.toUpperCase();b.setAttribute('aria-label',b.title);b.onclick=()=>{coordinateOrientation.primaryAxis=axis;paint();onChange();};controls.append(b);}
   const reverse=document.createElement('button');reverse.type='button';reverse.dataset.coordinateReverse='true';reverse.innerHTML=icon('rotate');reverse.title='Reverse primary direction';reverse.setAttribute('aria-label',reverse.title);reverse.onclick=()=>{coordinateOrientation.reverse=!coordinateOrientation.reverse;paint();onChange();};controls.append(reverse);
   for(let i=0;i<4;i++){const b=document.createElement('button');b.type='button';b.innerHTML=icon('angle-'+i*90);b.dataset.coordinateTurn=i;b.title='Rotate frame '+i*90+'°';b.setAttribute('aria-label',b.title);b.onclick=()=>{coordinateOrientation.quarterTurns=i;paint();onChange();};controls.append(b);}paint();
  }
  for(let index=0;index<3;index++){
   const entry=settings.references?.[index],table=selection('Reference '+(index+1),entry?[entry]:[],c=>!!c.geometry&&['point','line','plane','circle','cylinder','cone','sphere','surface'].includes(c.geometry.kind));
   const relations=document.createElement('div');relations.className='reference-relations';relations.setAttribute('aria-label','Reference '+(index+1)+' relations');selectionRegion.append(relations);
   const relation={value:entry?.relation??'coincident',angleAxis:entry?.angleAxis??'u'},buttons=[];
   const distance=value('reference-value-'+index,'Distance / angle',entry?.value??0,entry?.relation==='angle'?'rad':'mm',entry?.parameterId,()=>{});selectionRegion.append(distance.title,distance.row);
   const axisToggle=document.createElement('button');axisToggle.type='button';axisToggle.innerHTML=icon('rotate');axisToggle.dataset.referenceAngleAxis=index;axisToggle.setAttribute('aria-label','Switch rotation axis');axisToggle.title='Rotate about '+relation.angleAxis.toUpperCase();axisToggle.setAttribute('aria-pressed',String(relation.angleAxis==='v'));axisToggle.onclick=()=>{relation.angleAxis=relation.angleAxis==='u'?'v':'u';axisToggle.title='Rotate about '+relation.angleAxis.toUpperCase();axisToggle.setAttribute('aria-pressed',String(relation.angleAxis==='v'));onChange();};distance.row.append(axisToggle);
   for(const type of ['coincident','parallel','perpendicular','offset','angle','midplane','midpoint','endpoint-a','endpoint-b','center','tangent']){
    const b=document.createElement('button');b.type='button';b.title=type[0].toUpperCase()+type.slice(1);b.setAttribute('aria-label',b.title);b.dataset.referenceRelation=type;b.innerHTML=icon(type==='center'?'constraint-concentric':type==='tangent'?'constraint-tangent':type==='midpoint'?'constraint-midpoint':type==='endpoint-a'?'point-a':type==='endpoint-b'?'point-b':type==='angle'?'dim-angle':['coincident','parallel','perpendicular'].includes(type)?'constraint-'+type:'reference-'+type);
    b.onclick=()=>{const chosen=['midplane','midpoint'].includes(type)&&relation.value===type?'coincident':type;relation.value=chosen;distance.control.setOptions(graph.parameters.filter(p=>p.unit===(type==='angle'?'rad':'mm')).map(p=>({value:p.id,label:p.name,number:type==='angle'?p.value*180/Math.PI:p.value})));distance.control.setLiteral(0);refreshRelations(index,chosen);onChange();if(!distance.row.hidden){distance.control.input.focus();distance.control.input.select();}};relations.append(b);buttons.push(b);
   }
   table.changed=()=>refreshRelations();referenceTables.push({table,relation,distance,buttons,axisToggle});
  }
  refreshRelations();paintDefinition();
 }else if(finishing){
  sourceTable=selection('Edges',settings.finishing.references??[],c=>c.target.kind==='edge'&&c.target.producerId===settings.baseFeatureId,{multiple:true});
  const chamfer=state.finishing.kind==='chamfer';
  if(chamfer){state.finishing.mode??='distance-angle';state.finishing.distance2Mm??=1;state.finishing.angleDeg??=45;state.finishing.reverse??=false;}
  const modes=document.createElement('div');modes.className='reference-definition-modes chamfer-modes';
  if(chamfer){for(const [mode,label,glyph]of [['distance-angle','Distance and angle','chamfer-angle'],['two-distances','Two distances','chamfer-distances']]){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.dataset.chamferMode=mode;b.innerHTML=icon(glyph);b.onclick=()=>{state.finishing.mode=mode;paintModes();onChange();};modes.append(b);}const b=document.createElement('button');b.type='button';b.title='Reverse direction';b.setAttribute('aria-label',b.title);b.dataset.chamferReverse='true';b.innerHTML=icon('rotate');b.onclick=()=>{state.finishing.reverse=!state.finishing.reverse;paintModes();onChange();};modes.append(b);host.append(modes);}
  const finishValue=(key,label,number,unit,idKey)=>{const field=value(key,label,number,unit,state.finishing[idKey],(n,id)=>{state.finishing[{parameterId:'radiusMm',distance2ParameterId:'distance2Mm',angleParameterId:'angleDeg'}[idKey]]=n;if(id)state.finishing[idKey]=id;else delete state.finishing[idKey];});host.append(field.title,field.row);return field;};
  finishValue('feature-finishing-value',chamfer?'Distance 1 (mm)':'Radius (mm)',state.finishing.radiusMm,'mm','parameterId');
  let second,angle;if(chamfer){second=finishValue('feature-chamfer-distance','Distance 2 (mm)',state.finishing.distance2Mm,'mm','distance2ParameterId');angle=finishValue('feature-chamfer-angle','Angle (°)',state.finishing.angleDeg,'rad','angleParameterId');paintModes();}
  function paintModes(){for(const b of modes.querySelectorAll('[data-chamfer-mode]'))b.setAttribute('aria-pressed',String(b.dataset.chamferMode===state.finishing.mode));modes.querySelector('[data-chamfer-reverse]')?.setAttribute('aria-pressed',String(state.finishing.reverse));if(second){second.title.hidden=second.row.hidden=state.finishing.mode!=='two-distances';angle.title.hidden=angle.row.hidden=state.finishing.mode!=='distance-angle';}}

 }else if(repeating){
  sourceTable=selection('Features',(settings.repeat.sourceFeatureIds??[settings.repeat.sourceFeatureId]).filter(Boolean).map(id=>({target:{producerId:id,kind:'feature',role:'result'}})),c=>c.target.kind==='feature'&&graph.features.find(f=>f.id===c.target.producerId)?.data.form!=='finish',{multiple:true,changed:()=>{if(!booleanTouched&&sourceTable.selected.length){const operation=graph.features.find(f=>f.id===sourceTable.selected[0].target.producerId)?.data.operation;state.operation=operation==='new-body'?'none':operation??state.operation;paintBoolean();}}});
  const old=settings.repeat.reference,axis=settings.repeat.axis??'x';
  axisTable=selection(settings.repeat.kind==='mirror'?'Mirror plane':settings.repeat.kind==='linear'?'Direction':'Axis',old?[old]:[{target:{kind:'datum',producerId:'reference-frame',role:settings.repeat.kind==='mirror'?{x:'yz',y:'xz',z:'xy'}[axis]:axis}}],settings.repeat.kind==='mirror'?plane:line);
  booleanSection();const pattern=document.createElement('section'),heading=document.createElement('h4');pattern.className='feature-section';pattern.dataset.featureSection='pattern';heading.textContent='Pattern';pattern.append(heading);host.append(pattern);
  if(settings.repeat.kind!=='mirror')pattern.append(patternDistribution(document,{mode:settings.repeat.kind,value:state.repeat.distribution??'step',onChange:kind=>{state.repeat.distribution=kind;onChange();}}));
  for(const [key,title,number,units]of [['count','Instances including source',settings.repeat.count,'scalar'],['offsetMm',settings.repeat.kind==='mirror'?'Plane offset (mm)':'Step (mm)',settings.repeat.offsetMm,'mm'],['angleDeg','Angular step (°)',settings.repeat.angleDeg,'rad']]){
   if(key==='count'&&settings.repeat.kind==='mirror'||key==='angleDeg'&&settings.repeat.kind!=='circular'||key==='offsetMm'&&settings.repeat.kind==='circular')continue;
   const field=value('feature-'+key,title,number,units,settings.repeat[key+'ParameterId'],(n,id)=>{state.repeat[key]=n;if(id)state.repeat[key+'ParameterId']=id;else delete state.repeat[key+'ParameterId'];});
   field.control.input.dataset.featureSetting=key;pattern.append(field.title,field.row);if(key==='offsetMm'||key==='angleDeg'){const reverse=document.createElement('button');reverse.type='button';reverse.innerHTML=icon('rotate');reverse.title='Reverse direction';reverse.setAttribute('aria-label',reverse.title);reverse.dataset.patternReverse='true';reverse.setAttribute('aria-pressed',String(!!state.repeat.reverse));reverse.onclick=()=>{state.repeat.reverse=!state.repeat.reverse;reverse.setAttribute('aria-pressed',String(state.repeat.reverse));onChange();};field.row.append(reverse);}
  }
 }else{
  sourceTable=selection('Sketch',[settings.sketchId?{target:{kind:'sketch',producerId:settings.sketchId,role:'result'}}:null],c=>c.target.kind==='sketch'&&c.target.role==='result');
  if(revolve)axisTable=selection('Axis',settings.axisReference?[settings.axisReference]:settings.axisId?[{target:{kind:'sketch',producerId:settings.sketchId,role:settings.axisId}}]:[],line);
  booleanSection();
  const limitsBlock=document.createElement('section'),limitsTitle=document.createElement('h4');limitsBlock.className='feature-section';limitsBlock.dataset.featureSection='limits';limitsTitle.textContent='Limits';limitsBlock.append(limitsTitle);host.append(limitsBlock);
  for(const side of ['start','end']){
   const region=document.createElement('section'),title=document.createElement('h5'),modes=document.createElement('div');region.dataset.limitSide=side;title.textContent=side==='start'?'From':'To';modes.className='feature-limit-modes';const heading=document.createElement('div');heading.className='feature-limit-heading';heading.append(title,modes);region.append(heading);limitsBlock.append(region);
   const limit=state.limits[side];
   const field=value(side==='end'?'extrusion-depth-value':'extrusion-start-value',revolve?'Angle (°)':'Value (mm)',limit.value,revolve?'rad':'mm',limit.parameterId??(graph.parameters.find(p=>p.targets?.some(t=>t.kind==='feature'&&t.featureId===owner.item?.id&&t.parameter===(side==='end'&&!settings.limits?(revolve?'angle':'depth'):'limits.'+side+'.value')))?.id),(number,id)=>{
    number=revolve?Math.max(-360,Math.min(360,number)):number;limit.value=number;if(id)limit.parameterId=id;else delete limit.parameterId;if(side==='end'&&!revolve){state.depthMm=number;owner.depth.depthMm=number;owner.depth.parameterId=id;}limitsChanged=true;return number;
   });
   if(side==='end'){
    field.control.input.dataset.parameter='depth';owner.depth={depthMm:settings.depthMm,parameterId:field.control.select.value||null,options:[],control:field.control};
   }
   const reverse=document.createElement('button');reverse.type='button';reverse.title='Reverse direction';reverse.setAttribute('aria-label','Reverse direction');reverse.dataset.extrusionReverse=side;reverse.innerHTML=icon('rotate');reverse.setAttribute('aria-pressed',String(!!state.reverse));reverse.onclick=()=>{state.reverse=!state.reverse;for(const b of host.querySelectorAll('[data-extrusion-reverse]'))b.setAttribute('aria-pressed',String(state.reverse));onChange();};field.row.append(reverse);
   field.title.hidden=true;region.append(field.title,field.row);
   const table=selection((side==='start'?'From':'To')+' reference',limit.reference?[limit.reference]:[],c=>plane(c)||['body','feature'].includes(c.target.kind));region.append(table.element);
   const update=()=>{
    field.title.hidden=true;field.row.hidden=!['value','symmetric','offset'].includes(limit.mode);table.element.hidden=!['selected','offset'].includes(limit.mode);
    for(const button of modes.children)button.setAttribute('aria-pressed',String(button.dataset.limitMode===limit.mode));
    const end=limitPanels.get('end');if(end)end.hidden=state.limits.start.mode==='symmetric';
   };
   for(const [mode,label,glyph]of [['value','Value','dimension'],['symmetric','Symmetric Value','mirror'],['next','Until Next','limit-next'],['selected','Until Selected','face'],['offset','Offset from Selected','limit-offset'],['all','Through All','limit-all']]){
    if(mode==='symmetric'&&side==='end')continue;
    const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.dataset.limitMode=mode;button.innerHTML=icon(glyph);button.disabled=['next','all'].includes(mode)&&!settings.baseFeatureId;
    button.onclick=()=>{limit.mode=mode;limitsChanged=true;update();if(['selected','offset'].includes(mode)){activate(table);table.element.focus({preventScroll:true});}else if(['value','symmetric'].includes(mode)){activate(null);field.control.input.focus({preventScroll:true});field.control.input.select();}else activate(null);onChange();};modes.append(button);
   }
   if(revolve&&!limit.parameterId&&field.control.select.value){limit.parameterId=field.control.select.value;limitsChanged=true;}
   limitPanels.set(side,region);update();Object.assign(region,{table,field,update});
  }
  limitPanels.get('start').update();
 }
 function readNumber(field){const text=field.control.input.value.trim();if(field.control.select.value)return null;if(text&&!Number.isNaN(Number(text)))return Number(text);if(expressionDrafts.has(field.control.input.id)&&Number.isFinite(field.number))return field.number;throw Error('Select a parameter or enter a numeric value.');}
 function read({draft=false,preview=false}={}){
  if(referenceKind)return {featureId:settings.featureId??owner.item?.id??settings.id,name:nameInput.value,kind:referenceKind,definitionMode,...(referenceKind==='coordinate'?{orientation:coordinateOrientation}:{}),...(owner.item?{replace:true}:{}),references:referenceEntries()};
  if(finishing){if(!sourceTable.selected.length)throw Error('Select one or more exact model edges.');return {name:nameInput.value,sketchId:settings.sketchId,depthMm:settings.depthMm??10,reverse:false,operation:'none',baseFeatureId:settings.baseFeatureId,form:'finish',finishing:{...state.finishing,references:sourceTable.selected.map(c=>({target:structuredClone(c.target)}))}};}
  if(!sourceTable.selected.length)throw Error('Select '+(repeating?'one or more features.':'a source sketch.'));
  const selected=sourceTable.selected[0],sketchId=repeating?graph.features.find(f=>f.id===selected.target.producerId).data.sketchId:selected.target.producerId;
  const input={name:nameInput.value,sketchId,depthMm:Math.max(.001,Math.abs(state.depthMm??10)),reverse:state.reverse,operation:preview?state.operation:effectiveOperation(),...(settings.baseFeatureId?{baseFeatureId:settings.baseFeatureId}:{})};
  if(repeating){if(!axisTable.selected.length)throw Error('Select the operation reference.');input.booleanPreference=state.operation==='new-body'?'none':state.operation;input.repeat={...state.repeat,sourceFeatureId:selected.target.producerId,sourceFeatureIds:sourceTable.selected.map(c=>c.target.producerId),reference:reference(axisTable.selected[0])};return input;}
  input.booleanPreference=state.operation==='new-body'?'none':state.operation;
  if(revolve){if(!axisTable.selected.length)throw Error('Select a revolution axis.');input.axisReference=reference(axisTable.selected[0]);if(axisTable.selected[0].target.kind==='sketch')input.axisId=axisTable.selected[0].target.role;input.angleDeg=state.angleDeg;}
  for(const [side,region]of limitPanels){
   const limit=state.limits[side];
   if(draft&&['value','symmetric','offset'].includes(limit.mode)){const n=readNumber(region.field);if(n!==null&&n!==limit.value){limit.value=n;limitsChanged=true;}}
   if(['selected','offset'].includes(limit.mode)){if(!region.table.selected.length)throw Error('Select the '+side+' limit reference.');limit.reference=reference(region.table.selected[0]);}
  }
  if(limitsChanged){input.limits=structuredClone(state.limits);if(!revolve&&input.limits.end.mode==='value')input.depthMm=Math.max(.001,Math.abs(input.limits.end.value-input.limits.start.value));}
  if(!revolve){input.replaceDepthBinding=true;const id=limitPanels.get('end').field.control.select.value;if(id&&state.limits.end.mode==='value'&&state.limits.start.mode==='value'&&state.limits.start.value===0)input.depthParameterId=id;}
  return input;
 }
 activate(referenceKind&&definitionMode!=='references'?null:revolve&&sourceTable?.selected.length?axisTable:sourceTable??tables.find(t=>!t.selected.length&&!t.element.hidden)??tables[0]);
 function choiceFor(target){
  return choices.find(c=>active?.valid(c)&&c.target.producerId===target.producerId&&c.target.role===target.role&&(c.target.kind===target.kind||target.kind==='feature'&&c.target.kind==='sketch'&&c.target.role==='result'))
   ??(repeating&&active===sourceTable?choices.find(c=>active.valid(c)&&c.target.producerId===target.producerId&&c.target.kind==='feature'&&['body','face','edge','vertex'].includes(target.kind)):null);
 }
 function paintBoolean(){for(const button of host.querySelectorAll('[data-feature-boolean]')){const mode=button.dataset.featureBoolean;button.disabled=mode!=='none'&&(!settings.baseFeatureId||booleanAvailable?.[mode]===false);button.setAttribute('aria-pressed',String((effectiveOperation()==='new-body'?'none':effectiveOperation())===mode));}}
 return {selections:()=>tables.map(t=>({title:t.title,selected:structuredClone(t.selected)})),restoreSelections(rows){for(const row of rows??[]){const table=tables.find(t=>t.title===row.title);if(!table)continue;const selected=row.selected.map(c=>choices.find(x=>same(x,c))).filter(c=>c&&table.valid(c));if(selected.length){table.selected.splice(0,table.selected.length,...(table.multiple?selected:selected.slice(0,1)));table.changed();}}paint();if(revolve&&sourceTable.selected.length)activate(axisTable);},setOperationState(info){booleanAvailable=info.available??null;paintBoolean();},read:options=>{const input=read(options),paths={'feature-finishing-value':'finishing.radiusMm','feature-chamfer-distance':'finishing.distance2Mm','feature-chamfer-angle':'finishing.angleDeg','feature-count':'repeat.count','feature-offsetMm':'repeat.offsetMm','feature-angleDeg':'repeat.angleDeg','extrusion-start-value':'limits.start.value','extrusion-depth-value':input.limits?'limits.end.value':revolve?'angle':'depth'};input.valueExpressions=[...expressionDrafts].map(([key,expression])=>({parameter:key.startsWith('reference-value-')?'references.'+key.split('-').at(-1)+'.value':paths[key],expression}));if(!referenceKind)input.replaceFieldBindings=true;return input;},pick,choices,accepts:target=>!!choiceFor(target),pickTarget(target){const choice=choiceFor(target);return choice?pick(choice):false;},refreshScene(scene){const next=featureChoices(graph,scene).filter(allowed);if(JSON.stringify(next)===JSON.stringify(choices))return;choices.splice(0,choices.length,...next);for(const table of tables)for(let i=0;i<table.selected.length;i++){const fresh=choices.find(c=>same(c,table.selected[i]));if(fresh)table.selected[i]=fresh;}paint();},preview(){if(!referenceKind)return null;const entries=read().references;return {kind:referenceKind,frame:constructReference(referenceKind,entries.map(e=>({...e,value:e.parameterId?(graph.parameters.find(p=>p.id===e.parameterId)?.value??0)*(e.relation==='angle'?180/Math.PI:1):e.value,geometry:e.geometry??choices.find(c=>same(c,e))?.geometry})),coordinateOrientation)};},cancel(){highlight?.([]);},focus(){const field=fields.get(finishing?'feature-finishing-value':'extrusion-depth-value');if(field&&!field.row.hidden){field.control.input.focus({preventScroll:true});field.control.input.select();}}};
}
