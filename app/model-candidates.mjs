import {world,project,screenRay,rayTriangle} from './cad-camera.mjs';

const coordinates=p=>p.map(n=>Number(n.toFixed(3))).join(', ');
const segmentDistance=(p,a,b)=>{const d=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2||1)));return Math.hypot(p[0]-a[0]-t*d[0],p[1]-a[1]-t*d[1]);};
// Candidates come from the exact scene's semantic IDs. A chosen entry is still
// resolved by proof/pick; this table is not a substitute for native authority.
export function modelCandidates(renderer,x,y,{all=false,specialOnly=false}={}){
 const frame=renderer.presentedFrame,scene=renderer.scene;if(!frame||frame.scene!==scene)return [];
 const scale=frame.width/Math.max(1,renderer.canvas.getBoundingClientRect().width),radius=9*scale,p=[x,y],result=[],filter=renderer.filter;
 const point=q=>project(q,frame.matrix,frame.width,frame.height),allowed=kind=>all||filter==='auto'||filter===kind;
 const add=(selectionId,kind,role,distance,depth=0,extra={})=>{if(selectionId&&Number.isFinite(distance))result.push({selectionId,kind,role,distance,depth,priority:role==='origin'?0:extra.componentRole==='center'?1:({vertex:1,edge:2,datum:3,face:4,body:5,feature:6,instance:7}[kind]??8),...extra});};
 for(const d of scene.datums??[]){if(window.engineerVisibility?.(d.id)==='delete')continue;const q=point(d.originMm);if(d.role==='origin'&&Math.hypot(x-q[0],y-q[1])<=12*scale&&q[2]>=0&&q[2]<=1)add(d.selectionId,'datum','origin',Math.hypot(x-q[0],y-q[1]),q[2]);}
 const ray=screenRay(frame.camera,x/frame.width,y/frame.height,frame.width/frame.height,frame.projection);
 let frontDepth=null;
 const visibleCenter=center=>{if(all)return true;if(frontDepth===null){frontDepth=Infinity;for(const o of scene.occurrences){const mesh=scene.models.find(m=>m.definitionId===o.definitionId)?.mesh;if(!mesh)continue;for(let i=0;i<mesh.triangles.length;i+=3){const triangle=mesh.triangles.slice(i,i+3).map(j=>world(mesh.vertices.slice(j*3,j*3+3),o)),t=rayTriangle(ray,...triangle);if(t!==null)frontDepth=Math.min(frontDepth,t);}}}const depth=center.reduce((sum,n,i)=>sum+(n-ray.origin[i])*ray.direction[i],0);return frontDepth>=depth-1e-5;};

 for(const o of scene.occurrences){const mesh=scene.models.find(m=>m.definitionId===o.definitionId)?.mesh;if(!mesh)continue;
  if(!specialOnly&&allowed('vertex'))for(const v of mesh.exactVertices??[]){const q=point(world(v.pointMm,o)),d=Math.hypot(x-q[0],y-q[1]);if(d<=radius&&q[2]>=0&&q[2]<=1)add(o.vertexSelectionIds[v.role],'vertex',v.role,d,q[2],{label:'Vertex ('+coordinates(world(v.pointMm,o))+')'});}
  for(const edge of mesh.edges){if(!allowed('edge')&&!allowed('vertex'))continue;const ps=specialOnly?[]:edge.points.map(q=>point(world(q,o))),distance=specialOnly?Infinity:Math.min(...ps.slice(1).map((q,i)=>segmentDistance(p,ps[i],q)));
   if(allowed('edge')&&distance<=radius)add(o.edgeSelectionIds[edge.role],'edge',edge.role,distance,Math.min(...ps.map(q=>q[2])),{label:edge.curve?'Circle R'+Number(edge.curve.radiusMm.toFixed(3))+' ('+coordinates(world(edge.curve.centerMm,o))+')':'Edge ('+coordinates(world(edge.points[0],o))+') - ('+coordinates(world(edge.points.at(-1),o))+')'});
   if(edge.curve?.type==='circle'&&edge.curve.full!==false&&edge.resolution!=='TransientDisplayOnly'){const q=point(world(edge.curve.centerMm,o)),d=Math.hypot(x-q[0],y-q[1]);if(d<=radius&&q[2]>=0&&q[2]<=1&&visibleCenter(world(edge.curve.centerMm,o)))add(o.edgeSelectionIds[edge.role],'edge',edge.role,d,q[2],{componentRole:'center',label:'Circle center ('+coordinates(world(edge.curve.centerMm,o))+')'});}
  }
  if(!specialOnly&&(all||allowed('face')||['body','feature','instance'].includes(filter)))for(const group of mesh.groups){let depth=Infinity;for(let i=group.start;i<group.start+group.count;i+=3){const triangle=mesh.triangles.slice(i,i+3).map(j=>world(mesh.vertices.slice(j*3,j*3+3),o)),t=rayTriangle(ray,...triangle);if(t!==null)depth=Math.min(depth,t);}if(!Number.isFinite(depth))continue;
   if(allowed('face'))add(o.faceSelectionIds[group.role],'face',group.role,0,depth,{label:(['top','bottom'].includes(group.role)?group.role[0].toUpperCase()+group.role.slice(1)+' face':'Face')+' ('+coordinates(world(mesh.faces.find(f=>f.role===group.role)?.centerOfAreaMm??[0,0,0],o))+')'});
   for(const [kind,id]of [['body',o.bodySelectionId],['feature',o.featureSelectionId],['instance',o.instanceSelectionId]])if(allowed(kind))add(id,kind,kind,0,depth);
  }
 }
 const references=renderer.referenceCandidates?.(x,y,{all})??[renderer.referencePick?.(x,y)].filter(Boolean);for(const reference of references){if(result.some(c=>c.selectionId===reference.selectionId))continue;const d=scene.datums.find(d=>d.selectionId===reference.selectionId),sketch=scene.sketches?.find(s=>s.selectionId===reference.selectionId);add(reference.selectionId,renderer.kind(reference.selectionId),d?.role??'reference',reference.distance??0,0,{label:d?.name??sketch?.name??'Reference'});}

 const unique=new Map();for(const c of result){const key=c.selectionId+':'+(c.componentRole??'entity');if(!unique.has(key)||unique.get(key).depth>c.depth)unique.set(key,c);}
 return [...unique.values()].sort((a,b)=>a.priority-b.priority||a.distance-b.distance||a.depth-b.depth);
}
