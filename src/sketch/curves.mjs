const tau=2*Math.PI,eps=1e-7;
const delta=(a,b)=>a.map((n,i)=>n-b[i]);
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const wrap=value=>(value%tau+tau)%tau;
const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);

export const circular=entity=>entity?.type==='circle'||entity?.type==='arc';
export function arcAngles(arc){
  const angle=point=>Math.atan2(point[1]-arc.center[1],point[0]-arc.center[0]);
  const start=angle(arc.a),end=angle(arc.b);
  return {start,sweep:arc.clockwise?-wrap(start-end):wrap(end-start)};
}
export function arcPoint(arc,t){
  const {start,sweep}=arcAngles(arc),angle=start+sweep*t;
  return [arc.center[0]+arc.radius*Math.cos(angle),arc.center[1]+arc.radius*Math.sin(angle)];
}
export function circularSegments(entity,steps=96){
  const count=entity.type==='arc'?Math.max(4,Math.ceil(Math.abs(arcAngles(entity).sweep)/tau*steps)):steps;
  const at=entity.type==='arc'?t=>arcPoint(entity,t):t=>[entity.center[0]+entity.radius*Math.cos(t*tau),entity.center[1]+entity.radius*Math.sin(t*tau)];
  return Array.from({length:count},(_,i)=>[at(i/count),at((i+1)/count)]);
}
export function arcFromPoints(center,a,end){
  const startVector=delta(a,center),endVector=delta(end,center),radius=Math.hypot(...startVector),length=Math.hypot(...endVector);
  if(radius<=.01||length<=eps)return null;
  const b=center.map((n,i)=>n+radius*endVector[i]/length);
  if(Math.hypot(...delta(a,b))<eps)return null;
  return {type:'arc',center,a,b,radius,clockwise:cross(startVector,endVector)<0};
}
export function parameterOn(entity,p){
  if(entity.type==='line'){
    const u=delta(entity.b,entity.a),v=delta(p,entity.a);
    if(Math.abs(cross(u,v))>eps*Math.max(1,Math.hypot(...u)))return null;
    return dot(v,u)/dot(u,u);
  }
  if(Math.abs(Math.hypot(...delta(p,entity.center))-entity.radius)>eps)return null;
  const angle=Math.atan2(p[1]-entity.center[1],p[0]-entity.center[0]);
  if(entity.type==='circle')return wrap(angle)/tau;
  if(Math.hypot(...delta(p,entity.a))<eps)return 0;
  if(Math.hypot(...delta(p,entity.b))<eps)return 1;
  const {start,sweep}=arcAngles(entity);
  return (sweep<0?wrap(start-angle):wrap(angle-start))/Math.abs(sweep);
}
export function pointOn(entity,t){return entity.type==='line'?mix(entity.a,entity.b,t):arcPoint(entity,t);}

export function intersections(a,b){
  if(a.type==='line'&&b.type==='line'){
    const u=delta(a.b,a.a),v=delta(b.b,b.a),den=cross(u,v);
    if(Math.abs(den)<eps)return {points:[a.a,a.b,b.a,b.b].filter(p=>within(a,p)&&within(b,p)),coincident:Math.abs(cross(u,delta(b.a,a.a)))<eps};
    const t=cross(delta(b.a,a.a),v)/den,p=mix(a.a,a.b,t);
    return {points:within(a,p)&&within(b,p)?[p]:[],coincident:false};
  }
  if(b.type==='line')return intersections(b,a);
  if(a.type==='line'){
    const u=delta(a.b,a.a),v=delta(a.a,b.center),A=dot(u,u),B=dot(u,v),C=dot(v,v)-b.radius**2,disc=B*B-A*C;
    if(disc<-eps)return {points:[],coincident:false};
    const root=Math.sqrt(Math.max(0,disc)),points=(root<eps?[0]:[-root,root]).map(x=>mix(a.a,a.b,(-B+x)/A));
    return {points:points.filter(p=>within(a,p)&&within(b,p)),coincident:false};
  }
  const axis=delta(b.center,a.center),d=Math.hypot(...axis);
  if(d<eps){
    const coincident=Math.abs(a.radius-b.radius)<eps;
    return {points:coincident?[a.a,a.b,b.a,b.b].filter(p=>p&&within(a,p)&&within(b,p)):[],coincident};
  }
  if(d>a.radius+b.radius+eps||d<Math.abs(a.radius-b.radius)-eps)return {points:[],coincident:false};
  const x=(a.radius**2-b.radius**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,a.radius**2-x*x)),u=axis.map(n=>n/d);
  const base=a.center.map((n,i)=>n+x*u[i]),points=(h<eps?[0]:[-h,h]).map(y=>[base[0]-y*u[1],base[1]+y*u[0]]);
  return {points:points.filter(p=>within(a,p)&&within(b,p)),coincident:false};
}
export function within(entity,p){
  const t=parameterOn(entity,p);
  return t!==null&&t>=-eps&&t<=1+eps;
}
export function validArc(entity){
  const {a,b,center,radius}=entity;
  return [a,b].every(p=>Math.abs(Math.hypot(...delta(p,center))-radius)<=eps*Math.max(1,radius))&&
    Math.hypot(...delta(a,b))>eps;
}

export function nearestParameter(entity,p){
  if(entity.type==='line'){const u=delta(entity.b,entity.a);return dot(delta(p,entity.a),u)/dot(u,u);}
  const d=delta(p,entity.center),length=Math.hypot(...d);
  return length>eps?parameterOn(entity,entity.center.map((n,i)=>n+entity.radius*d[i]/length)):null;
}
export function polygonPoints(center,vertex,sides){
  const [x,y]=delta(vertex,center);
  return Array.from({length:sides},(_,i)=>{
    const angle=i*tau/sides,c=Math.cos(angle),s=Math.sin(angle);
    return [center[0]+x*c-y*s,center[1]+x*s+y*c];
  });
}

export function arcTangencyValid(a,b){
  if(a.type!=='arc'&&b.type!=='arc')return true;
  if(a.type==='line'||b.type==='line'){
    const line=a.type==='line'?a:b,arc=line===a?b:a;
    return within(arc,pointOn(line,nearestParameter(line,arc.center)));
  }
  const axis=delta(b.center,a.center),length=Math.hypot(...axis);
  if(length<=eps)return false;
  return [a,b].every((entity,i)=>entity.type!=='arc'||within(entity,entity.center.map((n,k)=>n+(i?-1:1)*entity.radius*axis[k]/length)));
}
