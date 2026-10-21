const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/account.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const timetable=room=>({events:[{SUMMARY:'Class',LOCATION:room,DTSTART:[{value:'20261020T090000',tz:'Pacific/Auckland'}]}],roomMappings:{}});
const guest=timetable('A11'),alice=timetable('R8');
const local=new Map([['fmb-calendar-v1',JSON.stringify(guest.events)],['fmb-rooms-v1','{}']]);
const server={user:'alice',rows:new Map([['alice',{timetable:alice,revision:1}]]),failWrites:false};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function boot(){
  const elements={},view={value:clone(guest)};
  const $=id=>elements[id]||=( {hidden:false,disabled:false,textContent:'',replaceChildren(){}} );
  const window={google:{accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){}}}}};
  const context=vm.createContext({window,document:{},JSON,Promise,
    text:(zh,en)=>en,$,
    saveLocal:(key,value)=>{local.set(key,JSON.stringify(value));return true;},
    stored:(key,fallback)=>local.has(key)?JSON.parse(local.get(key)):fallback,
    localStorage:{removeItem:key=>local.delete(key)},
    timetableSnapshot:()=>view.value,applyAccountTimetable:data=>view.value=clone(data),
    fetch:async(path,options)=>{
      assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
      let data,status=200;
      if(path==='/api/account')data={user:server.user?{id:'google:'+server.user,email:server.user+'@example.test'}:null,googleClientId:'123456789-test.apps.googleusercontent.com',csrf:'test-csrf'};
      else if(path==='/api/account/logout'){server.user=null;data={ok:true};}
      else if(path==='/api/timetable'){
        if(!server.user){data={error:'Sign in'};status=401;}
        else if(options.method==='PUT'){
          assert.equal(options.headers['X-CSRF-Token'],'test-csrf');
          if(server.failWrites)throw Error('Offline');
          const input=JSON.parse(options.body),row=server.rows.get(server.user);
          if(input.revision!==(row?.revision||0)){data={error:'Conflict'};status=409;}
          else{const next={timetable:input.timetable,revision:input.revision+1};server.rows.set(server.user,next);data={revision:next.revision};}
        }else data=server.rows.get(server.user)||{timetable:null,revision:0};
      }else throw Error('Unexpected endpoint '+path);
      return new Response(JSON.stringify(data),{status});
    }
  });
  vm.runInContext(source,context);await flush();
  return {elements,view,account:window.TimetableAccount};
}
(async()=>{
  let page=await boot();
  assert.equal(page.view.value.events[0].LOCATION,'R8','Signed-in account loads its timetable');
  assert.deepEqual(JSON.parse(local.get('fmb-calendar-v1')),guest.events,'Cloud data does not overwrite guest data');
  assert.equal(await page.account.save(timetable('C15')),true);
  page=await boot();assert.equal(page.view.value.events[0].LOCATION,'C15','Returning to the website restores the saved timetable');
  server.user='bob';const bob=await boot();
  assert.equal(bob.view.value.events[0].LOCATION,'A11','A different account does not receive Alice data');
  assert.match(bob.elements.cloudStatus.textContent,/not in your account/);
  server.user='alice';page=await boot();server.failWrites=true;
  assert.equal(await page.account.save(timetable('D12')),false);
  server.failWrites=false;page=await boot();
  assert.equal(page.view.value.events[0].LOCATION,'D12','An unsaved upload survives reopening the website');
  await page.elements.saveToAccount.onclick();assert.equal(server.rows.get('alice').timetable.events[0].LOCATION,'D12');
  server.rows.get('alice').revision++;
  assert.equal(await page.account.save(timetable('B12')),false);assert.match(page.elements.cloudStatus.textContent,/another device/);
  await page.elements.reloadCloud.onclick();await flush();assert.equal(page.view.value.events[0].LOCATION,'D12');
  await page.account.save({events:[],roomMappings:{}});page=await boot();
  assert.equal(page.view.value.events.length,0,'A deleted cloud timetable is not replaced by guest data');
  await page.elements.signOut.onclick();
  assert.equal(page.view.value.events[0].LOCATION,'A11','Signing out restores only the guest timetable');
  console.log('Account UI checks passed: persistence across visits, account isolation, offline backup, conflict handling, removal and sign-out.');
})().catch(error=>{console.error(error);process.exitCode=1;});
