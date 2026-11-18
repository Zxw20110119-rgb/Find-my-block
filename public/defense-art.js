/* SVG game artwork; coordinates follow the existing shared campus map. */
globalThis.DefenseArt = (() => {
  const palettes = {
    original:{pulse:'#6af0ba',frost:'#91d4ff',burst:'#ffc775',sniper:'#f9a9df',tesla:'#bca0ff',venom:'#b5ec66'},
    neon:{pulse:'#ff77d9',frost:'#bfa0ff',burst:'#ff8970',sniper:'#f7a785',tesla:'#8cbaff',venom:'#f59ae9'},
    arctic:{pulse:'#d2fff4',frost:'#e2f5ff',burst:'#f5e6b5',sniper:'#fce2f1',tesla:'#e8e5ff',venom:'#edf6d8'}
  };
  function armor(svg,level,color) {
    const g=svg('g',{'class':'tower-armor','pointer-events':'none'});
    const add=(tag,a)=>g.append(svg(tag,a));
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
  return {palettes,armor,shot};
})();
