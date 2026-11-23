from pathlib import Path
import base64,re
root=Path(__file__).parent
s=(root/'dist/index.html').read_text(encoding='utf-8')
for css in ['vendor/leaflet.css','style.css']:
    body=(root/'dist'/css).read_text(encoding='utf-8-sig')
    if css=='style.css':
        font=base64.b64encode((root/'dist/fonts/Nunito.ttf').read_bytes()).decode()
        body=body.replace('fonts/Nunito.ttf','data:font/ttf;base64,'+font)
        caveat=base64.b64encode((root/'dist/fonts/Caveat.ttf').read_bytes()).decode()
        body=body.replace('fonts/Caveat.ttf','data:font/ttf;base64,'+caveat)
    else:
        body=re.sub(r'url\(images/[^)]+\)','none',body)
    s=s.replace(f'<link rel="stylesheet" href="{css}">','<style>'+body+'</style>')
for js in ['vendor/leaflet.js','data.js','geometry.js','coast.js','world.js','display.js','core.js','app.js']:
    body=(root/'dist'/js).read_text(encoding='utf-8-sig')
    body=re.sub(r'//# sourceMappingURL=.*','',body)
    s=s.replace(f'<script src="{js}"></script>','<script>'+body+'</script>')
for license in ['fonts/OFL.txt','fonts/Caveat-OFL.txt','vendor/LEAFLET-LICENSE.txt']:
    s+='<!-- '+(root/'dist'/license).read_text(encoding='utf-8')+' -->'
(root/'mapowka-atlas-offline.html').write_text(s,encoding='utf-8')
print('Offline HTML ready')
