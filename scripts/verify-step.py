# SPDX-License-Identifier: MIT
# QA-only independent native OCCT reader; never imports the product Wasm kernel.
import sys,json,math,hashlib
from pathlib import Path
if Path('.axiom/step-qa-novtk').exists(): sys.path.insert(0,str(Path('.axiom/step-qa-novtk').resolve()))
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID
root=Path('test-results/step');manifest=json.loads((root/'manifest.json').read_text());results=[]
def near(a,b): assert abs(a-b)<=max(1e-6,abs(b)*1e-8),(a,b)
for case in manifest['cases']:
 path=root/case['file'];raw=path.read_bytes();assert len(raw)==case['bytes'];assert hashlib.sha256(raw).hexdigest()==case['sha256']
 reader=STEPControl_Reader();assert reader.ReadFile(str(path))==IFSelect_RetDone;reader.SetSystemLengthUnit(1);assert reader.TransferRoots()>0;shape=reader.OneShape();assert BRepCheck_Analyzer(shape).IsValid()
 props=GProp_GProps();BRepGProp.VolumeProperties_s(shape,props);near(props.Mass(),case['volumeMm3']);p=props.CentreOfMass()
 for a,b in zip([p.X(),p.Y(),p.Z()],case['centerOfMassMm']):near(a,b)
 area=GProp_GProps();BRepGProp.SurfaceProperties_s(shape,area);near(area.Mass(),case['areaMm2'])
 box=Bnd_Box();BRepBndLib.AddOptimal_s(shape,box,False,False)
 for a,b in zip(box.Get(),sum(case['boundsMm'],[])):near(a,b)
 count=0;explorer=TopExp_Explorer(shape,TopAbs_SOLID)
 while explorer.More():count+=1;explorer.Next()
 assert count==case['solids'];results.append({'file':case['file'],'valid':True,'solids':count,'volumeMm3':props.Mass(),'sha256':case['sha256']})
(root/'independent-report.json').write_text(json.dumps({'reader':'QA-only cadquery-ocp-novtk 7.9.3.1.1 / native OCCT 7.9.3','passed':True,'cases':results},indent=2)+'\n')
print('Independent STEP reader passed',len(results),'unit/placement/B-Rep round trips.')
