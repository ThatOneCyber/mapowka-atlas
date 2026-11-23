"""Generalized display layers only; scoring geometry is never modified."""
from pathlib import Path
import json
from shapely.geometry import shape,mapping,MultiPolygon
root=Path(__file__).parent
def read(name,prefix):
    s=(root/'dist'/name).read_text(encoding='utf-8-sig')
    return json.loads(s.strip()[len(prefix):].removesuffix(';'))
coast=shape(read('coast.js','const coastline='))
world=read('world.js','const world=')
def count(g):
    if isinstance(g,(list,tuple)):
        return sum(count(x) for x in g) if g and isinstance(g[0],(list,tuple)) else 1
    return count(g['coordinates'])
layers={}
for name,tolerance,min_area in [('low',.1,.015),('medium',.035,.0005)]:
    land=MultiPolygon([p.simplify(tolerance,preserve_topology=True) for p in coast.geoms if p.area>=min_area])
    layers[name]={'coast':mapping(land),'borders':{'type':'FeatureCollection','features':[
        {'type':'Feature','properties':{},'geometry':mapping(shape(f['geometry']).simplify(tolerance,preserve_topology=True))}
        for f in world['features'] if f['properties'].get('ADMIN')!='Antarctica']}}
    print(name,'coast vertices:',count(mapping(land)),'original:',count(mapping(coast)))
(root/'dist/display.js').write_text('const displayLayers='+json.dumps(layers,separators=(',',':'))+';',encoding='utf-8')

