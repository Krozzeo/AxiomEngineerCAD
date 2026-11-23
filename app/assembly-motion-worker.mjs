import {projectMotion} from '/assembly/solver.mjs';
const sessions=new Map();
self.onmessage=({data})=>{try{if(data.recipe){sessions.set(data.session,data.recipe);if(sessions.size>8)sessions.delete(sessions.keys().next().value);}const recipe=sessions.get(data.session);if(!recipe)throw Error('Motion session expired.');const result=projectMotion(recipe,data.targets);if(result.applicable)sessions.set(data.session,result.solvedRecipe);self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:error.message});}};
