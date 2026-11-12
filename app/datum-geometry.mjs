export function datumSegments(datum,extent){
 const origin=datum.originMm,world=v=>origin.map((n,i)=>n+v[i]);
 if(datum.datumType==='point')return [];
 if(datum.datumType==='axis')return [[world(datum.direction.map(n=>-n*extent)),world(datum.direction.map(n=>n*extent))]];
 const n=datum.normal,right=datum.u??(Math.abs(n[0])<.9?[1,0,0]:[0,1,0]),dot=right.reduce((sum,x,i)=>sum+x*n[i],0);
 const raw=right.map((x,i)=>x-dot*n[i]),length=Math.hypot(...raw),u=raw.map(x=>x/length),v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
 const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>world(u.map((x,i)=>(x*a+v[i]*b)*extent)));
 return points.map((p,i)=>[p,points[(i+1)%4]]);
}
