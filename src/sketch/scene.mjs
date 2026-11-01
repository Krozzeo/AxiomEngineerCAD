import {sketchScene} from './profile.mjs';
import {PARAMETRIC_PROFILE} from './relations.mjs';
import {solveParametric,mobility} from './solver.mjs';
import {check} from '../errors.mjs';
import {TOLERANCES} from '../lab/profile.mjs';
export async function solvedSketchScene(value){const scenes=sketchScene(value);for(const scene of scenes){const feature=value.native.graph.features.find(f=>f.id===scene.id);if(feature.data.profile!==PARAMETRIC_PROFILE)continue;const solved=await solveParametric(feature.data);if(solved.valid)check(mobility(feature.data.entities,feature.data.constraints).maxResidualMm<=TOLERANCES.solverResidualMm,'InvalidGeometry','Persisted sketch coordinates do not satisfy driving relations. Original source preserved.');scene.status=solved.status;scene.remainingDOF=solved.remainingDOF;for(const e of scene.entities)e.state=solved.entityStates[e.id];}return scenes;}
