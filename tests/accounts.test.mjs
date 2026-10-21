import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { handleAccountRequest } from '../server/account.mjs';

const origin='https://find-my-block-bhs.zengxuanwen.chatgpt.site';
const clientId='123456789-test.apps.googleusercontent.com';
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='test-key';
const googleKeys=createLocalJWKSet({keys:[jwk]});
const database=new DatabaseSync(':memory:');
database.exec(readFileSync(new URL('../drizzle/0000_rapid_logan.sql',import.meta.url),'utf8'));
const DB={prepare(sql){return {bind(...args){return {async first(){return database.prepare(sql).get(...args)||null;}};}};}};
const env={GOOGLE_CLIENT_ID:clientId,SESSION_SECRET:'only-a-unit-test-secret-with-at-least-32-characters',DB};
const opts={googleKeys};
const jars=new Map();
const body={events:[{UID:'lesson',DTSTART:[{value:'20261020T090000',tz:'Pacific/Auckland'}],SUMMARY:'Maths',LOCATION:'R8'}],roomMappings:{R8:'rakipaoa'}};
async function request(path,{method='GET',input,jar='a',csrf,requestOrigin=origin}={}){
  const cookies=jars.get(jar)||new Map();jars.set(jar,cookies);
  const headers={'Cookie':[...cookies].map(([k,v])=>k+'='+v).join(';')};
  if(method!=='GET'){headers.Origin=requestOrigin;headers['Content-Type']='application/json';if(csrf)headers['X-CSRF-Token']=csrf;}
  const response=await handleAccountRequest(new Request(origin+path,{method,headers,body:method==='GET'?undefined:JSON.stringify(input||{})}),env,opts);
  for(const line of response.headers.getSetCookie()){
    const [name,value]=line.split(';')[0].split('=');if(value)cookies.set(name,value);else cookies.delete(name);
    assert.match(line,/HttpOnly/);assert.match(line,/Secure/);assert.match(line,/SameSite=Lax/);
  }
  return {status:response.status,data:await response.json(),headers:response.headers};
}
async function googleToken(sub,csrf,overrides={}){
  return new SignJWT({nonce:csrf,email:sub+'@example.test',email_verified:true,name:sub,...overrides}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject(sub).setAudience(clientId).setIssuer('https://accounts.google.com').setIssuedAt().setExpirationTime('1h').sign(privateKey);
}
async function login(jar){
  const setup=await request('/api/account',{jar});
  assert.equal(setup.data.googleClientId,clientId);
  const signed=await request('/api/account/google',{method:'POST',jar,input:{csrf:setup.data.csrf,credential:await googleToken(jar,setup.data.csrf)}});
  assert.equal(signed.status,200);assert.equal(signed.data.user.id,'google:'+jar);return signed.data.csrf;
}
test('anonymous and forged identity headers cannot read saved timetables',async()=>{
  assert.equal((await request('/api/timetable',{jar:'anonymous'})).status,401);
  const fake=await handleAccountRequest(new Request(origin+'/api/timetable',{headers:{'oai-authenticated-user-id':'google:a','x-user-id':'google:a'}}),env,opts);
  assert.equal(fake.status,401);
});
test('login validates audience, issuer, expiry, nonce and CSRF',async()=>{
  const setup=await request('/api/account',{jar:'invalid'}),csrf=setup.data.csrf;
  const valid=await googleToken('invalid',csrf);
  assert.equal((await request('/api/account/google',{method:'POST',jar:'invalid',input:{credential:valid,csrf:'wrong'}})).status,403);
  assert.equal((await request('/api/account/google',{method:'POST',jar:'invalid',requestOrigin:'https://attacker.test',input:{credential:valid,csrf}})).status,403);
  for(const overrides of [{nonce:'wrong'},{email_verified:false}]){
    assert.equal((await request('/api/account/google',{method:'POST',jar:'invalid',input:{csrf,credential:await googleToken('invalid',csrf,overrides)}})).status,401);
  }
  for(const [issuer,audience,expires]of [['https://attacker.test',clientId,'1h'],['https://accounts.google.com','wrong-audience','1h'],['https://accounts.google.com',clientId,'-1h']]){
    const credential=await new SignJWT({nonce:csrf,email:'test@example.test',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('invalid').setIssuedAt().setIssuer(issuer).setAudience(audience).setExpirationTime(expires).sign(privateKey);
    assert.equal((await request('/api/account/google',{method:'POST',jar:'invalid',input:{csrf,credential}})).status,401);
  }
});
test('accounts save and restore separate timetables; stale saves do not overwrite',async()=>{
  const csrfA=await login('a'),csrfB=await login('b');
  const first=await request('/api/timetable',{method:'PUT',jar:'a',csrf:csrfA,input:{revision:0,timetable:body}});
  assert.equal(first.status,200);assert.equal(first.data.revision,1);
  const readA=await request('/api/timetable',{jar:'a'});assert.deepEqual(readA.data.timetable,body);
  const readB=await request('/api/timetable',{jar:'b'});assert.equal(readB.data.timetable,null);
  assert.equal((await request('/api/timetable',{method:'PUT',jar:'a',csrf:csrfA,input:{revision:0,timetable:{events:[],roomMappings:{}}}})).status,409);
  assert.deepEqual((await request('/api/timetable',{jar:'a'})).data.timetable,body);
  assert.equal((await request('/api/timetable',{method:'PUT',jar:'b',csrf:csrfB,input:{revision:0,ownerId:'google:a',timetable:{events:[],roomMappings:{}}}})).status,200);
  assert.deepEqual((await request('/api/timetable',{jar:'a'})).data.timetable,body);
  const cleared=await request('/api/timetable',{method:'PUT',jar:'a',csrf:csrfA,input:{revision:1,timetable:{events:[],roomMappings:{}}}});
  assert.equal(cleared.data.revision,2);assert.deepEqual((await request('/api/timetable',{jar:'a'})).data.timetable.events,[]);
});
test('invalid payloads, absent CSRF and tampered cookies are rejected',async()=>{
  const csrf=await login('tamper');
  assert.equal((await request('/api/timetable',{method:'PUT',jar:'tamper',input:{revision:0,timetable:body}})).status,403);
  assert.equal((await request('/api/timetable',{method:'PUT',jar:'tamper',csrf,input:{revision:0,timetable:{events:'wrong',roomMappings:{}}}})).status,400);
  const jar=jars.get('tamper');jar.set('__Host-fmb-session',jar.get('__Host-fmb-session').slice(0,-4)+'abcd');
  assert.equal((await request('/api/timetable',{jar:'tamper'})).status,401);
});
test('sign out removes the session but leaves the saved account data',async()=>{
  const csrf=await login('logout');
  await request('/api/timetable',{method:'PUT',jar:'logout',csrf,input:{revision:0,timetable:body}});
  assert.equal((await request('/api/account/logout',{method:'POST',jar:'logout',csrf})).status,200);
  assert.equal((await request('/api/timetable',{jar:'logout'})).status,401);
  await login('logout');assert.deepEqual((await request('/api/timetable',{jar:'logout'})).data.timetable,body);
});
test('without owner configuration the site honestly reports Google unavailable',async()=>{
  const response=await handleAccountRequest(new Request(origin+'/api/account'),{SESSION_SECRET:env.SESSION_SECRET,DB},opts);
  const data=await response.json();assert.equal(data.configured,false);assert.equal(data.googleClientId,null);
});
