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
  check(!seen.has(feature.id),'InvalidNativeGraph','Reference construction contains a cycle.');seen=new Set([...seen,feature.id]);
  const entries=feature.data.references.map(e=>({...e,value:e.parameterId?referenceParameter(graph,e):e.value,geometry:referenceGeometry(graph,e.target,e.geometry,seen)}));
  const frame=constructReference(feature.data.kind,entries);
  if(feature.data.kind==='axis')return {kind:'line',origin:frame.origin,direction:frame.normal};
  if(feature.data.kind==='plane')return {kind:'plane',...frame};
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
 check(d?.profile==='E3-reference/1'&&['plane','axis','coordinate'].includes(d.kind)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=128&&Array.isArray(d.references)&&d.references.length>0&&d.references.length<=3,'InvalidInput','Invalid reference construction.');
 for(const entry of d.references)check(['coincident','parallel','perpendicular','offset','angle','midplane'].includes(entry.relation)&&Number.isFinite(entry.value),'InvalidInput','Invalid reference relation.');
 const dependencies=[...new Set(d.references.map(e=>e.target.producerId).filter(id=>id!=='reference-frame'))];
 check(feature.dependsOn.length===dependencies.length&&dependencies.every(id=>feature.dependsOn.includes(id)),'InvalidNativeGraph','Reference dependencies must identify every selected producer.');
 referenceGeometry(graph,{producerId:feature.id,definitionId:feature.definitionId,role:d.kind,occurrencePath:[feature.definitionId]});
}
export function referenceCommand(value,input){
 const graph=value.native.graph,old=graph.features.find(f=>f.id===input.featureId);
 check(!old||old.type===REFERENCE_TYPE&&input.replace,'InvalidInput','Reference identity already exists.');
 const feature={id:input.featureId,definitionId:graph.primaryDefinitionId,type:REFERENCE_TYPE,parameterIds:[...new Set(input.references.map(e=>e.parameterId).filter(Boolean))],
  dependsOn:[...new Set(input.references.map(e=>e.target.producerId).filter(id=>id!=='reference-frame'))],
  data:{profile:'E3-reference/1',kind:input.kind,name:input.name,references:structuredClone(input.references)}};
 if(old)graph.features[graph.features.indexOf(old)]=feature;else graph.features.push(feature);
 validateReference(feature,graph);
}
export function referenceDatums(value){
 const graph=value.native?.graph??value.graph;if(!graph)return [];
 return graph.features.filter(f=>f.type===REFERENCE_TYPE&&!f.disabled).flatMap(f=>{
  const base={kind:'datum',definitionId:f.definitionId,producerId:f.id,occurrencePath:[f.definitionId],referenceFeature:true};
  const geometry=referenceGeometry(graph,{...base,role:f.data.kind});
  if(f.data.kind==='coordinate')return [{...base,id:f.id,role:'origin',datumType:'point',name:f.data.name,originMm:geometry.origin,pointMm:geometry.origin,coordinateFrame:[geometry.frame?.u??[1,0,0],geometry.frame?.v??[0,1,0],geometry.frame?.normal??[0,0,1]]},...['x','y','z'].map(role=>{const g=referenceGeometry(graph,{...base,role});return {...base,id:f.id+'-'+role,role,datumType:'axis',name:f.data.name+' · '+role.toUpperCase(),originMm:g.origin,direction:g.direction};})];
  return [{...base,id:f.id,role:f.data.kind,datumType:f.data.kind,name:f.data.name,originMm:geometry.origin,...(geometry.kind==='plane'?{normal:geometry.normal,u:geometry.u,planeFrame:{origin:geometry.origin,u:geometry.u,v:geometry.v,normal:geometry.normal}}:{direction:geometry.direction})}];
 });
}
