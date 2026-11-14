// Shared safe formula catalogue. This module is served verbatim to browser inputs.
export const FORMULA_FUNCTIONS=Object.freeze([
 ['IF','test, trueValue, falseValue'],...['AND','NAND','OR','NOR','XOR','XNOR'].map(n=>[n,'test1, test2, ...']),['NOT','test'],['ABS','value'],['SIGN','value'],
 ...['COS','SIN','TAN','COT','COSH','SINH','COTH','SEC','SECH','ACOS','ASIN','ATAN','ACOT','ACOSH','ASINH','ACOTH','ASEC','ASECH'].flatMap(n=>[[n,'value'],[n+'_rad','value']]),
 ...['ROUNDCEIL','ROUNDFLOOR','ROUND'].map(n=>[n,'value, decimals']),...['DEGREES','RADIANS','EXP','FACT','LN','LOG10','SQRT'].map(n=>[n,'value']),['LOG','value, base'],['PI',''],['POWER','value, power'],['RAND','']
].map(([name,args])=>Object.freeze({name,signature:name+'('+args+')',insert:name+'()',kind:'function'})));
export const functionCompletions=prefix=>FORMULA_FUNCTIONS.filter(f=>f.name.toLowerCase().startsWith(prefix.toLowerCase())).map(f=>({token:f.insert,label:f.signature,kind:'function'}));
// RAND is a pure deterministic sample of its retained expression and parameter identity.
// No clock, global RNG or regeneration state can alter a saved part.
export function formulaRandom(seed,index=0){let h=2166136261;for(const c of String(seed)+'#'+index){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return (h>>>0)/4294967296;}
