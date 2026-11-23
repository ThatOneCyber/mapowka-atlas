const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./dist/core.js');
const outlines=vm.runInNewContext(fs.readFileSync('dist/geometry.js','utf8')+';outlines');
const fixtures=JSON.parse(fs.readFileSync('tests/hit-fixtures.json','utf8'));
assert.equal(Object.keys(outlines).length,111);
for(const f of fixtures){const got=core.classify(outlines[f.id],...f.point);assert.equal(got.accepted,f.accept,JSON.stringify(f));}
// Holes and disconnected parts must not turn into accepted bounding boxes.
const square={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]};
assert(core.contains(square,2,2));assert(!core.contains(square,5,5));assert(!core.contains(square,12,5));assert(core.contains(square,0,5));
const multi={type:'MultiPolygon',coordinates:[square.coordinates,[[[20,20],[22,20],[22,22],[20,22],[20,20]]]]};
assert(core.contains(multi,21,21));assert(!core.contains(multi,15,15));
for(const [id,o] of Object.entries(outlines)){
 const corePoint=fixtures.find(f=>f.id===id&&f.accept).point;
 assert(core.classify(o,...corePoint).core);
 const tolerancePoint=fixtures.filter(f=>f.id===id&&f.accept)[1].point;
 assert(core.classify(o,...tolerancePoint).tolerance);
}
const input=['a','b','c','d'],shuffled=core.shuffle(input,()=>0);assert.deepEqual(input,['a','b','c','d']);assert.deepEqual([...shuffled].sort(),input);assert.notDeepEqual(shuffled,input);
const s={queue:['a','b'],index:0,locked:false,answers:[]};assert(core.recordAnswer(s,{id:'a',accepted:false}));assert(!core.recordAnswer(s,{id:'a',accepted:true}));assert.equal(s.answers.length,1);assert.equal(s.answers[0].accepted,false);s.index++;s.locked=false;assert(core.recordAnswer(s,{id:'b',accepted:true}));
console.log('PASS: 111 outlines, 333 hit tests, 222 core/tolerance checks, holes, multipolygons, shuffle and final-answer lock.');
