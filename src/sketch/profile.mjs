import {referenceGeometry,REFERENCE_TYPE} from '../reference/profile.mjs';
import {extendSketch,seedPolygonCenter} from './extended.mjs';
import {equationGeometry} from './equation-curve.mjs';
import {circularSegments,splineSegments,equationSegments,MAX_SKETCH_ENTITIES} from './curves.mjs';
import {referenceAnchors} from './reference-anchors.mjs';
import {validateSupportFrame} from '../extrusion/planar.mjs';
import {capFrame} from '../extrusion/frame.mjs';
import {dimensions} from './relation-kinds.mjs';
import {check} from '../errors.mjs';
import {UNITS,KERNEL,recipe} from '../lab/profile.mjs';
import {PARAMETRIC_PROFILE,M4_PROFILE,M5_PROFILE,isParametric,validateRelations,upgradeSketch,expandRectangle,derivedId,pointAt} from './relations.mjs';
export const SKETCH_TYPE='sketch-primitives',SKETCH_PROFILE='E1.M2-sketch/1';
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
export {stableId,validateEntity} from './entities.mjs';
import {stableId,validateEntity} from './entities.mjs';
export function validateSketch(f,g,ids=new Set()){
 check(f.definitionId===g.primaryDefinitionId,'UnsupportedCapability','Edit sketches in the primary part. Editing through component occurrences is not available.');const d=f.data,parametric=isParametric(d.profile);check(exact(d,['profile','name','plane','entities',...(parametric?['constraints']:[]),...['patterns','mirrors','conversions'].filter(k=>Object.hasOwn(d,k))])&&[SKETCH_PROFILE,PARAMETRIC_PROFILE,M4_PROFILE,M5_PROFILE].includes(d.profile)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=128,'InvalidInput','Unsupported sketch profile or name.');check(f.parameterIds.length===0,'UnsupportedCapability','Sketch relations store literal dimensions; expressions follow in E1.M4.');
 const externalProducers=[...new Set(d.entities.filter(e=>e.external&&(e.external.kind!=='datum'||e.external.producerId!=='reference-frame')).map(e=>e.external.producerId))];check(d.entities.every(e=>!e.external||d.profile===M5_PROFILE&&e.external.definitionId===f.definitionId&&e.external.producerId!==f.id),'LostReference','External references require the current primary-part sketch.');const supportDeps=f.dependsOn.filter(id=>!externalProducers.includes(id)||id===d.plane.producerId);check(externalProducers.every(id=>f.dependsOn.includes(id)),'LostReference','Missing external source dependency.');const p=d.plane,witness=/^planar:[a-f0-9]{64}$/.test(p?.role??'');if(witness){check(d.profile===M5_PROFILE,'IncompatibleVersion','Planar geometry witnesses require the M5 workbench.');validateSupportFrame(p.frame);}else check(!Object.hasOwn(p??{},'frame'),'InvalidInput','Only witnessed planar supports carry an exact frame.');if(p?.orientation)check(exact(p.orientation,['reverseNormal','rightQuarterTurns'])&&typeof p.orientation.reverseNormal==='boolean'&&Number.isInteger(p.orientation.rightQuarterTurns)&&p.orientation.rightQuarterTurns>=0&&p.orientation.rightQuarterTurns<=3,'InvalidInput','Invalid sketch normal/right orientation.');if(p?.kind==='datum'){check(exact(p,['kind','role',...(p.producerId?['producerId']:[]),...(p.orientation?['orientation']:[])])&&(!p.producerId?['xy','xz','yz'].includes(p.role):g.features.some(r=>r.id===p.producerId&&r.type===REFERENCE_TYPE&&r.data.kind==='plane'))&&!f.selector&&supportDeps.length===(p.producerId?1:0),'LostReference','Sketch requires a canonical reference plane.');}else{const producer=g.features.find(x=>x.id===p?.producerId),selector=f.selector;check(exact(p,['kind','producerId','role',...(witness?['frame']:[]),...(p.orientation?['orientation']:[])])&&p.kind==='face'&&(witness||(parametric?['top','bottom','left','right','front','back']:['top','bottom']).includes(p.role))&&(producer?.type==='geometry-probe'&&['extrude','cut'].includes(producer.data.spec.scenario)||d.profile===M5_PROFILE&&producer?.type==='sketch-extrusion'&&(witness||['top','bottom'].includes(p.role)))&&producer.definitionId===f.definitionId&&supportDeps.length===1&&supportDeps[0]===p.producerId&&selector?.producerId===p.producerId&&selector.role===p.role&&selector.kind==='face'&&selector.kernel===KERNEL,'LostReference','Choose a uniquely resolved supported planar face in the sketch definition.');}
 check(Array.isArray(d.entities)&&d.entities.length<=(d.profile===M5_PROFILE?MAX_SKETCH_ENTITIES:64),'ResourceLimit','The sketch exceeds the document geometry capacity.');for(const e of d.entities){validateEntity(e);check(!['arc','spline','equation-curve'].includes(e.type)||d.profile===M5_PROFILE,'IncompatibleVersion','Arcs and splines require the current parametric sketch.');check(d.profile===M5_PROFILE||!Object.hasOwn(e,'name')&&!Object.hasOwn(e,'pointNames'),'InvalidInput','Editable reference metadata requires the M5 sketch profile.');check(!parametric||e.type!=='rectangle','InvalidInput','Parametric rectangles are four lines with explicit relations.');check(!ids.has(e.id),'InvalidInput','Primitive IDs must be unique across the native graph.');ids.add(e.id);}if(d.patterns){
  check(d.profile===M5_PROFILE&&Array.isArray(d.patterns)&&d.patterns.length<=8,'InvalidInput','At most eight managed sketch patterns.');
  const known=new Set(),sketchIds=new Set(d.entities.map(e=>e.id));
  for(const p of d.patterns){
   check(stableId(p.id)&&!known.has(p.id)&&['linear','circular'].includes(p.mode)&&Array.isArray(p.entityIds)&&p.entityIds.length>0&&p.entityIds.length<=16&&new Set(p.entityIds).size===p.entityIds.length&&p.entityIds.every(id=>sketchIds.has(id))&&p.reference&&sketchIds.has(p.reference.entityId)&&typeof p.reference.role==='string'&&Number.isSafeInteger(p.count)&&p.count>=2&&Number.isFinite(p.spacing)&&p.spacing>0&&(p.distribution===undefined||['step','total'].includes(p.distribution))&&typeof p.reverse==='boolean'&&Array.isArray(p.generated)&&p.generated.every(id=>sketchIds.has(id))&&[p.countParameterId,p.spacingParameterId].every(id=>id===undefined||stableId(id)&&g.parameters.some(parameter=>parameter.id===id))&&typeof p.signature==='string'&&p.signature.length<24000,'InvalidInput','Invalid managed sketch pattern.');
   known.add(p.id);
  }
 }
 for(const entity of d.entities)if(entity.type==='equation-curve'){
  const geometry=equationGeometry(entity.recipe,g.parameters,f.definitionId,planeFrame(f,g)),expected=geometry.samples;
  check(expected.every((point,i)=>point.every((n,j)=>Math.abs(n-entity.samples[i][j])<1e-7)),'InvalidGeometry','Equation curve coordinates differ from their source expression.');
  if(entity.tangents)check(geometry.tangents.every((v,i)=>v?v.every((n,j)=>Math.abs(n-entity.tangents[i]?.[j])<1e-7):entity.tangents[i]===null),'InvalidGeometry','Equation tangents differ from their source expression.');
 }
 for(const key of ['mirrors','conversions'])if(d[key]){
  check(d.profile===M5_PROFILE&&Array.isArray(d[key]),'InvalidInput','Invalid sketch operation history.');
  const existing=new Set(d.entities.map(e=>e.id)),seen=new Set();
  for(const operation of d[key]){
   check(stableId(operation.id)&&!seen.has(operation.id)&&Array.isArray(operation.entityIds)&&operation.entityIds.length&&operation.entityIds.every(id=>existing.has(id))&&
    (key!=='mirrors'||existing.has(operation.axisId)&&Array.isArray(operation.generated)&&operation.generated.every(id=>existing.has(id))),
    'LostReference','Sketch operation has a missing participant.');
   seen.add(operation.id);
  }
 }
 if(parametric)validateRelations(d,ids);return f;
}
export function sketchOf(value,id){const f=value.native?.graph.features.find(f=>f.id===id);check(f?.type===SKETCH_TYPE,'LostReference','Sketch identity is missing.');return f;}
function basePlaneFrame(f,g){const p=f.data.plane;if(p.frame)return structuredClone(p.frame);if(p.kind==='datum'&&p.producerId){const {kind,...frame}=referenceGeometry(g,{kind:'datum',producerId:p.producerId,role:p.role,definitionId:f.definitionId,occurrencePath:[f.definitionId]});return frame;}if(p.kind==='datum')return {origin:[0,0,0],u:p.role==='yz'?[0,1,0]:[1,0,0],v:p.role==='xy'?[0,1,0]:[0,0,1],normal:{xy:[0,0,1],xz:[0,-1,0],yz:[1,0,0]}[p.role]};const producer=g.features.find(x=>x.id===p.producerId);if(producer.type==='sketch-extrusion')return capFrame(producer,g,p.role);const s=recipe(producer.data.spec),unit=UNITS[s.unit],w=s.width*unit/2,h=s.height*unit/2;if(['left','right'].includes(p.role)){const sign=p.role==='right'?1:-1;return {origin:[sign*w,0,0],u:[0,sign,0],v:[0,0,1],normal:[sign,0,0]};}if(['front','back'].includes(p.role)){const sign=p.role==='back'?-1:1;return {origin:[0,-sign*h,0],u:[sign,0,0],v:[0,0,1],normal:[0,-sign,0]};}return {origin:[0,0,p.role==='top'?s.depth*unit:0],u:[1,0,0],v:[0,p.role==='top'?1:-1,0],normal:[0,0,p.role==='top'?1:-1]};}
export function planeFrame(f,g){const base=basePlaneFrame(f,g),o=f.data.plane.orientation;if(!o)return base;const u=base.u,v=base.v.map(x=>x*(o.reverseNormal?-1:1)),q=o.rightQuarterTurns,cos=[1,0,-1,0][q],sin=[0,1,0,-1][q];return {...base,u:u.map((n,i)=>n*cos+v[i]*sin),v:v.map((n,i)=>(n*cos-u[i]*sin)||0),normal:base.normal.map(x=>(x*(o.reverseNormal?-1:1))||0)};}
export function primitiveSegments(e){if(e.type==='point')return [];if(e.type==='spline')return splineSegments(e);if(e.type==='equation-curve')return equationSegments(e);if(e.type==='line')return [[e.a,e.b]];if(e.type==='rectangle'){const a=e.a,b=e.b,p=[a,[b[0],a[1]],b,[a[0],b[1]]];return p.map((v,i)=>[v,p[(i+1)%4]]);}return circularSegments(e,64);}
export function sketchScene(value){const g=value.native?.graph;if(!g)return [];return g.features.filter(f=>f.type===SKETCH_TYPE).map(f=>{if(f.selector)check(['ResolvedStable','ResolvedReidentified'].includes(f.selector.state),f.selector.state,'Repair the sketch support reference before displaying it.');const frame=planeFrame(f,g),world=p=>frame.origin.map((n,i)=>n+frame.u[i]*p[0]+frame.v[i]*p[1]);return {id:f.id,name:f.data.name,definitionId:f.definitionId,frame,entities:f.data.entities.filter(e=>!e.referenceOnly&&(!e.external||e.converted)).map(e=>({id:e.id,type:e.type,construction:e.construction,...(e.type==='circle'?{curve:{type:'circle',full:true,centerMm:world(e.center),radiusMm:e.radius,normal:frame.normal}}:{}),segments:primitiveSegments(e).map(s=>s.map(world)),points:e.type==='point'?[world(e.point)]:[]}))};});}
function attachSnap(feature,from,to){
 check(feature.data.profile===M5_PROFILE,'UnsupportedCapability','Snap requires the current sketch workbench.');
 if(to.entityId==='origin:reference-frame'){
  check(to.role==='point','InvalidInput','Snap to the coordinate origin as a point.');const id=derivedId(feature.id,'snap-origin');
  const origin=feature.data.entities.find(e=>e.id===id);
  check(!origin||origin.type==='point'&&origin.point.every(n=>Math.abs(n)<1e-8)&&feature.data.constraints.some(c=>c.type==='fixed'&&c.refs[0].entityId===id&&c.value.every(n=>n===0)),'LostReference','The sketch Origin reference was modified. Restore or remove it before snapping to the coordinate origin.');
  if(!origin){
   feature.data.entities.push({id,type:'point',point:[0,0],construction:true,name:'Origin'});
   feature.data.constraints.push({id:derivedId(id,'fixed'),type:'fixed',refs:[{entityId:id,role:'point'}],driving:true,value:[0,0]});
  }
  to={entityId:id,role:'point'};
 }
 const targetEntity=feature.data.entities.find(e=>e.id===to.entityId);
 if(to.role==='entity'&&['line','circle'].includes(targetEntity?.type)){
  const fromEntity=feature.data.entities.find(e=>e.id===from.entityId),radial=from.role==='circumference';
  check(radial?fromEntity?.type==='circle':pointAt(feature.data.entities,from),'LostReference','Snap needs a sketch point or circle perimeter.');
  check(from.entityId!==to.entityId,'InvalidInput','A sketch entity cannot snap to itself.');
  feature.data.constraints.push({id:derivedId(feature.id,'snap',from.entityId,from.role,to.entityId,to.role),type:radial?'tangent':targetEntity.type==='line'?'point-on-line':'point-on-circle',refs:[radial?{entityId:from.entityId,role:'entity'}:structuredClone(from),structuredClone(to)],driving:true,value:null});return;
 }
 if(from.role==='circumference'){
  check(feature.data.entities.some(e=>e.id===from.entityId&&e.type==='circle')&&pointAt(feature.data.entities,to),'LostReference','Circle Snap requires an existing circle and semantic target point.');
  check(from.entityId!==to.entityId,'InvalidInput','A circle cannot snap to its own center.');
  feature.data.constraints.push({id:derivedId(feature.id,'snap',from.entityId,'circumference',to.entityId,to.role),type:'point-on-circle',refs:[structuredClone(to),{entityId:from.entityId,role:'entity'}],driving:true,value:null});return;
 }
 check(pointAt(feature.data.entities,from)&&pointAt(feature.data.entities,to),'LostReference','Snap requires two existing semantic points.');
 check(from.entityId!==to.entityId||from.role!==to.role,'InvalidInput','A point cannot snap to itself.');
 const same=(a,b)=>a.entityId===b.entityId&&a.role===b.role;
 if(feature.data.constraints.some(c=>c.type==='coincident'&&(same(c.refs[0],from)&&same(c.refs[1],to)||same(c.refs[1],from)&&same(c.refs[0],to))))return;
 feature.data.constraints.push({id:derivedId(feature.id,'snap',from.entityId,from.role,to.entityId,to.role),type:'coincident',refs:[structuredClone(from),structuredClone(to)],driving:true,value:null});
}
export function sketchCommand(next,name,input){const g=next.native.graph;
 if(name==='cad.sketch.create.v1'){check(g.definitions.some(d=>d.id===input.definitionId),'LostReference','Sketch definition is missing.');check(g.features.filter(f=>f.type===SKETCH_TYPE).length<16,'ResourceLimit','At most sixteen editable sketches.');const p=structuredClone(input.plane),face=p.kind==='face';g.features.push({id:input.sketchId,definitionId:input.definitionId,type:SKETCH_TYPE,dependsOn:face||p.producerId?[p.producerId]:[],parameterIds:[],data:{profile:input.profile??SKETCH_PROFILE,name:input.name,plane:p,entities:[],...(isParametric(input.profile)?{constraints:[]}: {})},...(face?{selector:{producerId:p.producerId,role:p.role,kind:'face',kernel:KERNEL,state:'ResolvedStable'}}:{})});return;}
 if(input.externalEntities?.length){
  check(['cad.sketch.constraint.add.v1','cad.sketch.constraint.update.v1','cad.sketch.constraints.add.v1','cad.sketch.entity.add.v1','cad.sketch.drag.v1','cad.sketch.mirror.v1','cad.sketch.pattern.v1'].includes(name),'InvalidInput','External references accompany a sketch edit.');
  const refs=[...(input.constraint?.refs??[]),...(input.constraints??[]).flatMap(c=>c.refs),...(input.snaps??[]).map(s=>s.to),...(input.snapTarget?[input.snapTarget]:[]),...(input.axisId?[{entityId:input.axisId}]:[]),...(input.reference?[input.reference]:[])];
  check(new Set(input.externalEntities.map(e=>e.id)).size===input.externalEntities.length,'InvalidInput','Repeated implicit reference.');
  for(const entity of input.externalEntities){check(entity.referenceOnly===true&&entity.external&&refs.some(r=>r.entityId===entity.id),'InvalidInput','Only used implicit source references may be materialized.');sketchCommand(next,'cad.sketch.entity.add.v1',{sketchId:input.sketchId,entity,unit:'mm'});}
 }
 if(name==='cad.sketch.entities.add.v1'){check(input.entities.length>0&&input.entities.length<=32&&new Set(input.entities.map(e=>e.id)).size===input.entities.length,'InvalidInput','Provide unique entity identities.');for(const entity of input.entities)sketchCommand(next,'cad.sketch.entity.add.v1',{sketchId:input.sketchId,entity,unit:input.unit});return;}
 if(name==='cad.sketch.constraints.add.v1'){check(Array.isArray(input.constraints)&&input.constraints.length<=32&&input.constraints.length>0,'InvalidInput','Provide 1–32 relations.');for(const constraint of input.constraints)sketchCommand(next,'cad.sketch.constraint.add.v1',{sketchId:input.sketchId,constraint});return;}
 if(name==='cad.sketch.constraints.delete.v1'){check(new Set(input.constraintIds).size===input.constraintIds.length&&input.constraintIds.length>0,'InvalidInput','Provide unique relation IDs.');for(const constraintId of input.constraintIds)sketchCommand(next,'cad.sketch.constraint.delete.v1',{sketchId:input.sketchId,constraintId});return;}
 if(name==='cad.sketch.entities.delete.v1'){check(new Set(input.entityIds).size===input.entityIds.length&&input.entityIds.length>0,'InvalidInput','Provide unique entity IDs.');for(const entityId of input.entityIds)sketchCommand(next,'cad.sketch.entity.delete.v1',{sketchId:input.sketchId,entityId});return;}
 const f=sketchOf(next,input.sketchId);if(name==='cad.sketch.upgrade.v1'){upgradeSketch(f,input.profile??PARAMETRIC_PROFILE);return;}if(name==='cad.sketch.delete.v1'){check(!g.features.some(x=>x.dependsOn.includes(f.id)),'LostReference','Delete dependent features before deleting this sketch.');g.features.splice(g.features.indexOf(f),1);return;}
 if(name==='cad.sketch.spline.chain.v1'){
  check(f.data.profile===M5_PROFILE,'UnsupportedCapability','Upgrade the sketch before fitting splines.');
  let previous=input.previousId?f.data.entities.find(e=>e.id===input.previousId):null;
  check(!input.previousId||previous?.type==='spline','LostReference','The previous spline span is missing.');
  for(const entity of input.entities){
   check(entity.type==='spline','InvalidInput','A spline chain accepts cubic spans.');
   sketchCommand(next,'cad.sketch.entity.add.v1',{sketchId:f.id,entity,unit:'mm'});
   if(previous){
    const refs=[{entityId:previous.id,role:'b'},{entityId:entity.id,role:'a'}];
    for(const type of ['coincident','spline-tangent'])f.data.constraints.push({id:derivedId(f.id,entity.id,type),type,refs,driving:true,value:null});
   }
   previous=entity;
  }
  return;
 }
 if(name==='cad.sketch.conversion.v1'){
  check(f.data.profile===M5_PROFILE,'UnsupportedCapability','Upgrade the sketch before converting references.');
  const data=f.data,old=data.conversions?.find(o=>o.id===input.id)??(input.replace&&input.id.startsWith('legacy-')?{
   id:input.id,entityIds:data.entities.filter(e=>e.converted&&'legacy-'+e.id===input.id).map(e=>e.id)
  }:null);
  check(input.replace?old?.entityIds.length:!old,'LostReference','The conversion operation changed.');
  check(input.entities.every(e=>e.converted&&e.external)&&new Set(input.entities.map(e=>e.id)).size===input.entities.length,'InvalidInput','Choose distinct converted references.');
  const nextIds=new Set(input.entities.map(e=>e.id));
  if(old){
   const oldIds=new Set(old.entityIds),anchors=new Set(data.entities.filter(e=>oldIds.has(e.id)).flatMap(e=>referenceAnchors(f.id,e,derivedId).map(c=>c.id)));
   check(!data.constraints.some(c=>!anchors.has(c.id)&&c.refs.some(r=>oldIds.has(r.entityId)&&!nextIds.has(r.entityId))),
    'ConstraintConflict','Remove downstream relations before changing these conversion references.');
   data.entities=data.entities.filter(e=>!oldIds.has(e.id));
   data.constraints=data.constraints.filter(c=>!anchors.has(c.id));
  }
  for(const entity of input.entities)sketchCommand(next,'cad.sketch.entity.add.v1',{sketchId:f.id,entity,unit:'mm'});
  if(data.conversions?.includes(old))old.entityIds=[...nextIds];
  else (data.conversions??=[]).push({id:input.id,entityIds:[...nextIds]});
  return;
 }
 if(name==='cad.sketch.equation-curve.add.v1'){
  const {id,recipe,construction}=input;
  const entity={id,type:'equation-curve',construction,recipe:structuredClone(recipe),...equationGeometry(recipe,g.parameters,f.definitionId,planeFrame(f,g))};
  const original=f.data.entities.find(e=>e.id===id);
  check(input.replace?original?.type==='equation-curve':!original,'LostReference','The equation curve operation changed.');
  sketchCommand(next,input.replace?'cad.sketch.entity.update.v1':'cad.sketch.entity.add.v1',{sketchId:f.id,entity,unit:'mm'});return;
 }
 const extended=name.match(/^cad\.sketch\.(polygon|split|trim|mirror|pattern)\.v1$/);
 if(extended){
  check(f.data.profile===M5_PROFILE,'UnsupportedCapability','Upgrade the sketch before using extended tools.');
  extendSketch(f.data,extended[1],input,f.id,g);return;
 }
 if(name.startsWith('cad.sketch.constraint.')){
 const incoming=input.constraint;
 if(incoming?.driving){const refs=incoming.refs.map(r=>f.data.entities.find(e=>e.id===r.entityId)),implicit=e=>!!(e?.external&&!e.converted);
 check(refs.some(e=>!implicit(e))&&(!['horizontal','vertical','fixed'].includes(incoming.type)||!refs.some(implicit)),'InvalidInput','A driving relation must constrain sketch geometry. External references are read-only.');}
 check(isParametric(f.data.profile),'UnsupportedCapability','Upgrade the sketch before adding relations.');const cs=f.data.constraints,i=cs.findIndex(c=>c.id===(input.constraintId??input.constraint?.id));if(name==='cad.sketch.constraint.delete.v1'){check(i>=0,'LostReference','Relation is missing.');cs.splice(i,1);}else if(name==='cad.sketch.constraint.add.v1'){check(i<0,'InvalidInput','Relation ID already exists.');if(!input.allowOverdefined&&f.data.profile===M5_PROFILE&&input.constraint.driving&&dimensions.includes(input.constraint.type)){const incoming=input.constraint,radial=c=>['radius','diameter'].includes(c.type),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);check(!cs.some(c=>c.driving&&(radial(c)&&radial(incoming)&&c.refs[0].entityId===incoming.refs[0].entityId||c.type===incoming.type&&(same(c.refs,incoming.refs)||['distance','line-distance'].includes(c.type)&&same(c.refs,[...incoming.refs].reverse())))),'ConstraintConflict','This dimension is already driven. Edit its existing dimension or create a reference dimension.');}seedPolygonCenter(f.data,input.constraint);cs.push(structuredClone(input.constraint));}else{check(name==='cad.sketch.constraint.update.v1'&&i>=0,'LostReference','Relation is missing.');check(f.data.profile===M5_PROFILE||cs[i].driving||input.constraint.value===cs[i].value&&input.constraint.driving===false,'InvalidInput','A reference dimension cannot drive geometry. Remove it before creating a driving dimension.');cs[i]=structuredClone(input.constraint);}return;}
 if(name==='cad.sketch.reference.rename.v1'){check(f.data.profile===M5_PROFILE,'UnsupportedCapability','Upgrade the sketch before naming references.');const e=f.data.entities.find(e=>e.id===input.ref.entityId);check(e,'LostReference','Reference is missing.');if(input.ref.role==='entity'||e.type==='point'&&input.ref.role==='point')e.name=input.name;else{check((e.type==='line'?['a','b','midpoint']:e.type==='circle'?['center']:e.type==='arc'?['a','b','center']:e.type==='spline'?['a','b','control1','control2']:[]).includes(input.ref.role),'LostReference','Invalid point role.');e.pointNames={...e.pointNames,[input.ref.role]:input.name};}return;}
 if(name==='cad.sketch.drag.v1'){check(!f.data.patterns?.some(pattern=>pattern.generated.includes(input.ref.entityId)),'ConstraintConflict','Edit the pattern or its source geometry to move this copy.');check(isParametric(f.data.profile),'UnsupportedCapability','Upgrade the sketch before constrained drag.');if(input.snapTarget){const e=f.data.entities.find(e=>e.id===input.ref.entityId),role={circle:'center',arc:'center',line:'midpoint',spline:'a',point:'point'}[e?.type],from=input.ref.role==='entity'&&role?{entityId:e.id,role}:input.ref;attachSnap(f,from,input.snapTarget);}return;}
 const entities=f.data.entities,index=entities.findIndex(e=>e.id===(input.entityId??input.entity?.id));if(name==='cad.sketch.entity.delete.v1'){check(index>=0,'LostReference','Sketch primitive is missing.');removeSketchEntity(f.data,f.id,input.entityId);return;}
 check(Object.hasOwn(UNITS,input.unit),'InvalidUnits','Choose mm, cm, m or inch.');const e=structuredClone(input.entity),factor=UNITS[input.unit];for(const k of ['point','a','b','center','control1','control2','corner'])if(e[k])e[k]=e[k].map(x=>x*factor);if(e.radius!==undefined)e.radius*=factor;validateEntity(e);
 if(name==='cad.sketch.entity.add.v1'){check(index<0,'InvalidInput','Primitive ID already exists.');if(isParametric(f.data.profile)&&e.type==='rectangle')expandRectangle(f.data,e,f.id);else entities.push(e);if(e.external){if((e.external.kind!=='datum'||e.external.producerId!=='reference-frame')&&!f.dependsOn.includes(e.external.producerId))f.dependsOn.push(e.external.producerId);f.data.constraints.push(...referenceAnchors(f.id,e,derivedId));}for(const snap of input.snaps??[]){check(e.type!=='rectangle'||['a','b'].includes(snap.fromRole),'InvalidInput','Rectangle snaps identify its two chosen opposite corners.');const from=e.type==='rectangle'?(snap.fromRole==='b'?{entityId:derivedId(f.id,e.id,'edge',2),role:'a'}:{entityId:e.id,role:'a'}):{entityId:e.id,role:snap.fromRole};attachSnap(f,from,snap.to);}if(input.alignment){check(e.type==='line'&&f.data.profile===M5_PROFILE,'InvalidInput','Alignment requires a current straight line.');f.data.constraints.push({id:derivedId(f.id,e.id,input.alignment),type:input.alignment,refs:[{entityId:e.id,role:'entity'}],driving:true,value:null});}}else{check(name==='cad.sketch.entity.update.v1'&&index>=0,'LostReference','Sketch primitive is missing.');check(entities[index].type===e.type,'InvalidInput','Update preserves primitive identity and type.');check(!f.data.patterns?.some(pattern=>pattern.generated.includes(e.id)),'ConstraintConflict','Edit the pattern or its source geometry to change this copy.');entities[index]={...entities[index],...e};}
}

function removeSketchEntity(data,sketchId,id){
 const removed=new Set([id]);
 for(let size=-1;size!==removed.size;){
  size=removed.size;
  for(const mirror of data.mirrors??[]){
   check(!removed.has(mirror.axisId),'ConstraintConflict','Choose a different mirror axis before removing it.');
   mirror.entityIds=mirror.entityIds.filter(source=>{
    const copy=derivedId(sketchId,mirror.id,source,1);
    if(!removed.has(source)&&!removed.has(copy))return true;
    removed.add(copy);return false;
   });
   mirror.generated=mirror.generated.filter(copy=>!removed.has(copy));
  }
  for(const pattern of data.patterns??[]){
   check(!removed.has(pattern.reference.entityId),'ConstraintConflict','Choose a different pattern reference before removing it.');
   const before=pattern.entityIds;
   pattern.entityIds=before.filter(source=>!removed.has(source));
   const affected=new Set();
   for(const source of before.filter(source=>removed.has(source)))
    for(let i=1;i<=MAX_SKETCH_ENTITIES;i++)affected.add(derivedId(sketchId,pattern.id,source,i));
   for(const copy of pattern.generated)if(affected.has(copy))removed.add(copy);
   pattern.omitted=[...new Set([...(pattern.omitted??[]),...pattern.generated.filter(copy=>removed.has(copy)&&!affected.has(copy))])];
   pattern.generated=pattern.generated.filter(copy=>!removed.has(copy));
   delete pattern.signature;
  }
 }
 data.entities=data.entities.filter(e=>!removed.has(e.id));
 if(data.constraints)data.constraints=data.constraints.filter(c=>!c.refs.some(r=>removed.has(r.entityId)));
 for(const key of ['mirrors','patterns'])if(data[key]){
  data[key]=data[key].filter(o=>o.entityIds.length&&o.generated.length);
  if(!data[key].length)delete data[key];
 }
 for(const item of removed)pruneSketchOperations(data,item);
}

export function pruneSketchOperations(data,id){
 for(const key of ['mirrors','conversions'])if(data[key]){
  data[key]=data[key].filter(o=>o.axisId!==id&&!o.entityIds.includes(id)&&!o.generated?.includes(id));
  if(!data[key].length)delete data[key];
 }
}
export function pruneImplicitReferences(value){
 const g=value.native.graph;
 for(const f of g.features.filter(f=>f.type===SKETCH_TYPE)){
  for(const e of f.data.entities.filter(e=>e.converted)){
   const anchors=referenceAnchors(f.id,e,derivedId),ids=new Set(anchors.map(c=>c.id));
   if(anchors.every(anchor=>f.data.constraints.some(c=>c.id===anchor.id)))continue;
   pruneSketchOperations(f.data,e.id);delete e.external;delete e.converted;f.data.constraints=f.data.constraints.filter(c=>!ids.has(c.id));
   for(const p of g.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='dimension'||t.sketchId!==f.id||!ids.has(t.constraintId));
  }
  const removed=new Set(),constraints=new Set();
  for(const e of f.data.entities.filter(e=>e.referenceOnly)){
   if(f.data.patterns?.some(pattern=>pattern.reference.entityId===e.id))continue;
   const anchors=new Set(referenceAnchors(f.id,e,derivedId).map(c=>c.id));
   if(f.data.constraints.some(c=>!anchors.has(c.id)&&c.refs.some(r=>r.entityId===e.id)))continue;
   removed.add(e.id);for(const id of anchors)constraints.add(id);
  }
  if(!removed.size)continue;
  const producers=f.data.entities.filter(e=>removed.has(e.id)).map(e=>e.external.producerId);
  f.data.entities=f.data.entities.filter(e=>!removed.has(e.id));f.data.constraints=f.data.constraints.filter(c=>!constraints.has(c.id));
  f.dependsOn=f.dependsOn.filter(id=>id===f.data.plane.producerId||!producers.includes(id)||f.data.entities.some(e=>e.external?.producerId===id));
  for(const p of g.parameters)if(p.targets)p.targets=p.targets.filter(t=>t.kind!=='dimension'||t.sketchId!==f.id||!constraints.has(t.constraintId));
 }
}
