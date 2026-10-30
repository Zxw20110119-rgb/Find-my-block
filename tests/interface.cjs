const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dist=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]));
const local=new Map(),elements={},events={};
class FakeElement{
  constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.style={};this.attrs={};this.children=[];this.clientWidth=390;this.clientHeight=844;this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),contains:k=>this.classes.has(k),toggle:(k,force)=>{const on=force??!this.classes.has(k);on?this.classes.add(k):this.classes.delete(k);return on;}};}
  setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]}
  replaceChildren(...items){this.children=items;if(items.length&&items[0].value!==undefined)this.value=items[0].value}
  append(...items){this.children.push(...items)}add(option){this.children.push(option)}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:844}}setPointerCapture(){}focus(){}
}
const el=id=>{assert.ok(ids.has(id),'Missing HTML ID: '+id);return elements[id] ||= new FakeElement();};
const tabs=['search','notices','timetable','roads','mapstyle'].map(tab=>{const button=new FakeElement();button.dataset={tab};return button;});
const document={getElementById:el,createElement:()=>new FakeElement(),createElementNS:()=>new FakeElement(),querySelectorAll:selector=>selector==='.tool-tabs button'?tabs:[],querySelector:selector=>tabs.find(button=>selector.includes('data-tab="'+button.dataset.tab+'"'))||null,body:new FakeElement(),documentElement:{lang:'en'}};
const window={addEventListener:(event,handler)=>(events[event]??=[]).push(handler)};
for(const id of ['toolPanel','schedulePeek','timetableTab','roadsTab','mapstyleTab','reportForm','manualStatus','progressWrap'])el(id).hidden=true;
const browser=vm.createContext({document,window,Date,Intl,URL,URLSearchParams,Option:function(label,value){this.label=label;this.value=value},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
  location:{href:'https://example.test/',search:''},history:{replaceState(){}},requestAnimationFrame(){},setInterval(){}});
for(const file of ['calendar.js','app.js','features.js']){
  vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),browser,{filename:file});
  if(file==='calendar.js')browser.CampusCalendar=window.CampusCalendar;
}
assert.equal(el('toolsButton').textContent,'Tools');
el('toolsButton').onclick();assert.equal(el('toolPanel').hidden,false);
el('searchInput').value='C15';el('searchInput').oninput();
assert.ok(el('searchResults').children.some(node=>node.textContent==='C Block'));
el('searchResults').children.find(node=>node.textContent==='C Block').onclick();
assert.equal(el('to').value,'c');
el('searchInput').value='R8';el('searchInput').oninput();
assert.equal(el('searchResults').children[0].textContent,'R Block · Rakipaoa');
el('searchResults').children[0].onclick();assert.equal(el('to').value,'rakipaoa');
assert.ok(el('simpleLabels').children.some(node=>node.textContent==='R'&&node.attrs.class==='always-label'));
vm.runInContext('handleMapToolTap([745,500])',browser);assert.equal(el('to').value,'b');
el('closeRoadMode').onclick();assert.equal(el('toolPanel').hidden,true);
vm.runInContext('handleMapToolTap([805,515])',browser);
assert.equal(vm.runInContext('closedEdges.has("c0|cTop")',browser),true);
assert.equal(el('toolPanel').hidden,false);
el('closedList').children[0].onclick();
assert.equal(vm.runInContext('closedEdges.size',browser),0);
el('reportMode').onclick();vm.runInContext('handleMapToolTap([805,515])',browser);
el('reportText').value='Path blocked';el('saveReport').onclick();
assert.equal(JSON.parse(local.get('fmb-reports-v1'))[0].text,'Path blocked');
assert.match(el('roadStatus').textContent,/Share report/);
assert.equal(el('shareReport').hidden,false);
el('simpleToggle').onclick();assert.equal(document.body.classList.contains('simple-map'),true);
assert.equal(JSON.parse(local.get('fmb-simple-map-v1')),true);
const date=new Date(Date.now()+86400000);date.setHours(9,0,0,0);
const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('')+'T090000';
const ics=`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:nextclass\nSUMMARY:Maths\nLOCATION:Room D12\nDTSTART:${stamp}\nDTEND:${stamp.slice(0,9)}100000\nEND:VEVENT\nEND:VCALENDAR`;
(async()=>{
  const target={files:[{size:ics.length,text:async()=>ics}],value:'test.ics'};
  await el('icsFile').onchange({target});
  assert.match(el('calendarStatus').textContent,/Imported 1/);
  assert.equal(el('schedulePeek').hidden,false);
  assert.match(el('schedulePeek').textContent,/Maths/);
  assert.ok(el('scheduleList').children.length>0);
  assert.equal(vm.runInContext('placeForEvent(activeCalendarEvents()[0])',browser),'d');
  assert.equal(el('to').value,'d','Import automatically selects the first destination');
  let clock=Date.parse('2026-10-19T08:30:00+13:00');
  browser.Date=class extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
  browser.autoFixture='BEGIN:VCALENDAR\n'+[
    ['yesterday','20261018','150000','160000','D12'],
    ['first','20261019','090000','095000','A11'],
    ['second','20261019','100000','105000','R8'],
    ['third','20261019','110000','120000','C15'],
    ['tomorrow','20261020','090000','100000','D12']
  ].map(([uid,day,start,end,room])=>`BEGIN:VEVENT\nUID:${uid}\nSUMMARY:${uid}\nLOCATION:${room}\nDTSTART;TZID=Pacific/Auckland:${day}T${start}\nDTEND;TZID=Pacific/Auckland:${day}T${end}\nEND:VEVENT\n`).join('')+'END:VCALENDAR';
  vm.runInContext('calendarEvents=CampusCalendar.readIcs(autoFixture);lastAutoClassKey="";pinnedStart=[615,668];manualPosition={p:[615,668]};options();$("from").value="pinned";refreshSchedule();',browser);
  assert.equal(el('from').value,'pinned','First class preserves a manually pinned start');
  assert.equal(el('to').value,'a');
  assert.equal(vm.runInContext('Boolean(manualPosition)',browser),true);
  clock=Date.parse('2026-10-19T09:30:00+13:00');vm.runInContext('refreshSchedule()',browser);
  assert.equal(el('from').value,'a');assert.equal(el('to').value,'rakipaoa');
  assert.equal(vm.runInContext('manualPosition',browser),null,'Previous class replaces the active manual marker');
  el('from').value='m';el('to').value='k';el('to').onchange();
  clock=Date.parse('2026-10-19T09:45:00+13:00');vm.runInContext('refreshSchedule()',browser);
  assert.equal(el('from').value,'m');assert.equal(el('to').value,'k','An unchanged class pair does not overwrite a manual route');
  clock=Date.parse('2026-10-19T10:30:00+13:00');vm.runInContext('refreshSchedule()',browser);
  assert.equal(el('from').value,'rakipaoa');assert.equal(el('to').value,'c');
  clock=Date.parse('2026-10-19T12:30:00+13:00');vm.runInContext('refreshSchedule()',browser);
  assert.equal(el('from').value,'rakipaoa','The next school day does not use the previous day as its origin');
  assert.equal(el('to').value,'d');
  el('clearCalendar').onclick();
  assert.equal(JSON.parse(local.get('fmb-calendar-v1')).length,0);
  assert.equal(el('schedulePeek').hidden,true);
  console.log('UI checks passed: search, map destination, closures, reports, import, automatic class transitions, first-class manual start, manual override and next-day boundaries.');
})().catch(error=>{console.error(error);process.exitCode=1;});
