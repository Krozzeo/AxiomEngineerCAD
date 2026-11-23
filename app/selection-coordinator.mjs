// Panel selection has one owner; viewport highlights are a presentation of it.
import {editorDocument as document} from './editor-document.mjs';
let owner=null,clearing=false;
const clearers=new Map();window.engineerSelectionOwner=()=>owner;
window.engineerRegisterSelection=(name,clear)=>clearers.set(name,clear);
window.engineerClaimSelection=name=>{
 if(clearing)return;clearing=true;
 try{for(const [key,clear]of clearers)if(key!==name)clear();if(owner!==name&&name!=='model')void window.engineerViewport?.clear();owner=name;}
 finally{clearing=false;}
};
window.engineerClearSelection=()=>{
 if(clearing)return;clearing=true;
 try{owner=null;for(const clear of clearers.values())clear();window.engineerHoverSource?.(null);window.engineerSketchReferences?.([]);void window.engineerViewport?.clear();}
 finally{clearing=false;}
};
document.addEventListener('click',event=>{
 const target=event.target;if(target.closest?.('input,textarea,select,[contenteditable=true]'))return;
 if(target.closest?.('#project-content [data-project-path]'))window.engineerClaimSelection('project');
 else if(target.closest?.('[data-component-path]'))window.engineerClaimSelection('components');
 else if(target.closest?.('#wb-tree-items [data-source-id]'))window.engineerClaimSelection('features');
 else if(target.matches?.('#project-icons,#project-files,#wb-tree-items,.wb-tree'))window.engineerClearSelection();
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!event.target.closest?.('input,textarea,select,[contenteditable=true]')&&!window.engineerSketch?.operationActive)window.engineerClearSelection();
});
window.addEventListener('engineer-selection-changed',event=>{if(!event.detail&&owner==='model')window.engineerClearSelection();});
document.addEventListener('pointerdown',event=>{if(event.button===0&&event.target.id==='proof-canvas')window.engineerClaimSelection('model');},true);

window.addEventListener('engineer-workspace-activated',()=>window.engineerClearSelection());

for(const name of ['pointerdown','click','keydown'])document.addEventListener(name,event=>{
 if(!window.engineerWorkspaceTransition||event.target.closest?.('.part-tabs,.part-tab-picker')&&(!event.ctrlKey&&!event.metaKey))return;
 event.preventDefault();event.stopImmediatePropagation();
},true);
