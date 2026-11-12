import {exactBodies} from './bodies.mjs';
import {contactLimit} from './contact-limit.mjs';
import {operationSpan,trimTool} from './limits.mjs';
import {referenceGeometry,REFERENCE_TYPE,referenceParameter} from '../reference/profile.mjs';
import {constructReference,unit,cross} from '../reference/geometry.mjs';
import {arcPoint} from '../sketch/curves.mjs';
import {exactReferenceGeometry} from './reference-geometry.mjs';
import {planarSupport} from './planar.mjs';
import {capFrame} from './frame.mjs';
import {KERNEL} from '../lab/profile.mjs';
import * as cad from 'replicad';
import {initializeKernel} from '../lab/kernel.mjs';
import {planeFrame} from '../sketch/profile.mjs';
import {closedProfile} from './loops.mjs';
import {EXTRUSION_TYPE,validateExtrusion} from './profile.mjs';
import {check} from '../errors.mjs';
const EPS=1e-6,dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]),world=(f,p,z=0)=>f.origin.map((x,i)=>x+f.u[i]*p[0]+f.v[i]*p[1]+f.normal[i]*z);
function drawing(loop){if(loop.kind==='circle')return cad.drawCircle(loop.radius).translate(loop.center);if(loop.kind==='curved'){const pen=cad.draw(loop.edges[0].a);for(const edge of loop.edges){if(edge.type==='arc')pen.threePointsArcTo(edge.b,arcPoint(edge,.5));else pen.lineTo(edge.b);}return pen.close();}let pen=cad.draw(loop.points[0]);for(const p of loop.points.slice(1))pen=pen.lineTo(p);return pen.close();}

function capMatches(shape,frame){return shape.faces.filter(face=>face.geomType==='PLANE'&&dot(face.normalAt().toTuple(),frame.normal)>1-1e-9&&Math.abs(dot(sub(face.center.toTuple(),frame.origin),frame.normal))<EPS);}
function capLineage(builder,previous,output){if(!previous.element)return previous;const modified=builder.Modified(previous.element.wrapped);try{const count=modified.Size();if(count>1)return {state:'AmbiguousReference',candidates:count};if(count===1){const descendant=cad.cast(modified.First()),matches=output.faces.filter(face=>face.isSame(descendant));return matches.length===1?{state:'ResolvedReidentified',candidates:1,element:matches[0]}:{state:matches.length?'AmbiguousReference':'LostReference',candidates:matches.length};}if(builder.IsDeleted(previous.element.wrapped))return {state:'LostReference',candidates:0};const matches=output.faces.filter(face=>face.isSame(previous.element));return matches.length===1?{state:previous.state,candidates:1,element:matches[0]}:{state:matches.length?'AmbiguousReference':'LostReference',candidates:matches.length};}finally{modified.delete();}}
export async function regenerateExtrusions(value,{includeMesh=false,includeToolMesh=false,featureId,inspectShape}={}){const graph=value.native?.graph??value.graph,oc=await initializeKernel(),memo=new Map(),retained=[];try{const validateSolid=shape=>{
 const analyzer=new oc.BRepCheck_Analyzer(shape.wrapped,true,false,true);let valid;
 try{valid=analyzer.IsValid();}finally{analyzer.delete();}
 check(valid&&!shape.isNull&&shape.solids.length>0,'InvalidGeometry','The feature must produce valid closed solids.');
 };
 const retain=shape=>{retained.push(shape);return shape;};
 const resolve=(reference,{body=false}={})=>{
  const target=reference.target;check(target.definitionId===graph.primaryDefinitionId&&target.occurrencePath?.length===1&&target.occurrencePath[0]===target.definitionId,'LostReference','Choose geometry in the current part.');const producer=graph.features.find(f=>f.id===target.producerId);
  if(producer?.type===REFERENCE_TYPE){
   const entries=producer.data.references.map(entry=>({...entry,value:entry.parameterId?referenceParameter(graph,entry):entry.value,geometry:resolve(entry)}));
   const f=constructReference(producer.data.kind,entries);
   if(producer.data.kind==='plane')return {kind:'plane',...f};
   if(producer.data.kind==='axis')return {kind:'line',origin:f.origin,direction:f.normal};
   return ['x','y','z'].includes(target.role)?{kind:'line',origin:f.origin,direction:f[{x:'u',y:'v',z:'normal'}[target.role]]}:{kind:'point',origin:f.origin};
  }
  if(producer?.type!==EXTRUSION_TYPE)return referenceGeometry(graph,target);
  const result=build(producer);if(body)return referenceOnShape(result,target,graph).shape;
  return referenceOnShape(result,target,graph);
 };
 const combine=(base,tool,operation,caps=null,refine=true)=>{
  if(operation==='none')return retain(cad.makeCompound([...base.solids,...tool.solids]));
  const Builder=operation==='cut'?oc.BRepAlgoAPI_Cut:operation==='intersect'?oc.BRepAlgoAPI_Common:oc.BRepAlgoAPI_Fuse;
  const builder=new Builder(base.wrapped,tool.wrapped);
  try{if(refine)builder.SimplifyResult(true,true,1e-9);const result=retain(cad.cast(builder.Shape()));validateSolid(result);if(operation==='add')check(result.solids.length<base.solids.length+tool.solids.length,'InvalidGeometry','Unite requires material touching an existing body. Use None to retain a separate body.');if(caps)for(const role of Object.keys(caps))caps[role]=capLineage(builder,caps[role],result);return result;}finally{builder.delete();}
 };
 const contactFor=(feature,profile,frame,base,side,body,limitPlane)=>{
  const data=feature.data,angular=data.form==='revolve',sign=(side==='start'?-1:1)*(data.reverse?-1:1),from=side==='end'&&data.limits?.start.mode==='value'?data.limits.start.value:0;
  const sketch=graph.features.find(f=>f.id===data.sketchId),axis=data.axisReference?resolve(data.axisReference):null,line=sketch.data.entities.find(e=>e.id===data.axisId);
  const axisOrigin=angular?(axis?.origin??world(frame,line.a)):null,axisDirection=angular?unit(axis?.direction??sub(world(frame,line.b),axisOrigin)):null;
  const makeTool=distance=>{
   const drawingPlane=new cad.Plane(world(frame,[0,0],angular?0:from*(data.reverse?-1:1)),frame.u,frame.normal);
   let outline=drawing(profile.outer);for(const hole of profile.holes)outline=outline.cut(drawing(hole));
   try{const work=outline.sketchOnPlane(drawingPlane);if(!angular)return work.extrude(distance*sign);let tool=work.revolve(axisDirection.map(n=>n*sign),{origin:axisOrigin,angle:distance});if(from)tool=tool.rotate(from*(data.reverse?-1:1),axisOrigin,axisDirection);return tool;}
   finally{drawingPlane.delete();}
  };
  const maximum=angular?360-Math.abs(from):Math.max(1,...base.shape.boundingBox.bounds.flatMap(p=>p.map((n,i)=>Math.abs(n-frame.origin[i]))))*4;
  let halfSpace;
  if(limitPlane){const size=Math.max(100,...base.shape.boundingBox.bounds.flatMap(p=>p.map(Math.abs)))*8,plane=new cad.Plane(limitPlane.origin,limitPlane.u,limitPlane.normal);try{halfSpace=cad.drawRectangle(size*2,size*2).sketchOnPlane(plane).extrude(size);}finally{plane.delete();}body=halfSpace;}
  try{return from+(side==='start'?-1:1)*contactLimit(makeTool,body,maximum,{angular});}finally{halfSpace?.delete();}
 };
 const build=feature=>{if(memo.has(feature.id))return memo.get(feature.id);validateExtrusion(feature,graph);
 if(feature.data.form==='repeat'){
  const settings=structuredClone(feature.data.repeat);for(const key of ['count','offsetMm','angleDeg'])if(settings[key+'ParameterId']){const parameter=graph.parameters.find(p=>p.id===settings[key+'ParameterId']);check(parameter&&parameter.unit===({count:'scalar',offsetMm:'mm',angleDeg:'rad'}[key]),'InvalidUnits','Pattern driver has an incompatible unit.');settings[key]=parameter.value*(key==='angleDeg'?180/Math.PI:1);}check(Number.isInteger(settings.count)&&settings.count>=2&&settings.count<=32&&Number.isFinite(settings.offsetMm)&&Number.isFinite(settings.angleDeg)&&(settings.kind!=='linear'||Math.abs(settings.offsetMm)>1e-6)&&(settings.kind!=='circular'||Math.abs(settings.angleDeg)>1e-6&&Math.abs(settings.angleDeg)<360),'InvalidGeometry','Pattern parameters must define a supported integer count and nonzero spacing.');const sources=(settings.sourceFeatureIds??[settings.sourceFeatureId]).map(id=>build(graph.features.find(f=>f.id===id))),base=build(graph.features.find(f=>f.id===feature.data.baseFeatureId));
  const reference=settings.reference?resolve(settings.reference):null;
  const axis=reference?(settings.kind==='mirror'?reference.normal:reference.direction):['x','y','z'].map(key=>key===settings.axis?1:0);
  check(axis,'InvalidGeometry','Choose a plane for mirroring or a straight axis for a pattern.');
  const origin=reference?.origin??[0,0,0],copies=[],tools=[];let shape=base.shape;
  for(let i=1;i<settings.count;i++)for(const source of sources)for(const chunk of source.tools??[{shape:source.toolShape,operation:source.feature.data.operation}]){
   const clone=chunk.shape.clone(),tool=retain(settings.kind==='mirror'?clone.mirror(axis,origin.map((n,k)=>n+axis[k]*settings.offsetMm)):
    settings.kind==='linear'?clone.translate(axis.map(n=>n*settings.offsetMm*i)):clone.rotate(settings.angleDeg*i,origin,axis));
   copies.push(tool);const previous=cad.measureVolume(shape);
   const operation=chunk.operation==='new-body'?feature.data.operation:chunk.operation;tools.push({shape:tool,operation});
   shape=combine(shape,tool,operation);
   check(Math.abs(cad.measureVolume(shape)-previous)>EPS,'InvalidGeometry','Every pattern instance must change material.');
  }
  const toolShape=copies.length===1?copies[0]:retain(cad.makeCompound(copies)),caps={top:{state:'LostReference',candidates:0},bottom:{state:'LostReference',candidates:0}};
  const result={shape,toolShape,tools,feature,profile:sources[0].profile,frame:sources[0].frame,caps,volumeMm3:cad.measureVolume(shape),areaMm2:cad.measureArea(shape)};
  memo.set(feature.id,result);return result;
 }
 const sketch=graph.features.find(f=>f.id===feature.data.sketchId),profile=closedProfile(sketch.data),frame=planeFrame(sketch,graph),base=feature.data.baseFeatureId?build(graph.features.find(f=>f.id===feature.data.baseFeatureId)):null,span=operationSpan(feature.data,graph,frame,base,resolve,profile,(side,body,plane)=>contactFor(feature,profile,frame,base,side,body,plane)),plane=new cad.Plane(world(frame,[0,0],feature.data.form==='revolve'?0:span.start*(feature.data.reverse?-1:1)),frame.u,frame.normal);let profileDrawing=drawing(profile.outer);for(const hole of profile.holes)profileDrawing=profileDrawing.cut(drawing(hole));let shape,revolve=feature.data.form==='revolve',expectedRevolve;
 try{
  const work=profileDrawing.sketchOnPlane(plane);
  if(revolve){
   const source=feature.data.axisReference?resolve(feature.data.axisReference):null,axis=sketch.data.entities.find(e=>e.id===feature.data.axisId);
   check(!source||source.kind==='line','InvalidGeometry','A revolution axis must be straight.');
   const origin=source?.origin??world(frame,axis.a),direction=unit(source?.direction??sub(world(frame,axis.b),origin));
   check(Math.abs(dot(direction,frame.normal))<1e-7&&Math.abs(dot(sub(origin,frame.origin),frame.normal))<1e-6,'InvalidGeometry','The revolution axis must lie in the sketch plane.');
   const local=p=>[dot(sub(p,frame.origin),frame.u),dot(sub(p,frame.origin),frame.v)],axisA=local(origin),axisB=local(origin.map((n,i)=>n+direction[i])),delta=sub(axisB,axisA),length=Math.hypot(...delta),radial=[-delta[1]/length,delta[0]/length];
   const distance=point=>dot(sub(point,axisA),radial);
   const bounds=[profile.outer,...profile.holes].flatMap(loop=>loop.kind==='circle'?[distance(loop.center)-loop.radius,distance(loop.center)+loop.radius]:loop.kind==='curved'?loop.edges.flatMap(e=>e.type==='arc'?Array.from({length:65},(_,i)=>distance(arcPoint(e,i/64))):[distance(e.a),distance(e.b)]):loop.points.map(distance));
   check(Math.min(...bounds)>=-EPS||Math.max(...bounds)<=EPS,'InvalidGeometry','A revolve profile cannot cross its axis.');
   expectedRevolve=profile.area*Math.abs(distance(profile.centroid))*(span.end-span.start)*Math.PI/180;
   shape=work.revolve(direction.map(n=>n*(feature.data.reverse?-1:1)),{origin,angle:span.end-span.start});
   if(span.start)shape=shape.rotate(span.start*(feature.data.reverse?-1:1),origin,direction);
  }else shape=work.extrude((span.end-span.start)*(feature.data.reverse?-1:1));
 }finally{plane.delete();}retained.push(shape);const expectedVolume=revolve?expectedRevolve:profile.area*(span.end-span.start),expectedArea=revolve?cad.measureArea(shape):2*profile.area+profile.perimeter*(span.end-span.start),near=(a,b)=>Math.abs(a-b)<=Math.max(1e-5,Math.abs(b)*1e-8);check(near(cad.measureVolume(shape),expectedVolume)&&near(cad.measureArea(shape),expectedArea),'InvalidGeometry','OCCT extrusion differs from independent profile area/perimeter oracles.');const physical=cad.measureShapeVolumeProperties(shape);try{const expectedCenter=world(frame,profile.centroid,(span.start+span.end)*(feature.data.reverse?-1:1)/2);check(revolve||physical.centerOfMass.every((x,i)=>Math.abs(x-expectedCenter[i])<1e-6),'InvalidGeometry','Exact volume centroid differs from the independent profile oracle.');}finally{physical.delete();}if(span.clips.length)shape=trimTool(shape,span,frame,feature.data.reverse,retain);const toolShape=shape;let caps=Object.fromEntries(['top','bottom'].map(role=>{if(revolve||span.clips.length||feature.data.limits&&Object.values(feature.data.limits).some(l=>!['value','symmetric'].includes(l.mode)))return [role,{state:'LostReference',candidates:0}];const matches=capMatches(shape,capFrame(feature,graph,role));check(matches.length===1,'AmbiguousReference','The initial extrusion cap is not unique.');return [role,{state:'ResolvedStable',candidates:1,element:matches[0]}];}));if(base){
 const previous=shape,volume=cad.measureVolume(base.shape),toolVolume=cad.measureVolume(toolShape);
 shape=combine(base.shape,toolShape,feature.data.operation,caps,!!feature.data.refined);
 const output=cad.measureVolume(shape);
 check(output>EPS&&output<=volume+toolVolume+1e-5,'InvalidGeometry','Boolean output exceeds material bounds.');
 if(feature.data.operation==='cut')check(output<volume-EPS,'InvalidGeometry','Subtract must remove material.');
 if(feature.data.operation==='intersect')check(output<=Math.min(volume,toolVolume)+1e-5,'InvalidGeometry','Intersection exceeds its inputs.');

}

 validateSolid(shape);const result={shape,toolShape,tools:[{shape:toolShape,operation:feature.data.operation}],feature,profile,frame,caps,volumeMm3:cad.measureVolume(shape),areaMm2:cad.measureArea(shape),expectedVolumeMm3:expectedVolume,expectedAreaMm2:expectedArea};memo.set(feature.id,result);return result;};
 const features=graph.features.filter(f=>f.type===EXTRUSION_TYPE);check(features.length>0,'LostReference','No extrusion exists.');for(const f of features)build(f);for(const f of graph.features.filter(f=>f.type===REFERENCE_TYPE))for(const entry of f.data.references){const actual=resolve(entry);if(entry.geometry)check(sameReferenceGeometry(entry.geometry,actual),'LostReference','The reference source geometry changed. Repair its explicit reference.');}const tip=featureId?features.find(f=>f.id===featureId):features.find(f=>!features.some(other=>other.data.baseFeatureId===f.id));check(tip,'LostReference','Extrusion output missing.');const result=memo.get(tip.id),{shape}=result,faces=shape.faces,caps=result.caps,bodies=shape.solids.length>1?exactBodies(shape):[];const faceData=faces.map((face,i)=>{const physical=cad.measureShapeSurfaceProperties(face);let centerOfAreaMm;try{centerOfAreaMm=physical.centerOfMass;}finally{physical.delete();}const role=['top','bottom'].find(r=>caps[r].element?.isSame(face)),areaMm2=cad.measureArea(face),support=!role?planarSupport(face,centerOfAreaMm,areaMm2):null;return {...(bodies.length?{bodyRole:bodies.find(b=>b.solid.faces.some(f=>f.isSame(face)))?.role}:{}),kind:'face',role:role??support?.role??'transient-face-'+i,resolution:role?caps[role].state:support?'ResolvedStable':'TransientDisplayOnly',areaMm2,centerOfAreaMm,planeNormal:face.geomType==='PLANE'?face.normalAt().toTuple():null,...(role?{planeFrame:capFrame(tip,graph,role)}:{}),...(support?{planeFrame:support.frame,supportPolicy:'Exact geometric witness; changed faces require explicit repair'}:{})};});
 const physical=cad.measureShapeVolumeProperties(shape);let centerOfMassMm;try{centerOfMassMm=physical.centerOfMass;}finally{physical.delete();}let mesh=null;if(includeMesh){const raw=shape.mesh({tolerance:.05,angularTolerance:.2}),groups=raw.faceGroups.map(g=>{const i=faces.findIndex(f=>f.hashCode===g.faceId);check(i>=0,'LostReference','Mesh has no exact source face.');return {start:g.start,count:g.count,role:faceData[i].role,...(faceData[i].bodyRole?{bodyRole:faceData[i].bodyRole}:{})};}),references=exactReferenceGeometry(shape);for(let i=0;i<faceData.length;i++)faceData[i].edgeRoles=references.faceEdgeRoles[faces[i].hashCode];mesh={vertices:raw.vertices,normals:raw.normals,triangles:raw.triangles,groups,faces:faceData,...references,volumeMm3:result.volumeMm3,areaMm2:result.areaMm2,...(bodies.length?{bodies:bodies.map(({solid,...body})=>({...body,edgeRoles:[...new Set(faceData.filter(f=>f.bodyRole===body.role).flatMap(f=>f.edgeRoles))]}))}:{})};}
 return {...(includeToolMesh?{toolMesh:displayMesh(result.toolShape)}:{}),featureId:tip.id,capReferences:Object.fromEntries(Object.entries(caps).map(([role,cap])=>[role,{state:cap.state,candidates:cap.candidates}])),centerOfMassMm,kernel:KERNEL,toleranceMm3:Math.max(1e-5,result.volumeMm3*1e-8),spec:{selectorRole:'top',selectorKind:'face'},volumeMm3:result.volumeMm3,areaMm2:result.areaMm2,bounds:shape.boundingBox.bounds,validity:{brepValid:true,solids:shape.solids.length,null:false},faces:faceData,mesh,reference:{state:caps.top.state},featureEvidence:features.map(f=>{const r=memo.get(f.id);return {id:f.id,profile:f.data.profile,volumeMm3:r.volumeMm3,areaMm2:r.areaMm2};}),...(inspectShape?{analysis:await inspectShape(shape,result)}:{})};
 }finally{for(const shape of [...new Set(retained)].reverse())try{shape.delete();}catch{}}}

export async function verifyExtrusionReference(value,selector){check(selector.kind==='face'&&(['top','bottom'].includes(selector.role)||/^planar:[a-f0-9]{64}$/.test(selector.role)),'UnsupportedCapability','Choose a proven planar B-Rep face.');const result=await regenerateExtrusions(value,{featureId:selector.producerId});if(['top','bottom'].includes(selector.role))return result.capReferences[selector.role];const matches=result.faces.filter(f=>f.role===selector.role&&f.planeNormal);return {state:matches.length===1?'ResolvedStable':matches.length?'AmbiguousReference':'LostReference',candidates:matches.length,...(matches.length===1?{frame:matches[0].planeFrame}:{}),reason:'Exact producer-owned planar geometry witness; no nearest-face retargeting.'};}

function displayMesh(shape){const raw=shape.mesh({tolerance:.05,angularTolerance:.2});return {vertices:raw.vertices,normals:raw.normals,triangles:raw.triangles,groups:raw.faceGroups.map((g,i)=>({start:g.start,count:g.count,role:"preview-"+i})),edges:exactReferenceGeometry(shape).edges};}

export function sameReferenceGeometry(a,b){
 return a.kind===b.kind&&['origin','normal','direction','u','v'].every(key=>!a[key]&&!b[key]||a[key]?.length===3&&b[key]?.length===3&&a[key].every((n,i)=>Math.abs(n-b[key][i])<1e-6));
}
function referenceOnShape(result,target,graph){
 const {shape,caps,feature}=result;
 if(target.kind==='body'||target.kind==='feature'){const bodies=exactBodies(shape).filter(b=>b.role===target.role);check(target.role==='solid'||target.kind==='feature'||bodies.length===1,'LostReference','The selected body is missing or ambiguous.');return {kind:'body',shape:target.role==='solid'||target.kind==='feature'?shape:bodies[0].solid};}
 if(target.kind==='face'){
  let face=caps[target.role]?.element;
  if(!face)face=shape.faces.find(face=>{if(face.geomType!=='PLANE')return false;const physical=cad.measureShapeSurfaceProperties(face);try{return planarSupport(face,physical.centerOfMass,cad.measureArea(face))?.role===target.role;}finally{physical.delete();}});
  check(face?.geomType==='PLANE','LostReference','The selected planar face no longer resolves.');
  const physical=cad.measureShapeSurfaceProperties(face);let origin;try{origin=physical.centerOfMass;}finally{physical.delete();}const normal=face.normalAt().toTuple();
  const right=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],u=unit(right.map((n,i)=>n-normal[i]*dot(right,normal)));
  return {kind:'plane',origin,normal,u,v:cross(normal,u)};
 }
 const geometry=exactReferenceGeometry(shape),item=target.kind==='vertex'?geometry.exactVertices.find(v=>v.role===target.role):geometry.edges.find(e=>e.role===target.role);
 check(item?.resolution==='ResolvedStable'&&!item.displayHidden,'LostReference','The exact reference edge or vertex no longer resolves.');
 if(item.kind==='vertex')return {kind:'point',origin:item.pointMm};
 check(item.points.length===2&&!item.curve,'InvalidGeometry','Select a straight edge for an axis.');return {kind:'line',origin:item.points[0],direction:unit(sub(item.points[1],item.points[0]))};
}
