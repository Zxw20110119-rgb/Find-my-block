import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseNotices,findLocations,findDates,getNotices,handleNoticeRequest,GITHUB_ORIGIN} from '../server/notices.mjs';
const fixture=(title,body)=>`<title>Notices | Burnside High School</title><a href="https://burnside.school.kiwi/">School</a><div class="card sk_card"><h5 class="card-title">${title}</h5><span class="badge">Music</span><p class="card-text">${body}</p><h6>Teacher</h6></div>`;
test('notice locations, exact text and future dates do not confuse sign-up point with event date',()=>{
 const [n]=parseNotices(fixture('Choir Auditions','Auditions start on Friday Nov 6th.<br>Sign-up sheets outside M1.<br>Entries close 3 November 2026.<br>Ends 10 November 2026.'),'2026-10-30');
 assert.equal(n.startDate,'2026-11-06');assert.equal(n.deadline,'2026-11-03');assert.equal(n.endDate,'2026-11-10');
 assert.deepEqual(n.locations,[{place:'m',label:'M1',context:'sign-up point'}]);assert.ok(n.body.includes('Sign-up sheets outside M1.'));
 assert.deepEqual(findLocations('Rowing','At Avon Rowing Club on Kerrs Road. Year 11-13 welcome.'),[]);
 assert.equal(findLocations('Meeting','R8 and P Block')[0].place,'rakipaoa');
 assert.equal(findLocations('Meeting','R8 and P Block')[1].place,'pukehinau');
 assert.deepEqual(findDates('Camp runs 6–8 November 2026.','2026-10-30'),{startDate:'2026-11-06',endDate:'2026-11-08',deadline:null});
 assert.deepEqual(findDates('Camp runs November 6–8, 2026.','2026-10-30'),{startDate:'2026-11-06',endDate:'2026-11-08',deadline:null});
 assert.equal(findDates('Every Wednesday, 2:50–4 pm.','2026-10-30').startDate,null);
});
test('untrusted school HTML is never executable and obfuscated public contact is restored',()=>{
 assert.throws(()=>parseNotices('<title>Sign in</title>','2026-10-30'));
 const [n]=parseNotices(fixture('A &amp; B','Hello<script>alert("bad")</script><img src=x onerror=alert(1)>world<br>Teacher: <script>var l=[];l[0] = \';\';l[1] = \'|64\';for (var i=1;i>=0;i--) document.write(l[i]);</script>'),'2026-10-30');
 assert.equal(n.title,'A & B');assert.ok(!n.body.includes('alert'));assert.ok(!n.body.includes('onerror'));assert.ok(n.body.includes('@'));
});
test('month merges repeated notices, retains posted dates, and does not create event end dates',async()=>{
 const result=await getNotices('2028-01-01',31,async()=>new Response(fixture('Meet','Meet at Library on 15 January 2028.')));
 assert.equal(result.checkedDates.length,31);assert.equal(result.items.length,1);assert.equal(result.items[0].sourceDates.length,31);
 assert.equal(result.items[0].endDate,null);assert.equal(result.endDate,'2028-01-31');
});
test('unavailable month dates stay explicitly unavailable instead of being claimed empty',async()=>{
 const result=await getNotices('2028-02-01',1,async()=>{throw Error('offline');});assert.deepEqual(result.unavailableDates,['2028-02-01']);assert.equal(result.stale,true);
});
test('public API retires login and validates dates while allowing only the Pages CORS origin',async()=>{
 let r=await handleNoticeRequest(new Request('https://example.test/api/account/google',{method:'POST'}));assert.equal(r.status,410);
 r=await handleNoticeRequest(new Request('https://example.test/api/notices?date=2026-02-31'));assert.equal(r.status,400);
 r=await handleNoticeRequest(new Request('https://example.test/api/notices',{method:'OPTIONS',headers:{Origin:GITHUB_ORIGIN}}));assert.equal(r.headers.get('Access-Control-Allow-Origin'),GITHUB_ORIGIN);
 r=await handleNoticeRequest(new Request('https://example.test/api/notices?date=x',{headers:{Origin:'https://other.example'}}));assert.equal(r.headers.has('Access-Control-Allow-Origin'),false);
});
test('real initial month snapshot only pins known campus places and retains full source contacts',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../public/notices-snapshot.json',import.meta.url)));
 assert.equal(data.checkedDates.length,31);const choir=data.items.find(n=>n.title==='Choir Auditions');assert.ok(choir.body.includes('sude@burnside.school.nz'));assert.equal(choir.startDate,'2026-11-06');
 assert.ok(data.items.filter(n=>n.title.includes('Rowing')).every(n=>n.locations.length===0));
});
