const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dist=path.join(__dirname,'../public');
const app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
const calendar=fs.readFileSync(path.join(dist,'calendar.js'),'utf8');
const features=fs.readFileSync(path.join(dist,'features.js'),'utf8');
const ctx=vm.createContext({localStorage:{getItem:()=>null},window:{},Date,Intl});
vm.runInContext(app.split('const $=id=>')[0],ctx);
vm.runInContext(calendar,ctx);
ctx.CampusCalendar=ctx.window.CampusCalendar;
vm.runInContext(features.split('$("toolsButton").onclick=')[0],ctx);
vm.runInContext(`for(const from of Object.keys(places))for(const to of Object.keys(places)){
  const route=shortest(from,to);
  if(!route)throw Error('No route: '+from+' to '+to);
  if(!places[from].access.includes(route[0])||!places[to].access.includes(route.at(-1)))throw Error('Wrong endpoints: '+from+' to '+to);
  if(from!==to&&route.length<2)throw Error('Zero length between different buildings: '+from+' to '+to);
  for(let i=1;i<route.length;i++)if(!graph[route[i-1]].some(([v])=>v===route[i]))throw Error('Unmapped route segment');
}
const libraryToK=shortest('library','k');
if(!libraryToK.join(',').includes('c1,c0,cTop,b1'))throw Error('C path backtracks');
const receptionToInternational=shortest('reception','international');
if(receptionToInternational.join(',')!=='south,southLink,q0w,q0')throw Error('Missing walkway by International Office');
if(nodes.q0w[0]!==674||nodes.southLink[0]!==674)throw Error('Link must stay outside the lower A Block footprint');
const edge=edgeKey('b1','cTop');closedEdges.add(edge);
if(shortest('b','c').some((n,i,route)=>i&&edgeKey(n,route[i-1])===edge))throw Error('Route uses closed path');
closedEdges.delete(edge);
const fromPin=routeFromPin([616,672],'d');
if(!fromPin||!places.d.access.includes(fromPin.path.at(-1)))throw Error('Manual start fails');
`,ctx);
const fixture=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:math\r\nSUMMARY:Maths\r\nLOCATION:Room C15\r\nDTSTART;TZID=Pacific/Auckland:20261012T090000\r\nDTEND;TZID=Pacific/Auckland:20261012T100000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261101T000000Z\r\nEXDATE;TZID=Pacific/Auckland:20261014T090000\r\nEND:VEVENT\r\nEND:VCALENDAR`;
const events=ctx.CampusCalendar.occurrences(ctx.CampusCalendar.readIcs(fixture),new Date('2026-10-11'),new Date('2026-10-25'));
assert.equal(events.length,3);
assert.equal(new Date(events[0].start).toISOString(),'2026-10-11T20:00:00.000Z');
assert.equal(ctx.CampusCalendar.roomCode(events[0]),'C15');
assert.equal(vm.runInContext('placeForEvent({location:"Room C15",title:"Maths"})',ctx),'c');
assert.equal(vm.runInContext('placeForEvent({location:"P23",title:"English"})',ctx),'pukehinau');
assert.equal(ctx.CampusCalendar.roomCode({location:'Room R8',title:'English'}),'R8');
for(const location of ['R8','R Block','Rakipaoa','R']){
  ctx.roomLocation=location;
  assert.equal(vm.runInContext('placeForEvent({location:roomLocation,title:"English"})',ctx),'rakipaoa');
}
assert.equal(vm.runInContext('buildingAt([419,480])',ctx),'rakipaoa');
assert.equal(vm.runInContext('buildingAt([745,500])',ctx),'b');
assert.equal(vm.runInContext('nearestEdge([805,515])',ctx),'c0|cTop');
console.log('Navigation checks passed: all building pairs, no zero-length routes, C/Library route, closures, manual pin, timetable recurrence and room mapping.');
