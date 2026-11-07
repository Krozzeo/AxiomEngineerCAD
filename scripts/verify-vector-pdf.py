"""Independent PDF parser/vector and PDFium raster checks; QA dependencies only."""
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import sys
import pdfplumber
from pypdf import PdfReader

folder = Path(sys.argv[1] if len(sys.argv) > 1 else 'test-results')
pt = 72 / 25.4
results = []
def near(a, b, eps=0.0001):
    assert abs(a - b) < eps, (a, b)

integrated = '--integrated' in sys.argv
extrusion = '--extrusion' in sys.argv
proposal = '--proposal' in sys.argv
reconstruction = '--reconstruction' in sys.argv
fixtures = [('integrated-a4-40',40,10),('integrated-a4-60',60,15),('integrated-a4-historical',40,10)] if integrated else [('drawing-a4-40',40,10),('drawing-a4-60',60,10)]
if extrusion:
    fixtures = [('e2-m2-extrusion',40,10)]
if proposal:
    fixtures = [('e2-m3-proposal',40,10)]
if reconstruction:
    fixtures = [('e2-m4-reconstructed',48,12)]
radius = 4 if reconstruction else 3
for stem,width,depth in fixtures:
    path = folder / f'{stem}.pdf'
    reader = PdfReader(path, strict=True)
    assert len(reader.pages) == 1
    page = reader.pages[0]
    page_mm = [297,210] if proposal else [210,297]
    near(float(page.mediabox.width) / pt, page_mm[0])
    near(float(page.mediabox.height) / pt, page_mm[1])
    assert len(page.images) == 0
    text = page.extract_text()
    assert all(t in text for t in ['FRONT', 'third-angle', 'NOT RELEASED FOR MANUFACTURE'])
    if proposal:
        assert 'TOP' not in text and f'{width}.000 mm' not in text
        assert f'{depth}.000 mm' in text
    else:
        assert 'TOP' in text and f'{width}.000 mm' in text
        assert (f'{depth}.000 mm' if extrusion or reconstruction else 'RIGHT') in text
    raw = path.read_bytes()
    assert all(t not in raw for t in [b'/JavaScript', b'/Launch', b'/OpenAction', b'/Image'])
    with pdfplumber.open(path) as doc:
        p = doc.pages[0]
        assert not p.images
        # Independent fixed fixture oracle: top plate width and height, not emitter metadata.
        top_y, center_x = (58, 148.5) if proposal else ((225, 105) if extrusion or reconstruction else (220, 60))
        top_edges = [line for line in p.lines if abs(line['y0'] / pt - top_y) < .0001 and abs(line['y1'] - line['y0']) < .0001]
        assert any(abs(line['x0'] / pt - (center_x - width / 2)) < .0001 and abs(line['x1'] / pt - (center_x + width / 2)) < .0001 for line in top_edges)
        hidden = [line for line in p.lines if line['dash'][0]]
        assert len(hidden) == (2 if extrusion or proposal or reconstruction else 4)
        for line in hidden:
            near(line['height'] / pt, depth)
            near(line['width'], 0)
        if proposal:
            assert not p.curves
            cubics, deviation = 0, 0
        else:
            assert len(p.curves) == 1
            circle = p.curves[0]
            near(circle['width'] / pt, 2*radius)
            near(circle['height'] / pt, 2*radius)
            cx, cy = (circle['x0'] + circle['x1']) / 2, (circle['top'] + circle['bottom']) / 2
            deviation = 0
            previous = None
            cubics = 0
            for item in circle['path']:
                if item[0] == 'm':
                    previous = item[1]
                elif item[0] == 'c':
                    controls = [previous, *item[1:]]
                    for i in range(25):
                        t = i / 24
                        weights = [(1-t)**3, 3*(1-t)**2*t, 3*(1-t)*t*t, t**3]
                        x, y = [sum(weights[j] * controls[j][axis] for j in range(4)) for axis in range(2)]
                        deviation = max(deviation, abs(math.hypot(x-cx, y-cy) / pt - radius))
                    previous = controls[-1]
                    cubics += 1
            assert cubics == 16
            assert deviation < .0001, deviation
        image = folder / f'{stem}-rendered.png'
        p.to_image(resolution=120).save(image)
        results.append({'file':path.name, 'sha256':hashlib.sha256(raw).hexdigest(), 'pageMm':page_mm, 'widthMm':width, 'depthMm':depth, 'rasterImages':0, 'hiddenLines':len(hidden), 'circleCubicSegments':cubics, 'maxMeasuredCircleDeviationMm':deviation, 'rendered':image.name})
profile = 'E2.M4-independent-pdf/1' if reconstruction else 'E2.M3-independent-pdf/1' if proposal else ('E2.M2-independent-pdf/1' if extrusion else ('E0.M7-independent-pdf/1' if integrated else 'E0.M6-independent-pdf/1'))
report = {'passed':True, 'profile':profile, 'readers':{n:importlib.metadata.version(n) for n in ['pypdf','pdfplumber','pypdfium2']}, 'files':results}
(folder / ('reconstruction-pdf-validation.json' if reconstruction else 'proposal-pdf-validation.json' if proposal else ('extrusion-pdf-validation.json' if extrusion else ('integrated-pdf-validation.json' if integrated else 'pdf-validation.json')))).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
