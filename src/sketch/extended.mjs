import {intersections,parameterOn,pointOn,circular,polygonPoints} from './curves.mjs';
import {derivedId} from './relations.mjs';
import {check} from '../errors.mjs';

const eps=1e-7;
const blend=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
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
    const dx=axis.b[0]-axis.a[0],dy=axis.b[1]-axis.a[1],den=dx*dx+dy*dy;
    mapping=p=>{const t=((p[0]-axis.a[0])*dx+(p[1]-axis.a[1])*dy)/den;return blend(p,blend(axis.a,axis.b,t),2);};
  }else if(input.mode==='linear'){
    check(input.step&&Math.hypot(...input.step)>eps,'InvalidGeometry','Enter a nonzero linear pattern step.');
    mapping=(p,i)=>p.map((n,k)=>n+input.step[k]*i);
  }else{
    check(input.center&&Math.abs(input.angle)>eps,'InvalidGeometry','Enter a nonzero circular pattern step.');
    mapping=(p,i)=>{const [x,y]=p.map((n,k)=>n-input.center[k]),c=Math.cos(input.angle*i),s=Math.sin(input.angle*i);return [input.center[0]+x*c-y*s,input.center[1]+x*s+y*c];};
  }
  for(let i=1;i<(mirror?2:input.count);i++)for(const source of sources){
    const id=derivedId(sketchId,input.id,source.id,i),next={id,type:source.type,construction:source.construction};
    const roles=['a','b','center','point'].filter(role=>source[role]);
    for(const role of roles)next[role]=mapping(source[role],i);
    if(circular(source))next.radius=source.radius;
    if(source.type==='arc')next.clockwise=mirror?!source.clockwise:source.clockwise;
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
  else transform(data,name,input,sketchId);
}
