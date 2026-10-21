const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const transport=fs.readFileSync(path.join(root,'public/github-account-transport.js'),'utf8');
const client=fs.readFileSync(path.join(root,'public/account.js'),'utf8');
const backend='https://find-my-block-bhs.zengxuanwen.chatgpt.site';
const pages='https://zxw20110119-rgb.github.io';
const storageKey='fmb-github-session-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const timetable=room=>({events:[{SUMMARY:'Class',LOCATION:room,DTSTART:[{value:'20261020T090000',tz:'Pacific/Auckland'}]}],roomMappings:{}});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup({local=new Map(),tab=new Map(),rows=new Map(),blocked=false,language='en'}={}){
  let now=Date.now();const calls=[],listeners={},elements={},popups=[],timers=new Map();let timerId=0;
  const guest={events:JSON.parse(local.get('fmb-calendar-v1')||'[]'),roomMappings:JSON.parse(local.get('fmb-rooms-v1')||'{}')};
  const view={value:guest};
  const $=id=>elements[id]||={hidden:false,disabled:false,textContent:'',children:[],replaceChildren(...children){this.children=children;}};
  const window={addEventListener:(type,fn)=>listeners[type]=fn,open(url){if(blocked)return null;const popup={url,closed:false,focus(){},close(){this.closed=true;}};popups.push(popup);return popup;}};
  const context=vm.createContext({window,document:{createElement:()=>({})},location:{origin:pages},URL,Uint8Array,crypto:webcrypto,Date:{now:()=>now},JSON,Promise,
    setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id),setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
    sessionStorage:{getItem:key=>tab.get(key)||null,setItem:(key,value)=>tab.set(key,value),removeItem:key=>tab.delete(key)},
    localStorage:{removeItem:key=>local.delete(key)},$,
    text:(zh,en)=>language==='zh'?zh:en,
    stored:(key,fallback)=>local.has(key)?JSON.parse(local.get(key)):fallback,
    saveLocal:(key,value)=>{local.set(key,JSON.stringify(value));return true;},
    timetableSnapshot:()=>view.value,applyAccountTimetable:data=>view.value=clone(data),
    fetch:async(url,options)=>{
      calls.push({url,options});assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');
      assert.equal(options.headers.Cookie,undefined);assert.ok(url.startsWith(backend+'/api/pages/'));
      const token=options.headers.Authorization?.slice(7),id=token==='alice-token'?'google:alice':token==='bob-token'?'google:bob':null;
      let data,status=200;
      if(!id){status=401;data={error:'Reconnect'};}
      else if(url.endsWith('/account'))data={user:{id,email:id.slice(7)+'@example.test'},googleClientId:'123-test.apps.googleusercontent.com',csrf:''};
      else if(options.method==='PUT'){
        const input=JSON.parse(options.body),row=rows.get(id);
        if(input.revision!==(row?.revision||0)){status=409;data={error:'Conflict'};}
        else{const next={timetable:input.timetable,revision:input.revision+1};rows.set(id,next);data={revision:next.revision};}
      }else data=rows.get(id)||{timetable:null,revision:0};
      return new Response(JSON.stringify(data),{status});
    }
  });
  vm.runInContext(transport,context);vm.runInContext(client,context);
  const message=(popup,token,{origin=backend,source=popup,state=new URL(popup.url).searchParams.get('state')}={})=>listeners.message({origin,source,data:{type:'find-my-block:account',state,accessToken:token,expiresAt:now+3600000,user:{id:'forged-user'}}});
  return {window,context,elements,view,local,tab,rows,calls,popups,message,advance:ms=>now+=ms,account:window.TimetableAccount};
}
test('GitHub sign-in validates popup origin, source and state before accepting the verified account',async()=>{
  const local=new Map([['fmb-calendar-v1',JSON.stringify(timetable('A11').events)]]);
  const page=setup({local,rows:new Map([['google:alice',{timetable:timetable('R8'),revision:1}]])});await flush();
  assert.equal(page.calls.length,0);assert.equal(page.view.value.events[0].LOCATION,'A11');
  page.elements.googleButton.children[0].onclick();const popup=page.popups[0];
  assert.equal(new URL(popup.url).origin,backend);assert.equal(new URL(popup.url).pathname,'/account/connect');
  assert.equal(new URL(popup.url).searchParams.get('origin'),pages);
  await page.message(popup,'alice-token',{origin:'https://attacker.test'});
  await page.message(popup,'alice-token',{source:{}});await page.message(popup,'alice-token',{state:'wrong'});
  assert.equal(page.calls.length,0);assert.equal(page.tab.size,0);
  await page.message(popup,'alice-token');await flush();
  assert.equal(page.view.value.events[0].LOCATION,'R8');assert.equal(page.elements.accountIdentity.textContent,'alice@example.test');
  assert.ok(page.tab.get(storageKey));assert.ok(![...page.local.values()].some(value=>value.includes('alice-token')));
  assert.equal(popup.closed,true);assert.equal(JSON.parse(local.get('fmb-calendar-v1'))[0].LOCATION,'A11');
  assert.equal(await page.account.save(timetable('C15')),true);
  const returned=setup({local,tab:page.tab,rows:page.rows});await flush();
  assert.equal(returned.view.value.events[0].LOCATION,'C15');assert.equal(returned.popups.length,0);
  await returned.elements.signOut.onclick();await flush();
  assert.equal(returned.tab.has(storageKey),false);assert.equal(returned.view.value.events[0].LOCATION,'A11');
});
test('expired connections preserve unsaved account changes and reconnect without another import',async()=>{
  const local=new Map([['fmb-calendar-v1',JSON.stringify(timetable('A11').events)]]);
  const tab=new Map([[storageKey,JSON.stringify({accessToken:'alice-token',expiresAt:Date.now()+3600000})]]);
  const page=setup({local,tab,rows:new Map([['google:alice',{timetable:timetable('R8'),revision:1}]])});await flush();
  page.advance(3600001);assert.equal(await page.account.save(timetable('D12')),false);
  assert.match(page.elements.cloudStatus.textContent,/expired/);assert.equal(page.elements.googleButton.hidden,false);
  assert.equal(JSON.parse(local.get('fmb-account-cache:google:alice')).timetable.events[0].LOCATION,'D12');
  page.elements.googleButton.children[0].onclick();await page.message(page.popups[0],'alice-token');await flush();
  assert.equal(page.view.value.events[0].LOCATION,'D12');assert.match(page.elements.cloudStatus.textContent,/not in your account/);
  await page.elements.saveToAccount.onclick();assert.equal(page.rows.get('google:alice').timetable.events[0].LOCATION,'D12');
});
test('switching accounts does not seed an empty account with the previous user timetable',async()=>{
  const local=new Map([['fmb-calendar-v1',JSON.stringify(timetable('A11').events)]]);
  const page=setup({local,tab:new Map([[storageKey,JSON.stringify({accessToken:'alice-token',expiresAt:Date.now()+3600000})]]),rows:new Map([['google:alice',{timetable:timetable('R8'),revision:1}]])});await flush();
  page.advance(3600001);await page.account.save(timetable('D12'));
  page.elements.googleButton.children[0].onclick();await page.message(page.popups[0],'bob-token');await flush();
  assert.equal(page.elements.accountIdentity.textContent,'bob@example.test');assert.equal(page.view.value.events[0].LOCATION,'A11');
  assert.equal(page.rows.has('google:bob'),false);assert.equal(JSON.parse(local.get('fmb-account-cache:google:alice')).timetable.events[0].LOCATION,'D12');
  await assert.rejects(page.window.CampusAccountTransport.request('/api/timetable',{method:'PUT',accountId:'google:alice',body:JSON.stringify({revision:0,timetable:timetable('R8')})}),/account changed/);
  assert.equal(page.rows.has('google:bob'),false);
});
test('blocked windows and forged saved sessions leave a usable guest mode',async()=>{
  const page=setup({blocked:true,language:'zh',tab:new Map([[storageKey,JSON.stringify({accessToken:'forged',expiresAt:Date.now()+3600000})]])});await flush();
  assert.equal(page.tab.has(storageKey),false);assert.equal(page.elements.googleButton.hidden,false);
  page.elements.googleButton.children[0].onclick();assert.match(page.elements.cloudStatus.textContent,/弹窗/);
  assert.equal(await page.account.save(timetable('B12')),true);assert.equal(JSON.parse(page.local.get('fmb-calendar-v1'))[0].LOCATION,'B12');
});
