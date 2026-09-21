/* Coordinates traced from the user's red-line map; units are image pixels, not metres. */
const nodes={
w0:[437,390],w1:[480,390],w2:[597,390],w3:[695,390],
n0:[695,245],n2:[795,245],nTurn:[808,270],n3:[858,266],n4:[887,251],n7:[894,151],
g0:[858,373],gHub:[858,317],g1:[805,373],b0:[695,430],b1:[805,430],a0:[597,535],a1:[695,535],a2:[597,583],e0:[480,587],e1:[433,587],e2:[433,562],m0:[591,587],m2:[591,675],m3:[591,707],m4:[591,908],
c0:[805,535],cTop:[805,485],cEast:[983,485],c1:[805,594],c2:[695,594],xBridge:[695,375],xg:[805,375],q0:[695,657],q0w:[657,657],q1:[805,657],q1e:[900,657],q1n:[900,605],south:[657,707],
s0:[887,272],s2:[948,317],s4:[983,368],s5:[983,585],s6:[935,595],s6h:[983,595]
};
// Extra walkways from the latest red-line markup: X→G and the east side of C Block.
const chains=[
["w0","w1","w2","w3"],["w1","e0"],["w2","a0","a2"],["a2","m0"],["a0","a1"],
["e2","e1","e0","m0","m2","m3","m4"],["m3","south","q0w","q0"],
["q0","c2","a1","b0","w3","n0"],["b0","b1"],["b1","xg","g1","g0","gHub","n3"],["w3","xBridge","xg"],["b1","c0","cTop","cEast"],["cTop","c1"],["c1","q1"],
["c2","c1"],["q0","q1","q1e","q1n","s6","s6h","s5"],
["n0","n2","nTurn","n3","n4","n7"],["n3","s0","s2","s4","cEast","s5"]
];
const places={
a:{name:"A Block",access:["a0","a1","q0","m2"]},
b:{name:"B Block",access:["b0","b1","a1","c1"]},
c:{name:"C Block",access:["c0","cTop","cEast","c1","s5"]},
d:{name:"D Block",access:["q1e"]},
e:{name:"E Block",access:["w1","w2","e0"]},
g:{name:"G Block",access:["g0","g1","gHub","s4"]},
h:{name:"H Block",access:["n0","n2"]},
k:{name:"K Block",access:["n3","n4","n7"]},
l:{name:"L Block",access:["w2","a0","a1"]},
m:{name:"M Block",access:["m0","m2","m3"]},
n:{name:"N Block",access:["n0","w3","g0"]},
x:{name:"X Block",access:["w3","b0","b1"]},
library:{name:"Library",zh:"图书馆",access:["q1"]},
international:{name:"International Office",zh:"国际部",access:["q0","south"]},
reception:{name:"Main Reception · nearby path",zh:"接待处附近步道",access:["south"]},
canteen:{name:"Canteen",zh:"食堂",access:["s6"]},
hunter:{name:"Hunter Gym",access:["s2","s4"]},
aurora:{name:"Aurora Centre",access:["m4"]},
rakipaoa:{name:"Rakipaoa",access:["w0","e2"]},
pukehinau:{name:"Pukehinau",access:["w3","n0"]}
};
const graph=Object.fromEntries(Object.keys(nodes).map(k=>[k,[]]));
const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
chains.forEach(chain=>chain.slice(1).forEach((b,i)=>{const a=chain[i],d=len(nodes[a],nodes[b]);graph[a].push([b,d]);graph[b].push([a,d]);}));
function shortest(from,to){
const dist=Object.fromEntries(Object.keys(nodes).map(k=>[k,Infinity])),prev={},queue=new Set(Object.keys(nodes));
places[from].access.forEach(k=>dist[k]=0);
let end;
while(queue.size){let u=[...queue].reduce((a,b)=>dist[a]<dist[b]?a:b);if(!Number.isFinite(dist[u]))break;queue.delete(u);if(places[to].access.includes(u)){end=u;break;}
for(const [v,w]of graph[u])if(queue.has(v)&&dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u;}}
if(!end)throw Error("No connected route");
const path=[end];while(prev[path[0]])path.unshift(prev[path[0]]);
return path;
}
const $=id=>document.getElementById(id);
let lang="en",path=[],points=[],total=0,travel=0,playing=false,started=false,follow=true,zoom=1,pan=[0,0],angle=0,last=0,velocity=0,lastInstruction="",lastIcon="";
const text=(zh,en)=>lang==="zh"?zh:en;
const name=k=>lang==="zh"?(places[k].zh||places[k].name):places[k].name;
function options(){for(const id of ["from","to"]){const old=$(id).value;$(id).replaceChildren(...Object.keys(places).map(k=>new Option(name(k),k)));if(old)$(id).value=old;}}
function plan(){
playing=false;started=false;travel=0;velocity=0;follow=false;pan=[0,0];zoom=1;
path=shortest($("from").value,$("to").value);points=path.map(k=>nodes[k]);total=points.slice(1).reduce((s,p,i)=>s+len(points[i],p),0);
const poly=points.map(p=>p.join(",")).join(" ");$("route").setAttribute("points",poly);$("halo").setAttribute("points",poly);
for(const line of [$("route"),$("halo")]){line.classList.remove("route-draw");void line.getBoundingClientRect();line.classList.add("route-draw");}
const end=points.at(-1);$("destination").setAttribute("transform","translate("+end.join(" ")+")");
const url=new URL(location.href);url.searchParams.set("start",$("from").value);url.searchParams.set("end",$("to").value);history.replaceState(null,"",url);
const card=$("bottomCard");card.classList.remove("card-change");void card.offsetWidth;card.classList.add("card-change");
update();
}
function at(distance){
let remaining=distance;
for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],d=len(a,b);if(d<.001)continue;if(remaining<=d||i===points.length-2){const t=Math.min(1,remaining/d);return {p:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],heading:Math.atan2(b[0]-a[0],-(b[1]-a[1]))*180/Math.PI,index:i};}remaining-=d;}
return {p:points[0]||[0,0],heading:0,index:0};
}
function camera(state,dt=.016){
const w=$("map").clientWidth,h=$("map").clientHeight,mobile=w<=760;
let scale,cx,cy,px,py,rotation;
if(started&&follow){
scale=(mobile?1.45:1.8)*zoom;cx=mobile?w*.46:384+(w-384)*.5;cy=mobile?h*.57:h*.62;[px,py]=state.p;
const desired=-state.heading;const turn=((desired-angle+540)%360)-180;angle+=turn*(1-Math.exp(-Math.min(dt,.12)*8));rotation=angle;
}else{
const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const bw=Math.max(220,Math.max(...xs)-Math.min(...xs)+170),bh=Math.max(220,Math.max(...ys)-Math.min(...ys)+170);
scale=Math.min((mobile?w-40:w-470)/bw,(mobile?Math.max(180,h-480):h-220)/bh,1.6)*zoom;
cx=mobile?w*.5:410+(w-410)*.5;cy=mobile?280+Math.max(180,h-480)*.5:h*.53;px=(Math.min(...xs)+Math.max(...xs))/2;py=(Math.min(...ys)+Math.max(...ys))/2;rotation=0;
angle=0;
}
$("world").style.transform="translate("+(cx+pan[0])+"px,"+(cy+pan[1])+"px) rotate("+rotation+"deg) scale("+scale+") translate("+(-px)+"px,"+(-py)+"px)";
$("follow").classList.toggle("active",started&&follow);
}
function update(dt=.016){
const state=at(travel),arrived=travel>=total,from=$("from").value,to=$("to").value;
$("position").setAttribute("transform","translate("+state.p.join(" ")+") rotate("+state.heading+")");
$("tripTitle").textContent=name(to);$("tripSubtitle").textContent=text("从 ","From ")+name(from);
$("language").textContent=lang==="zh"?"EN":"中文";
$("start").textContent=arrived?text("已到达","Arrived"):playing?text("暂停演示","Pause demo"):started?text("继续演示","Resume demo"):text("开始模拟导航","Start demo");
$("start").disabled=arrived;
$("reset").textContent=text("重新规划","Reset");
$("note").textContent=text("按你标注的步道规划。模拟位置；尚未接入 GPS 或手机朝向。","Uses your marked paths. Simulated location; GPS and device heading are not connected.");
$("badge").textContent=started?text("模拟导航 · 非实时定位","SIMULATION · Not live location"):text("路线预览 · 未开启定位","Route preview · Location off");
$("progressWrap").hidden=!started;document.body.classList.toggle("simulating",started);
$("progressLabel").textContent=text("拖动预览行程","Scrub through the route")+" · "+(total?Math.round(travel/total*100):100)+"%";
$("progress").value=total?Math.round(travel/total*1000):1000;
let instruction=text("沿蓝色路线前行","Follow the blue route"),icon="↑";
if(arrived){instruction=from===to?text("你已在目的地","Already at destination"):text("已到达建筑旁步道","At the path beside your block");icon="✓";}
else if(started&&state.index<points.length-2){
const a=points[state.index],b=points[state.index+1],c=points[state.index+2];
const h1=Math.atan2(b[1]-a[1],b[0]-a[0]),h2=Math.atan2(c[1]-b[1],c[0]-b[0]);const turn=((h2-h1)*180/Math.PI+540)%360-180;
if(Math.abs(turn)>30){instruction=turn>0?text("前方右转","Turn right ahead"):text("前方左转","Turn left ahead");icon=turn>0?"↱":"↰";}
else instruction=text("继续直行","Continue straight");
}
$("instruction").textContent=instruction;$("turnIcon").textContent=icon;
if(instruction!==lastInstruction||icon!==lastIcon){const guidance=$("guidance");guidance.classList.remove("guidance-change");void guidance.offsetWidth;guidance.classList.add("guidance-change");lastInstruction=instruction;lastIcon=icon;}
$("next").textContent=arrived?name(to):text("前往 ","Towards ")+name(to);
camera(state,dt);
}
$("network").innerHTML=chains.map(c=>'<polyline points="'+c.map(k=>nodes[k].join(",")).join(" ")+'"/>').join("");
options();
const params=new URLSearchParams(location.search);
$("from").value=places[params.get("start")]?params.get("start"):"library";
$("to").value=places[params.get("end")]?params.get("end"):"k";
$("from").onchange=plan;$("to").onchange=plan;
$("swap").onclick=()=>{const a=$("from").value;$("from").value=$("to").value;$("to").value=a;plan();};
$("language").onclick=()=>{lang=lang==="zh"?"en":"zh";document.documentElement.lang=lang==="zh"?"zh-CN":"en";options();update(.16);};
$("start").onclick=()=>{if(travel>=total)return;started=true;playing=!playing;follow=true;pan=[0,0];last=0;update(.16);};
$("reset").onclick=plan;
$("progress").oninput=()=>{playing=false;travel=Number($("progress").value)/1000*total;update(.12);};
$("overview").onclick=()=>{follow=false;pan=[0,0];zoom=1;update(.18);};
$("follow").onclick=()=>{started=true;follow=true;pan=[0,0];update(.18);};
$("plus").onclick=()=>{zoom=Math.min(3,zoom*1.25);update(.18);};
$("minus").onclick=()=>{zoom=Math.max(.45,zoom/1.25);update(.18);};
let drag=null;
$("map").onpointerdown=e=>{drag=[e.clientX,e.clientY,...pan];$("map").setPointerCapture(e.pointerId);};
$("map").onpointermove=e=>{if(!drag)return;pan=[drag[2]+e.clientX-drag[0],drag[3]+e.clientY-drag[1]];camera(at(travel),.05);};
$("map").onpointerup=()=>drag=null;$("map").onpointercancel=()=>drag=null;
window.addEventListener("resize",()=>camera(at(travel)));
function tick(now){const dt=last?Math.min((now-last)/1000,.12):0;if(playing&&dt){const response=1-Math.exp(-dt*6);velocity+=(30-velocity)*response;travel=Math.min(total,travel+velocity*dt);if(travel>=total){playing=false;velocity=0;}update(dt);}else if(!playing&&velocity>0.05){velocity*=Math.exp(-dt*9);}last=now;requestAnimationFrame(tick);}
plan();requestAnimationFrame(tick);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:"plan_campus_route",description:"Plan a campus route along the marked walkways; location is simulated.",inputSchema:{type:"object",properties:{start:{type:"string",enum:Object.keys(places)},destination:{type:"string",enum:Object.keys(places)}},required:["start","destination"],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!places[input.start]||!places[input.destination])throw Error("Unknown location");$("from").value=input.start;$("to").value=input.destination;plan();return {start:input.start,destination:input.destination,simulation:true};}})).catch(()=>{});}catch{}}
