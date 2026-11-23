import {check,validate} from '../document.mjs';
import {MATE_PROFILE} from './native-profile.mjs';
import {buildProof} from '../proof/kernel.mjs';
import {sceneSelections} from '../workbench/model.mjs';
import {componentTree} from '../components/hierarchy.mjs';
import {solveAssembly,relations} from './solver.mjs';
import {qmul,rotate,inverse,sub,rank} from './math.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),prefix=(path,parent)=>parent.every((id,i)=>path?.[i]===id);
export async function solveNativeAssembly(value,{targets=null,commit=true}={}){
 validate(value);const spatial=value.native.graph.spatial??{profile:MATE_PROFILE,grounded:[],mates:[]};
 const nodes=[],walk=n=>{nodes.push(n);if(!n.sourceSnapshot)n.children.forEach(walk);};walk(componentTree(value));
 // Local groups organize children; an external assembly is one rigid component.
 for(const path of spatial.grounded)check(nodes.some(n=>same(n.path,path)&&n.path.length>1&&n.instanceOwnerDocumentId===value.documentId),'LostReference','A grounded component no longer exists.');
 const bodies=nodes.filter(n=>n.path.length===1||n.kind==='part'||n.sourceSnapshot).filter(n=>n.path.length===1||n.instanceOwnerDocumentId===value.documentId);
 check(bodies.length<=33,'ResourceLimit','This spatial solver profile supports 32 rigid components and the world frame.');
 const raw=structuredClone(value);delete raw.native.graph.spatial;
 const proof=await buildProof(raw,{viewportOnly:true}),entities=sceneSelections(proof.scene).map(r=>r.item);
 const bodyFor=path=>bodies.filter(b=>prefix(path,b.path)).sort((a,b)=>b.path.length-a.path.length)[0];
 const recipe={profile:MATE_PROFILE,unit:'mm',bodies:bodies.map((node,i)=>({id:'body-'+i,definitionId:'definition-'+i,grounded:i===0||spatial.grounded.some(path=>prefix(node.path,path)),pose:structuredClone(node.placement),datums:[{id:'frame',kind:'frame',origin:[0,0,0],state:'ResolvedStable'}]})),mates:[]};
 function reference(ref,index){const node=bodyFor(ref.occurrencePath);check(node,'LostReference','The mate component no longer exists.');const body=recipe.bodies[bodies.indexOf(node)],hits=entities.filter(e=>e.kind===ref.kind&&e.producerId===ref.producerId&&e.role===ref.role&&same(e.occurrencePath,ref.occurrencePath)&&(e.sourceDocumentId??value.documentId)===ref.sourceDocumentId);check(hits.length===1,hits.length?'AmbiguousReference':'LostReference','The mate reference no longer resolves uniquely. No substitute was selected.');const e=hits[0];check(['ResolvedStable','ResolvedReidentified'].includes(e.resolution??'ResolvedStable'),'LostReference','Repair the mate reference before solving.');
  let kind,origin,direction,world=false;
  if(e.kind==='instance'){check(same(e.occurrencePath,node.path),'UnsupportedCapability','Choose the rigid component frame rather than an internal frame of an external assembly.');kind='frame';origin=[0,0,0];}
  else if(e.kind==='datum'){kind=e.datumType==='axis'?'axis':e.datumType==='plane'?'plane':'point';origin=e.originMm;direction=e.direction??e.normal;world=true;}
  else if(e.kind==='vertex'){kind='point';origin=e.pointMm;}
  else if(e.kind==='face'){const g=e.referenceGeometry;if(e.planeNormal){kind='plane';origin=e.planeFrame?.origin??e.centerOfAreaMm;direction=e.planeNormal;}else if(g?.kind==='cylinder'){kind='axis';origin=g.origin;direction=g.direction;}}
  else if(e.kind==='edge'){const o=proof.scene.occurrences.find(o=>same(o.path,e.occurrencePath)),mesh=proof.scene.models.find(m=>m.definitionId===o?.definitionId)?.mesh,edge=mesh?.edges.find(x=>x.role===e.role);if(edge?.curve){kind='axis';origin=edge.curve.centerMm;direction=edge.curve.normal;}else if(edge?.points.length===2){kind='axis';origin=edge.points[0];const d=sub(edge.points[1],origin),length=Math.hypot(...d);direction=d.map(x=>x/length);}}
  check(kind&&origin,'UnsupportedCapability','Use native points, planar faces, straight/circular edges, cylindrical faces or reference geometry for this mate.');
  const displayed=proof.scene.occurrences.find(o=>same(o.path,e.occurrencePath)),occurrence=displayed?{placement:{position:displayed.position,quaternion:displayed.quaternion}}:nodes.find(n=>same(n.path,e.occurrencePath))??node;if(!world){origin=rotate(occurrence.placement.quaternion,origin).map((x,i)=>x+occurrence.placement.position[i]);if(direction)direction=rotate(occurrence.placement.quaternion,direction);}
  origin=rotate(inverse(node.placement.quaternion),sub(origin,node.placement.position));if(direction)direction=rotate(inverse(node.placement.quaternion),direction);
  const id='reference-'+index;body.datums.push({id,kind,origin,...(direction?{direction}:{}),state:'ResolvedStable'});return {bodyId:body.id,datumId:id};
 }
 spatial.mates.forEach((m,i)=>recipe.mates.push({id:m.id,type:m.type,...(m.relative?{relative:m.relative}:{}),...(m.type==='angle'?{regularized:true}:{}),a:reference(m.a,i+'a'),b:reference(m.b,i+'b'),...(['distance','angle'].includes(m.type)?{value:m.type==='angle'?m.value*Math.PI/180:m.value}:{})}));
 // Temporary motion targets never become persistent mates. Multiple targets are
 // solved together so a group move cannot break a relation between its children.
 const dragTargets=targets?.map(target=>{const node=bodies.find(n=>same(n.path,target.path));check(node,'UnsupportedCapability','Move rigid components or a group containing them.');return {bodyId:recipe.bodies[bodies.indexOf(node)].id,...target.pose};});
 const currentSatisfied=relations(recipe.bodies,recipe.mates).rows.every(row=>Math.abs(row.value)<=(row.unit==='mm'?1e-6:1e-7));
 const result=solveAssembly(recipe,dragTargets?.length?{targets:dragTargets}:{});
 const next=structuredClone(value);if(commit&&result.applicable)for(let i=1;i<bodies.length;i++){const node=bodies[i],parent=nodes.find(n=>same(n.path,node.path.slice(0,-1))),pose=result.poses[i],item=next.native.graph.instances.find(x=>x.id===node.instanceId);item.transform={position:rotate(inverse(parent.placement.quaternion),sub(pose.position,parent.placement.position)),quaternion:qmul(inverse(parent.placement.quaternion),pose.quaternion)};}
 const diagnostics={currentSatisfied,status:result.status,applicable:result.applicable,remainingDOF:result.remainingDOF,rank:result.rank,redundant:result.redundant,conflicts:result.conflicts,evidence:result.evidence,components:bodies.slice(1).map((node,i)=>({path:node.path,name:node.name,grounded:recipe.bodies[i+1].grounded,remainingDOF:result.bodyDOF?.['body-'+(i+1)]??null})),...(result.drag?{drag:result.drag}:{})};
 return {document:next,diagnostics};
}
