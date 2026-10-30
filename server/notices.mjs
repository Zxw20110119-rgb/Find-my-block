import snapshot from '../public/notices-snapshot.json' with {type:'json'};
const SOURCE='https://burnside.school.kiwi';
export const GITHUB_ORIGIN='https://zxw20110119-rgb.github.io';
export const schoolToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const validDate=value=>/^20\d{2}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&addDays(value,0)===value;
function entities(s){const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',hellip:'…'};return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(all,v)=>{if(v[0]!=='#')return named[v]??all;const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});}
export function plain(html){return entities(html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(_,code)=>{
 // KAMAR encodes public contact links as reversed literal arrays. Never execute source scripts.
 if(!code.includes('document.write'))return '';
 const parts=[...code.matchAll(/l\[(\d+)\]\s*=\s*'([^']*)';/g)].map(m=>[Number(m[1]),m[2]]).sort((a,b)=>b[0]-a[0]);
 return parts.map(([,v])=>/^\|\d+$/.test(v)?'&#'+v.slice(1)+';':v).join('');
}).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|li|h\d)>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
const letters={A:'a',B:'b',C:'c',D:'d',E:'e',G:'g',H:'h',K:'k',L:'l',M:'m',N:'n',X:'x',P:'pukehinau',R:'rakipaoa'};
export function findLocations(title,body){
 const input=title+'\n'+body,found=[];
 const add=(place,label,index)=>{if(!found.some(x=>x.place===place&&x.label===label)){
 const line=input.slice(Math.max(0,input.lastIndexOf('\n',index)+1),input.indexOf('\n',index)<0?undefined:input.indexOf('\n',index));
 found.push({place,label,context:/sign[ -]?up|registration|enrol|collect.*form/i.test(line)?'sign-up point':'mentioned location'});}};
 for(const m of input.matchAll(/\b([ABCDEGHKLMNXPR])\s*(?:block\b|[- ]?(\d{1,3})\b)/gi)){const key=letters[m[1].toUpperCase()];if(key)add(key,m[2]?m[1].toUpperCase()+m[2]:m[1].toUpperCase()+' Block',m.index);}
 const names=[['library',/\blibrary\b/ig],['canteen',/\b(?:canteen|cafeteria)\b/ig],['international',/\binternational (?:office|department)\b/ig],['reception',/\bmain reception\b/ig],['hunter',/\bhunter (?:gym|gymnasium)\b/ig],['aurora',/\baurora cent(?:re|er)\b/ig],['rakipaoa',/\brakipaoa\b/ig],['pukehinau',/\bpukehinau\b/ig]];
 for(const [key,pattern] of names)for(const m of input.matchAll(pattern))add(key,m[0],m.index);
 return found;
}
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function findDates(body,sourceDate){
 const hits=[];
 function add(m,day,month,year){let y=Number(year)||Number(sourceDate.slice(0,4));if(!year&&Number(sourceDate.slice(5,7))>=11&&month<=2)y++;
 const date=`${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(!validDate(date))return;
 const before=body.slice(Math.max(0,m.index-75),m.index).split(/[.!?\n]/).at(-1);
 const kind=/deadline|clos(?:e[sd]?|ing)|due|before|register by|sign[ -]?up by|entries by|applications by/i.test(before)?'deadline':/until|ends?|finishes?|through|\bto\s*$|[-–]\s*$/i.test(before)?'endDate':'startDate';
 hits.push({date,kind,evidence:m[0]});}
 for(const m of body.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s*(?:(20\d{2})\b)?/gi))add(m,+m[1],months.indexOf(m[2].slice(0,3).toLowerCase())+1,m[3]);
 for(const m of body.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/gi))add(m,+m[2],months.indexOf(m[1].slice(0,3).toLowerCase())+1,m[3]);
 for(const m of body.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?\b/g))add(m,+m[1],+m[2],m[3]?.length===2?'20'+m[3]:m[3]);
 for(const m of body.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g))add(m,+m[3],+m[2],m[1]);

 const monthName='January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
 let range=null;
 for(const m of body.matchAll(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:[-–—]|to|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+('+monthName+')(?:\\s+(20\\d{2}))?\\b','gi'))){
 const month=months.indexOf(m[3].slice(0,3).toLowerCase())+1,year=m[4]||sourceDate.slice(0,4),a=year+'-'+String(month).padStart(2,'0')+'-'+m[1].padStart(2,'0'),b=year+'-'+String(month).padStart(2,'0')+'-'+m[2].padStart(2,'0');if(validDate(a)&&validDate(b)&&a<=b)range=[a,b];
 }
 for(const m of body.matchAll(new RegExp('\\b('+monthName+')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:[-–—]|to|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b','gi'))){
 const month=months.indexOf(m[1].slice(0,3).toLowerCase())+1,year=m[4]||sourceDate.slice(0,4),a=year+'-'+String(month).padStart(2,'0')+'-'+m[2].padStart(2,'0'),b=year+'-'+String(month).padStart(2,'0')+'-'+m[3].padStart(2,'0');if(validDate(a)&&validDate(b)&&a<=b)range=[a,b];
 }
 const first=kind=>hits.filter(x=>x.kind===kind).map(x=>x.date).sort()[0]||null;
 return {startDate:range?.[0]||first('startDate'),endDate:range?.[1]||first('endDate'),deadline:first('deadline')};
}
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
export function parseNotices(html,date){
 if(!/Notices\s*(?:\||<)/i.test(html)||!html.includes('school.kiwi'))throw Error('The school returned an unexpected page.');
 const sections=html.split(/<div\s+class=["']card sk_card["'][^>]*>/i).slice(1),items=[];
 for(const section of sections){const title=plain(section.match(/<h5\b[^>]*class=["']card-title["'][^>]*>([\s\S]*?)<\/h5>/i)?.[1]||'');
 const body=plain(section.match(/<p\b[^>]*class=["']card-text["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
 if(!title||!body)continue;
 const category=plain(section.match(/<span\b[^>]*class=["'][^"']*badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'');
 const author=plain(section.match(/<h6\b[^>]*>([\s\S]*?)<\/h6>/i)?.[1]||'');
 const dates=findDates(body,date),relative=/\b(?:today|tomorrow)\b/i.test(body);
 items.push({id:hash(title+'\n'+body.replace(/\s+/g,' '))+(relative?'-'+date:''),title,body,category,author,locations:findLocations(title,body),...dates,sourceDate:date,sourceDates:[date],sourceUrl:SOURCE+'/notices/date/'+date});
 }
 if(!items.length&&sections.length)throw Error('School notice format changed.');
 return items;
}
const cache=new Map(),pending=new Map(),TTL=15*60000;
async function dayNotices(date,fetcher){
 const prior=cache.get(date);if(prior&&Date.now()-prior.time<TTL)return {...prior,stale:false};
 if(pending.has(date))return pending.get(date);
 const work=(async()=>{try{
 const response=await fetcher(SOURCE+'/notices/date/'+date,{headers:{'User-Agent':'FindMyBlock/1.0 (school notice map)','Accept':'text/html'},signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error('School returned '+response.status);
 const html=await response.text();if(html.length>1_000_000)throw Error('School response too large');
 const value={items:parseNotices(html,date),time:Date.now()};cache.set(date,value);if(cache.size>70)cache.delete(cache.keys().next().value);return {...value,stale:false};
 }catch(error){
 console.warn('School notices unavailable',date,error.message);
 if(prior)return {...prior,stale:true};
 if(snapshot.checkedDates?.includes(date))return {items:snapshot.items.filter(n=>n.sourceDates.includes(date)),time:Date.parse(snapshot.fetchedAt),stale:true};
 return {items:[],time:0,stale:true,unavailable:true};
 }finally{pending.delete(date);}})();pending.set(date,work);return work;
}
export async function getNotices(date,days=31,fetcher=fetch){
 const dates=Array.from({length:days},(_,i)=>addDays(date,i)),results=[];let index=0;
 await Promise.all(Array.from({length:Math.min(4,days)},async()=>{while(index<dates.length){const i=index++;results[i]=await dayNotices(dates[i],fetcher);}}));
 const items=new Map();for(let i=0;i<results.length;i++)for(const raw of results[i].items){
 const old=items.get(raw.id);if(old){if(!old.sourceDates.includes(dates[i]))old.sourceDates.push(dates[i]);}else items.set(raw.id,{...raw,sourceDates:[dates[i]],sourceDate:dates[i],sourceUrl:SOURCE+'/notices/date/'+dates[i]});}
 return {date,endDate:dates.at(-1),days,items:[...items.values()],checkedDates:dates.filter((_,i)=>!results[i].unavailable),unavailableDates:dates.filter((_,i)=>results[i].unavailable),stale:results.some(r=>r.stale),fetchedAt:new Date(Math.min(...results.filter(r=>r.time).map(r=>r.time),Date.now())).toISOString(),sourceUrl:SOURCE+'/notices/date/'+date};
}
export async function handleNoticeRequest(request){
 const url=new URL(request.url),headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Vary':'Origin','Cache-Control':'no-store'};
 if(request.headers.get('origin')===GITHUB_ORIGIN)headers['Access-Control-Allow-Origin']=GITHUB_ORIGIN;
 headers['Access-Control-Allow-Methods']='GET, OPTIONS';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(url.pathname!=='/api/notices')return Response.json({error:'Account sign-in and cloud syncing have been removed.'},{status:410,headers});
 if(request.method!=='GET')return Response.json({error:'Use GET.'},{status:405,headers});
 const date=url.searchParams.get('date')||schoolToday(),days=Number(url.searchParams.get('days')||31);
 if(!validDate(date)||![1,31].includes(days))return Response.json({error:'Choose a valid date and 1 or 31 days.'},{status:400,headers});
 return Response.json(await getNotices(date,days),{headers});
}
