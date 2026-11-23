(function(root){
 'use strict';
 function onSegment(a,b,x,y){const cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);return Math.abs(cross)<1e-9&&x>=Math.min(a[0],b[0])-1e-9&&x<=Math.max(a[0],b[0])+1e-9&&y>=Math.min(a[1],b[1])-1e-9&&y<=Math.max(a[1],b[1])+1e-9}
 function inRing(ring,x,y){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if(onSegment(a,b,x,y))return true;if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
 function contains(geometry,x,y){const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;return polygons.some(p=>inRing(p[0],x,y)&&!p.slice(1).some(h=>inRing(h,x,y)))}
 function classify(outline,lng,lat){const core=contains(outline.geometry,lng,lat),accepted=core||contains(outline.acceptance,lng,lat);return {accepted,core,tolerance:accepted&&!core}}
 function shuffle(list,random=Math.random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function recordAnswer(session,answer){if(session.locked||session.index>=session.queue.length)return false;session.answers.push(answer);session.locked=true;return true}
 const api={inRing,contains,classify,shuffle,recordAnswer};if(typeof module==='object'&&module.exports)module.exports=api;else root.MapowkaCore=api;
})(typeof globalThis==='object'?globalThis:this);
