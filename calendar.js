/* Calendar files are parsed in the browser. Nothing is uploaded. */
(function(){
  const weekdays={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};
  const unfold=source=>source.replace(/\r?\n[ \t]/g,"").split(/\r?\n/);
  function parseDate(raw,tz){
    if(!raw)return null;
    const m=/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?)?(Z)?$/.exec(raw.trim());
    if(!m)return null;
    const y=+m[1],month=+m[2]-1,day=+m[3],h=+(m[4]||0),min=+(m[5]||0),sec=+(m[6]||0);
    const utc=Date.UTC(y,month,day,h,min,sec);
    if(m[7])return new Date(utc);
    if(tz){
      try{
        const formatter=new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
        let stamp=utc;
        for(let i=0;i<3;i++){
          const fields=Object.fromEntries(formatter.formatToParts(new Date(stamp)).map(p=>[p.type,+p.value]));
          const seen=Date.UTC(fields.year,fields.month-1,fields.day,fields.hour,fields.minute,fields.second);
          const next=stamp+utc-seen;
          if(next===stamp)break;
          stamp=next;
        }
        return new Date(stamp);
      }catch{/* Unknown TZID: use the browser's local time below. */}
    }
    return new Date(y,month,day,h,min,sec);
  }
  const decode=s=>String(s||"").replace(/\\[nN]/g,"\n").replace(/\\([,;\\])/g,"$1");
  function readIcs(source){
    if(typeof source!=="string"||source.length>2_000_000)throw Error("Calendar file is too large (2 MB maximum).");
    if(!/BEGIN:VCALENDAR/i.test(source))throw Error("Choose an .ics calendar file.");
    const events=[];let event=null;
    for(const line of unfold(source)){
      if(line==="BEGIN:VEVENT"){event={};continue;}
      if(line==="END:VEVENT"){
        if(event?.DTSTART&&events.length<2000)events.push(event);
        event=null;continue;
      }
      if(!event)continue;
      const index=line.indexOf(":");if(index<0)continue;
      const head=line.slice(0,index),value=line.slice(index+1),key=head.split(";")[0].toUpperCase();
      if(["DTSTART","DTEND","EXDATE","RECURRENCE-ID"].includes(key)){
        const tz=/TZID=(?:"([^"]+)"|([^;]+))/i.exec(head)?.slice(1).find(Boolean)||"";
        (event[key]??=[]).push({value,tz});
      }else if(["SUMMARY","LOCATION","UID","RRULE","STATUS"].includes(key))event[key]=value;
    }
    if(!events.length)throw Error("No calendar events found in this file.");
    return events;
  }
  function occurrences(events,from,to){
    const result=[];
    const overridden=new Set(events.filter(e=>e["RECURRENCE-ID"]?.length).map(e=>{
      const v=e["RECURRENCE-ID"][0];return e.UID+":"+parseDate(v.value,v.tz)?.getTime();
    }));
    for(const e of events){
      if(e.STATUS==="CANCELLED")continue;
      const startSpec=e.DTSTART?.[0],endSpec=e.DTEND?.[0];
      if(!startSpec||!startSpec.value.includes("T"))continue; // all-day events are not lessons
      const start=parseDate(startSpec.value,startSpec.tz);
      const end=endSpec?parseDate(endSpec.value,endSpec.tz):null;
      if(!start||!Number.isFinite(start.getTime()))continue;
      const duration=end&&end>start?Math.min(end-start,86400000):3600000;
      const exclusions=new Set((e.EXDATE||[]).flatMap(v=>v.value.split(",").map(s=>parseDate(s,v.tz||startSpec.tz)?.getTime())));
      const rule=Object.fromEntries((e.RRULE||"").split(";").map(x=>x.split("=")));
      const add=date=>{
        const stamp=date.getTime();
        if(stamp<from.getTime()-duration||stamp>to.getTime()||exclusions.has(stamp)||(!e["RECURRENCE-ID"]&&overridden.has(e.UID+":"+stamp)))return;
        result.push({id:(e.UID||e.SUMMARY||"")+":"+stamp,title:decode(e.SUMMARY)||"Class",location:decode(e.LOCATION),start:stamp,end:stamp+duration});
      };
      if(!rule.FREQ){add(start);continue;}
      if(!["WEEKLY","DAILY"].includes(rule.FREQ))continue;
      const ymd=/^(\d{4})(\d\d)(\d\d)T/.exec(startSpec.value);
      if(!ymd)continue;
      const base=Date.UTC(+ymd[1],+ymd[2]-1,+ymd[3]);
      const until=rule.UNTIL?parseDate(rule.UNTIL,startSpec.tz)?.getTime():Infinity;
      const interval=Math.max(1,Math.min(365,Number(rule.INTERVAL)||1));
      const byDay=rule.BYDAY?.split(",").map(d=>weekdays[d]).filter(d=>d!==undefined);
      let count=0;
      for(let d=0;d<15000;d++){
        const date=new Date(base+d*86400000);
        if(date.getTime()>to.getTime()+86400000)break;
        const eligible=rule.FREQ==="DAILY"?d%interval===0:Math.floor(d/7)%interval===0&&(!byDay?date.getUTCDay()===new Date(base).getUTCDay():byDay.includes(date.getUTCDay()));
        if(!eligible)continue;
        const token=date.toISOString().slice(0,10).replace(/-/g,"")+startSpec.value.slice(8);
        const occurrence=parseDate(token,startSpec.tz);
        if(!occurrence||occurrence.getTime()>until)break;
        if(rule.COUNT&&++count>Number(rule.COUNT))break;
        add(occurrence);
      }
    }
    return result.sort((a,b)=>a.start-b.start).slice(0,500);
  }
  function roomCode(event){
    const source=[event.location,event.title].filter(Boolean).join(" ").toUpperCase();
    const match=source.match(/\b(?:ROOM|RM|CLASSROOM)?\s*([ABCDEGHKLMNPRX])\s*[- ]?\s*(\d{1,3}[A-Z]?)\b/);
    return match?match[1]+match[2]:"";
  }
  window.CampusCalendar={readIcs,occurrences,roomCode,parseDate};
})();
