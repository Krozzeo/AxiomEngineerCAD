// Original MIT numerical probe. World-frame tangent increments, never Euler angles.
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const mul=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const norm=a=>Math.hypot(...a);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>mul(a,1/norm(a));
export function qmul(a,b){return [...add(add(mul(a.slice(0,3),b[3]),mul(b.slice(0,3),a[3])),cross(a,b)),a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];}
export const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
export function rotate(q,v){return add(v,mul(cross(q.slice(0,3),add(cross(q.slice(0,3),v),mul(v,q[3]))),2));}
export function exp(v){const angle=norm(v);return angle<1e-12?[...mul(v,.5),1]:[...mul(v,Math.sin(angle/2)/angle),Math.cos(angle/2)];}
export function log(q){const p=q[3]<0?mul(q,-1):q,s=norm(p.slice(0,3));return s<1e-12?mul(p.slice(0,3),2):mul(p.slice(0,3),2*Math.atan2(s,p[3])/s);}
export function increment(bodies,variables,delta){const out=structuredClone(bodies);variables.forEach((index,k)=>{const b=out[index];b.pose.position=add(b.pose.position,delta.slice(k*6,k*6+3));b.pose.quaternion=unit(qmul(exp(delta.slice(k*6+3,k*6+6)),b.pose.quaternion));});return out;}
export function rank(rows,n,threshold=1e-6){const a=rows.map(r=>[...r]);let rank=0;
  for(let c=0;c<n&&rank<a.length;c++){let pivot=rank;for(let r=rank+1;r<a.length;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;
    if(Math.abs(a[pivot][c])<threshold)continue;[a[rank],a[pivot]]=[a[pivot],a[rank]];const v=a[rank][c];for(let j=c;j<n;j++)a[rank][j]/=v;
    for(let r=rank+1;r<a.length;r++){const v=a[r][c];for(let j=c;j<n;j++)a[r][j]-=v*a[rank][j];}rank++;}return rank;}
export function linear(a,b){a=a.map((row,i)=>[...row,b[i]]);const n=b.length;
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-18)return null;
    [a[p],a[c]]=[a[c],a[p]];const v=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=v;
    for(let r=0;r<n;r++)if(r!==c){const v=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=v*a[c][j];}}
  return a.map(row=>row[n]);}
