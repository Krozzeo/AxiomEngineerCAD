import {rotate,add} from '../assembly/math.mjs';
export function thumbnailSVG(scene){const size=[180,130],rows=[],edges=[],points=[],sqrt=Math.sqrt;const project=p=>[(p[0]-p[1])/sqrt(2),(p[0]+p[1])/sqrt(6)-p[2]*sqrt(2/3),p[0]+p[1]+p[2]];for(const o of scene.occurrences){const m=scene.models.find(m=>m.definitionId===o.definitionId).mesh,world=p=>add(o.position,rotate(o.quaternion,p)),vertices=[];for(let i=0;i<m.vertices.length;i+=3){const p=project(world(m.vertices.slice(i,i+3)));vertices.push(p);points.push(p);}for(let i=0;i<m.triangles.length;i+=3){const triangle=m.triangles.slice(i,i+3).map(index=>vertices[index]);const normal=rotate(o.quaternion,m.normals.slice(m.triangles[i]*3,m.triangles[i]*3+3)),light=.42+.58*Math.abs(normal.reduce((sum,n,k)=>sum+n*[.286,-.477,.859][k],0)),fill='#'+[148,161,186].map(n=>Math.round(n*light).toString(16).padStart(2,'0')).join('');rows.push({triangle,depth:triangle.reduce((sum,p)=>sum+p[2],0)/3,fill});}for(const edge of m.edges.filter(e=>!e.displayHidden))edges.push(edge.points.map(p=>project(world(p))));}if(!points.length)return '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="130"><text x="90" y="65" text-anchor="middle" fill="#8aa4bc" font-size="12">No model yet</text></svg>';const lo=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],hi=[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))],scale=Math.min(160/Math.max(hi[0]-lo[0],1),110/Math.max(hi[1]-lo[1],1)),xy=p=>[(p[0]-(lo[0]+hi[0])/2)*scale+90,(p[1]-(lo[1]+hi[1])/2)*scale+65].map(n=>n.toFixed(2));const visible=visibleEdges(edges,rows.map(r=>r.triangle));rows.sort((a,b)=>a.depth-b.depth);return '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="130" viewBox="0 0 180 130">'+rows.map((r,i)=>'<polygon points="'+r.triangle.map(p=>xy(p).join(',')).join(' ')+'" fill="'+r.fill+'"/>').join('')+visible.map(e=>'<polyline points="'+e.map(p=>xy(p).join(',')).join(' ')+'" fill="none" stroke="#2c4055" stroke-width="0.65"/>').join('')+'</svg>';}

// Clip projected edge intervals against the actual depth of every covering triangle.
// Back edges must not be overlaid after the opaque face painter.
export function visibleEdges(edges,triangles){
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],out=[];
 const prepared=triangles.map(t=>{const u=[t[1][0]-t[0][0],t[1][1]-t[0][1]],v=[t[2][0]-t[0][0],t[2][1]-t[0][1]],den=cross(u,v);if(Math.abs(den)<1e-12)return null;return {t,u,v,den,bounds:[Math.min(...t.map(p=>p[0])),Math.max(...t.map(p=>p[0])),Math.min(...t.map(p=>p[1])),Math.max(...t.map(p=>p[1]))]};}).filter(Boolean);
 for(const edge of edges)for(let i=1;i<edge.length;i++){
  const a=edge[i-1],b=edge[i],at=t=>a.map((x,k)=>x+(b[k]-x)*t);let intervals=[[0,1]];
  for(const f of prepared){const [xmin,xmax,ymin,ymax]=f.bounds;if(Math.max(a[0],b[0])<xmin||Math.min(a[0],b[0])>xmax||Math.max(a[1],b[1])<ymin||Math.min(a[1],b[1])>ymax)continue;
   const bary=p=>{const d=[p[0]-f.t[0][0],p[1]-f.t[0][1]],u=cross(d,f.v)/f.den,v=cross(f.u,d)/f.den;return [1-u-v,u,v];},ba=bary(a),bb=bary(b),depth=(w,p)=>w.reduce((sum,x,k)=>sum+x*f.t[k][2],0)-p[2]-1e-7;
   const constraints=[...ba.map((x,k)=>[x,bb[k]]),[depth(ba,a),depth(bb,b)]];let lo=0,hi=1;
   for(const [x,y]of constraints){const d=y-x;if(Math.abs(d)<1e-14){if(x<0){hi=-1;break;}}else if(d>0)lo=Math.max(lo,-x/d);else hi=Math.min(hi,-x/d);}
   if(hi<=lo)continue;intervals=intervals.flatMap(([l,h])=>hi<=l||lo>=h?[[l,h]]:[...(lo>l?[[l,lo]]:[]),...(hi<h?[[hi,h]]:[])]);if(!intervals.length)break;
  }
  for(const [lo,hi]of intervals)if(hi-lo>1e-7)out.push([at(lo),at(hi)]);
 }return out;
}
