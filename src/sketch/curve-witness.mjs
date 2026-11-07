// Samples are supplied only for kernel-proven circular curves, never triangles.
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function circleWitness(points){
 if(points.length<5)return null;const a=points[0],b=points[Math.floor((points.length-1)/3)],c=points[Math.floor(2*(points.length-1)/3)],u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),w=cross(u,v),den=2*dot(w,w);if(den<1e-16)return null;
 const x=cross(v,w),y=cross(w,u),centerMm=a.map((n,i)=>n+(dot(u,u)*x[i]+dot(v,v)*y[i])/den),radiusMm=Math.hypot(...a.map((n,i)=>n-centerMm[i]));
 let normal=w.map(n=>n/Math.hypot(...w));if(normal.find(n=>Math.abs(n)>1e-9)<0)normal=normal.map(n=>-n);
 if(radiusMm<1e-8||points.some(p=>Math.abs(Math.hypot(...p.map((n,i)=>n-centerMm[i]))-radiusMm)>1e-7||Math.abs(dot(p.map((n,i)=>n-centerMm[i]),normal))>1e-7))return null;
 return {type:'circle',centerMm,radiusMm,normal};
}
export function closedCircularBoundary(arcs,curve){
 const near=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]))<1e-7,unused=[...arcs],points=[...unused.shift().points];
 while(unused.length){const last=points.at(-1),i=unused.findIndex(a=>near(a.points[0],last)||near(a.points.at(-1),last));if(i<0)return null;const arc=unused.splice(i,1)[0],ps=near(arc.points[0],last)?arc.points:[...arc.points].reverse();points.push(...ps.slice(1));}
 if(!near(points[0],points.at(-1)))return null;const length=arcs.reduce((s,a)=>s+a.lengthMm,0);if(Math.abs(length-2*Math.PI*curve.radiusMm)>1e-6)return null;
 const u=points[0].map((n,i)=>(n-curve.centerMm[i])/curve.radiusMm),v=cross(curve.normal,u);let winding=0,sign=0;for(let i=1;i<points.length;i++){const a=points[i-1].map((n,j)=>n-curve.centerMm[j]),b=points[i].map((n,j)=>n-curve.centerMm[j]),delta=Math.atan2(dot(b,v),dot(b,u))-Math.atan2(dot(a,v),dot(a,u)),step=Math.atan2(Math.sin(delta),Math.cos(delta));if(Math.abs(step)<1e-10)continue;if(sign&&sign*Math.sign(step)<0)return null;sign=Math.sign(step);winding+=step;}
 return Math.abs(Math.abs(winding)-2*Math.PI)<1e-7?{points,lengthMm:length}:null;
}
