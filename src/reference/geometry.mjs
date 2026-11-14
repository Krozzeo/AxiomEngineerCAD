import {check} from '../errors.mjs';

export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const scale=(a,n)=>a.map(x=>x*n);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function unit(v){const n=Math.hypot(...v);check(n>1e-9,'InvalidGeometry','Reference directions must be nonzero and independent.');return scale(v,1/n);}
export function frame(origin,normal,right=null){
 normal=unit(normal);right=right??(Math.abs(normal[0])<.9?[1,0,0]:[0,1,0]);
 const u=unit(sub(right,scale(normal,dot(right,normal))));return {origin:[...origin],u,v:cross(normal,u),normal};
}
export function rotate(v,axis,angle){axis=unit(axis);return add(add(scale(v,Math.cos(angle)),scale(cross(axis,v),Math.sin(angle))),scale(axis,dot(axis,v)*(1-Math.cos(angle))));}
export function datumGeometry(role){
 if(role==='origin')return {kind:'point',origin:[0,0,0]};
 if(['x','y','z'].includes(role))return {kind:'line',origin:[0,0,0],direction:['x','y','z'].map(k=>k===role?1:0)};
 const normal={xy:[0,0,1],xz:[0,-1,0],yz:[1,0,0]}[role];
 check(normal,'LostReference','Unknown datum.');return {kind:'plane',...frame([0,0,0],normal,role==='yz'?[0,1,0]:[1,0,0])};
}
const parallel=(a,b)=>Math.abs(dot(unit(a),unit(b)))>1-1e-8;
const near=n=>Math.abs(n)<1e-6;
const curved=g=>['circle','cylinder','cone','sphere','surface'].includes(g?.kind);
const midpoint=g=>g.a&&g.b?scale(add(g.a,g.b),.5):g.origin;
const tangentNormal=g=>g.kind==='circle'?unit(sub(g.point??g.a,g.origin)):unit(g.normal);
export function referenceRelations(kind,entries,index){
 const g=entries[index]?.geometry;if(!g)return [];
 if(kind==='coordinate')return g.kind==='point'?['coincident',...(entries.filter(e=>e.geometry?.kind==='point').length>1?['midpoint']:[])]:g.kind==='line'?['coincident','midpoint',...(g.a&&g.b?['endpoint-a','endpoint-b']:[]), 'parallel']:curved(g)?[...(g.kind!=='surface'?['center']:[]),'tangent']:['coincident','parallel'];
 if(kind==='axis')return curved(g)?[...(g.kind!=='surface'?['center']:[]),'tangent']:g.kind==='point'?['coincident']:['coincident','parallel','perpendicular'];
 if(curved(g))return [...(g.kind!=='surface'?['center']:[]),'tangent'];
 if(g.kind==='point')return ['coincident'];
 if(g.kind==='plane')return ['coincident','parallel','perpendicular','offset','angle',...(entries.filter(e=>e.geometry?.kind==='plane').length===2&&parallel(...entries.filter(e=>e.geometry?.kind==='plane').map(e=>e.geometry.normal))?['midplane']:[])];
 return ['coincident','parallel','perpendicular'];
}
export function inferReferenceRelations(kind,entries,{manualIndex=null,relation=null}={}){
 const next=entries.map(e=>({...e}));const planes=next.filter(e=>e.geometry?.kind==='plane'),points=next.filter(e=>e.geometry?.kind==='point');
 if(manualIndex!==null){const e=next[manualIndex];if(e)e.relation=relation;
  if(kind==='plane'&&planes.length===2){if(relation==='midplane'){for(const p of planes)p.relation='midplane';}else if(planes.some(p=>p.relation==='midplane')){for(const p of planes)if(p!==e)p.relation=relation==='coincident'?'parallel':'coincident';}}
  if(kind==='coordinate'&&points.length>1){if(relation==='midpoint')for(const p of points)p.relation='midpoint';else for(const p of points)if(p!==e&&p.relation==='midpoint')p.relation='coincident';}
 }else if(kind==='plane'&&planes.length===2&&planes.some(e=>e.relation==='midplane')){for(const p of planes)p.relation='midplane';}
 else if(kind==='coordinate'&&points.length>1&&points.some(e=>e.relation==='midpoint')){for(const p of points)p.relation='midpoint';}
 else if(kind==='plane'&&planes.length===2&&planes.every(e=>e.relation==='coincident')&&parallel(planes[0].geometry.normal,planes[1].geometry.normal)&&!near(dot(sub(planes[0].geometry.origin,planes[1].geometry.origin),planes[0].geometry.normal))){for(const p of planes)p.relation='midplane';}
 if(manualIndex===null&&kind==='plane'&&planes.length===2&&planes.every(e=>e.relation==='coincident')&&!parallel(planes[0].geometry.normal,planes[1].geometry.normal)){const cosine=Math.abs(dot(unit(planes[0].geometry.normal),unit(planes[1].geometry.normal)));planes[1].relation=cosine<1e-8?'perpendicular':'angle';planes[1].value=Math.acos(Math.min(1,cosine))*180/Math.PI;}
 for(let i=0;i<next.length;i++){const valid=referenceRelations(kind,next,i);if(!valid.includes(next[i].relation))next[i].relation=valid.includes('center')?'center':valid[0]??'coincident';}
 return next;
}
export function orientCoordinate(result,orientation={}){
 const {primaryAxis='x',reverse=false,quarterTurns=0}=orientation;
 let basis=primaryAxis==='y'?[result.normal,result.u,result.v]:primaryAxis==='z'?[result.v,result.normal,result.u]:[result.u,result.v,result.normal];const index={x:0,y:1,z:2}[primaryAxis];
 if(reverse){basis[index]=scale(basis[index],-1);basis[(index+1)%3]=scale(basis[(index+1)%3],-1);}
 if(quarterTurns)basis=basis.map(v=>rotate(v,basis[index],quarterTurns*Math.PI/2));
 return {origin:result.origin,u:basis[0],v:basis[1],normal:basis[2]};
}
export function constructReference(kind,entries,orientation={}){
 check(entries.length>0&&entries.length<=3&&entries.every(e=>e.geometry),'InvalidInput','Select one to three resolved references.');
 const planes=entries.filter(e=>e.geometry.kind==='plane'),lines=entries.filter(e=>e.geometry.kind==='line'),points=entries.filter(e=>e.geometry.kind==='point'),curves=entries.filter(e=>curved(e.geometry));
 if(kind==='coordinate'){
  const anchor=e=>e.geometry.kind==='line'?(e.relation==='endpoint-b'?e.geometry.b:e.relation==='midpoint'?midpoint(e.geometry):e.geometry.a??e.geometry.origin):e.relation==='tangent'?(e.geometry.point??e.geometry.a??e.geometry.origin):e.geometry.origin;
  const origin=points.length>1&&points.some(e=>e.relation==='midpoint')?scale(points.map(anchor).reduce(add),1/points.length):anchor(entries[0]);
  const first=entries[0].geometry,circle=curves[0],tangent=circle?.relation==='tangent',g=circle?.geometry;
  const x=unit(lines[0]?.geometry.direction??(points[1]?sub(anchor(points[1]),anchor(points[0])):g?(tangent?(g.kind==='circle'?cross(g.normal,sub(anchor(circle),g.origin)):g.kind==='cone'?sub(anchor(circle),g.origin):g.direction??g.u):g.direction??g.normal):planes[0]?.geometry.u)??[1,0,0]);
  let right=lines[1]?.geometry.direction??(points[2]?sub(anchor(points[2]),anchor(points[0])):planes[0]?.geometry.v)??(g?(tangent?cross(g.normal,x):g.kind==='circle'&&g.a?sub(g.a,g.origin):g.normal?sub(g.normal,scale(x,dot(g.normal,x))):g.u):null)??(Math.abs(x[1])<.9?[0,1,0]:[0,0,1]);
  if(Math.hypot(...sub(right,scale(x,dot(x,right))))<1e-8&&(g||points.some(e=>e.relation==='midpoint')))right=g?.u??(Math.abs(x[1])<.9?[0,1,0]:[0,0,1]);
  if(lines[1])check(Math.abs(dot(x,unit(lines[1].geometry.direction)))<1e-7,'ConstraintConflict','Coordinate directions must be perpendicular.');if(lines[0]&&planes[0]?.relation==='parallel')check(Math.abs(dot(x,planes[0].geometry.normal))<1e-7,'ConstraintConflict','The coordinate direction must lie parallel to the selected plane.');
  right=unit(sub(right,scale(x,dot(right,x))));return orientCoordinate({origin,u:x,v:right,normal:cross(x,right)},orientation);
 }
 if(kind==='axis'){
  let origin=points[0]?.geometry.origin??entries[0].geometry.origin,direction;
  if(curves.length){const e=curves[0],g=e.geometry;origin=e.relation==='tangent'?(g.point??g.a??g.origin):g.origin;direction=e.relation==='tangent'?(g.kind==='circle'?cross(g.normal,sub(origin,g.origin)):g.kind==='cone'?sub(origin,g.origin):g.kind==='cone'?sub(anchor(circle),g.origin):g.direction??g.u):g.direction??g.normal;}
  else if(points.length===2)direction=sub(points[1].geometry.origin,origin);
  else if(planes.length===2){const [a,b]=planes.map(e=>e.geometry);direction=unit(cross(a.normal,b.normal));const n=dot(a.normal,b.normal),den=1-n*n;check(den>1e-10,'InvalidGeometry','Parallel planes do not define an intersection axis.');origin=add(scale(a.normal,(dot(a.origin,a.normal)-n*dot(b.origin,b.normal))/den),scale(b.normal,(dot(b.origin,b.normal)-n*dot(a.origin,a.normal))/den));}
  else if(lines.length){if(!points.length&&lines[0].relation==='coincident')origin=lines[0].geometry.origin;direction=lines[0].geometry.direction;if(lines[0].relation==='perpendicular')direction=cross(direction,planes[0]?.geometry.normal??(Math.abs(direction[2])<.9?[0,0,1]:[1,0,0]));}
  else if(planes.length)direction=planes[0].relation==='perpendicular'?planes[0].geometry.normal:planes[0].geometry.u;
  else direction=[0,0,1];
  const result=frame(origin,direction);verify(kind,result,entries);return result;
 }
 check(kind==='plane','InvalidInput','Choose a supported reference type.');
 let origin=entries[0].geometry.origin,normal=[0,0,1],right=null;
 const primary=planes[0],line=lines[0]?.geometry;
 if(points.length===3){origin=points[0].geometry.origin;normal=cross(sub(points[1].geometry.origin,origin),sub(points[2].geometry.origin,origin));right=sub(points[1].geometry.origin,origin);}
 else if(primary){const g=primary.geometry;normal=g.normal;right=g.u;
  const angle=planes.find(e=>e.relation==='angle'),perpendicular=planes.some(e=>e.relation==='perpendicular');
  if(angle){const axis=line?.direction??(angle.angleAxis==='v'?g.v:g.u);normal=rotate(normal,axis,(angle.angleAxis==='v'&&line?-1:1)*angle.value*Math.PI/180);right=rotate(right,axis,(angle.angleAxis==='v'&&line?-1:1)*angle.value*Math.PI/180);}
  else if(perpendicular){normal=line?cross(g.normal,line.direction):g.v;if(Math.hypot(...normal)<1e-8)normal=g.u;right=line?.direction??g.u;}
 }else if(curves.length){const g=curves[0].geometry;normal=curves[0].relation==='tangent'?tangentNormal(g):g.kind==='circle'?g.normal:['cylinder','cone'].includes(g.kind)?unit(sub(g.normal,scale(g.direction,dot(g.normal,g.direction)))):g.normal??g.u;}
 else if(line){normal=lines[0].relation==='perpendicular'?line.direction:lines.length===2?cross(line.direction,lines[1].geometry.direction):points.length?cross(line.direction,sub(points[0].geometry.origin,line.origin)):cross(line.direction,Math.abs(line.direction[2])<.9?[0,0,1]:[0,1,0]);if(Math.hypot(...normal)<1e-8&&lines[1])normal=cross(line.direction,sub(lines[1].geometry.origin,line.origin));right=line.direction;}
 else if(points.length===2){right=sub(points[1].geometry.origin,points[0].geometry.origin);normal=cross(right,Math.abs(unit(right)[2])<.9?[0,0,1]:[0,1,0]);}
 normal=unit(normal);if(right&&Math.abs(dot(unit(right),normal))>1-1e-8)right=null;
 // Solve all positional conditions along the chosen normal, rather than keeping
 // the first face's origin when later references define the plane's location.
 const levels=[];
 const middle=planes.length===2&&planes.some(e=>e.relation==='midplane');if(entries.some(e=>e.relation==='midplane'))check(planes.length===2,'InvalidGeometry','Midplane requires two planar references.');
 if(middle){check(parallel(planes[0].geometry.normal,planes[1].geometry.normal),'ConstraintConflict','Midplane requires parallel planes.');levels.push(dot(scale(add(planes[0].geometry.origin,planes[1].geometry.origin),.5),normal));}
 for(const e of entries){const g=e.geometry;
  if(g.kind==='plane'&&!middle&&['coincident','offset'].includes(e.relation))levels.push(dot(g.origin,normal)+(e.relation==='offset'?e.value*dot(normal,g.normal):0));
  if(g.kind==='point'||g.kind==='line'&&e.relation==='coincident')levels.push(dot(g.origin,normal));
  if(curved(g)){if(e.relation==='center')levels.push(dot(g.origin,normal));else if(g.kind==='cylinder'||g.kind==='sphere'||g.kind==='circle')levels.push(dot(g.origin,normal)+g.radius);else levels.push(dot(g.point??g.origin,normal));}
 }
 if(levels.length){check(levels.every(v=>near(v-levels[0])),'ConstraintConflict','References require incompatible plane locations.');origin=add(origin,scale(normal,levels[0]-dot(origin,normal)));}
 const result=frame(origin,normal,right);verify(kind,result,entries);return result;
}
function verify(kind,result,entries){
 const middle=entries.some(e=>e.relation==='midplane');
 for(const e of entries){const g=e.geometry,r=e.relation,delta=sub(result.origin,g.origin);let valid=true;
  if(g.kind==='point')valid=kind==='plane'?near(dot(delta,result.normal)):Math.hypot(...cross(delta,result.normal))<1e-6;
  else if(kind==='plane'&&g.kind==='plane'){
   if(r==='coincident'&&!middle)valid=parallel(result.normal,g.normal)&&near(dot(delta,g.normal));
   if(r==='parallel')valid=parallel(result.normal,g.normal);
   if(r==='perpendicular')valid=near(dot(result.normal,g.normal));
   if(r==='offset')valid=parallel(result.normal,g.normal)&&near(dot(delta,g.normal)-e.value);
   if(r==='angle')valid=near(Math.abs(dot(result.normal,g.normal))-Math.abs(Math.cos(e.value*Math.PI/180)));
  }else if(kind==='plane'&&g.kind==='line'){valid=r==='perpendicular'?parallel(result.normal,g.direction):near(dot(result.normal,g.direction));if(r==='coincident')valid&&=near(dot(delta,result.normal));}
  else if(kind==='axis'&&g.kind==='line'){valid=r==='perpendicular'?near(dot(result.normal,g.direction)):parallel(result.normal,g.direction);if(r==='coincident')valid&&=Math.hypot(...cross(delta,result.normal))<1e-6;}
  else if(kind==='axis'&&g.kind==='plane'){valid=r==='perpendicular'?parallel(result.normal,g.normal):near(dot(result.normal,g.normal));if(r==='coincident')valid&&=near(dot(delta,g.normal));}
  else if(kind==='axis'&&curved(g)){
   if(r==='center'){valid=Math.hypot(...cross(delta,result.normal))<1e-6;if(g.kind!=='sphere')valid&&=parallel(result.normal,g.direction??g.normal);}
   else{const point=g.point??g.a??g.origin;valid=Math.hypot(...cross(sub(result.origin,point),result.normal))<1e-6&&near(dot(result.normal,g.kind==='circle'?unit(sub(point,g.origin)):g.normal));if(g.kind==='circle')valid&&=near(dot(result.normal,g.normal));}
  }
  else if(kind==='plane'&&curved(g)){
   if(['cylinder','cone'].includes(g.kind))valid=r==='center'?near(dot(result.normal,g.direction)):g.kind==='cylinder'?near(dot(result.normal,g.direction))&&near(Math.abs(dot(delta,result.normal))-g.radius):near(dot(sub(g.point,g.origin),result.normal))&&near(dot(sub(result.origin,g.point),result.normal));
   if(g.kind==='circle'&&r==='tangent')valid=near(dot(result.normal,g.normal))&&near(Math.abs(dot(delta,result.normal))-g.radius);
   if(g.kind==='sphere'&&r==='tangent')valid=near(Math.abs(dot(delta,result.normal))-g.radius);
   if(g.kind==='surface')valid=parallel(result.normal,g.normal)&&near(dot(sub(result.origin,g.point),result.normal));
  }
  check(valid,'ConstraintConflict','The selected references do not satisfy the requested '+r+' relation. Adjust the relation or remove an incompatible reference.');
 }
}
