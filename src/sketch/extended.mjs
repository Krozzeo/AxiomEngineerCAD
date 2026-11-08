import {createHash} from 'node:crypto';
import {dimensions} from './relation-kinds.mjs';
import {intersections,parameterOn,pointOn,circular,polygonPoints,arcTangencyValid,sketchTransform,transformSketchEntity,patternStep,MAX_SKETCH_ENTITIES} from './curves.mjs';
import {derivedId,pointAt} from './relations.mjs';
import {check} from '../errors.mjs';

const eps=1e-7;
const ref=(entityId,role='entity')=>({entityId,role});
const relation=(id,type,refs)=>({id,type,refs,driving:true,value:null});
const editable=e=>e&&!e.external&&e.type!=='equation-curve';
const curve=e=>e.type==='line'||circular(e);
function selected(data,ids){
  check(new Set(ids).size===ids.length,'InvalidInput','Choose distinct sketch entities.');
  const entities=ids.map(id=>data.entities.find(e=>e.id===id));
  check(entities.every(editable),'LostReference','Choose editable sketch entities.');
  return entities;
}
function addPolygon(data,input,sketchId){
  const {center,vertex,sides,id,construction}=input,vector=vertex.map((n,i)=>n-center[i]);
  const radius=Math.hypot(...vector);
  check(radius>.01,'InvalidGeometry','The polygon needs a nonzero radius.');
  const ring={id:derivedId(sketchId,id,'guide'),type:'circle',center,radius,construction:true};
  const points=polygonPoints(center,vertex,sides),edges=points.map((a,i)=>({
    id:i?derivedId(sketchId,id,'edge',i):id,type:'line',a,b:points[(i+1)%sides],construction
  }));
  data.entities.push(...edges,ring);
  for(const [i,edge] of edges.entries()){
    data.constraints.push(
      relation(derivedId(sketchId,id,'join',i),'coincident',[ref(edge.id,'b'),ref(edges[(i+1)%sides].id,'a')]),
      relation(derivedId(sketchId,id,'radius',i),'point-on-circle',[ref(edge.id,'a'),ref(ring.id)])
    );
    if(i>0)data.constraints.push(relation(derivedId(sketchId,id,'side',i),'equal',[ref(id),ref(edge.id)]));
  }
}
// A distant center target can otherwise attract all unconstrained polygon vertices
// to a collapsed numerical solution. Start from the equivalent rigid translation.
export function seedPolygonCenter(data,constraint){
 if(constraint?.type!=='coincident'||!constraint.driving)return;
 for(const [i,target] of constraint.refs.entries()){
  if(target.role!=='center')continue;
  const guide=data.entities.find(e=>e.id===target.entityId&&e.type==='circle'&&e.construction&&!e.external);
  if(!guide)continue;
  const edges=new Set(data.constraints.filter(c=>c.type==='point-on-circle'&&c.refs[1].entityId===guide.id).map(c=>c.refs[0].entityId));
  const group=new Set([guide.id,...edges]),destination=pointAt(data.entities,constraint.refs[1-i]);
  if(edges.size<3||!destination||group.has(constraint.refs[1-i].entityId))continue;
  if(data.constraints.some(c=>c.driving&&c.refs.some(ref=>group.has(ref.entityId))&&
   (c.type==='fixed'||c.refs.some(ref=>!group.has(ref.entityId)))))continue;
  const delta=destination.map((value,k)=>value-guide.center[k]);
  for(const entity of data.entities.filter(e=>group.has(e.id))){
   for(const role of ['a','b','center'])if(entity[role])entity[role]=entity[role].map((n,k)=>n+delta[k]);
  }
  return;
 }
}
function editSpan(data,input,split,sketchId){
  const [source]=selected(data,[input.entityId]);
  check(!data.patterns?.some(pattern=>pattern.generated.includes(source.id)),'ConstraintConflict','Edit the pattern or its source geometry to trim this copy.');
  check(['line','arc'].includes(source.type),'UnsupportedCapability','Select a line or arc to trim or split.');
  const fractions=input.fractions??[input.fraction],inside=t=>t>eps&&t<1-eps;
  check(fractions.every(inside),'InvalidInput','Choose a point inside the segment.');
  let spans;
  if(split)spans=[[0,fractions[0]],[fractions[0],1]];
  else{
    const crossings=(input.crossingEntities??data.entities).filter(e=>e.id!==source.id&&!e.construction&&curve(e)).flatMap(e=>{
      const hit=intersections(source,e);
      check(!hit.coincident||hit.points.length<2,'AmbiguousReference','Overlapping sketch curves make this trim ambiguous.');
      return hit.points.map(p=>parameterOn(source,p));
    }).filter(inside).sort((a,b)=>a-b);
    const bounds=[0,...crossings.filter((n,i)=>i===0||n-crossings[i-1]>eps),1];
    spans=bounds.slice(1).map((end,i)=>[bounds[i],end]);
    const kept=spans.filter(([left,right])=>!fractions.some(t=>t>=left-eps&&t<=right+eps));
    spans=[];
    for(const span of kept){const last=spans.at(-1);if(last&&last[1]===span[0])last[1]=span[1];else spans.push(span);}
  }
  const pieces=spans.map(([a,b],i)=>{
    const entity={...source,id:i===0?source.id:i===1?input.newEntityId:derivedId(sketchId,input.newEntityId,i),a:pointOn(source,a),b:pointOn(source,b)};
    if(source.pointNames){
      entity.pointNames={...source.pointNames};delete entity.pointNames.midpoint;
      if(a>0)delete entity.pointNames.a;if(b<1)delete entity.pointNames.b;
    }
    if(i)delete entity.name;
    return entity;
  });
  const remap=new Map([['a',spans[0]?.[0]===0?pieces[0].id:null],['b',spans.at(-1)?.[1]===1?pieces.at(-1).id:null],['center',pieces[0]?.id]]);
  data.constraints=data.constraints.filter(constraint=>{
    const participants=constraint.refs.filter(r=>r.entityId===source.id);
    const ids=participants.map(participant=>{
      const whole=participant.role==='entity'&&['horizontal','vertical','parallel','perpendicular','collinear','angle','radius','diameter','tangent','concentric','coradial'].includes(constraint.type);
      return whole?pieces[0]?.id:remap.get(participant.role);
    });
    if(!ids.every(Boolean)){
      check(!split,'ConstraintConflict','This split would invalidate relation '+(constraint.name??constraint.id)+'.');
      return false;
    }
    participants.forEach((participant,i)=>participant.entityId=ids[i]);
    if(!split&&participants.length&&constraint.type==='tangent'){
      const shapes=constraint.refs.map(ref=>pieces.find(e=>e.id===ref.entityId)??data.entities.find(e=>e.id===ref.entityId));
      if(shapes.every(Boolean)&&!arcTangencyValid(...shapes))return false;
    }
    return true;
  });
  if(!pieces.length)check(![...(data.patterns??[]),...(data.mirrors??[])].some(operation=>operation.generated.includes(source.id)||operation.entityIds.includes(source.id)||operation.axisId===source.id||operation.reference?.entityId===source.id),'ConstraintConflict','Edit the sketch operation before removing one of its participants.');
  if(!pieces.length)for(const key of ['conversions'])if(data[key]){
    data[key]=data[key].filter(o=>o.axisId!==source.id&&!o.entityIds.includes(source.id)&&!o.generated?.includes(source.id));
    if(!data[key].length)delete data[key];
  }
  data.entities.splice(data.entities.indexOf(source),1,...pieces);
  if(split){
    const [a,b]=pieces;
    data.constraints.push(
      relation(derivedId(sketchId,input.newEntityId,'split-point'),'coincident',[ref(a.id,'b'),ref(b.id,'a')]),
      relation(derivedId(sketchId,input.newEntityId,'split-curve'),source.type==='line'?'parallel':'concentric',[ref(a.id),ref(b.id)])
    );
  }else if(source.type==='arc'&&pieces.length===2){
    data.constraints.push(relation(derivedId(sketchId,input.newEntityId,'trim-curve'),'coradial',pieces.map(e=>ref(e.id))));
  }
}
const invariantRelations=new Set(['coincident','parallel','perpendicular','collinear','equal','concentric','coradial','tangent','point-on-line','point-on-circle','midpoint','symmetry','spline-tangent','equal-curve-length','length','radius','diameter','distance','line-distance','angle']);
function inheritedRelations(data,sources,operationId,instance,mirror,mapPoint){
 const mapping=new Map(sources.map(source=>[source.id,derivedId(data.sketchId,operationId,source.id,instance)]));
 const origin=mapPoint([0,0]),axis=mapPoint([1,0]).map((n,i)=>n-origin[i]);
 const aligned=Math.abs(axis[1])<1e-7?'same':Math.abs(axis[0])<1e-7?'swap':null;
 return data.constraints.filter(c=>c.refs.every(r=>mapping.has(r.entityId))).flatMap(c=>{
  let type=c.type;
  if(['horizontal','vertical'].includes(type)){
   if(!aligned)return [];
   if(aligned==='swap')type=type==='horizontal'?'vertical':'horizontal';
  }else if(!invariantRelations.has(type))return [];
  return [{
   ...structuredClone(c),type,id:derivedId(operationId,'inherited',instance,c.id),
   refs:c.refs.map(r=>({...r,entityId:mapping.get(r.entityId)})),
   ...(dimensions.includes(type)?{driving:false}:{}),
   ...(mirror&&c.direction!==undefined?{direction:-c.direction}:{}),
  }];
 });
}
function transform(data,name,input,sketchId){
  const sources=selected(data,input.entityIds);
  let mapping,mirror=name==='mirror';
  if(mirror){
    const axis=data.entities.find(e=>e.id===input.axisId);
    check(axis?.type==='line'&&!sources.includes(axis),'InvalidInput','Choose a separate straight mirror axis.');
    mapping=sketchTransform('mirror',{axis});
  }else if(input.mode==='linear'){
    check(input.step&&Math.hypot(...input.step)>eps,'InvalidGeometry','Enter a nonzero linear pattern step.');
    mapping=(p,i)=>p.map((n,k)=>n+input.step[k]*i);
  }else{
    check(input.center&&Math.abs(input.angle)>eps,'InvalidGeometry','Enter a nonzero circular pattern step.');
    mapping=(p,i)=>{const [x,y]=p.map((n,k)=>n-input.center[k]),c=Math.cos(input.angle*i),s=Math.sin(input.angle*i);return [input.center[0]+x*c-y*s,input.center[1]+x*s+y*c];};
  }
  const count=mirror?2:input.count;
  check(Number.isSafeInteger(count)&&count>=2,'InvalidInput','Pattern count must be an integer of at least two.');
  check((count-1)*sources.length<=MAX_SKETCH_ENTITIES-data.entities.length,'ResourceLimit','The resulting sketch exceeds the document geometry capacity.');
  const inherited=mirror?inheritedRelations({...data,sketchId},sources,input.id,1,true,mapping):[];
  for(let i=1;i<count;i++)for(const source of sources){
    const id=derivedId(sketchId,input.id,source.id,i),next=transformSketchEntity(source,p=>mapping(p,i),{id,mirror});
    const roles=['a','b','center','point','control1','control2'].filter(role=>source[role]);
    data.entities.push(next);
    if(mirror){
      for(const role of roles)data.constraints.push(relation(derivedId(id,role),'symmetry',[ref(source.id,role),ref(id,role),ref(input.axisId)]));
      if(source.type==='circle')data.constraints.push(relation(derivedId(id,'radius'),'equal',[ref(source.id),ref(id)]));
    }
  }
  data.constraints.push(...inherited);
  return inherited.map(c=>c.id);
}
export function extendSketch(data,name,input,sketchId){
  if(name==='polygon')addPolygon(data,input,sketchId);
  else if(name==='trim'&&input.stroke){
    const strokes=input.stroke.slice(1).map((b,i)=>({type:'line',a:input.stroke[i],b})).filter(s=>Math.hypot(...s.a.map((n,i)=>n-s.b[i]))>eps);
    check(strokes.length,'InvalidGeometry','Draw a nonzero trim stroke.');
    const edits=data.entities.filter(e=>editable(e)&&['line','arc'].includes(e.type)).map(e=>({
      entityId:e.id,newEntityId:derivedId(sketchId,input.newEntityId,e.id),
      fractions:strokes.flatMap(stroke=>intersections(e,stroke).points).map(p=>parameterOn(e,p)).filter(t=>t>eps&&t<1-eps)
    })).filter(edit=>edit.fractions.length);
    check(edits.length,'LostReference','The trim stroke did not cross an editable span.');
    const original=data.entities.slice();
    for(const edit of edits)editSpan(data,{...edit,crossingEntities:original},false,sketchId);
  }
  else if(name==='split'||name==='trim')editSpan(data,input,name==='split',sketchId);
  else if(name==='mirror'){
    const old=data.mirrors?.find(item=>item.id===input.id),previous=new Set(old?.generated??[]);
    check(input.replace?old:!old,'LostReference','The mirror operation changed.');
    const generated=input.entityIds.map(id=>derivedId(sketchId,input.id,id,1)),next=new Set(generated);
    if(old){
     const intrinsic=new Set([...(old.inherited??[]),...old.generated.flatMap(id=>['a','b','center','point','control1','control2','radius'].map(role=>derivedId(id,role)))]);
     check(!data.constraints.some(c=>!intrinsic.has(c.id)&&c.refs.some(r=>previous.has(r.entityId)&&!next.has(r.entityId))),
       'ConstraintConflict','Remove downstream relations before changing these mirror entities.');
     data.entities=data.entities.filter(e=>!previous.has(e.id));
     data.constraints=data.constraints.filter(c=>!intrinsic.has(c.id));
    }
    const inherited=transform(data,name,input,sketchId);
    const operation={id:input.id,entityIds:[...input.entityIds],axisId:input.axisId,generated,inherited};
    if(old)Object.assign(old,operation);else (data.mirrors??=[]).push(operation);
  }
  else if(name==='pattern'&&input.reference){
    data.patterns??=[];
    const old=data.patterns.find(item=>item.id===input.id);
    check(input.replace?old:!old,'LostReference','The pattern operation changed.');
    const {id,mode,entityIds,reference,count,spacing,distribution,reverse=false,countParameterId,spacingParameterId}=input;
    const operation={id,mode,entityIds,reference,count,spacing,reverse,generated:old?.generated??[],inherited:old?.inherited??[],...(distribution?{distribution}:{}),
      ...(countParameterId?{countParameterId}:{}),...(spacingParameterId?{spacingParameterId}:{})};
    if(old)data.patterns[data.patterns.indexOf(old)]=operation;else data.patterns.push(operation);
  }
  else transform(data,name,input,sketchId);
}

export function synchronizePatterns(graph,featureId=null){
 for(const feature of graph.features.filter(f=>f.data?.patterns&&(!featureId||f.id===featureId))){
  const data=feature.data;
  for(const pattern of data.patterns){
   const {id,mode,entityIds,reference,reverse,distribution}=pattern;
   const value=(key,unit)=>{
    const parameterId=pattern[key+'ParameterId'];
    if(!parameterId)return pattern[key];
    const p=graph.parameters.find(item=>item.id===parameterId);
    check(p&&(!p.definitionId||p.definitionId===feature.definitionId),'LostReference','The pattern driver is missing or outside the sketch scope.');
    check(p.unit===unit,'InvalidUnits','Pattern '+key+' requires '+unit+'.');return p.value;
   };
   const count=value('count','scalar'),spacing=value('spacing',mode==='circular'?'rad':'mm');
   check(Number.isSafeInteger(count)&&count>=2&&Number.isFinite(spacing)&&spacing>0,'InvalidInput','Pattern count or spacing is outside its supported range.');
   const sources=selected(data,entityIds),axis=data.entities.find(e=>e.id===reference.entityId),center=mode==='circular'&&pointAt(data.entities,reference);
   check(mode==='circular'?center:axis?.type==='line'&&reference.role==='entity','LostReference','Select a straight pattern direction or a semantic center point.');
   const step=patternStep(mode,distribution,spacing,count);
   check((count-1)*sources.length<=MAX_SKETCH_ENTITIES-data.entities.length+pattern.generated.length,'ResourceLimit','The resulting sketch exceeds the document geometry capacity.');
   const sourceIds=new Set(entityIds),sourceRelations=data.constraints.filter(c=>c.refs.every(r=>sourceIds.has(r.entityId)));
   const signature=createHash('sha256').update(JSON.stringify([count,step,reverse,mode==='circular'?center:[axis.a,axis.b],sources,sourceRelations])).digest('hex');
   if(signature===pattern.signature)continue;
   const copies=[],inherited=[],oldRelations=new Set(pattern.inherited??[]);
   for(let i=1;i<count;i++)for(const source of sources)
    copies.push(transformSketchEntity(source,sketchTransform(mode,{axis,center,spacing:step,reverse},i),{id:derivedId(feature.id,id,source.id,i)}));
   const retained=new Set(copies.map(e=>e.id)),previous=new Set(pattern.generated);
   const removed=new Set(pattern.generated.filter(key=>!retained.has(key)));
   check(!data.constraints.some(c=>!oldRelations.has(c.id)&&c.refs.some(r=>removed.has(r.entityId))),'ConstraintConflict','Lowering the pattern count would remove an entity used by a constraint.');
   data.entities=[...data.entities.filter(e=>!previous.has(e.id)),...copies];
   for(let i=1;i<count;i++)inherited.push(...inheritedRelations({constraints:sourceRelations,sketchId:feature.id},sources,id,i,false,sketchTransform(mode,{axis,center,spacing:step,reverse},i)));
   data.constraints=[...data.constraints.filter(c=>!oldRelations.has(c.id)),...inherited];
   pattern.generated=copies.map(e=>e.id);pattern.inherited=inherited.map(c=>c.id);pattern.signature=signature;
  }
 }
}
