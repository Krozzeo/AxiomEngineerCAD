export const projectFiles=scene=>scene.projectFiles??[];
export const parentPath=path=>path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
export const leafName=path=>path.split('/').at(-1);
export function projectPath(path){if(!path||path.startsWith('/')||path.includes('\\')||/[<>:"|?*\x00-\x1f]/.test(path)||path.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Choose a valid project file name.');return path;}
export function editProjectFiles(scene,data){if(data.action==='create'){projectPath(data.path);if(projectFiles(scene).some(f=>f.path.toLowerCase()===data.path.toLowerCase()))throw Error('A file with that name already exists.');}if(data.action==='move')projectPath(data.to);return projectFiles(scene);}
