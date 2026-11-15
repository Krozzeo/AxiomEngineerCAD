// One typed registry for tables, bindings, formula inputs and dependency traces.
export function featureParameters(feature){
 const d=feature.data,rows=[],add=(parameter,path,unit='mm',idPath=null,factor=1)=>{const value=getField(d,path);if(Number.isFinite(value))rows.push({parameter,path,unit,idPath,factor,value:value/factor,parameterId:idPath?getField(d,idPath):null});};
 if(feature.type==='geometry-probe')for(const p of ['width','height','depth','radius','count'])if(d.spec[p]!==undefined)add(p,'spec.'+p,p==='count'?'scalar':'mm',null,p==='count'?1:1/({mm:1,cm:10,m:1000,inch:25.4}[d.spec.unit]??1));
 if(feature.type==='sketch-extrusion'){
  if(d.form==='finish'){add('finishing.radiusMm','finishing.radiusMm','mm','finishing.parameterId');if(d.finishing.mode)add('finishing.distance2Mm','finishing.distance2Mm','mm','finishing.distance2ParameterId');if(d.finishing.mode)add('finishing.angleDeg','finishing.angleDeg','rad','finishing.angleParameterId',180/Math.PI);}
  else if(d.form==='repeat'){add('repeat.count','repeat.count','scalar','repeat.countParameterId');if(d.repeat.kind==='circular')add('repeat.angleDeg','repeat.angleDeg','rad','repeat.angleDegParameterId',180/Math.PI);else add('repeat.offsetMm','repeat.offsetMm','mm','repeat.offsetMmParameterId');}
  else {if(d.form==='revolve')add('angle','angleDeg','rad',null,180/Math.PI);else add('depth','depthMm');for(const side of ['start','end'])if(['value','symmetric','offset'].includes(d.limits?.[side]?.mode))add('limits.'+side+'.value','limits.'+side+'.value',d.form==='revolve'?'rad':'mm','limits.'+side+'.parameterId',d.form==='revolve'?180/Math.PI:1);}
 }
 if(feature.type==='sketch-primitives')for(const [i,p]of (d.patterns??[]).entries()){add('pattern.'+p.id+'.count','patterns.'+i+'.count','scalar','patterns.'+i+'.countParameterId');add('pattern.'+p.id+'.spacing','patterns.'+i+'.spacing',p.mode==='circular'?'rad':'mm','patterns.'+i+'.spacingParameterId');}
 if(feature.type==='reference-geometry')for(const [i,r]of d.references.entries())if(['angle','offset'].includes(r.relation))add('references.'+i+'.value','references.'+i+'.value',r.relation==='angle'?'rad':'mm','references.'+i+'.parameterId',r.relation==='angle'?180/Math.PI:1);
 return rows;
}
export const getField=(object,path)=>path.split('.').reduce((o,k)=>o?.[k],object);
export function setField(object,path,value){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((o,k)=>o[k],object);if(value===undefined)delete parent[last];else parent[last]=value;}
export const targetField=(graph,target)=>featureParameters(graph.features.find(f=>f.id===target.featureId)??{data:{}}).find(r=>r.parameter===target.parameter);
export function featureParameterUsers(graph,id){return graph.features.filter(f=>featureParameters(f).some(r=>r.parameterId===id)||f.data?.axisReference?.parameterId===id).map(f=>f.id);}
