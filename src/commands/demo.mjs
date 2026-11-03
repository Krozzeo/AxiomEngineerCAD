import {blank} from '../document.mjs';
import {upgrade} from '../native/schema.mjs';
import {recipe,KERNEL} from '../lab/profile.mjs';
import {runWorker} from '../lab/jobs.mjs';
import {createVersion} from '../native/session.mjs';
export async function reviewDemo(sourceConsumer){const value=upgrade({...blank('E0.M5 Review Lab'),provisional:'E0.M2',experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe()}});value.native.graph.dependencies=structuredClone(sourceConsumer.native.graph.dependencies);value.native.graph.instances=structuredClone(sourceConsumer.native.graph.instances);value.native.versions.push(createVersion(value,(await runWorker('native-verify',{document:value})).result));return value;}
