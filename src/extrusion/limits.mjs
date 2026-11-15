import * as cad from 'replicad';
import {check} from '../errors.mjs';
import {add,sub,scale,dot,unit,cross} from '../reference/geometry.mjs';

export function limitValue(limit,graph,revolve=false){
 if(!limit.parameterId)return limit.value;
 const p=graph.parameters.find(p=>p.id===limit.parameterId);
 check(p&&p.unit===(revolve?'rad':'mm'),'InvalidUnits','The limit driver has incompatible units.');
 return p.value*(revolve?180/Math.PI:1);
}
export function operationSpan(data,graph,frame,base,resolve,profile,contact){
 const revolve=data.form==='revolve',settings=data.limits;
 if(!settings)return {start:0,end:revolve?data.angleDeg:data.depthMm,clips:[]};
 if(settings.start.mode==='symmetric'){
  const half=limitValue(settings.start,graph,revolve);
  check(half>0&&(!revolve||half<=180),'InvalidGeometry','A symmetric limit must be positive and cannot exceed 180° on each side.');return {start:-half,end:half,clips:[]};
 }
 const extent=base?Math.max(...base.shape.boundingBox.bounds.flatMap(p=>p.map((n,i)=>Math.abs(n-frame.origin[i]))))*4+Math.max(data.depthMm,1):data.depthMm;
 const clips=[];
 const value=(limit,side)=>{
  if(limit.mode==='value')return limitValue(limit,graph,revolve);
  const direction=side==='start'?-1:1;
  if(limit.mode==='all')return direction*(revolve?360:extent);
  if(limit.mode==='next'){
   return contact(side,base.shape)+(limit.mode==='offset'?limitValue(limit,graph,revolve):0);
  }
  const target=limit.reference.target,geometry=resolve(limit.reference),offset=limit.mode==='offset'?limitValue(limit,graph,revolve):0;
  if(target.kind==='body'||target.kind==='feature'){
   return contact(side,resolve(limit.reference,{body:true}))+direction*offset;
  }
  check(geometry.kind==='plane','InvalidGeometry','A selected limit requires a plane, planar face or body.');
  if(revolve){
   const sketch=graph.features.find(f=>f.id===data.sketchId),source=data.axisReference?resolve(data.axisReference):null,axis=sketch.data.entities.find(e=>e.id===data.axisId);
   const world=p=>frame.origin.map((n,i)=>n+frame.u[i]*p[0]+frame.v[i]*p[1]);
   const origin=source?.origin??world(axis.a),axisDirection=unit(source?.direction??sub(world(axis.b),origin));
   if(Math.abs(dot(geometry.normal,axisDirection))>=1e-7||Math.abs(dot(sub(geometry.origin,origin),geometry.normal))>=1e-6)return contact(side,null,geometry)+direction*offset;
   const radial=sub(world(profile.centroid),origin),a=dot(radial,geometry.normal),b=dot(cross(axisDirection,radial),geometry.normal)*(data.reverse?-1:1)*direction;
   let angle=Math.atan2(-a,b)*180/Math.PI;while(angle<=1e-7)angle+=180;
   return direction*(angle+offset);
  }
  const normal=scale(frame.normal,data.reverse?-1:1),den=dot(geometry.normal,normal);
  check(Math.abs(den)>1e-8,'InvalidGeometry','The selected limit is parallel to the extrusion direction.');
  const origin=add(geometry.origin,scale(geometry.normal,offset));
  const sample=p=>dot(sub(origin,add(frame.origin,add(scale(frame.u,p[0]),scale(frame.v,p[1])))),geometry.normal)/den;
  const ranges=[profile.outer,...profile.holes].flatMap(loop=>loop.kind==='circle'?[loop]:loop.kind==='curved'?loop.edges.flatMap(e=>e.type==='arc'?[{kind:'circle',center:e.center,radius:e.radius},{points:[e.a,e.b]}]:[{points:[e.a,e.b]}]):[loop]).flatMap(loop=>{
   if(loop.kind!=='circle')return loop.points.map(sample);
   const middle=sample(loop.center),radius=loop.radius*Math.hypot(dot(frame.u,geometry.normal),dot(frame.v,geometry.normal))/Math.abs(den);return [middle-radius,middle+radius];
  });
  clips.push({side,plane:{...geometry,origin},offset:0,minimum:Math.min(...ranges),maximum:Math.max(...ranges)});
  return sample(profile.centroid);
 };
 const from=value(settings.start,'start'),to=value(settings.end,'end'),inverted=to<from;
 check(Math.abs(to-from)>1e-6&&(!revolve||Math.abs(to-from)<=360+1e-7),'InvalidGeometry','Limits must enclose positive material and the sweep cannot exceed 360°.');
 if(inverted)for(const clip of clips)clip.side=clip.side==='start'?'end':'start';
 const lower=clips.find(c=>c.side==='start'),upper=clips.find(c=>c.side==='end');
 return {start:lower?lower.minimum-1:Math.min(from,to),end:upper?upper.maximum+1:Math.max(from,to),clips};
}
export function trimTool(shape,span,frame,reverse,retain){
 const direction=scale(frame.normal,reverse?-1:1),positions=solid=>solid.edges.flatMap(edge=>[edge.startPoint.toTuple(),edge.endPoint.toTuple()]).map(p=>dot(sub(p,frame.origin),direction));
 let result=shape;
 for(const clip of span.clips){
  if(clip.plane){
   const plane=new cad.Plane(add(clip.plane.origin,scale(clip.plane.normal,clip.offset)),clip.plane.u,clip.plane.normal);
   try{
    const pieces=result.split(plane);if(pieces.positive)retain(pieces.positive);if(pieces.negative)retain(pieces.negative);
    const side=dot(direction,clip.plane.normal)*(clip.side==='end'?1:-1);
    result=side>0?pieces.negative:pieces.positive;
    check(result,'InvalidGeometry','The selected limit removes the entire operation.');
   }finally{plane.delete();}
  }else{
   const outside=result.cut(clip.body),inside=result.intersect(clip.body);retain(outside);retain(inside);
   const near=clip.side==='end'?span.start:span.end;
   const candidates=[...outside.solids,...inside.solids].map(solid=>({solid,positions:positions(solid)}));
   const distance=c=>Math.min(...c.positions.map(v=>Math.abs(v-near)));
   candidates.sort((a,b)=>distance(a)-distance(b));
   check(candidates.length&&distance(candidates[0])<1e-4,'InvalidGeometry','No bounded solid reaches the start limit. Select an unambiguous face.');
   const connected=candidates.filter(c=>distance(c)<1e-4).map(c=>c.solid);
   check(connected.length===1,'AmbiguousReference','More than one surface bounds the start section. Select a specific face.');result=connected[0];retain(result);const far=clip.side==='end'?span.end:span.start;check(Math.min(...positions(result).map(p=>Math.abs(p-far)))>1e-4,'InvalidGeometry','The selected body does not fully bound the profile. Select a face instead.');
  }
 }
 check(!result.isNull&&result.solids.length>0,'InvalidGeometry','The limits produce no material.');return result;
}
