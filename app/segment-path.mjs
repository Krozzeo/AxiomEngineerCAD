export function segmentPath(segments,project){
 let end=null,path='';
 for(const [a,b] of segments){
  const p=project(a),q=project(b);
  if(!end||Math.hypot(p[0]-end[0],p[1]-end[1])>1e-5)path+='M'+p[0]+' '+p[1];
  path+='L'+q[0]+' '+q[1];end=q;
 }
 return path;
}
