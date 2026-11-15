import {createHash} from 'node:crypto';
import {cast,getOC,ProjectionCamera} from 'replicad';
import {circleThrough} from '../sketch/curves.mjs';

export function sketchOutlines(shape,frame){
 const oc=getOC(),camera=new ProjectionCamera(frame.origin,frame.normal,frame.u),algo=new oc.HLRBRep_Algo();
 const projector=new oc.HLRAlgo_Projector(camera.wrapped);
 try{
  algo.Add(shape.wrapped,0);algo.Projector(projector);algo.Update();algo.Hide();
  const result=new oc.HLRBRep_HLRToShape(algo);
  try{
   const outline=result.OutLineVCompound();
   if(outline.IsNull()){outline.delete();return [];}
   const compound=cast(outline),found=new Map();
   try{
    for(const edge of compound.edges)try{
     oc.BRepLib.BuildCurves3d(edge.wrapped);
     const point=t=>{const p=edge.pointAt(t);try{return p.toTuple().slice(0,2).map(n=>Math.round(n*1e8)/1e8);}finally{p.delete();}};
     let a=point(0),b=point(1);const mid=point(.5);
     if(a[0]>b[0]||a[0]===b[0]&&a[1]>b[1])[a,b]=[b,a];
     const span=Math.hypot(...a.map((n,i)=>n-b[i]));
     let geometry;
     if(span>1e-7&&(edge.geomType==='LINE'||Math.abs(edge.length-span)<1e-7))geometry={type:'line',a,b};
     else if(edge.geomType==='CIRCLE'&&span>1e-7){const circle=circleThrough(a,mid,b);if(circle)geometry={type:'arc',a,b,...circle};}
     else if(edge.geomType==='CIRCLE'){
      const center=a.map((n,i)=>(n+mid[i])/2),radius=Math.hypot(...a.map((n,i)=>n-center[i]));
      if(radius>1e-7)geometry={type:'circle',center,radius};
     }
     if(!geometry)continue;
     const role='outline:'+createHash('sha256').update(JSON.stringify(geometry)).digest('hex');
     found.set(role,{...geometry,role,construction:true,name:'External projected silhouette'});
    }finally{edge.delete();}
   }finally{compound.delete();}
   return [...found.values()];
  }finally{result.delete();}
 }finally{projector.delete();algo.delete();camera.delete();}
}
