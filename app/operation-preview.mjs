import {world,rotate} from './cad-camera.mjs';

// Display-only operation layers never introduce selection IDs or native state.
export class OperationPreview{
 constructor(device){this.device=device;}
 set(layers=[]){
  this.clear();const faces=[],edges=[];
  for(const layer of layers){const mesh=layer.mesh,occurrence={position:layer.position,quaternion:layer.quaternion};
   for(const i of mesh.triangles)faces.push(...world(mesh.vertices.slice(i*3,i*3+3),occurrence),...rotate(mesh.normals.slice(i*3,i*3+3),occurrence.quaternion),0,3,0);
   for(const edge of mesh.edges.filter(e=>!e.displayHidden))for(let i=1;i<edge.points.length;i++)for(const p of [edge.points[i-1],edge.points[i]])edges.push(...world(p,occurrence),0,0,1,0,4,0);
  }
  const upload=values=>{const data=new Float32Array(values),buffer=this.device.createBuffer({size:Math.max(36,data.byteLength),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(buffer,0,data);return buffer;};
  this.faces=upload(faces);this.edges=upload(edges);this.faceCount=faces.length/9;this.edgeCount=edges.length/9;
 }
 draw(pass,facePipeline,edgePipeline){if(!this.faces)return;pass.setPipeline(facePipeline);pass.setVertexBuffer(0,this.faces);pass.draw(this.faceCount);pass.setPipeline(edgePipeline);pass.setVertexBuffer(0,this.edges);pass.draw(this.edgeCount);}
 clear(){this.faces?.destroy();this.edges?.destroy();this.faces=this.edges=null;}
}
