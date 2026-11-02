import './interaction-workbench.mjs';
import {editorDocument as document} from './editor-document.mjs';
const root=document.querySelector('.command-ribbon');function size(){for(const b of root.querySelectorAll('.operation-page button')){if(!b.dataset.commandSize)b.dataset.commandSize=b.dataset.sketchTool?'small':'medium';if(!b.title)b.title=b.textContent.trim();if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.textContent.trim());}}size();new MutationObserver(size).observe(root,{childList:true,subtree:true});
