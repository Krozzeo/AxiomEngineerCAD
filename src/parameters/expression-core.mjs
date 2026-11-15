import {check} from '../errors.mjs';
import {FORMULA_FUNCTIONS,formulaRandom} from './functions.mjs';
// Deliberately small quantity grammar. No JavaScript evaluation, property traversal or I/O.
export const UNITS=Object.freeze({mm:[1,1,0],cm:[10,1,0],m:[1000,1,0],inch:[25.4,1,0],rad:[1,0,1],deg:[Math.PI/180,0,1]});
export const quantity=(value,length=0,angle=0)=>{check(Number.isFinite(value)&&Math.abs(value)<=1e12&&Number.isInteger(length)&&Number.isInteger(angle)&&Math.abs(length)<=4&&Math.abs(angle)<=4,'InvalidUnits','Expression exceeds its numeric or dimensional domain.');return {value,length,angle};};
export const same=(a,b)=>a.length===b.length&&a.angle===b.angle;
export const unitQuantity=(value,unit)=>{check(['mm','rad','scalar'].includes(unit),'InvalidUnits','Unknown canonical parameter unit.');return unit==='scalar'?quantity(value):quantity(value,...({mm:[1,0],rad:[0,1]}[unit]));};

export function expression(source,resolve=()=>null,onReference,{seed=source}={}){
 check(typeof source==='string'&&source.length>0&&source.length<=512,'InvalidInput','An expression must contain 1–512 characters.');
 const matches=[...source.matchAll(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)?|<=|>=|<>|!=|==|\S/g)],tokens=matches.map(m=>m[0]);
 check(tokens.length<=128,'ResourceLimit','Expression exceeds 128 tokens.');let at=0,depth=0,randomIndex=0;const refs=new Map(),peek=()=>tokens[at],take=()=>tokens[at++],expect=s=>check(take()===s,'InvalidInput','Expected '+s+' in expression.');
 const names=new Set([...FORMULA_FUNCTIONS.map(f=>f.name.toUpperCase()),'MIN','MAX']);
 function atom(){check(++depth<=24,'ResourceLimit','Expression nesting exceeds 24.');let node;const index=at,token=take();
  if(token==='+'||token==='-')node={op:'unary'+token,args:[power()]};
  else if(token==='('){node=compare();expect(')');}
  else if(token&&/^(?:\d|\.)/.test(token)){const value=Number(token);if(Object.hasOwn(UNITS,peek())){const [f,l,a]=UNITS[take()];node={q:quantity(value*f,l,a)};}else node={q:quantity(value)};}
  else if(token&&/^[A-Za-z_]/.test(token)){
   if(peek()==='('){check(names.has(token.toUpperCase()),'InvalidInput','Unknown safe function: '+token);take();const args=[];if(peek()!==')'){args.push(compare());while(peek()===','){take();check(args.length<64,'ResourceLimit','At most 64 function arguments.');args.push(compare());}}expect(')');node={fn:token,args,randomIndex:randomIndex++};}
   else if(token==='pi')node={q:quantity(Math.PI)};
   else if(['TRUE','FALSE'].includes(token.toUpperCase()))node={q:quantity(token.toUpperCase()==='TRUE'?1:0)};
   else {if(!refs.has(token)){check(refs.size<16,'ResourceLimit','At most sixteen direct parameter dependencies.');refs.set(token,null);}node={ref:token};onReference?.({symbol:token,start:matches[index].index,end:matches[index].index+token.length});}
  }else check(false,'InvalidInput','Unexpected expression token.');depth--;return node;
 }
 function power(){let a=atom();if(peek()==='^'){take();let sign=1;if(peek()==='-'){take();sign=-1;}const n=sign*Number(take());check(Number.isInteger(n)&&Math.abs(n)<=4,'InvalidInput','Exponent must be an integer between -4 and 4.');a={fn:'POWER',args:[a,{q:quantity(n)}]};}return a;}
 function product(){let a=power();while(['*','/'].includes(peek()))a={op:take(),args:[a,power()]};return a;}
 function sum(){let a=product();while(['+','-'].includes(peek()))a={op:take(),args:[a,product()]};return a;}
 function compare(){let a=sum();if(['<','>','<=','>=','=','==','<>','!='].includes(peek()))a={op:take(),args:[a,sum()]};return a;}
 const tree=compare();check(at===tokens.length,'InvalidInput','Unexpected trailing expression input. Use explicit multiplication.');
 // Validate all source references even in an inactive IF branch. Evaluation itself is lazy.
 for(const symbol of refs.keys()){const q=resolve(symbol);check(q,'LostReference','Unknown parameter: '+symbol);refs.set(symbol,q);}
 const scalar=q=>{check(q.length===0&&q.angle===0,'InvalidUnits','This function requires a dimensionless argument.');return q.value;};
 const truth=q=>scalar(q)!==0;
 const arity=(args,n,max=n)=>check(args.length>=n&&args.length<=max,'InvalidInput','Function requires '+(n===max?n:n+'–'+max)+' argument(s).');
 function evaluate(n){try{return evaluateNode(n);}catch(error){if(n.fn)error.message=n.fn+': '+error.message;throw error;}}
 function evaluateNode(n){if(n.q)return n.q;if(n.ref)return refs.get(n.ref);if(n.op){const a=evaluate(n.args[0]);if(n.op.startsWith('unary'))return quantity((n.op==='unary-'?-1:1)*a.value,a.length,a.angle);const b=evaluate(n.args[1]);
   if(['+','-'].includes(n.op)){check(same(a,b),'InvalidUnits','Addition and subtraction require matching units.');return quantity(a.value+(n.op==='+'?1:-1)*b.value,a.length,a.angle);}
   if(['*','/'].includes(n.op)){check(n.op!=='/'||b.value!==0,'InvalidInput','Division by zero.');const sign=n.op==='*'?1:-1;return quantity(n.op==='*'?a.value*b.value:a.value/b.value,a.length+sign*b.length,a.angle+sign*b.angle);}
   check(same(a,b),'InvalidUnits','Comparison requires matching units.');return quantity(({ '<':()=>a.value<b.value,'>':()=>a.value>b.value,'<=':()=>a.value<=b.value,'>=':()=>a.value>=b.value,'=':()=>a.value===b.value,'==':()=>a.value===b.value,'!=':()=>a.value!==b.value,'<>':()=>a.value!==b.value}[n.op]())?1:0);
  }
  const raw=n.fn,key=raw.toUpperCase(),rad=key.endsWith('_RAD'),name=rad?key.slice(0,-4):key;
  if(name==='IF'){arity(n.args,3);return evaluate(n.args[truth(evaluate(n.args[0]))?1:2]);}
  const args=n.args.map(evaluate),a=args[0];
  if(['PI','RAND'].includes(name)){arity(args,0);return quantity(name==='PI'?Math.PI:formulaRandom(seed,n.randomIndex));}
  if(['AND','NAND','OR','NOR','XOR','XNOR'].includes(name)){arity(args,1,64);const bits=args.map(truth),v=name.includes('AND')?bits.every(Boolean):name.includes('XOR')||name==='XNOR'?bits.filter(Boolean).length%2===1:bits.some(Boolean);return quantity((['NAND','NOR','XNOR'].includes(name)?!v:v)?1:0);}
  if(name==='NOT'){arity(args,1);return quantity(truth(a)?0:1);}
  if(['MIN','MAX'].includes(name)){arity(args,1,64);check(args.every(b=>same(a,b)),'InvalidUnits','Function arguments require matching units.');return quantity(Math[name.toLowerCase()](...args.map(q=>q.value)),a.length,a.angle);}
  if(name==='ABS'){arity(args,1);return quantity(Math.abs(a.value),a.length,a.angle);}
  if(name==='SIGN'){arity(args,1);return quantity(Math.sign(a.value));}
  if(name==='SQRT'){arity(args,1);check(a.value>=0&&a.length%2===0&&a.angle%2===0,'InvalidUnits','Square root requires a nonnegative quantity with even dimensions.');return quantity(Math.sqrt(a.value),a.length/2,a.angle/2);}
  if(name==='POWER'){arity(args,2);const e=scalar(args[1]);check(a.length===0&&a.angle===0||Number.isInteger(e)&&Math.abs(e)<=4,'InvalidUnits','A dimensional power requires an integer exponent between -4 and 4.');check(a.value!==0||e>=0,'InvalidInput','Division by zero.');return quantity(a.value**e,a.length*e,a.angle*e);}
  if(['ROUND','ROUNDCEIL','ROUNDFLOOR'].includes(name)){arity(args,2);const digits=scalar(args[1]);check(Number.isInteger(digits)&&Math.abs(digits)<=12,'InvalidInput','Decimal places must be an integer between -12 and 12.');const f=10**digits,v=a.value*f,rounded=name==='ROUND'?(v<0?-1:1)*Math.floor(Math.abs(v)+.5+Number.EPSILON*Math.abs(v)*2):Math[name==='ROUNDCEIL'?'ceil':'floor'](v);return quantity(rounded/f,a.length,a.angle);}
  arity(args,name==='LOG'?2:1);
  if(name==='RADIANS'){check(!a.length&&[0,1].includes(a.angle),'InvalidUnits','RADIANS requires degrees or an angle.');return quantity(a.angle?a.value:a.value*Math.PI/180,0,1);}
  if(name==='DEGREES'){check(!a.length&&[0,1].includes(a.angle),'InvalidUnits','DEGREES requires radians or an angle.');return quantity(a.value*180/Math.PI);}
  if(['COS','SIN','TAN','COT','SEC'].includes(name)){
   check(!a.length&&[0,1].includes(a.angle)&&(!['sin','cos','tan'].includes(raw)||a.angle===1),'InvalidUnits','Trigonometry requires an angle; uppercase functions also accept numeric degrees.');const v=a.angle||rad?a.value:a.value*Math.PI/180,c=Math.cos(v),s=Math.sin(v);check(!['TAN','SEC'].includes(name)||Math.abs(c)>1e-12,'InvalidInput','Function is undefined at this angle.');check(name!=='COT'||Math.abs(s)>1e-12,'InvalidInput','Cotangent is undefined at this angle.');return quantity(({COS:()=>c,SIN:()=>s,TAN:()=>s/c,COT:()=>c/s,SEC:()=>1/c}[name])());
  }
  const x=scalar(a);
  const direct={COSH:Math.cosh,SINH:Math.sinh,COTH:v=>1/Math.tanh(v),SECH:v=>1/Math.cosh(v)},inverse={ACOS:Math.acos,ASIN:Math.asin,ATAN:Math.atan,ACOT:v=>Math.atan2(1,v),ASEC:v=>Math.acos(1/v)},hyper={ACOSH:Math.acosh,ASINH:Math.asinh,ACOTH:v=>Math.atanh(1/v),ASECH:v=>Math.acosh(1/v)};
  if(direct[name])return quantity(direct[name](x));if(inverse[name])return quantity(inverse[name](x)*(rad?1:180/Math.PI),0,rad?1:0);if(hyper[name])return quantity(hyper[name](x));
  if(name==='EXP')return quantity(Math.exp(x));if(['LN','LOG','LOG10'].includes(name)){check(x>0,'InvalidInput','Logarithm requires a positive value.');if(name==='LOG'){const b=scalar(args[1]);check(b>0&&b!==1,'InvalidInput','Logarithm base must be positive and different from 1.');return quantity(Math.log(x)/Math.log(b));}return quantity(name==='LN'?Math.log(x):Math.log10(x));}
  if(name==='FACT'){check(Number.isInteger(x)&&x>=0&&x<=170,'InvalidInput','Factorial requires an integer from 0 to 170.');let v=1;for(let i=2;i<=x;i++)v*=i;return quantity(v);}
  check(false,'InvalidInput','Unknown safe function: '+raw);
 }
 return {...evaluate(tree),symbols:[...refs.keys()]};
}
