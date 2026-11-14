import {blank} from '../document.mjs';
import {upgrade} from '../native/schema.mjs';
import {command} from '../commands/domain.mjs';

export const FEATURE_CONSTRUCTION_DEMO={id:'e3-m2-feature-construction',name:'E3.M2 Feature Construction'};
export function featureConstructionDemo(){
 let document=upgrade(blank(FEATURE_CONSTRUCTION_DEMO.name));
 const run=(name,input)=>document=command(document,'cad.'+name+'.v1',input);
 const sketch=(id,a,b)=>{
  run('sketch.create',{sketchId:id,definitionId:'definition-main',name:id,profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}});
  run('sketch.entity.add',{sketchId:id,unit:'mm',entity:{id:id+'-outline',type:'rectangle',a,b,construction:false}});
 };
 const extrude=(featureId,sketchId,operation,baseFeatureId)=>run('extrusion.create',{featureId,sketchId,name:featureId,depthMm:10,reverse:false,operation,...(baseFeatureId?{baseFeatureId}:{})});
 sketch('base-profile',[0,0],[40,30]);extrude('base-extrusion','base-profile','new-body');
 sketch('satellite-profile',[50,0],[60,10]);extrude('separate-solid','satellite-profile','none','base-extrusion');
 sketch('bridge-profile',[30,0],[60,10]);extrude('unite-bridge','bridge-profile','add','separate-solid');
 sketch('limit-practice',[8,8],[14,14]);
 const datum=role=>({kind:'datum',producerId:'reference-frame',role,definitionId:'definition-main',occurrencePath:['definition-main']});
 run('reference.set',{featureId:'raised-plane',kind:'plane',name:'Raised plane · 20 mm',references:[{target:datum('xy'),relation:'offset',value:20}]});
 run('reference.set',{featureId:'datum-axis',kind:'axis',name:'Reference Z axis',references:[{target:datum('xy'),relation:'perpendicular',value:0}]});
 const corner=document.native.graph.features.find(f=>f.id==='satellite-profile').data.entities[0];
 run('reference.set',{featureId:'satellite-frame',kind:'coordinate',name:'Satellite coordinate system',references:[{target:{kind:'sketch',producerId:'satellite-profile',role:corner.id+':a',definitionId:'definition-main',occurrencePath:['definition-main']},relation:'coincident',value:0},{target:datum('x'),relation:'parallel',value:0},{target:datum('y'),relation:'parallel',value:0}]});
 sketch('revolve-practice',[70,0],[74,5]);
 run('sketch.entity.add',{sketchId:'revolve-practice',unit:'mm',entity:{id:'practice-axis',type:'line',construction:true,a:[65,-8],b:[65,12]}});
 return document;
}
