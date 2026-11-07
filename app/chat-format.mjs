// A small shared Markdown renderer. Build DOM nodes, never interpolate model HTML.
export function chatBlocks(text){
 const lines=String(text).replaceAll('\r\n','\n').split('\n'),blocks=[];
 for(let i=0;i<lines.length;){const line=lines[i];if(!line.trim()){i++;continue;}
  if(/^\s*```/.test(line)){const language=line.trim().slice(3),body=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))body.push(lines[i++]);if(i<lines.length)i++;blocks.push({tag:'pre',text:body.join('\n'),language});continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){blocks.push({tag:'h'+heading[1].length,text:heading[2]});i++;continue;}
  if(/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)){blocks.push({tag:'hr',text:''});i++;continue;}
  const list=line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);if(list){const ordered=!!list[2],items=[];while(i<lines.length){const item=lines[i].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);if(!item||!!item[2]!==ordered)break;items.push(item[3]);i++;}blocks.push({tag:ordered?'ol':'ul',items,start:ordered?Number(list[2]):undefined});continue;}
  if(/^>\s?/.test(line)){const body=[];while(i<lines.length&&/^>\s?/.test(lines[i]))body.push(lines[i++].replace(/^>\s?/,''));blocks.push({tag:'blockquote',text:body.join('\n')});continue;}
  const body=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,6}\s|\s*```|>\s?|\s*[-+*]\s|\s*\d+[.)]\s)/.test(lines[i]))body.push(lines[i++]);blocks.push({tag:'p',text:body.join('\n')});
 }return blocks;
}
export function chatInline(text){
 const result=[],pattern=/(`[^`\n]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^\s)]+\))/g;let end=0;
 for(const match of text.matchAll(pattern)){if(match.index>end)result.push({tag:'text',text:text.slice(end,match.index)});const token=match[0];
  if(token[0]==='`')result.push({tag:'code',text:token.slice(1,-1)});
  else if(token[0]==='['){const link=token.match(/^\[([^\]]+)\]\((.+)\)$/);if(/^https?:\/\//i.test(link[2]))result.push({tag:'a',text:link[1],href:link[2]});else result.push({tag:'text',text:token});}
  else{const bold=token.startsWith('**')||token.startsWith('__'),width=bold?2:1;result.push({tag:bold?'strong':'em',text:token.slice(width,-width)});}end=match.index+token.length;
 }if(end<text.length)result.push({tag:'text',text:text.slice(end)});return result;
}
export function renderChatText(document,container,text){
 container.classList.add('chat-markdown');container.replaceChildren();
 const inline=(node,value)=>{for(const part of chatInline(value)){if(part.tag==='text'){node.append(document.createTextNode(part.text));continue;}const child=document.createElement(part.tag);child.textContent=part.text;if(part.href){child.href=part.href;child.target='_blank';child.rel='noopener noreferrer';}node.append(child);}};
 for(const block of chatBlocks(text)){const node=document.createElement(block.tag);if(block.tag==='pre'){const code=document.createElement('code');code.textContent=block.text;node.append(code);}else if(block.items){if(block.start!==undefined)node.start=block.start;for(const value of block.items){const item=document.createElement('li');inline(item,value);node.append(item);}}else inline(node,block.text);container.append(node);}
}
