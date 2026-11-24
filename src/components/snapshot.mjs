import {validateContent} from '../native/schema.mjs';
// Materialize only the verified effective source, never the current source file.
export function documentFromSnapshot(content){
 validateContent(content);
 return {formatId:'axiom.engineer-document',formatVersion:1,documentId:content.documentId,revision:0,metadata:structuredClone(content.metadata),
  ...(content.experiment?{experiment:structuredClone(content.experiment)}:{}),...(content.assembly?{assembly:structuredClone(content.assembly)}:{}),
  native:{graph:structuredClone(content.graph),versions:structuredClone(content.localVersions),publications:[]}};
}
