import {initialMainId} from './version-series.mjs';
import {BINDING_PROFILE} from './version-bindings.mjs';
import {MATE_PROFILE} from '../assembly/native-profile.mjs';
import {workspaceDemo} from './demo.mjs';
import {createVersion} from '../native/session.mjs';
import {verifyNative} from '../native/verify.mjs';
export const ANALYSIS_WORKSPACE_DEMO={id:'e4-m5-assembly-analysis',name:'E4.M5 Assembly Analysis and Versions'};
export async function workspaceAnalysisDemo(){
 const demo=await workspaceDemo({mates:true,motion:true}),base=demo.documents.find(([path])=>path==='Parts/Base.engineer.json')[1],pin=demo.documents.find(([path])=>path==='Parts/Pin.engineer.json')[1],assembly=demo.documents.find(([path])=>path==='Assembly.engineer.json')[1];
 base.native.graph.definitions[0].material={name:'Nominal steel',densityKgM3:7850};
 for(const doc of [base,pin]){doc.native.versions=[];doc.native.publications=[];const version=createVersion(doc,await verifyNative(doc));for(const dependency of assembly.native.graph.dependencies.filter(d=>d.documentId===doc.documentId))Object.assign(dependency,{profile:BINDING_PROFILE,versionNodeId:initialMainId(doc.documentId),policy:'Latest',channel:'version-series',effectiveVersion:version.id,snapshot:version.content});}
 for(const dependency of assembly.native.graph.dependencies)delete dependency.requestedVersion;assembly.native.graph.spatial.profile=MATE_PROFILE;
 assembly.native.versions=[];assembly.native.publications=[];assembly.native.graph.instances.push({id:'pin-2',ownerDefinitionId:'definition-main',definitionId:'definition-main',dependencyId:'dependency-pin',transform:{position:[3,0,6],quaternion:[0,0,0,1]}});await verifyNative(assembly);
 demo.anchor.metadata.name=ANALYSIS_WORKSPACE_DEMO.name;demo.index.name=ANALYSIS_WORKSPACE_DEMO.name;delete demo.layout.layout.positions.versions;demo.layout.layout.closed=demo.layout.layout.closed.filter(id=>id!=='versions');return demo;
}
