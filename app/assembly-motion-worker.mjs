import {solveAssembly} from '/assembly/solver.mjs';
self.onmessage=({data})=>{try{const result=solveAssembly(data.recipe,{targets:data.targets,projectTargets:true});self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:error.message});}};
