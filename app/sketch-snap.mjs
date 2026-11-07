const roles=e=>e.type==='point'?['point']:e.type==='circle'?['center']:['a','b','midpoint'];
const at=(e,role)=>role==='midpoint'?e.a.map((n,i)=>(n+e.b[i])/2):e[role];
export function dragSnapExclusions(entities,constraints,ref,preview){
 const moving=entities.find(e=>e.id===ref.entityId),excluded=new Set((ref.role==='entity'?roles(moving):[ref.role]).map(role=>ref.entityId+':'+role));
 let changed=true;while(changed){changed=false;for(const c of constraints){if(!c.driving||!['coincident','midpoint','concentric','coradial'].includes(c.type))continue;const keys=c.refs.map(r=>r.entityId+':'+(r.role==='entity'?(c.type==='midpoint'?'midpoint':['concentric','coradial'].includes(c.type)?'center':r.role):r.role));if(!keys.some(key=>excluded.has(key)))continue;for(const key of keys)if(!excluded.has(key)){excluded.add(key);changed=true;}}}
 // Never snap to geometry that this same gesture is moving in the preview.
 for(const entity of preview??[]){const original=entities.find(e=>e.id===entity.id);if(!original)continue;for(const role of roles(entity)){const a=at(original,role),b=at(entity,role);if(a&&b&&Math.hypot(...a.map((n,i)=>n-b[i]))>1e-7)excluded.add(entity.id+':'+role);}}
 return excluded;
}
