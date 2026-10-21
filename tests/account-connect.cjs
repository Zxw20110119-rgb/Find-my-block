const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/account-connect.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const allowed='https://zxw20110119-rgb.github.io';
const state='a'.repeat(48);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function start({origin=allowed,stateValue=state,hasOpener=true,user=null}={}){
  const elements={},calls=[],messages=[],scripts=[];let googleOptions;
  const el=id=>elements[id]||={hidden:true,textContent:'',disabled:false};
  const context=vm.createContext({URLSearchParams,location:{search:'?'+new URLSearchParams({origin,state:stateValue})},
    window:{opener:hasOpener?{postMessage:(data,target)=>messages.push({data,target})}:null},
    document:{documentElement:{},getElementById:el,createElement:()=>({}),head:{append:script=>scripts.push(script)}},
    google:{accounts:{id:{initialize:options=>googleOptions=options,renderButton(){}}}},
    fetch:async(url,options)=>{
      calls.push({url,options});assert.equal(options.credentials,'same-origin');
      const data=url==='/api/account'?{user,csrf:'csrf-initial',googleClientId:'123-test.apps.googleusercontent.com'}:
        url==='/api/account/google'?{user:{id:'google:alice'},csrf:'csrf-after-google'}:
        {accessToken:'short-lived-connection',expiresAt:Date.now()+3600000};
      return new Response(JSON.stringify(data));
    }
  });
  vm.runInContext(source,context);
  return {elements,calls,messages,scripts,options:()=>googleOptions};
}
test('connection page rejects untrusted parents and malformed state before reading an account',async()=>{
  for(const options of [{origin:'https://attacker.test'},{stateValue:'short'},{hasOpener:false}]){
    const page=start(options);await flush();assert.equal(page.calls.length,0);assert.match(page.elements.status.textContent,/Return to GitHub/);
  }
});
test('existing main-site session requires an explicit account choice and sends only to the trusted opener',async()=>{
  const page=start({user:{email:'alice@example.test'}});await flush();
  assert.equal(page.messages.length,0);assert.equal(page.elements.continue.hidden,false);
  await page.elements.continue.onclick();
  assert.equal(page.messages.length,1);assert.equal(page.messages[0].target,allowed);assert.equal(page.messages[0].data.state,state);
  const issued=page.calls.find(call=>call.url==='/api/account/pages-session');
  assert.equal(issued.options.headers['X-CSRF-Token'],'csrf-initial');
  assert.equal(JSON.parse(issued.options.body).origin,allowed);
});
test('Google sign-in reuses the verified Google nonce and fresh CSRF before issuing a Pages connection',async()=>{
  const page=start();await flush();page.scripts[0].onload();
  assert.equal(page.options().nonce,'csrf-initial');assert.equal(page.options().auto_select,false);
  await page.options().callback({credential:'google-id-token'});
  const login=page.calls.find(call=>call.url==='/api/account/google');
  assert.equal(JSON.parse(login.options.body).csrf,'csrf-initial');
  const issued=page.calls.find(call=>call.url==='/api/account/pages-session');
  assert.equal(issued.options.headers['X-CSRF-Token'],'csrf-after-google');
  assert.equal(page.messages[0].data.accessToken,'short-lived-connection');
  assert.ok(!JSON.stringify(page.messages).includes('google-id-token'));
});
