import {expression,unitQuantity} from '../parameters/expressions.mjs';
import {check} from '../errors.mjs';

export const equationModes=['x','y','z','parametric'];
export function equationGeometry(recipe,parameters,definitionId,frame){
 const {mode,start,end,first,second}=recipe,variable=mode==='parametric'?'t':mode;
 check(equationModes.includes(mode),'InvalidInput','Choose a curve equation format.');
 const resolve=symbol=>{
  const [scope,name]=symbol.split('.');
  const parameter=name?parameters.find(p=>p.name===name&&p.definitionId===(scope==='doc'?null:scope==='local'?definitionId:undefined)):
   parameters.find(p=>p.name===scope&&p.definitionId===definitionId)??parameters.find(p=>p.name===scope&&p.definitionId===null);
  return parameter?unitQuantity(parameter.value,parameter.unit):null;
 };
 const bounds=[expression(start,resolve),expression(end,resolve)],a=bounds[0].value,b=bounds[1].value;
 check(bounds[0].length===bounds[1].length&&bounds[0].angle===bounds[1].angle&&a<b,'InvalidInput','The equation interval must increase and its bounds need matching units.');
 let vertical;
 if(mode==='z'){
  vertical=[frame.u[2],frame.v[2]];
  check(Math.abs(frame.normal[2])<1e-7,'InvalidGeometry','Choose a sketch plane containing the Z direction.');
 }
 const evaluate=value=>{
  const get=symbol=>symbol===variable?{...bounds[0],value}:resolve(symbol);
  const measure=source=>{const result=expression(source,get);check(result.angle===0&&[0,1].includes(result.length),'InvalidUnits','Curve coordinates must be lengths or numeric millimetres.');return result.value;};
  const out=measure(first);
  if(mode==='parametric')return [out,measure(second)];
  check(!bounds[0].angle&&[0,1].includes(bounds[0].length),'InvalidUnits','Use a length interval for an explicit curve.');
  if(mode==='z')return [vertical[0]*value+vertical[1]*out,vertical[1]*value-vertical[0]*out];
  return mode==='x'?[value,out]:[out,value];
 };
 const samples=Array.from({length:65},(_,i)=>evaluate(a+(b-a)*i/64));
 const tangents=[a,b].map((value,i)=>{
  try{
   const step=(b-a)*1e-5*(i?-1:1),p=samples[i?64:0],q=evaluate(value+step),r=evaluate(value+2*step);
   const derivative=p.map((n,k)=>(-3*n+4*q[k]-r[k])*Math.sign(step)),length=Math.hypot(...derivative);
   return length>1e-14?derivative.map(n=>n/length):null;
  }catch{return null;}
 });
 return {samples,tangents};
}
export const equationPoints=(...args)=>equationGeometry(...args).samples;
