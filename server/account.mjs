import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

const GOOGLE_KEYS=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const SESSION_COOKIE='__Host-fmb-session',NONCE_COOKIE='__Host-fmb-nonce';
const SESSION_AGE=30*86400;
export const GITHUB_PAGES_ORIGIN='https://zxw20110119-rgb.github.io';
const PAGES_SESSION_AGE=3600;
const encoder=new TextEncoder();
const cookie=(name,value,age)=>`${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const cookieValue=(request,name)=>request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
const nonce=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
const sessionKey=env=>encoder.encode(env.SESSION_SECRET||'');
const configured=env=>typeof env.GOOGLE_CLIENT_ID==='string'&&/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID)&&sessionKey(env).length>=32;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function json(data,status=200,cookies=[]){
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  for(const value of cookies)headers.append('Set-Cookie',value);
  return new Response(JSON.stringify(data),{status,headers});
}
function checkOrigin(request){
  if(request.headers.get('origin')!==new URL(request.url).origin)fail(403,'This request must come from this website.');
}
function checkCsrf(request,submitted){
  const expected=cookieValue(request,NONCE_COOKIE);
  if(!expected||!submitted||submitted!==expected)fail(403,'Your session changed. Refresh and try again.');
}
async function body(request,limit){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON data.');
  if(Number(request.headers.get('content-length'))>limit)fail(413,'The upload is too large.');
  const raw=await request.text();if(encoder.encode(raw).length>limit)fail(413,'The upload is too large.');
  try{return JSON.parse(raw);}catch{fail(400,'Invalid JSON data.');}
}
export async function readSession(request,env){
  if(sessionKey(env).length<32)return null;
  const token=cookieValue(request,SESSION_COOKIE);if(!token)return null;
  try{
    const {payload}=await jwtVerify(token,sessionKey(env),{algorithms:['HS256'],issuer:'find-my-block',audience:'find-my-block'});
    if(typeof payload.sub!=='string'||!payload.sub.startsWith('google:')||typeof payload.email!=='string')return null;
    return {id:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:payload.email};
  }catch{return null;}
}
export function normalizeTimetable(data){
  if(!data||!Array.isArray(data.events)||data.events.length>2000||!data.roomMappings||typeof data.roomMappings!=='object'||Array.isArray(data.roomMappings))fail(400,'Invalid timetable data.');
  const allowed=new Set(['DTSTART','DTEND','EXDATE','RECURRENCE-ID','SUMMARY','LOCATION','UID','RRULE','STATUS']);
  const events=data.events.map(event=>{
    if(!event||typeof event!=='object'||Array.isArray(event)||!Array.isArray(event.DTSTART)||!event.DTSTART.length)fail(400,'Invalid calendar event.');
    const clean={};
    for(const [key,value]of Object.entries(event)){
      if(!allowed.has(key))continue;
      if(['DTSTART','DTEND','EXDATE','RECURRENCE-ID'].includes(key)){
        if(!Array.isArray(value)||value.length>366)fail(400,'Invalid calendar dates.');
        clean[key]=value.map(item=>{
          if(!item||typeof item.value!=='string'||item.value.length>12000||typeof item.tz!=='string'||item.tz.length>200)fail(400,'Invalid calendar date.');
          return {value:item.value,tz:item.tz};
        });
      }else{if(typeof value!=='string'||value.length>20000)fail(400,'Invalid calendar text.');clean[key]=value;}
    }
    return clean;
  });
  const roomMappings=Object.fromEntries(Object.entries(data.roomMappings).map(([room,block])=>{
    if(room.length>500||typeof block!=='string'||!/^[a-z]{1,30}$/.test(block))fail(400,'Invalid room mapping.');
    return [room,block];
  }));
  if(Object.keys(roomMappings).length>2000)fail(400,'Too many room mappings.');
  return {events,roomMappings};
}
async function timetableRequest(request,env,user){
  if(!env.DB)fail(503,'Cloud timetable storage is unavailable.');
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT payload, revision, updated_at FROM user_timetables WHERE owner_id = ?').bind(user.id).first();
    return json({timetable:row?JSON.parse(row.payload):null,revision:row?.revision||0,updatedAt:row?.updated_at||null});
  }
  if(request.method==='PUT'){
    const input=await body(request,2_000_000);
    if(!Number.isSafeInteger(input.revision)||input.revision<0)fail(400,'Invalid timetable revision.');
    const payload=JSON.stringify(normalizeTimetable(input.timetable)),now=Date.now();
    const row=input.revision===0
      ?await env.DB.prepare('INSERT INTO user_timetables (owner_id, payload, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(owner_id) DO NOTHING RETURNING revision, updated_at').bind(user.id,payload,now).first()
      :await env.DB.prepare('UPDATE user_timetables SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ? RETURNING revision, updated_at').bind(payload,now,user.id,input.revision).first();
    if(!row)fail(409,'Your timetable changed on another device. Load it or choose Save this timetable.');
    return json({revision:row.revision,updatedAt:row.updated_at});
  }
  return json({error:'Method not allowed.'},405);
}
async function readPagesSession(request,env){
  if(sessionKey(env).length<32)return null;
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')||authorization.length>12000)return null;
  try{
    const {payload,protectedHeader}=await jwtVerify(authorization.slice(7),sessionKey(env),{
      algorithms:['HS256'],issuer:'find-my-block:pages',audience:'find-my-block:github-pages',maxTokenAge:'1h',
    });
    if(protectedHeader.typ!=='fmb-pages-session'||payload.origin!==GITHUB_PAGES_ORIGIN||typeof payload.sub!=='string'||!payload.sub.startsWith('google:')||typeof payload.email!=='string')return null;
    return {id:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:payload.email};
  }catch{return null;}
}
async function pagesRequest(request,env,path){
  // Bearer requests never use cookies. CORS is restricted to this owner's Pages origin.
  if(request.headers.get('origin')!==GITHUB_PAGES_ORIGIN)return json({error:'This website is not allowed to connect.'},403);
  let response;
  try{
    if(!['/api/pages/account','/api/pages/timetable'].includes(path))fail(404,'Not found.');
    if(request.method==='OPTIONS'){
      const method=request.headers.get('access-control-request-method');
      if(!['GET','PUT'].includes(method))fail(405,'Method not allowed.');
      response=new Response(null,{status:204});
    }else{
      const user=await readPagesSession(request,env);if(!user)fail(401,'Reconnect your Google account to continue.');
      if(path==='/api/pages/account'){
        if(request.method!=='GET')fail(405,'Method not allowed.');
        response=json({user,csrf:'',googleClientId:configured(env)?env.GOOGLE_CLIENT_ID:null,configured:configured(env)});
      }else response=await timetableRequest(request,env,user);
    }
  }catch(error){response=json({error:error.status?error.message:'The account service is temporarily unavailable.'},error.status||503);}
  const headers=new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin',GITHUB_PAGES_ORIGIN);
  headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
  headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Max-Age','600');
  headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
}
export async function handleAccountRequest(request,env,options={}){
  try{
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/pages/'))return pagesRequest(request,env,path);
    if(path==='/api/account'&&request.method==='GET'){
      const user=await readSession(request,env),existing=cookieValue(request,NONCE_COOKIE),csrf=/^[a-f0-9]{48}$/.test(existing)?existing:nonce();
      return json({user,googleClientId:configured(env)?env.GOOGLE_CLIENT_ID:null,configured:configured(env),csrf},200,[cookie(NONCE_COOKIE,csrf,SESSION_AGE)]);
    }
    if(path==='/api/account/google'&&request.method==='POST'){
      checkOrigin(request);const input=await body(request,20000);checkCsrf(request,input.csrf);
      if(!configured(env))fail(503,'Google sign-in is waiting for the site owner to configure a client ID.');
      if(typeof input.credential!=='string')fail(400,'Missing Google credential.');
      let payload;
      try{({payload}=await jwtVerify(input.credential,options.googleKeys||GOOGLE_KEYS,{algorithms:['RS256'],audience:env.GOOGLE_CLIENT_ID,issuer:['https://accounts.google.com','accounts.google.com'],maxTokenAge:'2h',clockTolerance:5}));}catch{fail(401,'Google could not verify this sign-in. Please try again.');}
      if(payload.nonce!==input.csrf||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||payload.email_verified!==true||typeof payload.email!=='string')fail(401,'Google could not verify this sign-in. Please try again.');
      const user={id:'google:'+payload.sub,email:payload.email.slice(0,320),name:typeof payload.name==='string'?payload.name.slice(0,160):payload.email.slice(0,320)};
      const session=await new SignJWT({email:user.email,name:user.name}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('find-my-block').setAudience('find-my-block').setIssuedAt().setExpirationTime(`${SESSION_AGE}s`).sign(sessionKey(env));
      const csrf=nonce();
      return json({user,csrf},200,[cookie(SESSION_COOKIE,session,SESSION_AGE),cookie(NONCE_COOKIE,csrf,SESSION_AGE)]);
    }
    if(path==='/api/account/logout'&&request.method==='POST'){
      checkOrigin(request);checkCsrf(request,request.headers.get('X-CSRF-Token'));
      return json({ok:true},200,[cookie(SESSION_COOKIE,'',0),cookie(NONCE_COOKIE,'',0)]);
    }
    if(path==='/api/account/pages-session'&&request.method==='POST'){
      checkOrigin(request);checkCsrf(request,request.headers.get('X-CSRF-Token'));
      if(!configured(env))fail(503,'Google sign-in is not configured.');
      const user=await readSession(request,env);if(!user)fail(401,'Sign in with Google first.');
      const input=await body(request,2000);
      if(input.origin!==GITHUB_PAGES_ORIGIN)fail(403,'This website is not allowed to connect.');
      const expiresAt=(Math.floor(Date.now()/1000)+PAGES_SESSION_AGE)*1000;
      const accessToken=await new SignJWT({email:user.email,name:user.name,origin:GITHUB_PAGES_ORIGIN})
        .setProtectedHeader({alg:'HS256',typ:'fmb-pages-session'}).setSubject(user.id)
        .setIssuer('find-my-block:pages').setAudience('find-my-block:github-pages')
        .setJti(nonce()).setIssuedAt().setExpirationTime(Math.floor(expiresAt/1000)).sign(sessionKey(env));
      return json({accessToken,expiresAt,user});
    }
    if(path==='/api/timetable'){
      const user=await readSession(request,env);if(!user)fail(401,'Sign in to save your timetable.');
      if(request.method==='PUT'){
        checkOrigin(request);checkCsrf(request,request.headers.get('X-CSRF-Token'));
      }
      return await timetableRequest(request,env,user);
    }
    return json({error:'Not found.'},404);
  }catch(error){return json({error:error.status?error.message:'The account service is temporarily unavailable.'},error.status||503);}
}
