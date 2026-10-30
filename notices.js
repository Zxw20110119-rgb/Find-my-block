/* Public school notices; no accounts, geolocation or timetable uploads. */
(function(){
  const host='https://find-my-block-bhs.zengxuanwen.chatgpt.site';
  const isPages=location.hostname==='zxw20110119-rgb.github.io';
  const api=isPages?host+'/api/notices':'/api/notices';
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let selected=today(),days=31,data=null,loading=false,generation=0,pins=[],shown=true,opened=[],focusBefore=null,firstLoad=true;
  const shortTitle=title=>title.split(/\s+/).slice(0,5).join(' ')+(title.split(/\s+/).length>5?'…':'');
  function dateLabel(value){return value?new Intl.DateTimeFormat(lang==='zh'?'zh-CN':'en-NZ',{timeZone:'Pacific/Auckland',day:'numeric',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00+13:00')):text('未注明','Not stated');}
  const sourceFor=date=>'https://burnside.school.kiwi/notices/date/'+date;
  function dateRows(n){return [[text('开始','Starts'),n.startDate],[text('结束','Ends'),n.endDate],[text('报名截止','Sign-up deadline'),n.deadline]];}
  function openTools(){ $('toolPanel').hidden=false;$('toolsButton').setAttribute('aria-expanded','true');selectTab('notices'); }
  function card(n,full=false){
    const article=make('article',undefined,'notice-card');article.append(make(full?'h3':'strong',n.title));
    article.append(make('small',(n.category||text('学校通知','School notice'))+' · '+(n.locations.length?n.locations.map(l=>l.label).join(', '):text('校外／地点未定位','Off campus / location not mapped'))));
    const dates=make('div',undefined,'notice-dates');for(const [label,value] of dateRows(n))dates.append(make('span',label+': '+dateLabel(value)));article.append(dates);
    if(full){
      article.append(make('p',n.body,'notice-body'));
      if(n.author)article.append(make('small',text('发布者：','Posted by: ')+n.author));
      article.append(make('small',text('通知刊登日期：','Notice listed: ')+dateLabel(n.sourceDates[0])+(n.sourceDates.length>1?' – '+dateLabel(n.sourceDates.at(-1)):'')));
      if(n.locations.length)article.append(make('p',text('图钉标在对应建筑；教室的精确位置请以现场标识为准。','Pins identify the building, not the exact room. Follow signs at the building.'),'tool-copy'));
      for(const l of n.locations){
        const button=make('button',text('导航至 ','Route to ')+l.label+(l.context==='sign-up point'?text('（报名点）',' (sign-up point)'):''),'tool-action');button.type='button';button.onclick=()=>{$('noticeDialog').close();setDestination(l.place);};article.append(button);
      }
      const link=make('a',text('查看学校原文 ↗','Read on school website ↗'),'notice-source');link.href=sourceFor(n.sourceDate);link.target='_blank';link.rel='noopener noreferrer';article.append(link);
    }else{
      const excerpt=n.body.split('\n').filter(Boolean).slice(0,1).join(' ');article.append(make('p',excerpt.slice(0,100)+(excerpt.length>100?'…':''),'tool-copy'));
      const button=make('button',text('查看完整通知','Read full notice'),'tool-action');button.type='button';button.onclick=()=>show([n]);article.append(button);
    }
    return article;
  }
  function show(items){
    opened=items;focusBefore=document.activeElement;$('noticeDetail').replaceChildren(...items.map(n=>card(n,true)));
    $('noticeDialogTitle').textContent=items.length===1?text('通知详情','Notice details'):text('此处的通知','Notices at this place');
    if(!$('noticeDialog').open)$('noticeDialog').showModal();
  }
  const anchor=key=>{const poly=buildingAreas[key];return [(Math.min(...poly.map(p=>p[0]))+Math.max(...poly.map(p=>p[0])))/2,Math.min(...poly.map(p=>p[1]))+22];};
  function renderPins(){
    $('noticePins').replaceChildren();pins=[];if(!shown||!data)return;
    const groups=new Map();for(const n of data.items)for(const l of n.locations){if(!places[l.place]||!buildingAreas[l.place])continue;const group=groups.get(l.place)||[];if(!group.some(x=>x.id===n.id))group.push(n);groups.set(l.place,group);}
    for(const [key,items] of groups){
      const point=anchor(key);
      const button=make('button',undefined,'notice-pin');button.type='button';button.setAttribute('aria-label',items.map(n=>n.title).join('; ')+' · '+name(key));
      const icon=make('span',String(items.length),'notice-pin-icon');icon.setAttribute('aria-hidden','true');button.append(icon,make('span',shortTitle(items[0].title)+(items.length>1?' +'+(items.length-1):''),'notice-pin-title'));
      button.onpointerdown=e=>e.stopPropagation();button.onpointerup=e=>e.stopPropagation();button.onclick=e=>{e.stopPropagation();show(items);};
      $('noticePins').append(button);pins.push({button,point});
    }
    updatePins();
  }
  function updatePins(){
    if(!pins.length)return;
    const transform=getComputedStyle($('world')).transform,matrix=new DOMMatrixReadOnly(transform==='none'?undefined:transform);
    for(const {button,point} of pins){const p=new DOMPoint(...point).matrixTransform(matrix);button.style.left=p.x+'px';button.style.top=p.y+'px';}
  }
  function render(){
    $('noticeDateLabel').textContent=text('从此日期起','Starting date');$('noticeToday').textContent=text('今天','Today');$('noticeRefresh').textContent=text('刷新','Refresh');
    $('noticeRange').options[0].textContent=text('未来一个月','Next 31 days');$('noticeRange').options[1].textContent=text('仅当天','One day');
    $('noticeDate').value=selected;$('noticeRange').value=String(days);$('noticeToggleLabel').textContent=text('显示通知图钉','Show notice pins');
    $('noticeHelp').textContent=text('展示所选期间已发布的通知。开始、结束与报名截止按原文提取；未写明时显示“未注明”。请核对完整通知中的时间。','Notices published for this period. Starts, ends and sign-up deadlines are taken from the text; missing dates are marked Not stated. Check the full notice for times.');
    $('noticeSource').href=sourceFor(selected);$('noticeSource').textContent=text('打开学校通知 ↗','Open school notices ↗');
    $('noticeClose').setAttribute('aria-label',text('关闭通知','Close notice'));
    const list=$('noticeList');list.replaceChildren();
    if(data){
      for(const n of data.items)list.append(card(n));
      const mapped=data.items.filter(n=>n.locations.length).length;
      $('noticePeek').textContent=text('校园通知 · ','Notices · ')+data.items.length;
      const status=(loading?text('正在更新 · ','Updating · '):'')+dateLabel(data.date)+(days>1?' – '+dateLabel(data.endDate):'')+' · '+data.items.length+text(' 条通知，',' notices, ')+mapped+text(' 条已标记',' mapped')+(data.stale?text(' · 缓存，部分日期未能实时更新',' · cached; some dates could not be refreshed'):'');
      $('noticeStatus').textContent=status+(data.fetchedAt?' · '+text('读取于 ','Read ')+new Date(data.fetchedAt).toLocaleString(lang==='zh'?'zh-CN':'en-NZ',{timeZone:'Pacific/Auckland'}):'');
      if(!data.items.length)list.append(make('p',data.unavailableDates?.length?text('暂时无法读取这些日期，请打开学校原文。','These dates are temporarily unavailable. Open the school notices.'):text('学校尚未发布这段时间的通知。','The school has not posted notices for this period.'),'tool-copy'));
    }else{$('noticePeek').textContent=text('校园通知','School notices');$('noticeStatus').textContent=loading?text('正在读取学校通知…','Reading school notices…'):text('暂时无法读取，请刷新或打开学校原文。','Notices unavailable. Refresh or open the school website.');}
    $('noticeRefresh').disabled=loading;renderPins();
    if($('noticeDialog').open&&opened.length)$('noticeDetail').replaceChildren(...opened.map(n=>card(n,true)));
  }
  function fits(payload){return payload&&payload.date===selected&&payload.days===days&&Array.isArray(payload.items)&&Array.isArray(payload.checkedDates);}
  async function load(){
    const id=++generation,day=selected,span=days;loading=true;data=stored('fmb-notices:'+day+':'+span,null);if(!fits(data))data=null;
    render();if(firstLoad&&data?.items.some(n=>n.locations.length)){firstLoad=false;focusMap();}
    // A dated initial snapshot keeps the first view usable while the live month is read.
    const seed=fetch('notices-snapshot.json',{cache:'no-cache'}).then(r=>r.json()).then(payload=>{
      if(id!==generation||data||!payload.checkedDates?.includes(day))return;
      const end=new Date(Date.parse(day+'T12:00:00Z')+(span-1)*86400000).toISOString().slice(0,10);
      const items=payload.items.map(n=>({...n,sourceDates:n.sourceDates.filter(d=>d>=day&&d<=end)})).filter(n=>n.sourceDates.length).map(n=>({...n,sourceDate:n.sourceDates[0]}));
      data={...payload,date:day,endDate:end,days:span,items,stale:true};render();
      if(firstLoad&&items.some(n=>n.locations.length)){firstLoad=false;focusMap();}
    }).catch(()=>{});
    try{
      const response=await fetch(api+'?date='+day+'&days='+span,{credentials:'omit',signal:AbortSignal.timeout(100000)});if(!response.ok)throw Error('School notices unavailable');const result=await response.json();
      if(id!==generation)return;if(!fits(result))throw Error('Unexpected notice format');
      data=result;saveLocal('fmb-notices:'+day+':'+span,result);if(firstLoad){firstLoad=false;focusMap();}
    }catch{await seed;if(id!==generation)return;if(data)data.stale=true;}
    finally{if(id===generation){loading=false;render();}}
  }
  function focusMap(){
    if(!data)return;follow=false;pan=[0,0];zoom=1;
    const locations=data.items.flatMap(n=>n.locations).filter(l=>buildingAreas[l.place]).map(l=>anchor(l.place));
    const saved=points;if(locations.length){points=[...saved,...locations];camera(activeState());points=saved;}
  }
  $('noticeRange').onchange=()=>{days=Number($('noticeRange').value);load();};$('noticeDate').onchange=()=>{if(/^20\d{2}-\d{2}-\d{2}$/.test($('noticeDate').value)){selected=$('noticeDate').value;load();}};
  $('noticeToday').onclick=()=>{selected=today();load();};$('noticeRefresh').onclick=load;
  $('noticeVisible').onchange=()=>{shown=$('noticeVisible').checked;renderPins();};
  $('noticePeek').onclick=()=>{openTools();focusMap();};
  $('noticeClose').onclick=()=>$('noticeDialog').close();$('noticeDialog').addEventListener('close',()=>focusBefore?.focus());
  $('noticeDialog').onclick=e=>{if(e.target===$('noticeDialog')){const rect=$('noticeDialog').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)$('noticeDialog').close();}};
  window.NoticeMap={render,updatePins};
  let lastToday=today();setInterval(()=>{const day=today();if(selected===lastToday&&day!==lastToday)selected=day;lastToday=day;load();},15*60000);
  load();
})();
