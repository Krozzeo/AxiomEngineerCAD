// Internal source anchors are solver inputs, not user-created sketch operations.
export function referenceAnchors(sketchId,entity,derive){
 const roles=entity.type==='line'?['a','b']:entity.type==='circle'?['center']:['point'];
 const constraints=roles.map(role=>({id:derive(sketchId,entity.id,'external-fixed',role),type:'fixed',refs:[{entityId:entity.id,role}],driving:true,value:[...entity[role]]}));
 if(entity.type==='circle')constraints.push({id:derive(sketchId,entity.id,'external-radius'),type:'radius',refs:[{entityId:entity.id,role:'entity'}],driving:true,value:entity.radius});
 return constraints;
}
