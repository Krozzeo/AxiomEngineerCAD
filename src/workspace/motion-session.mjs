import {moveComponents,retainMovedGroupFrames} from '../components/motion.mjs';
import {check,validate} from '../document.mjs';
import {hash} from '../native/schema.mjs';
import {componentTree} from '../components/hierarchy.mjs';
import {projectMotion} from '../assembly/solver.mjs';
import {rotate,inverse,sub,qmul} from '../assembly/math.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export class MotionSession{
 constructor(doc,model){this.doc=doc;this.baseHash=hash(doc.value);this.base=structuredClone(doc.value);this.model=structuredClone(model);this.sequence=0;this.draft=structuredClone(doc.value);}
 current(expectedRevision,sequence){this.doc.expect(expectedRevision);check(hash(this.doc.value)===this.baseHash,'RevisionConflict','The source changed during the motion session.');check(sequence===this.sequence,'RevisionConflict','Motion sequence changed; refresh the current session.');}
 stage(p){const numeric=!p.targets;this.current(p.expectedDocumentRevision,p.sequence);let desired=null;if(!p.targets){desired=moveComponents(this.draft,p);const nodes=[],walk=n=>{nodes.push(n);n.children.forEach(walk);};walk(componentTree(desired));p={...p,targets:this.model.paths.slice(1).map(path=>({path,pose:nodes.find(n=>same(n.path,path)).placement}))};}check(Array.isArray(p.targets)&&p.targets.length<=32,'InvalidInput','Choose bounded motion targets.');const targets=p.targets.map(t=>{const i=this.model.paths.findIndex(path=>same(path,t.path));check(i>=1,'LostReference','Choose an owned rigid occurrence.');return {bodyId:this.model.recipe.bodies[i].id,...t.pose};});const result=projectMotion(this.model.recipe,targets);if(numeric)check(targets.every(t=>{const b=result.solvedRecipe.bodies.find(b=>b.id===t.bodyId);return Math.hypot(...sub(b.pose.position,t.position))<1e-6&&Math.abs(Math.abs(b.pose.quaternion.reduce((sum,x,i)=>sum+x*t.quaternion[i],0))-1)<1e-8;}),'ConstraintConflict','The entered motion conflicts with assembly mates.');check(result.applicable,'ConstraintConflict','No feasible motion was found. The previous poses were preserved.');
  const next=structuredClone(this.draft),nodes=[],walk=n=>{nodes.push(n);n.children.forEach(walk);};walk(componentTree(next));
  for(let i=1;i<this.model.paths.length;i++){const node=nodes.find(n=>same(n.path,this.model.paths[i])),parent=nodes.find(n=>same(n.path,node.path.slice(0,-1))),item=next.native.graph.instances.find(x=>x.id===node.instanceId),pose=result.solvedRecipe.bodies[i].pose;check(item&&node.instanceOwnerDocumentId===next.documentId,'PermissionDenied','Only owned rigid occurrences can move.');item.transform={position:rotate(inverse(parent.placement.quaternion),sub(pose.position,parent.placement.position)),quaternion:qmul(inverse(parent.placement.quaternion),pose.quaternion)};}
  validate(next);this.draft=desired?retainMovedGroupFrames(next,desired):next;this.model={...this.model,recipe:result.solvedRecipe,sourcePoses:result.solvedRecipe.bodies.map(b=>structuredClone(b.pose))};this.sequence++;this.doc.stagedMotion=this;return {sequence:this.sequence,motion:this.model,revision:this.base.revision};
 }
 async commit({expectedDocumentRevision,sequence},verify){this.current(expectedDocumentRevision,sequence);const next=structuredClone(this.draft);if(hash(next)===this.baseHash){this.discard();return this.doc.view();}await verify(next);this.current(expectedDocumentRevision,sequence);this.doc.stagedMotion=null;try{this.doc.native.set(next,expectedDocumentRevision);this.doc.commands.history.record(this.base,this.doc.value);}catch(error){this.doc.stagedMotion=this;throw error;}return this.doc.view();}
 discard(){if(this.doc.stagedMotion===this)this.doc.stagedMotion=null;}
}
