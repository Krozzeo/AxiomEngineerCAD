# SPDX-License-Identifier: MIT
# Independent native OCCT 7.9.3 fixture generator; not the product's Wasm exporter.
import sys,json,math
from pathlib import Path
if Path('.axiom/step-qa-novtk').exists():sys.path.insert(0,str(Path('.axiom/step-qa-novtk').resolve()))
from OCP.gp import gp_Pnt,gp_Dir,gp_Ax2
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox,BRepPrimAPI_MakeCylinder
from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut
from OCP.STEPControl import STEPControl_Writer,STEPControl_AsIs
from OCP.Interface import Interface_Static
from OCP.IFSelect import IFSelect_RetDone
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SHELL
root=Path('tests/fixtures/step');root.mkdir(parents=True,exist_ok=True)
block=BRepPrimAPI_MakeBox(gp_Pnt(2,3,4),10,20,30).Shape()
plate=BRepPrimAPI_MakeBox(gp_Pnt(0,0,0),40,30,8).Shape()
bore=BRepPrimAPI_MakeCylinder(gp_Ax2(gp_Pnt(10,15,0),gp_Dir(0,0,1)),3,8).Shape()
drilled=BRepAlgoAPI_Cut(plate,bore).Shape()
cylinder=BRepPrimAPI_MakeCylinder(gp_Ax2(gp_Pnt(40,0,0),gp_Dir(1,0,0)),5,12).Shape()
shells=TopExp_Explorer(block,TopAbs_SHELL)
fixtures=[('block-mm',block,'MM',6000,[[2,3,4],[12,23,34]]),('block-inch',block,'INCH',6000,[[2,3,4],[12,23,34]]),('drilled-plate',drilled,'MM',(1200-9*math.pi)*8,[[0,0,0],[40,30,8]]),('x-cylinder',cylinder,'CM',300*math.pi,[[40,-5,-5],[52,5,5]]),('open-shell',shells.Current(),'MM',None,None)]
manifest={'generator':'Original MIT fixtures built through cadquery-ocp-novtk 7.9.3.1.1 / native OCCT 7.9.3','cases':[]}
for name,shape,unit,volume,bounds in fixtures:
 writer=STEPControl_Writer();Interface_Static.SetCVal_s('write.step.unit',unit);Interface_Static.SetCVal_s('xstep.cascade.unit','MM');assert writer.Transfer(shape,STEPControl_AsIs)==IFSelect_RetDone
 path=root/(name+'.step');assert writer.Write(str(path))==IFSelect_RetDone
 # Stable, non-personal source metadata. Only the header timestamp is normalized.
 import re
 text=path.read_text(encoding='utf-8');text=re.sub(r"'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'", "'2026-11-14T00:00:00'",text);path.write_text(text,encoding='utf-8',newline='\n')
 manifest['cases'].append({'name':name,'file':path.name,'fileUnit':unit,'volumeMm3':volume,'boundsMm':bounds,'solids':0 if volume is None else 1})
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'independent STEP fixtures.')
