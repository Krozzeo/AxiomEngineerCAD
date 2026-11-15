import {command} from '../commands/domain.mjs';
import {blank} from '../document.mjs';
import {upgrade} from '../native/schema.mjs';
export const E3_FEATURE_DEMO={id:'e3-m2-feature-operations',name:'E3.M2 Shaft and Flange'};

export function featureOperationsDemo(){
 let doc=upgrade(blank(E3_FEATURE_DEMO.name));
 const apply=(name,input)=>{doc=command(doc,'cad.'+name+'.v1',input);};
 const sketch=(id,name,plane,entities)=>{
  apply('sketch.create',{sketchId:id,definitionId:'definition-main',name,plane:{kind:'datum',role:plane},profile:'E1.M5-sketch/1'});
  for(const entity of entities)apply('sketch.entity.add',{sketchId:id,entity,unit:'mm'});
 };
 const feature=(id,name,sketchId,operation,baseFeatureId,extra={})=>apply('extrusion.create',{
  featureId:id,name,sketchId,depthMm:6,reverse:false,operation,...(baseFeatureId?{baseFeatureId}:{}),...extra
 });
 const rectangle=(id,a,b)=>({id,type:'rectangle',a,b,construction:false});
 const circle=(id,center,radius)=>({id,type:'circle',center,radius,construction:false});
 const axis=id=>({id,type:'line',a:[0,0],b:[0,35],construction:true});
 sketch('shaft-profile','Shaft section','xz',[rectangle('shaft-section',[0,0],[8,32]),axis('shaft-axis')]);
 feature('shaft-revolve','Revolved shaft','shaft-profile','new-body',null,{form:'revolve',axisId:'shaft-axis',angleDeg:360});
 sketch('flange-profile','Flange profile','xy',[circle('flange-ring',[0,0],35)]);
 feature('flange','Flange','flange-profile','add','shaft-revolve');
 sketch('hole-profile','Hole profile','xy',[circle('hole-ring',[22,0],2)]);
 feature('first-hole','Extruded hole','hole-profile','cut','flange');
 const repeat=(id,name,kind,base,axis,offsetMm,angleDeg)=>feature(id,name,'hole-profile','cut',base,{
  form:'repeat',repeat:{kind,sourceFeatureId:'first-hole',axis,offsetMm,angleDeg,count:2}
 });
 repeat('mirror-hole','Mirrored hole','mirror','first-hole','x',0,0);
 repeat('circular-holes','Circular hole array','circular','mirror-hole','z',0,90);
 repeat('linear-holes','Linear hole array','linear','circular-holes','y',9,0);
 sketch('groove-profile','Groove section','xz',[rectangle('groove-section',[6,20],[10,24]),axis('groove-axis')]);
 feature('shaft-groove','Revolved groove','groove-profile','cut','linear-holes',{form:'revolve',axisId:'groove-axis',angleDeg:360});
 return doc;
}
