import {check,validate} from '../document.mjs';
import {componentTree} from './hierarchy.mjs';
import {qmul,rotate,inverse,sub,exp} from '../assembly/math.mjs';
const nodes=value=>{const out=[],walk=n=>{out.push(n);n.children.forEach(walk);};walk(componentTree(value));return out;};
export function moveComponents(value,{paths,mode='translate',frame='relative',values,contextPath=null,manual=false,pivot=[0,0,0]}){
 check(['translate','rotate'].includes(mode)&&['absolute','relative'].includes(frame)&&Array.isArray(values)&&values.length===3&&values.every(Number.isFinite),'InvalidInput','Choose a motion mode and three finite values.');
 check(Array.isArray(paths)&&paths.length>0,'InvalidInput','Select at least one component.');
 // Legacy solver bodies have no occurrence identity: never bypass their mates.
 check(!value.assembly?.mates?.length,'ConstraintConflict','This legacy assembly has solver mates. Edit its solved placements before moving components.');
 check(typeof manual==='boolean'&&Array.isArray(pivot)&&pivot.length===3&&pivot.every(Number.isFinite),'InvalidInput','Use a finite motion pivot.');const next=structuredClone(value),all=nodes(value),chosen=paths.map(path=>{const node=all.find(n=>JSON.stringify(n.path)===JSON.stringify(path));check(node?.instanceId&&path.length>1,'LostReference','Select a component occurrence.');check(node.instanceOwnerDocumentId===value.documentId,'InvalidInput','Move the containing project-file instance instead of an internal source occurrence.');check(all.filter(n=>n.instanceId===node.instanceId&&n.instanceOwnerDocumentId===value.documentId).length===1||contextPath?.length>1&&contextPath.every((id,i)=>node.path[i]===id),'AmbiguousReference','Edit a shared group to move its internal component.');return node;});
 check(new Set(chosen.map(n=>n.instanceId)).size===chosen.length,'InvalidInput','A component was selected more than once.');check(!chosen.some(n=>chosen.some(p=>p!==n&&p.path.length<n.path.length&&p.path.every((id,i)=>n.path[i]===id))),'InvalidInput','Select either a group or its child, not both.');
 for(const n of chosen){const item=next.native.graph.instances.find(i=>i.id===n.instanceId),parent=all.find(p=>JSON.stringify(p.path)===JSON.stringify(n.path.slice(0,-1))),pose=item.transform;
  if(manual){let world={position:[...n.placement.position],quaternion:[...n.placement.quaternion]};if(mode==='translate')world.position=world.position.map((x,i)=>x+values[i]);else{const q=exp(values.map(x=>x*Math.PI/180));world.position=rotate(q,sub(world.position,pivot)).map((x,i)=>x+pivot[i]);world.quaternion=qmul(q,world.quaternion);}pose.position=rotate(inverse(parent.placement.quaternion),sub(world.position,parent.placement.position));pose.quaternion=qmul(inverse(parent.placement.quaternion),world.quaternion);continue;}
  if(mode==='translate')pose.position=frame==='relative'?pose.position.map((x,i)=>x+rotate(pose.quaternion,values)[i]):rotate(inverse(parent.placement.quaternion),sub(values,parent.placement.position));
  else {let q=[0,0,0,1];values.forEach((angle,i)=>{const v=[0,0,0];v[i]=angle*Math.PI/180;q=qmul(exp(v),q);});pose.quaternion=frame==='relative'?qmul(pose.quaternion,q):qmul(inverse(parent.placement.quaternion),q);}
 }
 validate(next);return next;
}
export function reparentComponent(value,{path,parentPath,beforeId=null,contextPath=null}){
 const all=nodes(value),node=all.find(n=>JSON.stringify(n.path)===JSON.stringify(path)),parent=all.find(n=>JSON.stringify(n.path)===JSON.stringify(parentPath));
 check(node?.instanceId&&parent&&node.instanceOwnerDocumentId===value.documentId&&!parent.sourceSnapshot,'LostReference','Move a component between local groups.');check(parent.kind==='assembly'||parent.path.length===1,'InvalidInput','Drop components into a group.');check(!path.every((id,i)=>parentPath[i]===id),'DependencyCycle','A group cannot contain itself.');
 check(all.filter(n=>n.instanceId===node.instanceId&&n.instanceOwnerDocumentId===value.documentId).length===1||contextPath?.length>1&&contextPath.every((id,i)=>node.path[i]===id),'AmbiguousReference','Edit the shared group to reorganize its contents.');
 const next=structuredClone(value),g=next.native.graph,item=g.instances.find(i=>i.id===node.instanceId);item.ownerDefinitionId=parent.definitionId;
 item.transform={position:rotate(inverse(parent.placement.quaternion),sub(node.placement.position,parent.placement.position)),quaternion:qmul(inverse(parent.placement.quaternion),node.placement.quaternion)};
 if(g.spatial){const moved=old=>path.every((id,i)=>old[i]===id)?[...parentPath,item.id,...old.slice(path.length)]:old;g.spatial.grounded=g.spatial.grounded.map(moved);for(const mate of g.spatial.mates)for(const ref of [mate.a,mate.b])ref.occurrencePath=moved(ref.occurrencePath);}
 g.instances=g.instances.filter(i=>i.id!==item.id);const at=beforeId?g.instances.findIndex(i=>i.id===beforeId&&i.ownerDefinitionId===parent.definitionId):-1;check(!beforeId||at>=0,'LostReference','The target sibling changed.');if(at>=0)g.instances.splice(at,0,item);else g.instances.push(item);validate(next);return next;
}

// Organization frames retain the requested placement while solved rigid children
// keep the world poses established by the mate solver (without a double delta).
export function retainMovedGroupFrames(solved,candidate){
 const next=structuredClone(solved),world=nodes(solved),requested=nodes(candidate);
 const groups=requested.filter(n=>n.path.length>1&&n.kind==='assembly'&&!n.sourceSnapshot&&n.instanceOwnerDocumentId===next.documentId);
 for(const group of groups){const source=candidate.native.graph.instances.find(i=>i.id===group.instanceId),target=next.native.graph.instances.find(i=>i.id===group.instanceId);target.transform=structuredClone(source.transform);}
 for(const node of world.filter(n=>n.path.length>1&&(n.kind==='part'||n.sourceSnapshot)&&n.instanceOwnerDocumentId===next.documentId)){
  const parent=requested.find(n=>JSON.stringify(n.path)===JSON.stringify(node.path.slice(0,-1))),item=next.native.graph.instances.find(i=>i.id===node.instanceId);
  item.transform={position:rotate(inverse(parent.placement.quaternion),sub(node.placement.position,parent.placement.position)),quaternion:qmul(inverse(parent.placement.quaternion),node.placement.quaternion)};
 }
 validate(next);return next;
}
