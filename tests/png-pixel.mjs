import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
// Read Chromium's 8-bit RGB/RGBA screenshots without a new runtime dependency.
export function pngPixels(buffer){
 assert.equal(buffer.subarray(1,4).toString(),'PNG');let width,height,channels;const chunks=[];
 for(let at=8;at<buffer.length;){const n=buffer.readUInt32BE(at),type=buffer.subarray(at+4,at+8).toString(),data=buffer.subarray(at+8,at+8+n);at+=12+n;
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;assert.equal(data[12],0);}
  if(type==='IDAT')chunks.push(data);
 }
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(height*stride);let at=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[at++];assert.ok(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;pixels[i]=(raw[at++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 return {width,height,near(x,y,color,radius=3){for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const px=Math.round(x)+dx,py=Math.round(y)+dy;if(px>=0&&py>=0&&px<width&&py<height&&color.every((n,k)=>Math.abs(pixels[(py*width+px)*channels+k]-n)<5))return true;}return false;}};
}
