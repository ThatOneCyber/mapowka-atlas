/* Mapówka Atlas — local vector atlas, Leaflet, no tile service dependency. */
(()=>{'use strict';
const $=s=>document.querySelector(s), core=MapowkaCore;
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem('mapowka-atlas:'+key))??fallback}catch{return fallback}},set(key,value){try{localStorage.setItem('mapowka-atlas:'+key,JSON.stringify(value))}catch{}}};
const knownIds=new Set(regions.map(r=>r.id));
regions.forEach(r=>{r.outline=outlines[r.id];[r.lon,r.lat]=r.outline.center;r.area=(r.outline.bounds[2]-r.outline.bounds[0])*(r.outline.bounds[3]-r.outline.bounds[1])});
const byId=new Map(regions.map(r=>[r.id,r]));
let mode='learn', selected=null, reviewId=null, theme=storage.get('theme','orange');
let enabled=new Set(storage.get('categories',[0,1,2,3,4,5]).filter(i=>Number.isInteger(i)&&i>=0&&i<6));
const session={active:false,index:0,queue:[],answers:[],locked:false,outlinesVisible:false};
let completed=null;
const map=L.map('map',{crs:L.CRS.EPSG4326,zoomControl:false,attributionControl:true,preferCanvas:true,minZoom:-1,maxZoom:11,zoomSnap:.25,zoomDelta:.5,worldCopyJump:false,maxBounds:[[-85,-200],[85,200]],maxBoundsViscosity:.8,keyboard:true,scrollWheelZoom:true,doubleClickZoom:false,tapTolerance:12});
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>');
map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>');
map.createPane('geography');map.getPane('geography').style.zIndex=410;
map.createPane('tolerance');map.getPane('tolerance').style.zIndex=400;map.getPane('tolerance').style.pointerEvents='none';
map.createPane('answer');map.getPane('answer').style.zIndex=450;map.getPane('answer').style.pointerEvents='none';
const base=L.geoJSON(displayLayers.low.coast,{interactive:false,style:{color:'#7699aa',weight:.65,opacity:.48,fillColor:'#294755',fillOpacity:1,smoothFactor:1.5}}).addTo(map);
const borders=L.geoJSON(displayLayers.low.borders,{interactive:false,style:{color:'#8ba0ae',weight:.5,opacity:.32,fill:false,smoothFactor:1}}).addTo(map);
const graticule=L.layerGroup().addTo(map);
for(let lat=-60;lat<=60;lat+=30)L.polyline([[lat,-180],[lat,180]],{interactive:false,color:'#9bb4c6',weight:.6,opacity:lat===0?.19:.08}).addTo(graticule);
for(let lng=-150;lng<=180;lng+=30)L.polyline([[-80,lng],[80,lng]],{interactive:false,color:'#9bb4c6',weight:.6,opacity:.08}).addTo(graticule);
L.control.scale({position:'bottomleft',imperial:false,maxWidth:100}).addTo(map);
const shapeGroup=L.layerGroup().addTo(map),bufferGroup=L.layerGroup().addTo(map),labelGroup=L.layerGroup().addTo(map),answerGroup=L.layerGroup().addTo(map);
const regionRenderer=L.svg({pane:'geography',padding:.25});
const bufferRenderer=L.svg({pane:'tolerance',padding:.25});
const shapeCache=new Map(),bufferCache=new Map();
let displayLevel='low';
function updateDisplay(){const z=map.getZoom(),level=z<3.5?'low':z<5.5?'medium':'full';if(level===displayLevel)return;displayLevel=level;const data=level==='full'?{coast:coastline,borders:world}:displayLayers[level];base.clearLayers();base.addData(data.coast);borders.clearLayers();borders.addData(data.borders)}
map.on('zoomend',updateDisplay);
const resizeObserver=new ResizeObserver(()=>map.invalidateSize({pan:false}));resizeObserver.observe($('#map'));
function accent(){return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()}
function current(){return byId.get(session.queue[session.index])}
function pool(){return regions.filter(r=>enabled.has(r.cat))}
function categoryCount(){return new Set(session.queue.map(id=>byId.get(id).cat)).size}
function title(text){$('#task-title').textContent=text}
function setBadge(cat,show){const badge=$('#task-category');badge.hidden=!show;if(show){badge.textContent=groups[cat][0];badge.style.setProperty('--category',groups[cat][1])}}
function answerText(head='',detail='',state=''){ $('#answer-title').textContent=head;$('#answer-detail').textContent=detail;$('.answer-bar').dataset.state=state;}
function closeSidebar(){ $('#sidebar').classList.remove('open');$('#sidebar-toggle').setAttribute('aria-expanded','false')}
function applyTheme(){document.documentElement.dataset.theme=theme;$('#theme').setAttribute('aria-label',`Zmień motyw na ${theme==='orange'?'fioletowy':'pomarańczowy'}`);storage.set('theme',theme);if(selected)renderMap();}
function home(animate=true){map.fitBounds([[-57,-177],[81,177]],{padding:[18,18],animate,duration:.5})}
function focus(r,animate=true){let [west,south,east,north]=r.outline.bounds;map.fitBounds([[south,west],[north,east]],{padding:[50,65],maxZoom:8.5,animate,duration:.6})}
// One shared hover tooltip prevents a trail of stale layer-bound tooltips.
const hoverTip=L.tooltip({direction:'top',offset:[0,-8],opacity:1,interactive:false});
let hoveredRegion=null,mapMoving=false,pointerHeld=false;
function clearHover(){
 if(hoveredRegion&&hoveredRegion!==selected&&shapeCache.has(hoveredRegion))shapeCache.get(hoveredRegion).setStyle({weight:1.25,fillOpacity:.27});
 hoveredRegion=null;map.closeTooltip(hoverTip);
}
function hoverRegion(r,e){
 if(mode!=='learn'||session.active||completed||mapMoving||pointerHeld||e.originalEvent?.buttons){clearHover();return}
 if(hoveredRegion!==r.id){clearHover();hoveredRegion=r.id;if(selected!==r.id)shapeCache.get(r.id).setStyle({weight:2,fillOpacity:.5});hoverTip.setContent(r.name)}
 hoverTip.setLatLng(e.latlng);if(!map.hasLayer(hoverTip))hoverTip.addTo(map);
}
map.on('dragstart zoomstart movestart',()=>{mapMoving=true;clearHover()});
map.on('moveend zoomend',()=>{mapMoving=false;clearHover()});
map.getContainer().addEventListener('pointerdown',()=>{pointerHeld=true;clearHover()});
document.addEventListener('pointerup',()=>{pointerHeld=false});
document.addEventListener('pointercancel',()=>{pointerHeld=false;clearHover()});
map.getContainer().addEventListener('pointerleave',clearHover);
window.addEventListener('blur',()=>{pointerHeld=false;clearHover()});
function shapeFor(r){if(!shapeCache.has(r.id)){
 const layer=L.geoJSON(r.outline.geometry,{pane:'geography',renderer:regionRenderer,smoothFactor:1.2,bubblingMouseEvents:false,style:{color:groups[r.cat][1],weight:1.25,fillColor:groups[r.cat][1],fillOpacity:.27}});
 layer.on('click',e=>{if(mapMoving)return;if(session.active){answer(((e.latlng.lng+180)%360+360)%360-180,e.latlng.lat)}else if(mode==='learn'&&!completed)selectRegion(r)});
 layer.on('mouseover mousemove',e=>hoverRegion(r,e));
 layer.on('mouseout',()=>{if(hoveredRegion===r.id)clearHover()});
 shapeCache.set(r.id,layer)
 }return shapeCache.get(r.id)}
function bufferFor(r){if(!bufferCache.has(r.id))bufferCache.set(r.id,L.geoJSON(r.outline.acceptance,{pane:'tolerance',renderer:bufferRenderer,interactive:false,smoothFactor:1.2,style:{color:groups[r.cat][1],weight:1,dashArray:'4 4',fillColor:groups[r.cat][1],fillOpacity:.07,opacity:.8}}));return bufferCache.get(r.id)}
function drawPoint(lng,lat,color){L.circleMarker([lat,lng],{pane:'answer',interactive:false,radius:6,color:'#f5f7fb',weight:2,fillColor:color,fillOpacity:1}).addTo(answerGroup)}
function renderMap(){clearHover();shapeGroup.clearLayers();bufferGroup.clearLayers();labelGroup.clearLayers();
 let visible=[];
 if(mode==='learn'&&!session.active&&!completed)visible=pool();
 else if(!completed&&(session.active?session.outlinesVisible:$('#show-outlines').checked))visible=session.active?session.queue.map(id=>byId.get(id)):pool();
 else if(session.active&&session.locked&&mode==='practice')visible=[current()];
 else if(completed&&reviewId)visible=[byId.get(reviewId)];
 visible.sort((a,b)=>b.area-a.area).forEach(r=>{const layer=shapeFor(r),active=selected===r.id||reviewId===r.id||(session.active&&session.locked&&mode==='practice'&&current()?.id===r.id);layer.setStyle({color:active?'#fff':groups[r.cat][1],fillColor:active?accent():groups[r.cat][1],fillOpacity:active?.52:.27,weight:active?2:1.25});if($('#show-buffer').checked&&(mode==='learn'||(session.locked&&mode==='practice')||reviewId))bufferFor(r).addTo(bufferGroup);layer.addTo(shapeGroup);if($('#show-labels').checked&&mode==='learn'){const node=document.createElement('span');node.textContent=r.name;L.tooltip({permanent:true,direction:'center',className:'region-name',interactive:false,opacity:1}).setLatLng([r.lat,r.lon]).setContent(node).addTo(labelGroup)}});
 if($('#show-borders').checked){if(!map.hasLayer(borders))borders.addTo(map)}else borders.remove();
}
function renderCatalog(){const list=$('#region-list');list.replaceChildren();const query=$('#search').value.trim().toLocaleLowerCase('pl');const items=pool().filter(r=>r.name.toLocaleLowerCase('pl').includes(query));if(!items.length){let e=document.createElement('p');e.className='empty-list';e.textContent=pool().length?'Brak pasujących regionów.':'Wybierz co najmniej jedną warstwę.';list.append(e)}items.forEach(r=>{let b=document.createElement('button');b.classList.toggle('selected',selected===r.id);let dot=document.createElement('span');dot.className='category-dot';dot.style.background=groups[r.cat][1];let text=document.createElement('span');text.textContent=r.name;b.append(dot,text);b.onclick=()=>{selectRegion(r);focus(r);closeSidebar()};list.append(b)})}
function renderControls(){const active=session.active;$('#total-count').textContent=pool().length;$('#session-start').disabled=pool().length===0;$('#session-start').hidden=active||!!completed;$('#session-end').hidden=!active;$('#catalog').hidden=mode!=='learn'||!!completed;$('#show-labels').disabled=mode!=='learn'||active;$('#show-outlines').disabled=active;$('#show-buffer').disabled=mode==='exam'&&active;$('#show-borders').disabled=false;$('#select-all').disabled=$('#select-none').disabled=active;$('#categories').querySelectorAll('input').forEach(e=>{e.disabled=active;e.checked=enabled.has(+e.value)});$('#close-detail').hidden=!selected||active||!!completed;if(!completed)$('#close-detail').textContent='Zamknij';$('#skip').hidden=!active||session.locked;$('#next').hidden=!active||!session.locked;$('#next').textContent=session.index===session.queue.length-1?'Zobacz wynik':'Dalej';$('#progress-track').hidden=!active;$('#progress-track').setAttribute('aria-valuemax',session.queue.length||1);$('#progress-track').setAttribute('aria-valuenow',session.answers.length);$('#progress-fill').style.width=(session.queue.length?session.answers.length/session.queue.length*100:0)+'%';$('#sidebar-toggle').textContent=active?'Kategorie':'Warstwy';}
function render(){renderControls();renderCatalog();renderMap()}
function selectRegion(r){if(session.active)return;selected=r.id;title(r.name);setBadge(r.cat,true);$('#task-meta').textContent='';answerText(r.name,r.outline.generalized?'Obrys autorski — do porównania z atlasem.':r.outline.source);render();}
function idle(){selected=null;reviewId=null;answerGroup.clearLayers();$('#results').hidden=true;$('#mode-caption').textContent={learn:'Mapa do nauki',practice:'Ćwiczenia',exam:'Sprawdzian'}[mode];title(mode==='learn'?'Mapa świata':mode==='practice'?'Wybierz kategorie':'Wybierz kategorie');setBadge(0,false);$('#task-meta').textContent=mode==='exam'?'Pierwszy klik jest ostateczny. Wynik na końcu.':'';$('#session-start').textContent=mode==='exam'?'Rozpocznij sprawdzian':'Rozpocznij ćwiczenia';answerText();document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));render();}
function changeMode(next){mode=next;session.active=false;session.answers=[];session.queue=[];session.index=0;session.locked=false;completed=null;storage.set('session',null);idle();closeSidebar()}
function saveSession(){storage.set('session',session.active?{mode,queue:session.queue,index:session.index,answers:session.answers,locked:session.locked,outlinesVisible:session.outlinesVisible,enabled:[...enabled]}:null)}
function start(ids){if(!ids?.length)ids=pool().map(r=>r.id);if(!ids.length)return;if(mode==='learn')mode='practice';session.active=true;session.outlinesVisible=$('#show-outlines').checked;session.queue=core.shuffle(ids);session.index=0;session.answers=[];session.locked=false;completed=null;selected=null;reviewId=null;$('#results').hidden=true;$('#mode-caption').textContent=mode==='exam'?'Sprawdzian':'Ćwiczenia';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));closeSidebar();home(false);showQuestion();saveSession();}
function showQuestion(){selected=null;reviewId=null;answerGroup.clearLayers();const r=current();title(r.name);setBadge(r.cat,categoryCount()>1);$('#task-meta').textContent=`${session.index+1} / ${session.queue.length}`;answerText();if(session.locked)showFeedback(session.answers[session.answers.length-1]);render();}
function showFeedback(a){const r=current();if(mode==='exam'){answerText('Odpowiedź zapisana');if(a.point)drawPoint(...a.point,accent());return;}if(a.skipped)answerText(`To tutaj: ${r.name}`,'Zaznaczony obrys pokazuje poprawne położenie.','wrong');else if(a.accepted)answerText(`Dobrze! ${r.name}`,a.tolerance?'Trafienie w strefę tolerancji +20%.':'','correct');else answerText(`To tutaj: ${r.name}`,'Twój punkt jest zaznaczony na różowo.','wrong');if(a.point)drawPoint(...a.point,a.accepted?'#86d8b0':'#ff8d9c');}
function answer(lng,lat,skipped=false){if(!session.active||session.locked)return;const r=current();const verdict=skipped?{accepted:false,core:false,tolerance:false}:core.classify(r.outline,lng,lat);const a={id:r.id,point:skipped?null:[lng,lat],skipped,...verdict};if(!core.recordAnswer(session,a))return;showFeedback(a);renderControls();renderMap();if(mode==='practice'&&!a.accepted)focus(r);saveSession();}
map.on('click',e=>{if(session.active)answer(((e.latlng.lng+180)%360+360)%360-180,e.latlng.lat);else if(mode==='learn'&&!completed){const lng=((e.latlng.lng+180)%360+360)%360-180;const matches=pool().filter(r=>core.contains(r.outline.geometry,lng,e.latlng.lat)).sort((a,b)=>a.area-b.area);if(matches.length)selectRegion(matches[0])}});
function advance(){if(!session.active||!session.locked)return;if(session.index+1===session.queue.length){finish();return}session.index++;session.locked=false;showQuestion();saveSession();}
function finish(){if(!session.answers.length){changeMode(mode);return}if(mode==='exam'&&session.answers.length<session.queue.length){session.queue.slice(session.answers.length).forEach(id=>session.answers.push({id,point:null,skipped:true,accepted:false,core:false,tolerance:false}))}session.active=false;selected=null;reviewId=null;answerGroup.clearLayers();completed={mode,answers:session.answers.slice(),total:session.answers.length,planned:session.queue.length};const correct=completed.answers.filter(a=>a.accepted).length;const previous=storage.get('history',[]);storage.set('history',[{at:new Date().toISOString(),mode,correct,total:completed.total,ids:completed.answers.map(a=>a.id)} ,...previous].slice(0,30));storage.set('session',null);title('Sesja zakończona');setBadge(0,false);$('#task-meta').textContent=completed.total===completed.planned?'':`Odpowiedziano na ${completed.total} z ${completed.planned}`;answerText();$('#result-title').textContent=`${correct} / ${completed.total}`;$('#result-description').textContent=`${Math.round(correct/completed.total*100)}% poprawnych odpowiedzi`;const list=$('#result-list');list.replaceChildren();completed.answers.forEach(a=>{const r=byId.get(a.id),b=document.createElement('button');b.className='result-row'+(a.accepted?'':' wrong');const verdict=document.createElement('span');verdict.className='verdict';verdict.textContent=a.accepted?'✓':'×';const name=document.createElement('span');name.textContent=r.name;const sub=document.createElement('small');sub.textContent=groups[r.cat][0]+(a.skipped?' · pominięto':a.tolerance?' · tolerancja':'');name.append(sub);b.append(verdict,name);b.onclick=()=>review(a);list.append(b)});$('#repeat-errors').hidden=!completed.answers.some(a=>!a.accepted);$('#results').hidden=false;renderControls();renderCatalog();renderMap();home(false);}
function review(a){const r=byId.get(a.id);reviewId=r.id;selected=r.id;$('#results').hidden=true;focus(r);answerGroup.clearLayers();if(a.point)drawPoint(...a.point,a.accepted?'#86d8b0':'#ff8d9c');answerText(r.name,r.outline.generalized?'Obrys autorski — do porównania z atlasem.':'Obrys: poprawne miejsce. Punkt: Twoja odpowiedź.');$('#close-detail').hidden=false;$('#close-detail').textContent='Wyniki';renderMap();}
function setCategories(list){if(session.active)return;enabled=new Set(list);storage.set('categories',[...enabled]);selected=null;answerText();if(mode==='learn')title('Mapa świata');setBadge(0,false);render();}
groups.forEach(([name,color],i)=>{const row=document.createElement('label');row.className='category-row';const input=document.createElement('input');input.type='checkbox';input.value=i;input.checked=enabled.has(i);input.onchange=()=>{if(input.checked)enabled.add(i);else enabled.delete(i);setCategories([...enabled])};const dot=document.createElement('span');dot.className='category-dot';dot.style.background=color;const text=document.createElement('span');text.textContent=name;const count=document.createElement('span');count.className='category-count';count.textContent=regions.filter(r=>r.cat===i).length;row.append(input,dot,text,count);$('#categories').append(row)});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>changeMode(b.dataset.mode));
$('#theme').onclick=()=>{theme=theme==='orange'?'purple':'orange';applyTheme()};
$('#sidebar-toggle').onclick=()=>{let open=$('#sidebar').classList.toggle('open');$('#sidebar-toggle').setAttribute('aria-expanded',String(open));};
$('#select-all').onclick=()=>setCategories([0,1,2,3,4,5]);$('#select-none').onclick=()=>setCategories([]);
$('#search').oninput=renderCatalog;
['show-labels','show-buffer','show-borders','show-outlines'].forEach(id=>{const input=$('#'+id);input.checked=storage.get(id,id==='show-borders');input.onchange=()=>{storage.set(id,input.checked);renderMap()}});
$('#world-view').onclick=()=>home();$('#zoom-in').onclick=()=>map.zoomIn();$('#zoom-out').onclick=()=>map.zoomOut();
$('#session-start').onclick=()=>start();$('#session-end').onclick=()=>finish();$('#skip').onclick=()=>answer(0,0,true);$('#next').onclick=advance;
$('#close-detail').onclick=()=>{if(completed){$('#results').hidden=false;reviewId=null;selected=null;answerGroup.clearLayers();answerText();$('#close-detail').hidden=true;renderMap();home();}else{selected=null;idle()}};
$('#repeat-errors').onclick=()=>{const ids=completed.answers.filter(a=>!a.accepted).map(a=>a.id);mode='practice';start(ids)};
$('#restart').onclick=()=>{const nextMode=mode;completed=null;changeMode(nextMode);start()};$('#back-to-map').onclick=()=>changeMode('learn');
document.addEventListener('keydown',e=>{const editing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);if(e.key==='Escape'){if($('#sidebar').classList.contains('open'))closeSidebar();else if(selected&&!session.active)$('#close-detail').click()}if(e.key==='Enter'&&session.active&&session.locked&&!editing&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();advance()}});
applyTheme();idle();home(false);$('#loading').hidden=true;
const saved=storage.get('session',null);
if(saved&&['practice','exam'].includes(saved.mode)&&Array.isArray(saved.queue)&&saved.queue.length&&saved.queue.every(id=>knownIds.has(id))&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<saved.queue.length&&Array.isArray(saved.answers)&&saved.answers.length===saved.index+(saved.locked?1:0)&&saved.answers.every((a,i)=>a.id===saved.queue[i])){
mode=saved.mode;Object.assign(session,{active:true,index:saved.index,queue:saved.queue,answers:saved.answers,locked:!!saved.locked,outlinesVisible:!!saved.outlinesVisible});$('#show-outlines').checked=session.outlinesVisible;if(Array.isArray(saved.enabled))enabled=new Set(saved.enabled.filter(i=>groups[i]));$('#mode-caption').textContent=mode==='exam'?'Sprawdzian':'Ćwiczenia';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));showQuestion();}
})();

