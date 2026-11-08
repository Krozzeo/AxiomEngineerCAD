// Projection is proposed in the UI and independently checked against exact source geometry.
const fail=message=>{throw Object.assign(Error(message),{code:'LostReference'});};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function externalGeometry(scene,target,frame){
 if(target.occurrencePath.length!==1||target.occurrencePath[0]!==target.definitionId)fail('External references currently require geometry in the primary part.');
 const project=p=>{const q=p.map((x,i)=>x-frame.origin[i]);return [dot(q,frame.u),dot(q,frame.v)];};
 let item,points,name;
 if(target.kind==='datum'){
  const hits=scene.datums.filter(d=>d.producerId===target.producerId&&d.role===target.role&&d.definitionId===target.definitionId);
  if(hits.length!==1)fail('Reference datum is missing or ambiguous.');item=hits[0];name=item.name;
 }else if(target.kind==='sketch'){
  const sketch=scene.sketches?.find(s=>s.id===target.producerId&&s.definitionId===target.definitionId);
  const entity=sketch?.entities.find(e=>e.id===target.role);
  if(!entity||!['point','line','circle'].includes(entity.type))fail('The source sketch reference is missing or unsupported.');
  name=sketch.name+' · '+entity.type;
  item={...entity,pointMm:entity.points[0],points:entity.type==='line'?entity.segments[0]:entity.segments.flatMap((segment,i)=>i?[segment[1]]:segment)};
 }else{
  const occurrences=scene.occurrences.filter(o=>o.featureId===target.producerId&&o.definitionId===target.definitionId&&JSON.stringify(o.path)===JSON.stringify(target.occurrencePath));
  if(occurrences.length!==1)fail('External producer is missing, suppressed or downstream of this sketch.');
  const mesh=scene.models.find(m=>m.definitionId===target.definitionId)?.mesh;
  if(target.kind==='silhouette'){
   const side=target.role.slice(-2),matches=mesh?.cylinders?.filter(c=>c.role===target.role.slice(0,-2))??[];
   if(matches.length!==1||![':a',':b'].includes(side))fail('The cylindrical silhouette is missing or ambiguous.');
   const cylinder=matches[0];
   if(Math.abs(dot(cylinder.direction,frame.normal))>1e-7)fail('Cylindrical silhouettes require a side-on sketch plane.');
   const radial=cross(cylinder.direction,frame.normal),sign=side===':a'?-1:1;
   const outline=p=>project(p.map((n,i)=>n+radial[i]*cylinder.radius*sign));
   return {type:'line',a:outline(cylinder.a),b:outline(cylinder.b),construction:true,name:'External cylindrical silhouette'};
  }
  const hits=(target.kind==='vertex'?mesh?.exactVertices:target.kind==='edge'?mesh?.edges:target.kind==='face'?mesh?.faces:[])?.filter(e=>e.role===target.role)??[];
  if(hits.length!==1||['TransientDisplayOnly','AmbiguousReference','LostReference'].includes(hits[0].resolution)||target.role.startsWith('transient-'))fail('Choose a uniquely proven exact vertex, edge or planar face.');
  item=hits[0];name=target.kind==='edge'?(item.curve?.type==='circle'?'Circle R'+Number(item.curve.radiusMm.toFixed(3)):'Edge'):target.kind==='vertex'?'Vertex ('+item.pointMm.map(n=>Number(n.toFixed(3))).join(', ')+')':'Planar face';
 }
 if(target.kind==='vertex'||item.datumType==='point'||item.type==='point'&&target.kind==='sketch')return {type:'point',point:project(item.pointMm??item.originMm),construction:true,name:'External '+name};
 if(target.kind==='edge'||target.kind==='sketch'){
  const curve=item.curve;
  if(curve?.full){
   const alignment=Math.abs(dot(curve.normal,frame.normal)),center=project(curve.centerMm);
   if(alignment<1e-7){
    const direction=cross(curve.normal,frame.normal);
    const offset=[dot(direction,frame.u),dot(direction,frame.v)].map(n=>n*curve.radiusMm);
    return {type:'line',a:center.map((n,i)=>n-offset[i]),b:center.map((n,i)=>n+offset[i]),construction:true,name:'External '+name+' profile'};
   }
   if(1-alignment<1e-7)return {type:'circle',center,radius:curve.radiusMm,construction:true,name:'External '+name+' projection'};
  }
  points=item.points;
 }
 else if(item.datumType==='axis'){const a=project(item.originMm),delta=[dot(item.direction,frame.u),dot(item.direction,frame.v)],length=Math.hypot(...delta);if(length<1e-8)return {type:'point',point:a,construction:true,name:'External '+name+' projection'};return {type:'line',a:a.map((x,i)=>x-delta[i]/length*100),b:a.map((x,i)=>x+delta[i]/length*100),construction:true,name:'External '+name+' projection'};}
 else{
  const normal=item.planeNormal??item.normal,origin=item.centerOfAreaMm??item.originMm;
  if(!normal||!origin)fail('Choose a planar face; curved face references require their exact edge.');
  const nu=dot(normal,frame.u),nv=dot(normal,frame.v),size=nu*nu+nv*nv;
  if(size<1e-12)return {type:'point',point:project(origin),construction:true,name:'External '+name+' center projection'};
  const distance=dot(normal,origin.map((x,i)=>x-frame.origin[i])),center=[nu*distance/size,nv*distance/size],direction=[-nv/Math.sqrt(size),nu/Math.sqrt(size)];
  return {type:'line',a:center.map((x,i)=>x-direction[i]*100),b:center.map((x,i)=>x+direction[i]*100),construction:true,name:'External '+name+' trace'};
 }
 if(!points?.length)fail('Exact edge geometry is unavailable.');const ps=points.map(project);
 if(points.length===2){if(Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1])<1e-8)return {type:'point',point:ps[0],construction:true,name:'External '+name+' projection'};return {type:'line',a:ps[0],b:ps[1],construction:true,name:'External '+name+' projection'};}
 const [a,b,c]=[ps[0],ps[Math.floor(ps.length/3)],ps[Math.floor(2*ps.length/3)]],d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));
 if(Math.abs(d)<1e-10)fail('This edge projection is not a supported circle.');const sq=p=>dot(p,p),center=[(sq(a)*(b[1]-c[1])+sq(b)*(c[1]-a[1])+sq(c)*(a[1]-b[1]))/d,(sq(a)*(c[0]-b[0])+sq(b)*(a[0]-c[0])+sq(c)*(b[0]-a[0]))/d],radius=Math.hypot(a[0]-center[0],a[1]-center[1]);
 if(ps.some(p=>Math.abs(Math.hypot(p[0]-center[0],p[1]-center[1])-radius)>1e-6)||Math.hypot(ps[0][0]-ps.at(-1)[0],ps[0][1]-ps.at(-1)[1])>1e-6)fail('Only complete circular projections are supported; choose a vertex or straight edge for other curves.');
 return {type:'circle',center,radius,construction:true,name:'External '+name+' projection'};
}
