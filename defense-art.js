/* SVG game artwork; coordinates follow the existing shared campus map. */
globalThis.DefenseArt = (() => {
  const palettes = {
    original:{pulse:'#6af0ba',frost:'#91d4ff',burst:'#ffc775'},
    neon:{pulse:'#ff77d9',frost:'#bfa0ff',burst:'#ff8970'},
    arctic:{pulse:'#d2fff4',frost:'#e2f5ff',burst:'#f5e6b5'}
  };
  for(const p of Object.values(palettes))Object.assign(p,{sniper:'#f9a9df',tesla:'#bca0ff',venom:'#b5ec66'});
  function model(type) {
    const color=palettes.original[type], base='<ellipse cx="88" cy="142" rx="57" ry="19" fill="#122f36" opacity=".24"/><path d="M34 116 88 93 142 116v20l-54 25-54-25z" fill="#283f50" stroke="'+color+'" stroke-width="3"/><path d="M34 116 88 139 142 116 88 93z" fill="#456172"/>';
    const shapes={
      sniper:'<path d="M61 117V78l27-14 27 14v39l-27 14z" fill="#576977"/><path d="M70 85 107 34l15 9-37 56z" fill="#263443" stroke="#f9a9df" stroke-width="5"/><path d="M107 34l10-14 15 9-10 14z" fill="#edf5ff"/><circle cx="80" cy="87" r="9" fill="#f9a9df"/>',
      tesla:'<path d="M76 125V55h24v70l-12 7z" fill="#506879"/><ellipse cx="88" cy="100" rx="33" ry="10" fill="#8b72cc" stroke="#e9dbff" stroke-width="3"/><ellipse cx="88" cy="78" rx="28" ry="9" fill="#8b72cc" stroke="#e9dbff" stroke-width="3"/><circle cx="88" cy="47" r="22" fill="#c8acff" stroke="white" stroke-width="3"/><path d="m90 27-12 22h14l-8 18 21-26H90z" fill="white"/>',
      venom:'<path d="M52 115V63q0-17 18-17t18 17v52zM91 115V63q0-17 18-17t18 17v52z" fill="#314e48" stroke="#b5ec66" stroke-width="3"/><path d="M58 108V76h24v32zM97 108V76h24v32z" fill="#a0db4c"/><path d="M76 91 110 57l14 13-34 34z" fill="#526b56" stroke="#ddf6b7" stroke-width="3"/><circle cx="109" cy="90" r="4" fill="#efffc9"/>'
    };
    return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 176">'+base+shapes[type]+'</svg>');
  }
  function monster(svg,type,color){
    const g=svg('g',{'class':'enemy-model enemy-'+type});
    const add=(tag,a)=>g.append(svg(tag,a));
    add('ellipse',{cx:0,cy:10,rx:type==='boss'?21:15,ry:6,fill:'#12332f',opacity:.28});
    if(type==='tank'||type==='boss'){
      for(const x of [-17,11]){
        add('rect',{x,y:-13,width:6,height:29,rx:3,fill:'#243c48',stroke:'#a2b0b5','stroke-width':1});
        for(let y=-10;y<15;y+=6)add('path',{d:'M'+x+' '+y+'h6',stroke:'#647786','stroke-width':2});
      }
    }else{
      for(const k of [-1,1])add('path',{d:'M'+(k*6)+' -5 '+(k*17)+' -12 M'+(k*7)+' 3 '+(k*18)+' 5 M'+(k*6)+' 9 '+(k*14)+' 16',stroke:'#324d58','stroke-width':3,'stroke-linecap':'round'});
    }
    add('path',{d:type==='runner'?'M0-15 10-3 7 10 0 16-7 10-10-3z':'M-11-12 8-15 14-5 12 12 0 17-13 9z',fill:color,stroke:'#263d4a','stroke-width':2});
    add('path',{d:'M-8-8 6-11 10-4-7 0z',fill:'#ffffff',opacity:.32});
    add('rect',{x:-8,y:-4,width:16,height:7,rx:3,fill:'#203c49'});
    add('path',{d:'M-5-1h3m4 0h3',stroke:'#dcffff','stroke-width':2});
    if(type==='boss'){
      add('path',{d:'M-12-13-16-24-5-18 0-27 5-18 16-24 12-13z',fill:'#f6d78d',stroke:'#62464d','stroke-width':2});
      add('circle',{cx:0,cy:9,r:4,fill:'#fff2bf'});
    }
    return g;
  }
  function armor(svg,type,level,color) {
    const g=svg('g',{'class':'tower-armor','pointer-events':'none'});
    const add=(tag,a)=>g.append(svg(tag,a));
    if(type==='pulse') {
      add('path',{d:'M-25 3-30 11-23 20M25 3 30 11 23 20',fill:'none',stroke:color,'stroke-width':4,'stroke-linejoin':'round'});
      add('circle',{cx:0,cy:24,r:3,fill:color});
    } else if(type==='frost') {
      for(const x of [-25,25]) add('path',{d:'M'+x+' -6 l5 12-5 11-5-11z',fill:color,stroke:'#eaffff','stroke-width':1});
    } else {
      add('path',{d:'M-29 0-23-4-18 18-26 22zM29 0 23-4 18 18 26 22z',fill:'#39434f',stroke:color,'stroke-width':2});
      add('path',{d:'M-24 8-19 6M24 8 19 6',stroke:color,'stroke-width':3});
    }
    for(let i=0;i<level;i++) add('rect',{x:-8+i*7,y:27,width:4,height:4,rx:1,fill:color});
    if(level>=2)add('ellipse',{cx:0,cy:5,rx:30,ry:24,fill:'none',stroke:color,'stroke-width':1.5,'stroke-dasharray':'4 6'});
    if(level>=3)add('path',{d:'M-12 -32-7-27 0-35 7-27 12-32',fill:'none',stroke:color,'stroke-width':2});
    return g;
  }
  function shot(svg,fx,time,color,reduced=false) {
    const type=fx.type||'pulse', age=Math.max(0,time-fx.born);
    const life=Math.max(.001,fx.until-fx.born), progress=Math.min(1,age/life);
    const g=svg('g',{'class':'shot shot-'+type,'pointer-events':'none'});
    if(progress>=1)return g;
    const add=(tag,a)=>g.append(svg(tag,a));
    if(reduced) {add('circle',{cx:fx.tx,cy:fx.ty,r:5,fill:color,opacity:.65});return g;}
    if(type==='tesla'||type==='sniper'){
      const opacity=1-progress;
      const targets=[{x:fx.tx,y:fx.ty},...(fx.chain||[])];
      let x=fx.x,y=fx.y;
      for(const target of targets){
        const dx=target.x-x,dy=target.y-y;
        const d=type==='sniper'?'M'+x+' '+y+'L'+target.x+' '+target.y:
          'M'+x+' '+y+'L'+(x+dx*.3-dy*.08)+' '+(y+dy*.3+dx*.08)+'L'+(x+dx*.65+dy*.08)+' '+(y+dy*.65-dx*.08)+'L'+target.x+' '+target.y;
        add('path',{d,fill:'none',stroke:color,'stroke-width':type==='sniper'?2:4,opacity,'stroke-linejoin':'round'});
        add('circle',{cx:target.x,cy:target.y,r:4+progress*12,fill:'none',stroke:color,opacity});
        x=target.x;y=target.y;
      }
      return g;
    }
    const travel=Math.min(1,progress/.55), dx=fx.tx-fx.x,dy=fx.ty-fx.y;
    const arc=type==='burst'?26*Math.sin(travel*Math.PI):0;
    const x=fx.x+dx*travel,y=fx.y+dy*travel-arc;
    const angle=Math.atan2(dy-(type==='burst'?26*Math.PI*Math.cos(travel*Math.PI):0),dx)*180/Math.PI;
    if(travel<1) {
      const trail=Math.max(0,travel-.16);
      add('path',{d:'M'+(fx.x+dx*trail)+' '+(fx.y+dy*trail-(type==='burst'?26*Math.sin(trail*Math.PI):0))+' L'+x+' '+y,stroke:color,'stroke-width':type==='pulse'?5:3,opacity:.5,'stroke-linecap':'round'});
      const p=svg('g',{transform:'translate('+x+' '+y+') rotate('+angle+')'});
      if(type==='venom'){
        p.append(svg('path',{d:'M8 0Q-6-12-9 0Q-6 12 8 0',fill:color,stroke:'#eaffcf','stroke-width':1.5}));
      }else if(type==='pulse'){
        p.append(svg('rect',{x:-10,y:-3,width:18,height:6,rx:3,fill:color}),svg('rect',{x:-5,y:-1,width:12,height:2,rx:1,fill:'#fff'}));
      }else if(type==='frost'){
        p.append(svg('path',{d:'M10 0-2-6-8 0-2 6z',fill:color,stroke:'#fff','stroke-width':1}),svg('path',{d:'M-8 0H9',stroke:'#fff','stroke-width':1}));
      }else{
        p.append(svg('path',{d:'M-5-4-14 0-5 4',fill:'#ffb34f'}),svg('ellipse',{cx:0,cy:0,rx:7,ry:4,fill:color,stroke:'#64432e','stroke-width':1.5}));
      }
      g.append(p);
      if(progress<.15)add('circle',{cx:fx.x,cy:fx.y,r:7,fill:color,opacity:1-progress/.15});
    }else{
      const q=(progress-.55)/.45, r=5+q*(fx.splash||16);
      add('circle',{cx:fx.tx,cy:fx.ty,r,fill:type==='burst'?color:'none','fill-opacity':.13*(1-q),stroke:color,'stroke-width':type==='burst'?3:2,opacity:1-q});
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3, x1=fx.tx+Math.cos(a)*r*.5,y1=fx.ty+Math.sin(a)*r*.5;
        add('path',{d:'M'+x1+' '+y1+' l'+(Math.cos(a)*7)+' '+(Math.sin(a)*7),stroke:color,'stroke-width':type==='frost'?2:3,opacity:1-q,'stroke-linecap':'round'});
      }
    }
    return g;
  }
  return {palettes,armor,shot,model,monster};
})();
