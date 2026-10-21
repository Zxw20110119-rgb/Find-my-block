(function(){
  const state={ready:false,user:null,csrf:'',clientId:null,revision:0,loaded:false,dirty:false,saving:false,conflict:false,status:'loading'};
  let queue=Promise.resolve(true),pending=0,latest=null,googleLibrary=null,initializing=null;
  const message={
    loading:['正在读取账号…','Checking account…'],
    setup:['Google 登录尚待网站作者配置。当前课表仍保存在此设备。','Google sign-in is awaiting site-owner setup. Your timetable is saved on this device.'],
    guest:['未登录：课表仅保存在此设备。','Not signed in: timetable saved on this device only.'],
    loadingCloud:['正在读取账号课表…','Loading your saved timetable…'],
    saved:['课表已保存到账号，下次打开会自动读取。','Timetable saved to your account. It loads automatically when you return.'],
    saving:['正在保存到账号…','Saving to your account…'],
    unsaved:['此课表还没保存到账号，请点击“保存此课表”。','This timetable is not in your account yet. Choose Save this timetable.'],
    empty:['账号中还没有课表，请导入一次。','No timetable saved yet. Import a calendar once to get started.'],
    error:['暂时无法同步。当前内容已保留，稍后可以重试。','Could not sync. Your current timetable is kept; you can retry.'],
    conflict:['课表已在其他设备上更新。请选择读取云端课表，或保存当前这份。','Your timetable changed on another device. Load the saved timetable or save this one.'],
    googleError:['Google 登录暂时无法加载，请重试。','Google sign-in could not load. Please try again.'],
    loginError:['登录失败，请刷新后重试。','Sign-in failed. Refresh and try again.']
  };
  const t=(zh,en)=>text(zh,en);
  const cacheKey=()=>state.user?'fmb-account-cache:'+state.user.id:null;
  function cache(){if(cacheKey()&&latest)saveLocal(cacheKey(),{timetable:latest,revision:state.revision,dirty:state.dirty});}
  async function api(path,options={}){
    const headers={'Content-Type':'application/json',...(options.headers||{})};
    if(options.method&&options.method!=='GET')headers['X-CSRF-Token']=state.csrf;
    const response=await fetch(path,{...options,headers,credentials:'same-origin',cache:'no-store'});
    let data;try{data=await response.json();}catch{throw new Error('Account service unavailable');}
    if(!response.ok)throw Object.assign(new Error(data.error||'Account service unavailable'),{status:response.status});
    return data;
  }
  function render(){
    $('accountTitle').textContent=t('Google 账号','Google account');
    $('accountIdentity').textContent=state.user?state.user.email:t('登录后，课表会跟随你的账号。','Sign in to keep your timetable with your account.');
    $('cloudStatus').textContent=t(...(message[state.status]||message.error));
    $('signOut').hidden=!state.user;$('signOut').disabled=state.saving;
    $('signOut').textContent=t('退出登录','Sign out');
    $('saveToAccount').hidden=!state.user||!state.dirty;$('saveToAccount').disabled=state.saving;
    $('saveToAccount').textContent=t('保存此课表','Save this timetable');
    $('reloadCloud').hidden=!state.user;$('reloadCloud').disabled=state.saving;
    $('reloadCloud').textContent=t('读取云端课表','Load saved timetable');
    $('privacyLink').textContent=t('隐私与数据','Privacy and data');
    $('googleButton').hidden=!!state.user||!state.clientId;
    $('icsFile').disabled=!state.ready||state.status==='loadingCloud';
  }
  function installTimetable(data){
    latest=data||{events:[],roomMappings:{}};
    applyAccountTimetable(latest);
  }
  async function loadCloud(discard=false){
    if(!state.user)return;
    state.status='loadingCloud';render();
    try{
      const data=await api('/api/timetable');
      const cached=stored(cacheKey(),null);
      state.revision=data.revision;state.loaded=true;state.conflict=false;
      if(!discard&&cached?.dirty&&cached.timetable){
        installTimetable(cached.timetable);state.dirty=true;
        state.conflict=cached.revision!==data.revision;
        state.status=state.conflict?'conflict':'unsaved';
      }else if(data.timetable){
        installTimetable(data.timetable);state.dirty=false;state.status=latest.events.length?'saved':'empty';
      }else{
        if(discard)installTimetable({events:[],roomMappings:{}});
        else latest=JSON.parse(JSON.stringify(timetableSnapshot()));
        state.dirty=!!latest.events.length;state.status=state.dirty?'unsaved':'empty';
      }
      cache();render();
    }catch{
      const cached=stored(cacheKey(),null);
      if(cached?.timetable){installTimetable(cached.timetable);state.revision=cached.revision||0;state.dirty=!!cached.dirty;}
      state.status='error';render();
    }
  }
  async function save(snapshot){
    if(!state.ready&&initializing)await initializing;
    const copy=JSON.parse(JSON.stringify(snapshot));
    if(!state.user){
      const ok=saveLocal('fmb-calendar-v1',copy.events)&&saveLocal('fmb-rooms-v1',copy.roomMappings);
      state.status=ok?(state.clientId?'guest':'setup'):'error';render();return ok;
    }
    latest=copy;state.dirty=true;cache();pending++;
    const userId=state.user.id;
    queue=queue.then(async()=>{
      if(state.user?.id!==userId){pending--;return false;}
      state.saving=true;state.status='saving';render();let success=false;
      try{
        if(state.conflict||!state.loaded)throw Object.assign(new Error('Load the saved revision first'),{status:409});
        const data=await api('/api/timetable',{method:'PUT',body:JSON.stringify({revision:state.revision,timetable:copy})});
        state.revision=data.revision;success=true;
      }catch(error){state.conflict=error.status===409;state.status=state.conflict?'conflict':'error';}
      pending--;state.saving=pending>0;state.dirty=!success||pending>0;
      if(success)state.status=pending?'saving':copy.events.length?'saved':'empty';
      cache();render();return success;
    });
    return queue;
  }
  async function loadGoogle(){
    if(!state.clientId||state.user)return;
    try{
      if(!googleLibrary)googleLibrary=new Promise((resolve,reject)=>{
        if(window.google?.accounts?.id){resolve();return;}
        const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
        script.onload=resolve;script.onerror=reject;document.head.append(script);
      });
      await googleLibrary;
      window.google.accounts.id.initialize({client_id:state.clientId,nonce:state.csrf,ux_mode:'popup',auto_select:false,callback:async result=>{
        state.status='loading';render();
        try{
          const response=await api('/api/account/google',{method:'POST',body:JSON.stringify({credential:result.credential,csrf:state.csrf})});
          state.user=response.user;state.csrf=response.csrf;state.loaded=false;state.revision=0;
          await loadCloud();
        }catch{state.status='loginError';render();}
      }});
      $('googleButton').replaceChildren();
      window.google.accounts.id.renderButton($('googleButton'),{type:'standard',theme:'outline',size:'large',shape:'pill',text:'signin_with'});
    }catch{googleLibrary=null;state.status='googleError';render();}
  }
  async function init(){
    try{
      const data=await api('/api/account');state.user=data.user;state.csrf=data.csrf;state.clientId=data.googleClientId;
      state.ready=true;state.status=state.clientId?'guest':'setup';render();
      if(state.user)await loadCloud();else await loadGoogle();
    }catch{state.ready=true;state.status='error';render();}
  }
  $('saveToAccount').onclick=async()=>{
    if(state.saving)return;
    try{
      const latestVersion=await api('/api/timetable');state.revision=latestVersion.revision;state.loaded=true;state.conflict=false;
      await save(timetableSnapshot());
    }catch{state.status='error';render();}
  };
  $('reloadCloud').onclick=()=>{if(!state.saving)loadCloud(true);};
  $('signOut').onclick=async()=>{
    if(state.saving)return;
    try{
      await api('/api/account/logout',{method:'POST',body:'{}'});
      const key=cacheKey();if(key&&!state.dirty)try{localStorage.removeItem(key);}catch{}
      state.user=null;state.loaded=false;state.dirty=false;state.conflict=false;state.revision=0;latest=null;
      applyAccountTimetable({events:stored('fmb-calendar-v1',[]),roomMappings:stored('fmb-rooms-v1',{})});
      window.google?.accounts?.id.disableAutoSelect();
      initializing=init();await initializing;
    }catch{state.status='error';render();}
  };
  window.TimetableAccount={save,render};
  initializing=init();
})();
