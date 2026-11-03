// Original bounded A4 vector emitter. Inputs are validated exact-kernel primitives,
// never SVG/HTML/PDF supplied by a project. No embedded images, scripts or actions.
const n=v=>{if(!Number.isFinite(v))throw Error('Nonfinite vector coordinate');return Number(v.toFixed(7)).toString();};
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const literal=s=>String(s).replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,c=>'\\'+c);
export function vectorSheet(drawing){
  const {widthMm:w,heightMm:h}=drawing.sheet,ops=[],svg=[];
  const line=(a,b,hidden=false)=>{ops.push(`${hidden?'[1.5 1] 0 d':'[] 0 d'} ${n(a[0])} ${n(a[1])} m ${n(b[0])} ${n(b[1])} l S`);svg.push(`<path d="M${a.map(n).join(' ')}L${b.map(n).join(' ')}"${hidden?' stroke-dasharray="1.5 1"':''}/>`);};
  const text=(x,y,size,value)=>{ops.push(`BT /F1 ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(y)} Tm (${literal(value)}) Tj ET`);svg.push(`<text x="${n(x)}" y="${n(-y)}" font-size="${n(size)}" transform="scale(1,-1)" fill="#172b40" stroke="none">${xml(value)}</text>`);};
  line([10,10],[w-10,10]);line([w-10,10],[w-10,h-10]);line([w-10,h-10],[10,h-10]);line([10,h-10],[10,10]);
  text(15,h-19,5,'AXIOM ENGINEER CAD');text(15,h-27,3.5,drawing.title);text(15,25,3,'A4 | mm | scale 1:1 | third-angle projection');text(15,19,3,'GEOMETRIC REVIEW DRAFT - NOT RELEASED FOR MANUFACTURE');text(15,13,2.4,`Source revision ${drawing.source.revision} | ${drawing.source.contentHash.slice(0,23)}`);
  for(const view of drawing.views){const [dx,dy]=view.originMm;const shift=p=>[p[0]+dx,p[1]+dy];text(dx-12,dy+view.heightMm+8,3.5,view.name.toUpperCase());
    for(const [group,hidden]of [[view.hidden,true],[view.visible,false]])for(const p of group){if(p.kind==='line')line(shift(p.a),shift(p.b),hidden);else{
      const [cx,cy]=shift(p.center),r=p.radius;ops.push('[] 0 d');let a=0;ops.push(`${n(cx+r)} ${n(cy)} m`);
      // Sixteen cubic arcs: declared radial deviation < 0.0001 mm in this profile.
      for(let i=0;i<16;i++){const b=(i+1)*Math.PI/8,k=4/3*Math.tan((b-a)/4),ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);ops.push(`${n(cx+r*(ca-k*sa))} ${n(cy+r*(sa+k*ca))} ${n(cx+r*(cb+k*sb))} ${n(cy+r*(sb-k*cb))} ${n(cx+r*cb)} ${n(cy+r*sb)} c`);a=b;}ops.push('h S');svg.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`);
    }}
  }
  const dim=drawing.dimension,y=dim.yMm,x1=dim.x1Mm,x2=dim.x2Mm;line([x1,y-3],[x1,dim.extensionToYmm]);line([x2,y-3],[x2,dim.extensionToYmm]);line([x1,y],[x2,y]);for(const [x,sign]of [[x1,1],[x2,-1]]){line([x,y],[x+sign*2,y+1]);line([x,y],[x+sign*2,y-1]);}text((x1+x2)/2-8,y+3,3.5,`${dim.valueMm.toFixed(3)} mm`);
  text(115,13,2.4,drawing.source.versionId?'Retained '+drawing.source.versionId.slice(0,23):'Working model');
  const stream=`q\n2.834645669291339 0 0 2.834645669291339 0 0 cm\n0.18 w\n0.09 0.17 0.25 RG\n${ops.join('\n')}\nQ\n`;
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(w*72/25.4)} ${n(h*72/25.4)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`];
  let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return {pdfBase64:Buffer.from(pdf).toString('base64'),svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm"><rect width="${w}" height="${h}" fill="white"/><g transform="translate(0,${h}) scale(1,-1)" fill="none" stroke="#172b40" stroke-width="0.18">${svg.join('')}</g></svg>`,vector:{images:0,fonts:['Helvetica'],commands:ops.length,circleSegments:16,maxCircleDeviationMm:0.0001}};
}
