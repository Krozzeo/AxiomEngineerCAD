import {check} from '../errors.mjs';

export const DRAWING_TRANSLATOR='e2-m4-orthographic-svg';
const fields=['width','height','depth','boreDiameter','boreX','boreY'];
const numeric=/^-?[0-9]{1,5}(?:[.][0-9]{1,6})?$/;
const tag=/^<(rect|circle|line|text)((?: [a-zA-Z0-9-]+="[^"<>&]*")*)/;
const near=(a,b)=>Math.abs(a-b)<1e-5;
const number=(value,name)=>{
  check(numeric.test(value??''),'InvalidInput','Invalid SVG measurement: '+name);
  return Number(value);
};

export function drawingEvidence(svg){
  check(typeof svg==='string'&&Buffer.byteLength(svg)<=8192,'ResourceLimit','Drawing evidence exceeds 8 KiB.');
  const rows=svg.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  check(rows.shift()==='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" data-units="mm" data-scale="1">'&&rows.pop()==='</svg>',
    'UnsupportedCapability','Use the flat A4 SVG drawing profile in millimetres at 1:1.');
  check(rows.length<=16,'ResourceLimit','Too many SVG evidence records.');
  const found=new Map(),dimensions=new Map();
  for(const line of rows){
    const match=tag.exec(line);
    check(match,'UnsupportedCapability','Only flat rect, circle, line and dimension text are supported.');
    const [prefix,kind,raw]=match,entries=[...raw.matchAll(/ ([a-zA-Z0-9-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]);
    const attrs=Object.fromEntries(entries),tail=line.slice(prefix.length);
    check(entries.length===Object.keys(attrs).length,'InvalidInput','Duplicate SVG attribute.');
    if(kind==='text'){
      const field=attrs['data-dimension'],m=/^>([0-9]+(?:[.][0-9]+)?) mm<\/text>$/.exec(tail);
      check(fields.includes(field)&&m&&Object.keys(attrs).every(k=>['data-dimension','x','y'].includes(k)),'UnsupportedCapability','Use explicit dimension labels in millimetres.');
      check(!dimensions.has(field),'NeedsClarification','Which '+field+' dimension should be used?');
      dimensions.set(field,number(m[1],field));
      continue;
    }
    const role=attrs['data-role'];
    const required={
      top:['rect','x','y','width','height'],front:['rect','x','y','width','height'],
      bore:['circle','cx','cy','r'],'bore-left':['line','x1','y1','x2','y2'],'bore-right':['line','x1','y1','x2','y2']
    }[role];
    check(required?.[0]===kind&&tail==='/>'&&Object.keys(attrs).every(k=>['data-role','fill','stroke','stroke-dasharray',...required.slice(1)].includes(k)),
      'UnsupportedCapability','Unsupported orthographic SVG element.');
    check(!found.has(role),'NeedsClarification','Which '+role+' element represents the part?');
    found.set(role,Object.fromEntries(required.slice(1).map(key=>[key,number(attrs[key],role+'.'+key)])));
  }
  const missing=fields.filter(field=>!dimensions.has(field));
  check(!missing.length,'NeedsClarification','Provide explicit dimensions in mm for: '+missing.join(', ')+'.');
  const [top,front,bore,left,right]=['top','front','bore','bore-left','bore-right'].map(key=>found.get(key));
  check(top&&front&&bore&&left&&right,'NeedsClarification','Provide top and front views, the bore circle and both hidden bore edges.');
  const values=Object.fromEntries(dimensions),{width,height,depth,boreDiameter,boreX,boreY}=values;
  check([width,height,depth,boreDiameter].every(n=>n>0&&n<=100)&&boreX>boreDiameter/2&&boreY>boreDiameter/2
    &&boreX<width-boreDiameter/2&&boreY<height-boreDiameter/2,'InvalidGeometry','Bore must fit inside the supported rectangular plate.');
  const hidden=(line,x)=>near(line.x1,x)&&near(line.x2,x)&&near(Math.min(line.y1,line.y2),front.y)&&near(Math.max(line.y1,line.y2),front.y+depth);
  check(near(top.width,width)&&near(top.height,height)&&near(front.width,width)&&near(front.height,depth)
    &&near(bore.cx-top.x,boreX)&&near(top.y+height-bore.cy,boreY)&&near(bore.r*2,boreDiameter)
    &&hidden(left,front.x+boreX-bore.r)&&hidden(right,front.x+boreX+bore.r),
  'NeedsClarification','The orthographic geometry conflicts with the stated dimensions. Which measurements are correct?');
  return {profile:DRAWING_TRANSLATOR,unit:'mm',values,
    references:fields.map(field=>({field,source:'data-dimension='+field,valueMm:values[field]}))};
}

export function compareReprojection(drawing,evidence){
  const {width,height,depth,boreDiameter,boreX,boreY}=evidence.values;
  const [top,front]=['top','front'].map(name=>drawing?.views.find(view=>view.name===name));
  const hole=top?.visible.filter(edge=>edge.kind==='circle')??[];
  const lines=view=>view?.visible.filter(edge=>edge.kind==='line')??[];
  const deviations=[];
  function rectangle(edges,w,h){
    check(edges.length===4,'InvalidGeometry','Reprojection is missing an orthographic rectangle.');
    const pts=edges.flatMap(edge=>[edge.a,edge.b]);
    const x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[1]));
    const corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
    const pair=(a,b,c,d)=>Math.hypot(a[0]-c[0],a[1]-c[1])+Math.hypot(b[0]-d[0],b[1]-d[1]);
    corners.forEach((a,i)=>{
      const b=corners[(i+1)%4];
      deviations.push(Math.min(...edges.map(edge=>Math.min(pair(a,b,edge.a,edge.b),pair(a,b,edge.b,edge.a)))));
    });
    return [x,y];
  }
  const [tx,ty]=rectangle(lines(top),width,height),[fx,fy]=rectangle(lines(front),width,depth);
  check(hole.length===1&&front.hidden.length===2&&front.hidden.every(edge=>edge.kind==='line'),
    'InvalidGeometry','Reprojection does not reproduce the bore circle and both hidden edges.');
  const [circle]=hole,hidden=front.hidden.slice().sort((a,b)=>a.a[0]-b.a[0]);
  deviations.push(circle.center[0]-tx-boreX,circle.center[1]-ty-height+boreY,circle.radius-boreDiameter/2);
  hidden.forEach(({a,b},i)=>{
    const expected=fx+boreX+(i?1:-1)*boreDiameter/2;
    deviations.push(a[0]-expected,b[0]-expected,Math.min(a[1],b[1])-fy,Math.max(a[1],b[1])-fy-depth);
  });
  const maxDeviationMm=Math.max(...deviations.map(Math.abs));
  check(maxDeviationMm<1e-5,'InvalidGeometry','Reprojection disagrees with the supplied SVG geometry.');
  return {status:'Matched',views:['top','front'],maxDeviationMm,references:evidence.references};
}
