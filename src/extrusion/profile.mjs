import {check} from '../errors.mjs';
export const EXTRUSION_TYPE='sketch-extrusion',EXTRUSION_PROFILE='E1.M5-extrusion/1';
export const hasExtrusions=value=>(value.native?.graph??value.graph)?.features.some(f=>f.type===EXTRUSION_TYPE)??false;
export const combines=operation=>['add','cut','intersect','none'].includes(operation);
export function extrusionDependencies(data){
 const targets=[data.axisReference?.target,data.repeat?.reference?.target,data.limits?.start.reference?.target,data.limits?.end?.reference?.target].filter(Boolean);
 return [...new Set([data.sketchId,...(data.baseFeatureId?[data.baseFeatureId]:[]),...(data.form==='repeat'?(data.repeat.sourceFeatureIds??[data.repeat.sourceFeatureId]):[]),...targets.map(t=>t.producerId).filter(id=>id!=='reference-frame')])];
}
export function validateExtrusion(f,g){
 const d=f.data,allowed=['profile','name','sketchId','depthMm','reverse','operation','baseFeatureId','refined','form','axisId','axisReference','angleDeg','repeat','limits'];
 check(d&&Object.keys(d).every(k=>allowed.includes(k))&&d.profile===EXTRUSION_PROFILE&&typeof d.name==='string'&&d.name.trim().length>0&&d.name.length<=128&&Number.isFinite(d.depthMm)&&d.depthMm>=.001&&d.depthMm<=10000&&typeof d.reverse==='boolean'&&['new-body','none','add','cut','intersect'].includes(d.operation),'InvalidInput','Invalid extrusion source.');
 check(!g.features.some(x=>x.type==='geometry-probe'&&x.definitionId===g.primaryDefinitionId),'UnsupportedCapability','Use a sketch-based part for feature operations.');
 check(!g.features.some(x=>x.type===EXTRUSION_TYPE&&x.id!==f.id&&x.data.baseFeatureId===d.baseFeatureId&&d.baseFeatureId),'UnsupportedCapability','Choose the current history tip as the base.');
 const sketch=g.features.find(x=>x.id===d.sketchId);
 check(sketch?.type==='sketch-primitives'&&sketch.data.profile==='E1.M5-sketch/1'&&sketch.definitionId===f.definitionId&&f.definitionId===g.primaryDefinitionId,'LostReference','Choose a sketch in the primary part.');
 if(d.form==='repeat'){
  const r=d.repeat,sources=(r?.sourceFeatureIds??[r?.sourceFeatureId]).map(id=>g.features.find(item=>item.id===id));
  check(r&&['mirror','linear','circular'].includes(r.kind)&&(['x','y','z'].includes(r.axis)||r.reference)&&Number.isFinite(r.offsetMm)&&Number.isFinite(r.angleDeg)&&Number.isInteger(r.count)&&r.count>=2&&r.count<=32&&(r.kind!=='linear'||Math.abs(r.offsetMm)>1e-6)&&(r.kind!=='circular'||Math.abs(r.angleDeg)>1e-6&&Math.abs(r.angleDeg)<360)&&(r.kind!=='mirror'||r.count===2)&&sources.length>0&&sources[0]?.data.sketchId===d.sketchId&&r.sourceFeatureId===sources[0]?.id&&d.baseFeatureId&&combines(d.operation)&&sources.every(source=>source?.type===EXTRUSION_TYPE),'InvalidInput','Select earlier feature tools and a valid reference.');
 }
 const dependencies=extrusionDependencies(d);
 check(f.parameterIds.length===0&&f.dependsOn.length===dependencies.length&&dependencies.every(id=>f.dependsOn.includes(id)),'InvalidInput','Operation dependencies must identify every selected producer.');
 if(d.form==='revolve'){
  const axis=sketch.data.entities.find(e=>e.id===d.axisId);
  check((d.axisReference||axis?.type==='line')&&Number.isFinite(d.angleDeg)&&d.angleDeg>0&&d.angleDeg<=360,'InvalidGeometry','Revolve requires a straight axis and a valid angle.');
 }
 if(combines(d.operation))check(g.features.some(x=>x.id===d.baseFeatureId&&x.type===EXTRUSION_TYPE&&x.definitionId===f.definitionId),'LostReference','The previous model feature is missing.');
 else check(!d.baseFeatureId,'InvalidInput','The first solid has no base.');
 if(d.limits){
  check(d.form!=='repeat'&&d.limits.start&&d.limits.end,'InvalidInput','Start and end limits are required.');
  for(const [side,limit]of Object.entries(d.limits)){
   check(['start','end'].includes(side)&&['value','symmetric','next','selected','offset','all'].includes(limit.mode)&&Number.isFinite(limit.value)&&Math.abs(limit.value)<=10000&&(limit.mode!=='symmetric'||side==='start'),'InvalidInput','Invalid operation limit.');
   if(limit.parameterId){const p=g.parameters.find(p=>p.id===limit.parameterId);check(p&&p.unit===(d.form==='revolve'?'rad':'mm'),'InvalidUnits','Limit parameter has an incompatible unit.');}
   if(['selected','offset'].includes(limit.mode))check(limit.reference,'LostReference','Select the limit geometry.');
   if(['all','next'].includes(limit.mode))check(d.baseFeatureId,'LostReference','This limit requires an existing model.');
  }
 }
}
export function extrusionCommand(value,name,input){
 const g=value.native.graph,previous=g.features.find(f=>f.id===input.featureId),creating=name==='cad.extrusion.create.v1';
 check(creating?!previous:previous?.type===EXTRUSION_TYPE,'LostReference',creating?'Feature ID already exists.':'Operation is missing.');
 if(!creating)check(input.depthMm===previous.data.depthMm||!g.parameters.some(p=>p.targets?.some(t=>t.kind==='feature'&&t.featureId===previous.id&&t.parameter==='depth')),'ConstraintConflict','Depth is controlled by a parameter.');
 const data=creating?{profile:EXTRUSION_PROFILE}:structuredClone(previous.data);
 for(const key of ['name','sketchId','depthMm','reverse','operation','baseFeatureId','form','axisId','axisReference','angleDeg','repeat','limits'])if(Object.hasOwn(input,key))data[key]=structuredClone(input[key]);
 if(data.operation==='new-body')delete data.baseFeatureId;
 if(combines(data.operation)){if(creating)data.refined=true;}else delete data.refined;
 const sketch=g.features.find(f=>f.id===data.sketchId);check(sketch,'LostReference','Source sketch missing.');
 const feature={id:input.featureId,definitionId:sketch.definitionId,type:EXTRUSION_TYPE,dependsOn:extrusionDependencies(data),parameterIds:[],data};
 if(creating)g.features.push(feature);else g.features[g.features.indexOf(previous)]={...previous,...feature};
}
