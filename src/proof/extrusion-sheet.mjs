import * as cad from 'replicad';
import {check} from '../document.mjs';
import {vectorSheet} from './vector.mjs';

const EPS=1e-6;
const near=(a,b)=>Math.abs(a-b)<EPS;
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const point=p=>p.toTuple().slice(0,2);

function viewOf(shape,name){
  const camera=cad.lookFromPlane(name);
  try{
    const {visible,hidden}=cad.makeProjectedEdges(shape,camera);
    try{
      const circles=[],out={visible:[],hidden:[]};
      for(const [group,edges] of Object.entries({visible,hidden})){
        for(const edge of edges){
          const a=point(edge.startPoint),b=point(edge.endPoint),mid=point(edge.pointAt(.5));
          if(edge.geomType==='CIRCLE'){
            const full=distance(a,b)<EPS;
            const center=a.map((x,i)=>(x+(full?mid[i]:b[i]))/2),radius=distance(a,center);
            check(radius>EPS&&near(distance(mid,center),radius)&&near(edge.length,(full?2:1)*Math.PI*radius),
              'UnsupportedCapability','The projected circular edge is outside the full-circle drawing profile.');
            circles.push({group,center,radius,side:full?null:mid.map((n,i)=>n-center[i])});
          }else{
            check(near(edge.length,distance(a,b)),'UnsupportedCapability','The projected edge is outside the straight drawing profile.');
            if(distance(a,b)>EPS)out[group].push({kind:'line',a,b});
          }
        }
      }
      for(const group of ['visible','hidden']){
        const rings=circles.filter(c=>c.group===group);
        while(rings.length){
          const ring=rings.pop();
          if(ring.side){
            const partner=rings.findIndex(c=>c.side&&distance(c.center,ring.center)<EPS&&near(c.radius,ring.radius)
              &&Math.hypot(...c.side.map((n,i)=>n+ring.side[i]))<EPS);
            check(partner>=0,'UnsupportedCapability','The drawing requires a complete projected circular boundary.');
            rings.splice(partner,1);
          }
          out[group].push({kind:'circle',center:ring.center,radius:ring.radius});
        }
        out[group]=out[group].filter((item,i,all)=>!all.slice(0,i).some(other=>same(item,other)));
      }
      out.hidden=out.hidden.filter(item=>!out.visible.some(other=>same(item,other)))
        .filter(item=>item.kind!=='line'||!out.visible.some(other=>covered(item,other)));
      return {name,...out};
    }finally{for(const edge of [...visible,...hidden])edge.delete();}
  }finally{camera.delete();}
}

function same(a,b){
  if(a.kind!==b.kind)return false;
  if(a.kind==='circle')return distance(a.center,b.center)<EPS&&near(a.radius,b.radius);
  return distance(a.a,b.a)+distance(a.b,b.b)<EPS||distance(a.a,b.b)+distance(a.b,b.a)<EPS;
}

function covered(line,other){
  if(other.kind!=='line')return false;
  const length=distance(other.a,other.b);
  return [line.a,line.b].every(p=>near(distance(p,other.a)+distance(p,other.b),length));
}

function bounds(view){
  const points=view.visible.flatMap(e=>e.kind==='line'?[e.a,e.b]:
    [e.center.map(n=>n-e.radius),e.center.map(n=>n+e.radius)]);
  check(points.length,'UnsupportedCapability','The orthographic view is empty.');
  return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
    Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}

export function extrusionSheet(shape,{feature,profile,frame},value,source){
  check(feature.data.operation==='new-body'&&Math.abs(frame.normal[2])>1-EPS,
    'UnsupportedCapability','Drawing currently requires a single extrusion normal to the XY plane.');
  const top=viewOf(shape,'top'),front=viewOf(shape,'front');
  const [left,topLow,right,topHigh]=bounds(top),[frontLeft,bottom,frontRight,upper]=bounds(front);
  const width=right-left,depth=upper-bottom;
  check(near(frontLeft,left)&&near(frontRight,right)&&near(depth,feature.data.depthMm)
    &&top.visible.filter(e=>e.kind==='circle').length===(profile.outer.kind==='circle'?1:0)+profile.holes.length,
    'UnsupportedCapability','The projected dimensions or circular boundaries could not be verified.');
  const scale=[1,.5,.25,.1].find(s=>width*s<=145&&(topHigh-topLow)*s<=65&&depth*s<=65);
  check(scale,'UnsupportedCapability','The model does not fit the supported A4 scales.');
  const x=105-(left+right)*scale/2;
  Object.assign(top,{originMm:[x,225-topHigh*scale],heightMm:topHigh*scale});
  Object.assign(front,{originMm:[x,66-bottom*scale],heightMm:upper*scale});
  const binding=value.native.graph.parameters.find(p=>p.targets?.some(t=>t.kind==='feature'&&t.featureId===feature.id&&t.parameter==='depth'));
  const x1=x+left*scale,x2=x+right*scale;
  const drawing={profile:'E2.M2-extrusion-drawing/1',title:value.metadata.name,source:{...source,producerId:feature.id,definitionId:feature.definitionId},
    sheet:{size:'A4',widthMm:210,heightMm:297,scale,projection:'third-angle'},views:[top,front],
    dimension:{kind:'reference',producerId:feature.id,parameter:'width',valueMm:width,unit:'mm',x1Mm:x1,x2Mm:x2,
      yMm:top.originMm[1]+topLow*scale-12,extensionToYmm:top.originMm[1]+topLow*scale},
    depthDimension:{kind:'driving',producerId:feature.id,parameter:'depth',...(binding?{parameterId:binding.id}:{}),
      valueMm:depth,unit:'mm',y1Mm:66,y2Mm:66+depth*scale,edgeXmm:x2,xMm:x2+12}};
  return {...drawing,...vectorSheet(drawing)};
}
