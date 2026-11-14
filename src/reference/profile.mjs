import {check} from '../errors.mjs';
import {planeFrame} from '../sketch/profile.mjs';
import {constructReference,datumGeometry,add,sub,unit} from './geometry.mjs';

export const REFERENCE_TYPE='reference-geometry';
export function referenceParameter(graph,entry){const p=graph.parameters.find(p=>p.id===entry.parameterId);check(p&&p.unit===(entry.relation==='angle'?'rad':'mm'),'InvalidUnits','Reference parameter has incompatible units.');return p.value*(entry.relation==='angle'?180/Math.PI:1);}
export function referenceGeometry(graph,target,modelGeometry=null,seen=new Set()){
 check(target&&target.definitionId===graph.primaryDefinitionId&&target.occurrencePath?.length===1&&target.occurrencePath[0]===target.definitionId,'LostReference','Select a reference in the current part.');
 if(target.producerId==='reference-frame')return datumGeometry(target.role);
 const feature=graph.features.find(f=>f.id===target.producerId);
 check(feature&&!feature.disabled,'LostReference','The selected reference is missing or disabled.');
 if(feature.type===REFERENCE_TYPE){
  check(!(feature.data.deletedRoles??[]).includes(target.role),'LostReference','The selected coordinate child was deleted.');
  check(!seen.has(feature.id),'InvalidNativeGraph','Reference construction contains a cycle.');seen=new Set([...seen,feature.id]);
  const entries=feature.data.references.map(e=>({...e,value:e.parameterId?referenceParameter(graph,e):e.value,geometry:referenceGeometry(graph,e.target,e.geometry,seen)}));
  const frame=constructReference(feature.data.kind,entries);
  if(feature.data.kind==='axis')return {kind:'line',origin:frame.origin,direction:frame.normal};
  if(feature.data.kind==='plane')return {kind:'plane',...frame};
  if(['xy','xz','yz'].includes(target.role)){const indices={xy:['u','v','normal'],xz:['u','normal','v'],yz:['v','normal','u']}[target.role];const u=frame[indices[0]],v=frame[indices[1]];return {kind:'plane',origin:frame.origin,u,v,normal:[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]};}
  if(['x','y','z'].includes(target.role))return {kind:'line',origin:frame.origin,direction:frame[{x:'u',y:'v',z:'normal'}[target.role]]};
  return {kind:'point',origin:frame.origin,frame};
 }
 if(feature.type==='sketch-primitives'){
  const [id,role]=target.role.split(':'),entity=feature.data.entities.find(e=>e.id===id),f=planeFrame(feature,graph);
  check(entity,'LostReference','The selected sketch entity no longer exists.');
  const world=p=>f.origin.map((n,i)=>n+f.u[i]*p[0]+f.v[i]*p[1]);
  if(role||entity.type==='point'||entity.type==='circle'){
   const p=role==='center'?entity.center:role==='midpoint'?entity.a.map((n,i)=>(n+entity.b[i])/2):entity[role??(entity.type==='point'?'point':'center')];
   check(p,'InvalidGeometry','Select an endpoint, center or sketch point.');return {kind:'point',origin:world(p)};
  }
  check(entity.type==='line','InvalidGeometry','A straight reference requires a line.');return {kind:'line',origin:world(entity.a),direction:unit(sub(world(entity.b),world(entity.a)))};
 }
 check(feature.type==='sketch-extrusion'&&modelGeometry,'LostReference','Select an exact model face, straight edge or vertex.');
 return structuredClone(modelGeometry);
}
export function validateReference(feature,graph){
 const d=feature.data;
 check(['E3-reference/1','E3-reference/2'].includes(d?.profile)&&['plane','axis','coordinate'].includes(d.kind)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=128&&Array.isArray(d.references)&&d.references.length>0&&d.references.length<=3,'InvalidInput','Invalid reference construction.');
 check(!d.deletedRoles||d.profile==='E3-reference/2'&&d.kind==='coordinate'&&Array.isArray(d.deletedRoles)&&new Set(d.deletedRoles).size===d.deletedRoles.length&&d.deletedRoles.every(role=>['x','y','z','xy','xz','yz'].includes(role)),'InvalidInput','Invalid deleted coordinate children.');
 for(const entry of d.references)check(['coincident','parallel','perpendicular','offset','angle','midplane'].includes(entry.relation)&&Number.isFinite(entry.value),'InvalidInput','Invalid reference relation.');
 if(d.definitionMode){
  check(d.profile==='E3-reference/2'&&['references',...(d.kind==='coordinate'?['origin']:['x','y','z'])].includes(d.definitionMode),'InvalidInput','Invalid reference definition method.');
  if(d.definitionMode!=='references'){const role=d.kind==='plane'?{x:'yz',y:'xz',z:'xy'}[d.definitionMode]:d.definitionMode,e=d.references[0];check(d.references.length===1&&e.target.kind==='datum'&&e.target.producerId==='reference-frame'&&e.target.role===role&&e.relation==='coincident'&&e.value===0&&!e.parameterId,'InvalidInput','Absolute definitions must use the canonical world frame.');}
 }
 const dependencies=[...new Set(d.references.map(e=>e.target.producerId).filter(id=>id!=='reference-frame'))];
 check(feature.dependsOn.length===dependencies.length&&dependencies.every(id=>feature.dependsOn.includes(id)),'InvalidNativeGraph','Reference dependencies must identify every selected producer.');
 referenceGeometry(graph,{producerId:feature.id,definitionId:feature.definitionId,role:d.kind,occurrencePath:[feature.definitionId]});
}
export function referenceCommand(value,input){
 const graph=value.native.graph,old=graph.features.find(f=>f.id===input.featureId);
 check(!old||old.type===REFERENCE_TYPE&&input.replace,'InvalidInput','Reference identity already exists.');
 const feature={id:input.featureId,definitionId:graph.primaryDefinitionId,type:REFERENCE_TYPE,parameterIds:[...new Set(input.references.map(e=>e.parameterId).filter(Boolean))],
  dependsOn:[...new Set(input.references.map(e=>e.target.producerId).filter(id=>id!=='reference-frame'))],
  data:{profile:input.definitionMode?'E3-reference/2':old?.data.profile??'E3-reference/1',kind:input.kind,name:input.name,...(input.definitionMode?{definitionMode:input.definitionMode}:{}),references:structuredClone(input.references),...(old?.data.deletedRoles?{deletedRoles:[...old.data.deletedRoles]}:{})}};
 if(old)graph.features[graph.features.indexOf(old)]=feature;else graph.features.push(feature);
 validateReference(feature,graph);
}
export function referenceDatums(value){
 const graph=value.native?.graph??value.graph;if(!graph)return [];
 return graph.features.filter(f=>f.type===REFERENCE_TYPE&&!f.disabled).flatMap(f=>{
  const base={kind:'datum',definitionId:f.definitionId,producerId:f.id,occurrencePath:[f.definitionId],referenceFeature:true};
  const geometry=referenceGeometry(graph,{...base,role:f.data.kind});
  if(f.data.kind==='coordinate')return [{...base,id:f.id,role:'origin',datumType:'point',coordinateSystem:true,name:f.data.name,originMm:geometry.origin,pointMm:geometry.origin,coordinateFrame:[geometry.frame.u,geometry.frame.v,geometry.frame.normal]},...['x','y','z','xy','xz','yz'].filter(role=>!(f.data.deletedRoles??[]).includes(role)).map(role=>{const g=referenceGeometry(graph,{...base,role});return {...base,id:f.id+'-'+role,parentId:f.id,role,datumType:g.kind==='line'?'axis':'plane',name:{x:'X axis',y:'Y axis',z:'Z axis',xy:'Front',xz:'Top',yz:'Right'}[role],originMm:g.origin,...(g.kind==='line'?{direction:g.direction}:{normal:g.normal,u:g.u,planeFrame:{origin:g.origin,u:g.u,v:g.v,normal:g.normal}})};})];
  return [{...base,id:f.id,role:f.data.kind,datumType:f.data.kind,name:f.data.name,originMm:geometry.origin,...(geometry.kind==='plane'?{normal:geometry.normal,u:geometry.u,planeFrame:{origin:geometry.origin,u:geometry.u,v:geometry.v,normal:geometry.normal}}:{direction:geometry.direction})}];
 });
}
