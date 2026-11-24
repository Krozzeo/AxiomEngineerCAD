// Shared by focused development and the unchanged complete acceptance order.
// Each scenario owns its assertions; this catalogue only declares setup.
export const browserScenarios = [
  ['components', 'e4-m1', 'verifyComponentsUI', 'e4-m1-shared-components', 'E4.M1 Shared Components'],
  ['mates-motion', 'e4-m3', 'verifyE4M3UI', 'e4-m3-mates-motion', 'E4.M3 Mates and Motion'],
  ['mates-legacy', 'e4-m2', 'verifyE4M2UI', 'e4-m2-spatial-mates', 'E4.M2 Spatial Mates'],
  ['project', 'project-workspace', 'verifyProjectWorkspaceUI', 'e4-m1-project-workspace', 'E4.M1 Project Workspace'],
  ['production', 'e3-m6', 'verifyM6UI', 'e3-m6-production-part', 'E3.M6 Production Part'],
  ['step', 'e3-m5', 'verifyM5UI', 'e3-m5-step-interoperability', 'E3.M5 STEP Interoperability'],
  ['parameters', 'm4', 'verifyM4UI', 'e3-m4-dependency-workbench', 'E3.M4 Dependency Workbench'],
  ['finishing', 'm3', 'verifyM3UI', 'e3-m3-finishing-bracket', 'E3.M3 Finishing Bracket'],
  ['operation-ux', 'operation-ux', 'verifyOperationUX', 'e3-m2-feature-construction', 'E3.M2 Feature Construction'],
  ['feature-refinements', 'feature-refinements', 'verifyFeatureRefinementsUI', 'e3-m2-feature-construction', 'E3.M2 Feature Construction'],
  ['feature-construction', 'feature-construction', 'verifyFeatureConstructionUI', 'e3-m2-feature-construction', 'E3.M2 Feature Construction'],
  ['extended-sketch', 'extended-sketch', 'verifyExtendedSketchUI', 'e3-m1-extended-sketches', 'E3.M1 Extended Sketches'],
  ['feature-operations', 'feature-operations', 'verifyFeatureOperationsUI', 'e3-m2-feature-operations', 'E3.M2 Shaft and Flange'],
  ['sketch-interaction', 'sketch-interactions', 'verifyInteractionProjectUI', 'e2-m3-drawing-proposal', 'E2.M3 Drawing Proposal'],
  ['editing-recovery', 'editing-recovery', 'verifyRecoveryProjectUI', 'e2-m3-drawing-proposal', 'E2.M3 Drawing Proposal'],
  ['workbench', 'workbench', 'verifyWorkbenchUI', 'e1-m1-workbench', 'E1.M1 Model Workbench'],
  ['proof', 'proof', 'verifyProofUI', 'e0-m6-drawing-gpu', 'E0.M6 Drawing & GPU Lab'],
  ['versioned-assemblies', 'e4-m4', 'verifyE4M4UI', 'e4-m4-versioned-assemblies', 'E4.M4 Versioned Assembly'],
  ['assembly-analysis', 'e4-m5', 'verifyE4M5UI', 'e4-m5-assembly-analysis', 'E4.M5 Assembly Analysis and Versions'],
  ['version-lifecycle', 'e4-m5-lifecycle', 'verifyE4M5Lifecycle', 'e4-m5-assembly-analysis', 'E4.M5 Assembly Analysis and Versions'],
  ['startup', 'startup', 'verifyStartupRecovery'],
].map(([id, module, entry, fixtureId, fixtureName]) => ({
  id, module: `./browser-${module}.mjs`, entry,
  fixtures: fixtureId ? [{id: fixtureId, name: fixtureName}] : [],
}));

export const constructionScenarios = [...browserScenarios.slice(0, 11).map(s => s.id), 'versioned-assemblies', 'assembly-analysis', 'version-lifecycle'];

export function scenarioById(id) {
  const scenario = browserScenarios.find(s => s.id === id);
  if (!scenario) throw new Error(`Unknown browser scenario: ${id}`);
  return scenario;
}

export function constructionLaunchOptions(hardware = process.env.ENGINEER_HARDWARE === '1') {
  if (hardware) return {
    executablePath: process.env.ENGINEER_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, ignoreDefaultArgs: ['--disable-gpu-compositing'],
  };
  const args = process.platform === 'linux'
    ? ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-vulkan=swiftshader', '--enable-features=Vulkan']
    : ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--disable-gpu-watchdog', '--enable-dawn-features=allow_unsafe_apis', '--disable-dawn-features=use_dxc', '--enable-webgpu-developer-features', '--use-gpu-in-tests', '--enable-accelerated-2d-canvas'];
  return {channel: 'chromium', headless: true, ignoreDefaultArgs: ['--disable-gpu-compositing'], args};
}

export async function runBrowserScenario(id, options) {
  const scenario = scenarioById(id), started = performance.now();
  const measurement = {id, status: 'running'};
  (options.report.scenarios ??= []).push(measurement);
  try {
    const module = await import(scenario.module);
    await module[scenario.entry](options);
    measurement.status = 'passed';
  } catch (error) {
    measurement.status = 'failed';
    measurement.error = error.message;
    throw error;
  } finally {
    measurement.durationMs = Math.round(performance.now() - started);
  }
}
