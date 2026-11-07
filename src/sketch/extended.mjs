import {intersections,parameterOn,pointOn,circular,polygonPoints,sketchTransform,transformSketchEntity} from './curves.mjs';
import {derivedId,pointAt} from './relations.mjs';
import {check} from '../errors.mjs';

const eps=1e-7;
const ref=(entityId,role='entity')=>({entityId,role});
const relation=(id,type,refs)=>({id,type,refs,driving:true,value:null});
const editable=e=>e&&!e.external;
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
    if(i>0&&i<sides-1)data.constraints.push(relation(derivedId(sketchId,id,'side',i),'equal',[ref(id),ref(edge.id)]));
  }
}
function editSpan(data,input,split,sketchId){
  const [source]=selected(data,[input.entityId]);
  check(['line','arc'].includes(source.type),'UnsupportedCapability','Select a line or arc to trim or split.');
  const t=input.fraction;
  check(t>eps&&t<1-eps,'InvalidInput','Choose a point inside the segment.');
  let spans;
  if(split)spans=[[0,t],[t,1]];
  else{
    const crossings=data.entities.filter(e=>e!==source&&!e.construction&&curve(e)).flatMap(e=>{
      const hit=intersections(source,e);
      check(!hit.coincident||hit.points.length<2,'AmbiguousReference','Overlapping sketch curves make this trim ambiguous.');
      return hit.points.map(p=>parameterOn(source,p));
    }).filter(n=>n>eps&&n<1-eps).sort((a,b)=>a-b);
    check(crossings.length,'LostReference','Trim requires an intersection inside the selected curve.');
    check(!crossings.some(n=>Math.abs(n-t)<eps),'AmbiguousReference','Click the portion to remove, away from its boundary.');
    const left=crossings.findLast(n=>n<t),right=crossings.find(n=>n>t);
    spans=[...(left!==undefined?[[0,left]]:[]),...(right!==undefined?[[right,1]]:[])];
  }
  const pieces=spans.map(([a,b],i)=>{
    const entity={...source,id:i?input.newEntityId:source.id,a:pointOn(source,a),b:pointOn(source,b)};
    if(source.pointNames){
      entity.pointNames={...source.pointNames};delete entity.pointNames.midpoint;
      if(a>0)delete entity.pointNames.a;if(b<1)delete entity.pointNames.b;
    }
    if(i)delete entity.name;
    return entity;
  });
  const remap=new Map([['a',spans[0][0]===0?pieces[0].id:null],['b',spans.at(-1)[1]===1?pieces.at(-1).id:null],['center',pieces[0].id]]);
  for(const constraint of data.constraints){
    for(const participant of constraint.refs.filter(r=>r.entityId===source.id)){
      const whole=participant.role==='entity'&&['horizontal','vertical','parallel','perpendicular','collinear','angle','radius','diameter','tangent','concentric','coradial'].includes(constraint.type);
      const id=whole?pieces[0].id:remap.get(participant.role);
      check(id,'ConstraintConflict','This edit would invalidate relation '+(constraint.name??constraint.id)+'. Remove or reassign it first.');
      participant.entityId=id;
    }
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
  for(let i=1;i<(mirror?2:input.count);i++)for(const source of sources){
    const id=derivedId(sketchId,input.id,source.id,i),next=transformSketchEntity(source,p=>mapping(p,i),{id,mirror});
    const roles=['a','b','center','point','control1','control2'].filter(role=>source[role]);
    data.entities.push(next);
    if(mirror){
      for(const role of roles)data.constraints.push(relation(derivedId(id,role),'symmetry',[ref(source.id,role),ref(id,role),ref(input.axisId)]));
      if(source.type==='circle')data.constraints.push(relation(derivedId(id,'radius'),'equal',[ref(source.id),ref(id)]));
    }
  }
}
export function extendSketch(data,name,input,sketchId){
  if(name==='polygon')addPolygon(data,input,sketchId);
  else if(name==='split'||name==='trim')editSpan(data,input,name==='split',sketchId);
  else if(name==='pattern'&&input.reference){
    data.patterns??=[];
    check(!data.patterns.some(item=>item.id===input.id),'InvalidInput','The pattern identity already exists.');
    const {id,mode,entityIds,reference,count,spacing,reverse=false,countParameterId,spacingParameterId}=input;
    data.patterns.push({id,mode,entityIds,reference,count,spacing,reverse,generated:[],
      ...(countParameterId?{countParameterId}:{}),...(spacingParameterId?{spacingParameterId}:{})});
  }
  else transform(data,name,input,sketchId);
}

export function synchronizePatterns(graph){
 for(const feature of graph.features.filter(f=>f.data?.patterns)){
  const data=feature.data;
  for(const pattern of data.patterns){
   const {id,mode,entityIds,reference,reverse}=pattern;
   const value=(key,unit)=>{
    const parameterId=pattern[key+'ParameterId'];
    if(!parameterId)return pattern[key];
    const p=graph.parameters.find(item=>item.id===parameterId);
    check(p&&(!p.definitionId||p.definitionId===feature.definitionId),'LostReference','The pattern driver is missing or outside the sketch scope.');
    check(p.unit===unit,'InvalidUnits','Pattern '+key+' requires '+unit+'.');return p.value;
   };
   const count=value('count','scalar'),spacing=value('spacing',mode==='circular'?'rad':'mm');
   check(Number.isInteger(count)&&count>=2&&count<=12&&Number.isFinite(spacing)&&spacing>eps&&spacing<=(mode==='circular'?2*Math.PI:1000),'InvalidInput','Pattern count or spacing is outside its supported range.');
   const sources=selected(data,entityIds),axis=data.entities.find(e=>e.id===reference.entityId),center=mode==='circular'&&pointAt(data.entities,reference);
   check(mode==='circular'?center:axis?.type==='line'&&reference.role==='entity','LostReference','Select a straight pattern direction or a semantic center point.');
   const signature=JSON.stringify([count,spacing,reverse,mode==='circular'?center:[axis.a,axis.b],sources]);
   if(signature===pattern.signature)continue;
   const copies=[];
   for(let i=1;i<count;i++)for(const source of sources)
    copies.push(transformSketchEntity(source,sketchTransform(mode,{axis,center,spacing,reverse},i),{id:derivedId(feature.id,id,source.id,i)}));
   const removed=new Set(pattern.generated.filter(key=>!copies.some(e=>e.id===key)));
   check(!data.constraints.some(c=>c.refs.some(r=>removed.has(r.entityId))),'ConstraintConflict','Lowering the pattern count would remove an entity used by a constraint.');
   data.entities=[...data.entities.filter(e=>!pattern.generated.includes(e.id)),...copies];
   pattern.generated=copies.map(e=>e.id);pattern.signature=signature;
  }
 }
}
