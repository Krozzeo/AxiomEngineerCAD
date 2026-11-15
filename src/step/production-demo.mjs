import {dependencyDemo} from '../parameters/dependency-demo.mjs';import {command} from '../commands/domain.mjs';import {verifyNative} from '../native/verify.mjs';import {createVersion} from '../native/session.mjs';
export const PRODUCTION_DEMO={id:'e3-m6-production-part',name:'E3.M6 Production Part'};
export async function productionDemo(){let d=await dependencyDemo();d.metadata.name=PRODUCTION_DEMO.name;d=command(d,'cad.material.set.v1',{name:'Custom nominal material',densityKgM3:2700});const proof=await verifyNative(d);d.native.versions.push(createVersion(d,proof));return d;}
