import * as cad from 'replicad';
import {check} from '../errors.mjs';

// A growing sweep has monotonic material overlap. Bracket the first entry (or
// exit when starting inside), then solve against the exact B-Rep intersection.
export function contactLimit(makeTool,body,maximum,{angular=false}={}){
 const tolerance=angular?1e-7:1e-6,probe=Math.max(tolerance*8,Math.min(maximum*1e-5,.001));
 const overlap=distance=>{
  const tool=makeTool(distance);let common;
  try{common=tool.intersect(body);const volume=cad.measureVolume(tool),intersection=common.isNull||!common.solids.length?0:cad.measureVolume(common);return {volume,intersection};}
  finally{common?.delete();tool.delete();}
 };
 const initial=overlap(probe),epsilon=Math.max(1e-10,initial.volume*1e-7),inside=initial.intersection>=initial.volume-epsilon;
 check(inside||initial.intersection<=epsilon,'AmbiguousReference','The start section crosses the limiting body. Select a specific face.');
 const crossed=distance=>{const {volume,intersection}=overlap(distance);return inside?volume-intersection>Math.max(1e-9,volume*1e-9):intersection>Math.max(1e-9,volume*1e-9);};
 let high=Math.min(maximum,probe*2),low=0;
 while(high<maximum&&!crossed(high)){low=high;high=Math.min(maximum,high*2);}
 check(crossed(high),'InvalidGeometry','No limiting face is reached in this direction.');
 for(let i=0;i<48&&high-low>tolerance;i++){const mid=(high+low)/2;if(crossed(mid))high=mid;else low=mid;}
 return (low+high)/2;
}
