import {project} from './cad-camera.mjs';
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
export function sketchHits({items,frame,support,canvas},event){
 if(!frame)return [];const box=canvas.getBoundingClientRect(),scale=frame.width/box.width,p=[(event.clientX-box.left)*scale,(event.clientY-box.top)*frame.height/box.height],hits=[];
 const screen=q=>project(support.origin.map((n,i)=>n+support.u[i]*q[0]+support.v[i]*q[1]),frame.matrix,frame.width,frame.height);
 for(const e of items){if(e.referenceOnly||e.external&&!e.converted)continue;const points=e.type==='point'?[['point',e.point]]:e.type==='line'?[['a',e.a],['b',e.b],['midpoint',e.a.map((n,i)=>(n+e.b[i])/2)]]:e.type==='circle'?[['center',e.center]]:[];
  for(const [role,q]of points){const s=screen(q),d=Math.hypot(p[0]-s[0],p[1]-s[1]);if(d<=9*scale&&s[2]>=0&&s[2]<=1)hits.push({ref:{kind:'component',entityId:e.id,role},distance:d,priority:0});}
  const ps=e.type==='line'?[e.a,e.b]:e.type==='circle'?Array.from({length:97},(_,i)=>e.center.map((n,k)=>n+e.radius*(k?Math.sin:Math.cos)(i*Math.PI/48))):[];
  const projected=ps.map(screen);let d=Infinity;for(let i=1;i<projected.length;i++)if(projected[i][2]>=0&&projected[i][2]<=1)d=Math.min(d,distance(p,projected[i-1],projected[i]));
  if(d<=7*scale)hits.push({ref:{kind:'component',entityId:e.id,role:'entity'},distance:d,priority:1});
 }
 return hits.sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
}
