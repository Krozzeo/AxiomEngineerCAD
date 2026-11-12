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
export function constructReference(kind,entries){
 check(entries.length>0&&entries.length<=3,'InvalidInput','Select one to three references.');
 const geometries=entries.map(e=>e.geometry),first=geometries[0],points=geometries.filter(g=>g.kind==='point'),lines=geometries.filter(g=>g.kind==='line'),planes=geometries.filter(g=>g.kind==='plane');
 let origin=[...first.origin],direction=first.direction??first.normal??[0,0,1],right=first.u??[1,0,0];
 if(kind==='plane'){
  if(points.length===3){origin=points[0].origin;direction=cross(sub(points[1].origin,origin),sub(points[2].origin,origin));right=sub(points[1].origin,origin);}
  else if(planes.length){const plane=planes[0];origin=points.at(-1)?.origin??plane.origin;direction=plane.normal;right=plane.u;
   const angle=entries.find(e=>e.relation==='angle');if(angle){const axis=lines[0]?.direction??plane.u;direction=rotate(direction,axis,angle.value*Math.PI/180);right=rotate(right,axis,angle.value*Math.PI/180);}
   else if(entries.some(e=>e.relation==='perpendicular')){const axis=lines[0]?.direction??plane.u;direction=cross(plane.normal,axis);right=axis;}
   if(planes.length===2&&entries.some(e=>e.relation==='midplane')){check(Math.abs(dot(planes[0].normal,planes[1].normal))>1-1e-8,'InvalidGeometry','Midplane requires parallel planes.');origin=scale(add(planes[0].origin,planes[1].origin),.5);}
  }else if(lines.length){const line=lines[0];origin=points.at(-1)?.origin??line.origin;
   if(lines.length===2){direction=cross(line.direction,lines[1].direction);if(Math.hypot(...direction)<1e-8)direction=cross(line.direction,sub(lines[1].origin,line.origin));right=line.direction;}
   else if(points.length&&entries.at(-1).relation!=='perpendicular'){direction=cross(line.direction,sub(origin,line.origin));right=line.direction;}
   else if(entries[0].relation!=='perpendicular'){direction=cross(line.direction,Math.abs(line.direction[2])<.9?[0,0,1]:[0,1,0]);right=line.direction;}
   else direction=line.direction;
  }else if(points.length===2){right=sub(points[1].origin,points[0].origin);direction=cross(right,Math.abs(unit(right)[2])<.9?[0,0,1]:[0,1,0]);}
  const result=frame(origin,direction,right),offset=entries.filter(e=>e.relation==='offset').reduce((s,e)=>s+e.value,0);result.origin=add(result.origin,scale(result.normal,offset));verifyReferenceRelations(kind,result,entries);return result;
 }
 if(kind==='axis'){
  if(points.length===2){origin=points[0].origin;direction=sub(points[1].origin,origin);}
  else if(planes.length===2){const [a,b]=planes;direction=unit(cross(a.normal,b.normal));const n=dot(a.normal,b.normal),den=1-n*n;
   check(den>1e-10,'InvalidGeometry','Parallel planes do not define one intersection axis.');const da=dot(a.origin,a.normal),db=dot(b.origin,b.normal);origin=add(scale(a.normal,(da-n*db)/den),scale(b.normal,(db-n*da)/den));
  }else{origin=points.at(-1)?.origin??origin;direction=lines[0]?.direction??(entries.find(e=>e.geometry===planes[0])?.relation==='coincident'?planes[0]?.u:planes[0]?.normal)??direction;if(lines.length&&entries.find(e=>e.geometry===lines[0])?.relation==='perpendicular')direction=cross(lines[0].direction,planes[0]?.normal??(Math.abs(lines[0].direction[2])<.9?[0,0,1]:[1,0,0]));}
  const result=frame(origin,direction);verifyReferenceRelations(kind,result,entries);return result;
 }
 check(kind==='coordinate','InvalidInput','Choose a plane, axis or coordinate system.');
 origin=points[0]?.origin??first.origin;
 const x=unit(lines[0]?.direction??(points[1]?sub(points[1].origin,origin):planes[0]?.u)??[1,0,0]);
 let y=lines[1]?.direction??(points[2]?sub(points[2].origin,origin):planes[0]?.v)??[0,1,0];y=unit(sub(y,scale(x,dot(x,y))));return {origin,u:x,v:y,normal:cross(x,y)};
}

function verifyReferenceRelations(kind,result,entries){
 const near=n=>Math.abs(n)<1e-6,parallel=(a,b)=>Math.abs(dot(unit(a),unit(b)))>1-1e-8;
 const middle=entries.some(e=>e.relation==='midplane');
 if(middle)check(entries.filter(e=>e.geometry.kind==='plane').length===2,'InvalidGeometry','Midplane requires two parallel planes.');
 for(const entry of entries){
  const geometry=entry.geometry,relation=entry.relation,delta=sub(result.origin,geometry.origin);
  let valid=true;
  if(geometry.kind==='point')valid=kind==='plane'?near(dot(delta,result.normal)):Math.hypot(...cross(delta,result.normal))<1e-6;
  else if(kind==='plane'&&geometry.kind==='plane'){
   if(relation==='coincident'&&!middle)valid=parallel(result.normal,geometry.normal)&&near(dot(delta,geometry.normal));
   if(relation==='parallel')valid=parallel(result.normal,geometry.normal);
   if(relation==='perpendicular')valid=near(dot(result.normal,geometry.normal));
   if(relation==='offset')valid=parallel(result.normal,geometry.normal)&&near(dot(delta,geometry.normal)-entry.value);
   if(relation==='angle')valid=near(dot(result.normal,geometry.normal)-Math.cos(entry.value*Math.PI/180));
  }else if(kind==='plane'&&geometry.kind==='line'){
   valid=relation==='perpendicular'?parallel(result.normal,geometry.direction):near(dot(result.normal,geometry.direction));
   if(relation==='coincident')valid&&=near(dot(delta,result.normal));
  }else if(kind==='axis'){
   const direction=geometry.direction??geometry.normal;
   valid=geometry.kind==='plane'?(relation==='perpendicular'?parallel(result.normal,direction):near(dot(result.normal,direction))):(relation==='perpendicular'?near(dot(result.normal,direction)):parallel(result.normal,direction));
   if(relation==='coincident')valid&&=geometry.kind==='plane'?near(dot(delta,direction)):Math.hypot(...cross(delta,direction))<1e-6;
  }
  check(valid,'ConstraintConflict','The selected references do not satisfy the requested '+relation+' relation. Adjust the relation or remove an incompatible reference.');
 }
}
