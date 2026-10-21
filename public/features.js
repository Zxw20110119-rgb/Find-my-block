/* Search, building selection, local timetable and editable walkway closures. */
const buildingAreas={
  pukehinau:[[585,127],[684,127],[684,382],[585,382]],
  rakipaoa:[[375,414],[464,414],[464,564],[375,564]],
  e:[[493,411],[575,411],[575,562],[493,562]],
  l:[[611,437],[680,437],[680,523],[611,523]],
  a:[[600,548],[690,548],[690,650],[664,650],[664,690],[600,690],[600,651],[619,651],[619,584],[600,584]],
  b:[[707,438],[795,438],[795,583],[707,583]],
  n:[[705,252],[839,252],[839,367],[705,367]],
  x:[[701,381],[793,381],[793,421],[701,421]],
  g:[[820,315],[918,315],[918,380],[963,380],[963,481],[820,481]],
  c:[[814,493],[967,493],[967,601],[814,601]],
  h:[[746,173],[819,145],[870,243],[804,264]],
  k:[[818,138],[925,76],[980,195],[870,249]],
  d:[[855,656],[936,656],[936,810],[847,810]],
  m:[[469,652],[581,652],[581,959],[469,959]],
  library:[[779,659],[842,658],[842,822],[772,822]],
  international:[[688,664],[762,664],[762,810],[685,810]],
  reception:[[691,762],[786,762],[812,852],[704,839]],
  canteen:[[920,604],[1010,604],[1010,637],[920,637]],
  hunter:[[920,199],[1060,191],[1063,314],[966,334]],
  aurora:[[449,790],[583,790],[583,938],[449,938]]
};
function insidePolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>point[1])!==(yj>point[1])&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
function buildingAt(point){
  return Object.keys(buildingAreas).find(key=>insidePolygon(point,buildingAreas[key]))||null;
}
function nearestEdge(point,maxDistance=24){
  let candidate=null;
  for(const key of allEdges){
    const [a,b]=key.split("|"),v=nodes[a],w=nodes[b],dx=w[0]-v[0],dy=w[1]-v[1];
    const t=Math.max(0,Math.min(1,((point[0]-v[0])*dx+(point[1]-v[1])*dy)/(dx*dx+dy*dy)));
    const distance=len(point,[v[0]+t*dx,v[1]+t*dy]);
    if(distance<maxDistance&&(!candidate||distance<candidate.distance))candidate={key,distance};
  }
  return candidate?.key||null;
}
const make=(tag,label,className)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=label;if(className)e.className=className;return e;};
let activeTab="search",roadMode=null,pickedRoad=null;
let lastAutoClassKey="";
let calendarEvents=stored("fmb-calendar-v1",[]);
if(!Array.isArray(calendarEvents))calendarEvents=[];
let roomMappings=stored("fmb-rooms-v1",{});
if(!roomMappings||typeof roomMappings!=="object"||Array.isArray(roomMappings))roomMappings={};
let reports=stored("fmb-reports-v1",[]);
if(!Array.isArray(reports))reports=[];
const saveLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
function timetableSnapshot(){return {events:calendarEvents,roomMappings};}
async function persistTimetable(){
  if(window.TimetableAccount)return window.TimetableAccount.save(timetableSnapshot());
  return saveLocal("fmb-calendar-v1",calendarEvents)&&saveLocal("fmb-rooms-v1",roomMappings);
}
function applyAccountTimetable(data){
  calendarEvents=Array.isArray(data?.events)?data.events:[];
  roomMappings=data?.roomMappings&&typeof data.roomMappings==="object"?data.roomMappings:{};
  lastAutoClassKey="";refreshSchedule();refreshSearch();
}
const blockLetters=Object.fromEntries(Object.keys(places).filter(k=>k.length===1).map(k=>[k.toUpperCase(),k]));
blockLetters.P="pukehinau";
blockLetters.R="rakipaoa";
function placeForEvent(event){
  const code=CampusCalendar.roomCode(event),key=code||event.location||event.title;
  if(Object.hasOwn(roomMappings,key)&&places[roomMappings[key]])return roomMappings[key];
  const location=(event.location||"").toLowerCase();
  const exact=Object.keys(places).find(k=>[places[k].name.replace(" · nearby path",""),...(places[k].aliases||[])].some(label=>location.includes(label.toLowerCase())));
  return exact||blockLetters[location.trim().toUpperCase()]||blockLetters[code[0]]||null;
}
const campusTimezone="Pacific/Auckland";
const schoolDay=stamp=>new Intl.DateTimeFormat("en-NZ",{timeZone:campusTimezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(stamp);
function timeLabel(stamp){return new Intl.DateTimeFormat(lang==="zh"?"zh-CN":"en-NZ",{timeZone:campusTimezone,weekday:"short",hour:"numeric",minute:"2-digit"}).format(stamp);}
function activeCalendarEvents(){const now=new Date();return CampusCalendar.occurrences(calendarEvents,new Date(now.getTime()-86400000),new Date(now.getTime()+14*86400000));}
function classRouteContext(event,events){
  const previous=events.filter(other=>other.id!==event.id&&other.end<=event.start&&schoolDay(other.start)===schoolDay(event.start)).sort((a,b)=>b.end-a.end||b.start-a.start)[0]||null;
  return {previous,from:previous?placeForEvent(previous):null,to:placeForEvent(event)};
}
function routeToClass(event,events){
  const context=classRouteContext(event,events);
  if(!context.to)return false;
  if(context.from){$("from").value=context.from;manualPosition=null;selectingPosition=false;}
  $("to").value=context.to;plan();return true;
}
function syncClassRoute(event,events){
  if(!event){lastAutoClassKey="";return;}
  const context=classRouteContext(event,events);
  const key=JSON.stringify([event.id,context.previous?.id,context.from,context.to]);
  if(!context.to||key===lastAutoClassKey||selectingPosition||roadMode)return;
  if(routeToClass(event,events))lastAutoClassKey=key;
}
function setDestination(key){if(!places[key])return;$("to").value=key;plan();$("toolPanel").hidden=true;$("toolsButton").setAttribute("aria-expanded","false");}
function refreshSearch(){
  const query=$("searchInput").value.trim().toLowerCase(),container=$("searchResults");container.replaceChildren();
  if(!query){container.append(make("p",text("输入楼名或教室号。也可以直接点地图上的建筑。","Type a block or room number, or tap a building on the map."),"tool-copy"));return;}
  const room=CampusCalendar.roomCode({location:query,title:""});
  const mapped=roomMappings[room]||blockLetters[room[0]];
  const aliases={pukehinau:["p","p block"],rakipaoa:["r","r block","r楼","r 楼"],library:["lib"],canteen:["food","cafeteria"]};
  let matches=Object.keys(places).filter(key=>[key,places[key].name,places[key].zh||"",...(places[key].aliases||[]),...(aliases[key]||[])].some(word=>word.toLowerCase().includes(query)));
  if(room&&mapped&&places[mapped])matches=[mapped,...matches.filter(x=>x!==mapped)];
  for(const key of matches.slice(0,12)){const button=make("button",name(key));button.type="button";button.onclick=()=>setDestination(key);container.append(button);}
  if(!matches.length)container.append(make("p",text("没有找到。可在课表中设置教室对应的 Block。","No match. You can map rooms to blocks in Timetable."),"tool-copy"));
}
function buildRoomSelect(event){
  const select=make("select");select.className="room-select";select.setAttribute("aria-label","Block for "+(event.location||event.title));
  select.add(new Option(text("选择 Block","Choose block"),""));
  for(const key of Object.keys(places))select.add(new Option(name(key),key));
  select.value=placeForEvent(event)||"";
  select.onchange=()=>{
    const key=CampusCalendar.roomCode(event)||event.location||event.title;
    if(select.value)roomMappings[key]=select.value;else delete roomMappings[key];
    persistTimetable();refreshSchedule();refreshSearch();
  };
  return select;
}
function renderEvent(event,featured=false){
  const container=make("article",undefined,featured?"next-class":"schedule-item");
  const current=event.start<=Date.now()&&event.end>Date.now();
  container.append(make("strong",event.title+(current?text(" · 正在上课"," · Now"):"")));
  container.append(make("small",timeLabel(event.start)+"–"+new Intl.DateTimeFormat(lang==="zh"?"zh-CN":"en-NZ",{timeZone:campusTimezone,hour:"numeric",minute:"2-digit"}).format(event.end)+(event.location?" · "+event.location:"")));
  const code=CampusCalendar.roomCode(event),block=placeForEvent(event);
  if(code||event.location)container.append(make("small",code?text("教室 ","Room ")+code+(block?" · "+name(block):""):block?name(block):text("请指定教室所在楼","Assign a block for this room")));
  container.append(buildRoomSelect(event));
  const button=make("button",text("查看路线","Show route"));button.type="button";button.disabled=!block;button.onclick=()=>{routeToClass(event,activeCalendarEvents());$("toolPanel").hidden=true;$("toolsButton").setAttribute("aria-expanded","false");};container.append(button);
  return container;
}
function refreshSchedule(){
  const list=$("scheduleList"),next=$("nextClass"),peek=$("schedulePeek");list.replaceChildren();next.replaceChildren();
  $("clearCalendar").hidden=!calendarEvents.length;
  if(!calendarEvents.length){lastAutoClassKey="";peek.hidden=true;list.append(make("p",text("导入课表后，这里会显示下一节课。","Import a calendar to see your next class here."),"tool-copy"));return;}
  const now=Date.now(),events=activeCalendarEvents(),upcoming=events.filter(e=>e.end>now),first=events.find(e=>e.start>=now);
  syncClassRoute(first,events);
  if(first){
    next.append(make("small",text("下一节课","Next class")));
    next.append(renderEvent(first,true));
    const context=classRouteContext(first,events);
    next.append(make("small",context.previous?(context.from?name(context.from):text("上一节课的 Block 未设置","Previous class block not set"))+" → "+(context.to?name(context.to):text("下一节课的 Block 未设置","Next class block not set")):text("当天第一节课：保留起点，仅设置终点。","First class of the day: keep your start and set the destination.")));
    const minutes=Math.max(0,Math.ceil((first.start-now)/60000));
    peek.hidden=false;
    peek.textContent=(minutes?text(minutes+" 分钟后 · ","In "+minutes+" min · "):text("现在 · ","Now · "))+first.title+" · "+(first.location|| (placeForEvent(first)?name(placeForEvent(first)):text("教室待设置","room not set")));
  }else{peek.hidden=true;next.append(make("p",text("未来两周没有课程。","No classes in the next two weeks."),"tool-copy"));}
  for(const event of upcoming.slice(0,20))list.append(renderEvent(event));
}
function renderRoads(){
  $("closedNetwork").replaceChildren();$("closedList").replaceChildren();$("reportList").replaceChildren();
  for(const key of closedEdges){
    const [a,b]=key.split("|"),line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1",nodes[a][0]);line.setAttribute("y1",nodes[a][1]);line.setAttribute("x2",nodes[b][0]);line.setAttribute("y2",nodes[b][1]);$("closedNetwork").append(line);
    const button=make("button",text("重新开放步道 ","Reopen path ")+key.replace("|","–"));button.onclick=()=>toggleRoad(key);$("closedList").append(button);
  }
  for(const [index,report] of reports.entries()){
    const button=make("button",report.text+" · "+report.edge+text("（删除）"," (delete)"));
    button.onclick=()=>{reports.splice(index,1);saveLocal("fmb-reports-v1",reports);renderRoads();};
    $("reportList").append(button);
  }
  $("shareReport").hidden=reports.length===0;
  $("closeRoadMode").classList.toggle("active",roadMode==="close");$("reportMode").classList.toggle("active",roadMode==="report");
}
function toggleRoad(key){
  if(closedEdges.has(key))closedEdges.delete(key);else closedEdges.add(key);
  saveLocal("fmb-closed-v1",[...closedEdges]);renderRoads();plan();
  $("roadStatus").textContent=closedEdges.has(key)?text("已关闭路段；路线已重新计算。","Path closed; route recalculated."):text("已重新开放路段。","Path reopened.");
}
function showRoadSelection(key){
  const [a,b]=key.split("|");$("selectionLine").setAttribute("points",[nodes[a],nodes[b]].map(p=>p.join(",")).join(" "));
}
function roadTap(point){
  const scale=Number($("world").style.transform.match(/scale\(([\d.]+)\)/)?.[1])||1;
  const key=nearestEdge(point,Math.max(24,18/scale));
  $("toolPanel").hidden=false;$("toolsButton").setAttribute("aria-expanded","true");selectTab("roads");
  if(!key){$("roadStatus").textContent=text("请点击绘制的步道。","Tap a marked walkway.");return;}
  pickedRoad=key;showRoadSelection(key);
  if(roadMode==="close"){toggleRoad(key);$("reportForm").hidden=true;}
  else{$("roadStatus").textContent=text("描述这段路的问题。","Describe the problem on this path.");$("reportForm").hidden=false;$("reportText").focus();}
  roadMode=null;document.body.classList.remove("choosing-road");renderRoads();update(.12);
}
function handleMapToolTap(point){
  if(roadMode){roadTap(point);return;}
  const building=buildingAt(point);
  if(building)setDestination(building);
}
function selectTab(tab){
  activeTab=tab;
  for(const id of ["search","timetable","roads","mapstyle"])$(id+"Tab").hidden=id!==tab;
  for(const button of document.querySelectorAll(".tool-tabs button"))button.classList.toggle("active",button.dataset.tab===tab);
  $("panelTitle").textContent=({search:text("查找地点","Find a place"),timetable:text("我的课表","My timetable"),roads:text("步道状态","Walkway status"),mapstyle:text("地图样式","Map style")})[tab];
  if(tab==="search")refreshSearch();if(tab==="timetable")refreshSchedule();if(tab==="roads")renderRoads();
}
function refreshTools(){
  $("toolsButton").textContent=text("工具","Tools");
  for(const [id,zh,en] of [["search","搜索","Search"],["timetable","课表","Timetable"],["roads","道路","Roads"],["mapstyle","地图","Map"]])document.querySelector('.tool-tabs [data-tab="'+id+'"]').textContent=text(zh,en);
  for(const [id,zh,en] of [
    ["searchLabel","查找楼或教室","Find a block or classroom"],
    ["calendarHelp","导入 Apple Calendar 或 Google Calendar 导出的 .ics 文件。登录后课表保存到账号；未登录时仅保存在此设备。根据上一节与下一节课自动设置路线；当天第一节课只设置终点。","Import an .ics file from Apple Calendar or Google Calendar. Sign in to save it to your account; otherwise it stays on this device. Routes use your previous and next class. The first class keeps your starting point."],
    ["icsLabel","选择 .ics 文件","Choose .ics file"],
    ["clearCalendar","删除课表","Remove timetable"],
    ["roadHelp","点击步道以关闭路线或记录错误。保存的反馈可以分享给网站作者。","Tap a marked walkway to close it or report a route error. You can share a saved report with the site owner."],
    ["closeRoadMode","关闭／重开步道","Close / reopen a path"],
    ["reportMode","反馈路线问题","Report an issue"],
    ["reportLabel","这段路有什么问题？","What is wrong here?"],
    ["saveReport","保存反馈到此设备","Save report on this device"],
    ["shareReport","分享反馈","Share report"],
    ["mapHelp","淡化底图，突出建筑名称和路线。","Show building names clearly over a faded campus map."],
    ["mapTapHelp","点击地图上的建筑可选终点；“地图选点”仍用于设置起点。","Tap a building on the map to make it your destination. Set on map still chooses your starting point."]
  ])$(id).textContent=text(zh,en);
  $("searchInput").placeholder=text("例如 B 楼或 B12","e.g. B Block or B12");
  $("reportText").placeholder=text("例如施工封路","e.g. Path blocked by construction");
  $("simpleToggle").textContent=document.body.classList.contains("simple-map")?text("关闭简洁模式","Turn off simple map"):text("开启简洁模式","Turn on simple map");
  selectTab(activeTab);refreshSearch();refreshSchedule();renderRoads();renderSimpleLabels();
  window.TimetableAccount?.render();
}
function renderSimpleLabels(){
  const root=$("simpleLabels");root.replaceChildren();
  for(const [key,polygon] of Object.entries(buildingAreas)){
    const x=polygon.reduce((s,p)=>s+p[0],0)/polygon.length,y=polygon.reduce((s,p)=>s+p[1],0)/polygon.length;
    const textNode=document.createElementNS("http://www.w3.org/2000/svg","text");textNode.setAttribute("x",x);textNode.setAttribute("y",y);textNode.textContent=key==="rakipaoa"?"R":name(key).replace(" Block","");if(key==="rakipaoa")textNode.setAttribute("class","always-label");root.append(textNode);
  }
}
$("toolsButton").onclick=()=>{$("toolPanel").hidden=!$("toolPanel").hidden;$("toolsButton").setAttribute("aria-expanded",String(!$("toolPanel").hidden));if(!$("toolPanel").hidden)selectTab(activeTab);};
$("closePanel").onclick=()=>{$("toolPanel").hidden=true;$("toolsButton").setAttribute("aria-expanded","false");};
for(const button of document.querySelectorAll(".tool-tabs button"))button.onclick=()=>selectTab(button.dataset.tab);
$("searchInput").oninput=refreshSearch;
$("schedulePeek").onclick=()=>{$("toolPanel").hidden=false;$("toolsButton").setAttribute("aria-expanded","true");selectTab("timetable");};
$("icsFile").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error("Calendar file is too large (2 MB maximum).");
    const parsed=CampusCalendar.readIcs(await file.text());calendarEvents=parsed;lastAutoClassKey="";
    const saved=await persistTimetable();
    $("calendarStatus").textContent=text("已导入 "+parsed.length+" 项日程。","Imported "+parsed.length+" calendar events.")+(saved?"":text(" 保存尚未完成，请查看账号状态。"," Saving is not complete. Check the account status."));
    refreshSchedule();
  }catch(error){$("calendarStatus").textContent=error.message;}
  e.target.value="";
};
$("clearCalendar").onclick=()=>{
  calendarEvents=[];roomMappings={};lastAutoClassKey="";
  persistTimetable();
  $("calendarStatus").textContent=text("课表已清空。","Timetable cleared.");refreshSchedule();refreshSearch();
};
for(const [id,mode] of [["closeRoadMode","close"],["reportMode","report"]])$(id).onclick=()=>{
  if(selectingPosition)cancelPinSelection();
  roadMode=roadMode===mode?null:mode;document.body.classList.toggle("choosing-road",!!roadMode);
  $("roadStatus").textContent=roadMode?text("现在点击地图上要修改的步道。","Now tap the walkway on the map."):"";
  $("toolPanel").hidden=!!roadMode;$("toolsButton").setAttribute("aria-expanded",String(!$("toolPanel").hidden));renderRoads();update(.12);
};
$("saveReport").onclick=()=>{
  const value=$("reportText").value.trim();if(!pickedRoad||!value){$("roadStatus").textContent=text("请先写下问题。","Describe the issue first.");return;}
  reports.unshift({edge:pickedRoad,text:value.slice(0,250),created:Date.now()});
  saveLocal("fmb-reports-v1",reports);$("reportText").value="";$("reportForm").hidden=true;$("selectionLine").setAttribute("points","");
  $("roadStatus").textContent=text("已保存到此设备。点击“分享反馈”即可发出。","Saved on this device. Tap Share report to send it.");renderRoads();
};
$("shareReport").onclick=async()=>{
  const report=reports[0];if(!report)return;
  const [a,b]=report.edge.split("|");
  const message="Find My Block route report\n"+report.text+"\nPath: "+report.edge+" ("+nodes[a].join(",")+" → "+nodes[b].join(",")+")\n"+location.origin+location.pathname;
  try{
    if(window.navigator?.share){await window.navigator.share({title:"Find My Block route report",text:message});$("roadStatus").textContent=text("已打开分享选项。","Share options opened.");}
    else if(window.navigator?.clipboard){await window.navigator.clipboard.writeText(message);$("roadStatus").textContent=text("已复制反馈，可粘贴发送。","Report copied. Paste it into a message to send.");}
    else $("roadStatus").textContent=text("当前浏览器无法分享，可长按记录复制。","Sharing unavailable; long-press the report to copy it.");
  }catch(error){if(error.name!=="AbortError")$("roadStatus").textContent=text("分享失败，请重试。","Could not share. Please try again.");}
};
$("simpleToggle").onclick=()=>{
  document.body.classList.toggle("simple-map");saveLocal("fmb-simple-map-v1",document.body.classList.contains("simple-map"));refreshTools();
};
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&roadMode){roadMode=null;document.body.classList.remove("choosing-road");renderRoads();update(.12);}});
document.body.classList.toggle("simple-map",stored("fmb-simple-map-v1",false)===true);
renderSimpleLabels();refreshTools();setInterval(refreshSchedule,60000);
window.addEventListener("focus",refreshSchedule);
window.addEventListener("pageshow",refreshSchedule);
