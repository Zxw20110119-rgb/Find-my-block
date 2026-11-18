(() => {
  const game = CampusDefense;
  const $ = id => document.getElementById(id);
  const svg = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const copy = {
    hideGame:['Hide','隐藏'], minimize:['Minimize','收起'], expand:['Expand','展开'], gameOverview:['View all blocks','查看全部教学楼'],
    title:['Campus Defense','校园塔防'], intro:['Build towers on the school blocks. Stop the bots before they reach the Library.','在各个 Block 建塔，阻止机器人抵达图书馆。'],
    how:['How to play','怎么玩'], credits:['Credits','点数'], integrity:['Library health','图书馆生命'], wave:['Wave','波次'], best:['Best waves cleared','最高通关波数'],
    board:['Campus map','校园地图'], site:['Build site','建塔位置'], lane:['Bot path this wave','本波路线'], library:['Library','图书馆'],
    mission:['Wave control','波次控制'], reset:['Restart','重开'], workshop:['TOWER WORKSHOP','炮台工坊'], pick:['Select a block','选择 Block'],
    pulse:['Pulse','脉冲塔'], pulseDesc:['Fast, single target','快速攻击单个目标'], frost:['Frost','冰冻塔'], frostDesc:['Slows nearby bots','减速附近机器人'], burst:['Burst','爆破塔'], burstDesc:['Long range, area damage','远程范围伤害'],
    credit:['Burnside High School campus map','Burnside 高中校园地图'], local:['Saved on this device','保存在此设备'],
    helpTitle:['How to play','玩法说明'], step1:['Tap a letter on the map or choose a block from the menu. Pick a tower to build it. Hover or focus a tower option to preview its range.','点击地图上的字母或从菜单选 Block，再选择要建的塔。悬停或聚焦塔的选项可预览射程。'],
    step2:['Launch a wave. Towers fire automatically. The dashed lines show the paths bots will take, and each bot that reaches the Library costs health.','开始波次后，防御塔会自动攻击。虚线是机器人的路线，机器人到达图书馆会扣生命。'],
    step3:['Spend earned credits to expand and upgrade. Protect the Library through all twenty waves.','用赚到的点数建新塔或升级，守住图书馆二十波即可获胜。'],
    gotIt:['Got it','知道了'], resetTitle:['Restart this game?','重新开始这局？'], resetDetail:['Your current run will be reset. Your best score stays saved.','本局进度会重置，最高纪录会保留。'], cancel:['Cancel','取消'],
    inspect:['Inspect models','查看炮台模型'], modelLab:['TOWER LAB','炮台工坊'], close:['Close','关闭'], dragModel:['Drag to rotate','拖动旋转'], download:['Download 3D model (.glb)','下载 3D 模型 (.glb)'],
    ready:['BUILD PHASE','建塔阶段'], active:['WAVE INCOMING','机器人来袭'], paused:['PAUSED','已暂停'], won:['CAMPUS SECURED','防守成功'], lost:['LIBRARY OVERRUN','防守失败'],
  };
  Object.assign(copy,{
    sniper:['Sniper','狙击塔'],sniperDesc:['Long range, heavy single hit','超远射程，单体重击'],
    tesla:['Tesla','电弧塔'],teslaDesc:['Lightning chains to 3 bots','闪电连锁攻击三个目标'],
    venom:['Venom','毒液塔'],venomDesc:['Area poison over time','范围持续毒伤']
  });
  for(const type of ['sniper','tesla','venom']){
    const button=document.createElement('button');button.type='button';button.className='def-tower';button.dataset.tower=type;
    const thumb=document.createElement('span');thumb.className='def-thumb tower-model';thumb.dataset.model=type;thumb.setAttribute('aria-hidden','true');
    const name=document.createElement('b');name.dataset.copy=type;
    const price=document.createElement('span');price.className='def-price';price.textContent=game.towers[type].cost;
    button.append(thumb,name,price);$('towerShop').append(button);
    const inspect=document.createElement('button');inspect.type='button';inspect.className='def-quiet';inspect.dataset.inspect=type;inspect.dataset.copy=type;$('modelTypes').append(inspect);
  }
  let locale = lang === 'zh' ? 1 : 0;
  const tr = key => copy[key][locale];
  const setText = (el, value) => { if (el.textContent !== String(value)) el.textContent = value; };
  const t = (en, zh) => locale ? zh : en;
  const key = 'fmb-defense-best-v1';
  let best = 0;
  try { best = Math.max(0, Math.min(game.MAX_WAVES, Math.floor(Number(localStorage.getItem(key)) || 0))); } catch {}
  let s = game.state(), selected = 'e', preview = null, paused = false, last = 0, frame = 0;
  const padElements = new Map(), laneElements = new Map(), gates = new Map(), botElements = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const deck = $('defenseDeck');
  let finish = 'original';
  try { const saved=localStorage.getItem('fmb-tower-finish'); if(Object.hasOwn(DefenseArt.palettes,saved)) finish=saved; } catch {}
  const finishLabel=document.createElement('label'), finishSelect=document.createElement('select');
  finishLabel.className='def-finish'; finishSelect.id='towerFinish';
  const finishText=document.createElement('span');
  finishLabel.append(finishText,finishSelect);
  $('defenseWorkshop').append(finishLabel);
  const towerColor=type=>DefenseArt.palettes[finish][type];
  function applyFinish(){
    $('app').dataset.towerFinish=finish;
    for(const pad of padElements.values()) pad.artKey=null;
    updateBoard();
  }
  finishSelect.addEventListener('change',()=>{
    finish=finishSelect.value;
    try {localStorage.setItem('fmb-tower-finish',finish);} catch {}
    applyFinish(); paint();
  });
  let minimized = false;
  const mapIsPicking = () => selectingPosition || choosingRoad();
  const campusBounds = [[365,85],[1006,930]];
  const tile = 224, frameCount = 12;
  const wrapAngle = angle => (angle % frameCount + frameCount) % frameCount;
  const angleFor = (dx,dy) => wrapAngle(Math.round(Math.atan2(dx,-dy) * frameCount / (2 * Math.PI)));
  const mesh = (type, ext) => 'assets/towers/' + type + '.' + ext + '?v=3d2';
  function spriteAngle(sprite, angle) {
    if (sprite.dataset.angle === String(angle)) return;
    sprite.dataset.angle = angle;
    sprite.setAttribute('viewBox', (angle % 4 * tile) + ' ' + (Math.floor(angle / 4) * tile) + ' ' + tile + ' ' + tile);
  }
  function thumbAngle(thumb, angle) {
    thumb.dataset.angle = angle;
    thumb.style.setProperty('--frame-x', angle % 4 * 100 / 3 + '%');
    thumb.style.setProperty('--frame-y', Math.floor(angle / 4) * 50 + '%');
  }

  function padName(pad, short = false) {
    const block = t(pad.label + ' Block', pad.label + ' 楼');
    if (pad.id === 'pukehinau' || pad.id === 'rakipaoa') return short ? block : block + ' · ' + places[pad.place].name.split(' · ').at(-1);
    if (['d','d-east','k','k-east'].includes(pad.id)) return block + (pad.id.endsWith('-east') ? t(' · East',' · 东侧') : t(' · West',' · 西侧'));
    return block;
  }
  for (const [id, route] of Object.entries(game.routes)) {
    const line = svg('polyline', {class:'lane', points:route.points.map(p => p.join(',')).join(' ')});
    $('lanes').append(line);
    laneElements.set(id, line);
    const [x,y] = route.points[0], point = x + '|' + y;
    if (!gates.has(point)) {
      const gate = svg('g', {transform:'translate(' + x + ' ' + y + ')'});
      gate.append(svg('circle', {r:13, class:'gate'}), svg('path', {d:'M-4 -5 2 0 -4 5 M2 -5 8 0 2 5', fill:'none', stroke:'#fff2cb', 'stroke-width':2.3}));
      $('gateMarkers').append(gate);
      gates.set(point, gate);
    }
  }
  const library = svg('g', {transform:'translate(' + game.base.join(' ') + ')'});
  const label = svg('text', {x:0, y:43, class:'map-label'});
  library.append(svg('path', {d:'M0 -20 18 -13v12C18 10 9 17 0 21-9 17-18 10-18-1v-12z',class:'base'}), svg('path', {d:'M-11 -7q6 -3 11 1 5 -4 11 -1v13Q5 3 0 7-5 3-11 6z',fill:'#c2fcd7'}), label);
  $('gateMarkers').append(library);
  for (const pad of game.pads) {
    const el = svg('g', {class:'pad', transform:'translate(' + pad.x + ' ' + pad.y + ')', role:'button', tabindex:0});
    const title = svg('title'), letter = svg('text',{class:'letter'}), badge = svg('g'), level = svg('text', {x:23, y:19, class:'level'});
    const turret = svg('g', {class:'unit-stage'});
    const sprite = svg('svg', {x:-36,y:-42,width:72,height:72,overflow:'hidden', class:'unit-sprite'});
    const atlas = svg('image', {width:896,height:672, 'aria-hidden':'true'});
    sprite.append(atlas);
    turret.append(svg('circle',{cy:5,r:26,class:'unit-rim'}), sprite);
    letter.textContent = pad.label;
    badge.append(svg('circle', {cx:23, cy:19, r:11, class:'level-bg'}), level);
    el.append(title, svg('rect',{x:-30,y:-32,width:60,height:61,rx:14,fill:'transparent'}),svg('rect',{x:-23,y:-20,width:46,height:40,rx:11,class:'tile'}),letter,turret,badge);
    el.addEventListener('pointerdown', event => { if (!mapIsPicking()) event.stopPropagation(); });
    el.addEventListener('click', () => selectPad(pad.id, true));
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPad(pad.id, true); }
    });
    $('blockMarkers').append(el);
    padElements.set(pad.id,{el,title,badge,level,turret,sprite,atlas,model:null});
  }
  function updateRange() {
    const p = game.pads.find(pad => pad.id === selected), unit = s.units.get(selected);
    const radius = minimized ? 0 : unit ? game.stats(unit.type, unit.level).range : preview ? game.towers[preview].range : 0;
    $('towerRange').replaceChildren(...(radius ? [svg('circle', {cx:p.x, cy:p.y, r:radius, class:'range-ring'})] : []));
  }
  function selectPad(id, fromMap = false) {
    if (!padElements.has(id) || (fromMap && mapIsPicking())) return;
    selected = id;
    preview = null;
    render();
    if (fromMap) { closeToolPanel(); setMinimized(false); }
  }
  function updateBoard() {
    deck.classList.toggle('wave-running', s.status === 'active' && !paused);
    const activeLanes = new Set(game.waves[Math.max(0, Math.min(game.MAX_WAVES - 1, s.wave - (s.status === 'ready' ? 0 : 1)))][3]);
    const openGates = new Set([...activeLanes].map(id => game.routes[id].points[0].join('|')));
    for (const [id, line] of laneElements) line.classList.toggle('active', activeLanes.has(id));
    for (const [point, gate] of gates) gate.style.display = openGates.has(point) ? '' : 'none';
    for (const p of game.pads) {
      const pad = padElements.get(p.id);
      const {el,title,badge,level,turret,sprite,atlas} = pad;
      const unit = s.units.get(p.id);
      el.classList.toggle('selected', p.id === selected);
      el.classList.toggle('built', !!unit);
      const name = padName(p) + (unit ? ' · ' + tr(unit.type) + ' ' + t('level ','等级 ') + unit.level : '');
      el.setAttribute('aria-label', name);
      el.setAttribute('aria-pressed', String(p.id === selected));
      setText(title, name);
      badge.style.display = turret.style.display = unit ? '' : 'none';
      if (pad.model !== (unit?.type ?? null)) {
        pad.model = unit?.type ?? null;
        if (unit) {
          atlas.setAttribute('href', mesh(unit.type, 'webp'));
          spriteAngle(sprite, 2);
        } else atlas.removeAttribute('href');
      }
      if (unit) {
        el.style.setProperty('--tower', towerColor(unit.type)); setText(level, unit.level);
        const artKey=unit.type+'|'+unit.level+'|'+finish;
        if(pad.artKey!==artKey){
          pad.armor?.remove();
          pad.armor=DefenseArt.armor(svg,unit.level,towerColor(unit.type));
          turret.append(pad.armor); pad.artKey=artKey;
        }
      } else {pad.armor?.remove();pad.armor=null;pad.artKey=null;}
    }
    setText(label, tr('library'));
    updateRange();
  }
  function updateShop() {
    const unit = s.units.get(selected), pad = game.pads.find(p => p.id === selected);
    $('pickBlock').value = selected;
    $('blockName').textContent = padName(pad);
    $('padHint').textContent = unit ? t('Upgrade this tower or sell it to free the block.', '可升级防御塔，或卖掉它腾出位置。') :
      t('Choose a tower for this block.', '为这个 Block 选择一座防御塔。');
    $('towerShop').hidden = !!unit;
    $('builtTower').hidden = !unit;
    const ended = game.ended(s);
    for (const button of $('towerShop').querySelectorAll('[data-tower]')) button.disabled = ended || s.credits < game.towers[button.dataset.tower].cost;
    if (!unit) return;
    const tower = game.stats(unit.type, unit.level), cost = game.upgradeCost(unit);
    $('unitIcon').dataset.model = unit.type;
    $('unitName').textContent = tr(unit.type) + ' · ' + t('Level ', '等级 ') + unit.level;
    $('unitStats').textContent = t(tower.damage + ' damage per shot', '每发伤害 ' + tower.damage);
    $('upgrade').textContent = cost ? t('Upgrade', '升级') + ' · ⬡ ' + cost : t('Max level', '满级');
    $('upgrade').disabled = ended || !cost || s.credits < cost;
    $('sell').textContent = t('Sell', '出售') + ' · ⬡ ' + game.sellValue(unit);
    $('sell').disabled = ended;
  }
  function render() {
    const active = s.status === 'active', status = active && paused ? 'paused' : s.status;
    $('credits').textContent = s.credits;
    $('integrity').textContent = s.integrity + ' / ' + game.START_INTEGRITY;
    $('wave').textContent = s.wave + ' / ' + game.MAX_WAVES;
    setText($('bestFooter'), t('Best: ', '最高纪录：') + best + ' / ' + game.MAX_WAVES);
    $('roundState').textContent = tr(status);
    $('roundState').dataset.state = status;
    $('speed').textContent = s.speed + '×';
    $('speed').setAttribute('aria-pressed', String(s.speed === 2));
    const launch = $('launch');
    launch.disabled = s.status === 'ready' && !s.units.size;
    $('status').setAttribute('aria-live', active && !paused ? 'off' : 'polite');
    $('resetGame').hidden = game.ended(s);
    if (active) {
      launch.textContent = paused ? t('Resume', '继续') : t('Pause', '暂停');
      $('status').textContent = paused ? t('Wave paused. You can still build and upgrade.', '波次已暂停，仍可建塔和升级。') :
        t((s.enemies.length + s.quota - s.spawned) + ' bots left this wave.', '本波还剩 ' + (s.enemies.length + s.quota - s.spawned) + ' 个机器人。');
    } else if (game.ended(s)) {
      launch.textContent = t('Play again', '再玩一次');
      $('status').textContent = s.status === 'won' ? t('The Library held! You cleared all twenty waves.', '图书馆守住了！你已通过全部二十波。') : t('The Library fell. You cleared ' + s.cleared + ' of '+game.MAX_WAVES+' waves.', '图书馆失守。你守住了 ' + s.cleared + ' / '+game.MAX_WAVES+' 波。');
    } else {
      launch.textContent = t('Launch wave ', '开始第 ') + (s.wave + 1) + t('', ' 波');
      $('status').textContent = !s.units.size ? t('Build a tower on a block to launch the next wave.', '在 Block 上建一座塔后，就能开始下一波。') :
        s.lastBonus ? t('Wave clear! +' + s.lastBonus + ' credits. Prepare for the next wave.', '本波结束！获得 ' + s.lastBonus + ' 点数。准备迎接下一波。') :
        t('Build more towers or launch the first wave.', '继续建塔，或开始第一波。');
    }
    $('waveProgress').style.width = (active ? (s.spawned - s.enemies.length) / s.quota * 100 : s.cleared ? 100 : 0) + '%';
    updateShop();
    updateBoard();
  }
  function paint() {
    const onMap = new Set();
    for (const bot of s.enemies) {
      onMap.add(bot.id);
      if (!botElements.has(bot.id)) {
        const el=svg('g'),r=bot.type==='boss'?27:bot.type==='tank'?18:16;
        const shape=DefenseArt.monster(svg,bot.type,game.foes[bot.type].color);
        const hp=svg('rect',{x:-13,y:-r-9,width:26,height:4,rx:2,fill:'#a6ffc0'});
        el.append(shape,svg('rect',{x:-13,y:-r-9,width:26,height:4,rx:2,fill:'#2c221e'}),hp);
        $('bots').append(el);
        botElements.set(bot.id,{el,hp,shape});
      }
      const {el,hp,shape} = botElements.get(bot.id);
      el.setAttribute('transform','translate(' + bot.x.toFixed(1) + ' ' + bot.y.toFixed(1) + ')');
      hp.setAttribute('width', (26 * bot.hp / bot.maxHp).toFixed(1));
      shape.style.filter=bot.slowedUntil>s.time?'drop-shadow(0 0 3px #91d4ff)':bot.poisonUntil>s.time?'drop-shadow(0 0 3px #b5ec66)':'';
      if(!reduced.matches)shape.setAttribute('transform','translate(0 '+(Math.sin(s.time*(bot.type==='runner'?22:10)+bot.id)*1.2).toFixed(2)+')');
    }
    for (const [id,{el}] of botElements) if (!onMap.has(id)) { el.remove(); botElements.delete(id); }
    const effects = [];
    for (const fx of s.effects) {
      const pad = padElements.get(fx.pad);
      if (pad?.model) spriteAngle(pad.sprite, angleFor(fx.tx - fx.x, fx.ty - fx.y));
      effects.push(DefenseArt.shot(svg,fx,s.time,towerColor(fx.type || 'pulse'),reduced.matches));
    }
    $('fx').replaceChildren(...effects);
  }
  let prevStats = '';
  function loop(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    if (s.status === 'active' && !paused) {
      for (let i = 0; i < s.speed; i++) game.advance(s, dt);
      if (s.cleared > best) {
        best = s.cleared;
        try { localStorage.setItem(key,String(best)); } catch {}
      }
      const hud = [s.credits,s.integrity,s.status,s.spawned,s.enemies.length].join('|');
      if (hud !== prevStats) { prevStats = hud; render(); }
      paint();
    }
    frame = s.status === 'active' && !paused ? requestAnimationFrame(loop) : 0;
  }
  function runLoop() {
    if (frame || paused || s.status !== 'active') return;
    last = 0;
    frame = requestAnimationFrame(loop);
  }
  function pause() {
    if (s.status !== 'active' || paused) return;
    paused = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    render();
  }
  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    s = game.state();
    selected = 'e'; paused = false; preview = null;
    paint(); render();
  }
  $('pickBlock').addEventListener('change', event => selectPad(event.target.value));
  $('launch').addEventListener('click', () => {
    if (game.ended(s)) { reset(); return; }
    if (s.status === 'active' && !paused) { pause(); return; }
    if (s.status === 'active') paused = false;
    else if (!game.start(s)) return;
    if (matchMedia('(max-width: 760px)').matches) setMinimized(true);
    render(); runLoop();
  });
  $('speed').addEventListener('click', () => { s.speed = s.speed === 1 ? 2 : 1; render(); });
  $('resetGame').addEventListener('click', () => {
    if (!s.wave && !s.units.size) { reset(); return; }
    pause();
    $('resetDialog').showModal();
  });
  $('resetDialog').addEventListener('close', () => {
    if ($('resetDialog').returnValue === 'restart') reset();
    $('resetDialog').returnValue = '';
  });
  $('openHelp').addEventListener('click', () => { pause(); $('helpDialog').showModal(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  for (const button of $('towerShop').querySelectorAll('[data-tower]')) {
    const type = button.dataset.tower;
    const show = () => { if (!button.disabled && !s.units.has(selected)) { preview = type; updateRange(); } };
    const hide = () => { if (preview === type) { preview = null; updateRange(); } };
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointerleave', hide);
    button.addEventListener('focus', show);
    button.addEventListener('blur', hide);
    button.addEventListener('click', () => {
      if (!game.build(s, selected, type)) return;
      $('buildStatus').textContent = t('Built ' + tr(type) + '.', '已建造' + tr(type) + '。');
      render();
      ($('upgrade').disabled ? $('sell') : $('upgrade')).focus({preventScroll:true});
    });
  }
  $('upgrade').addEventListener('click', () => {
    if (!game.upgrade(s, selected)) return;
    $('buildStatus').textContent = t('Tower upgraded.', '防御塔已升级。');
    render();
    if ($('upgrade').disabled) $('sell').focus({preventScroll:true});
  });
  $('sell').addEventListener('click', () => {
    if (!game.sell(s, selected)) return;
    $('buildStatus').textContent = t('Tower sold.', '防御塔已出售。');
    preview = null;
    render();
    $('pickBlock').focus({preventScroll:true});
  });
  function translate() {
    locale = lang === 'zh' ? 1 : 0;
    for (const item of document.querySelectorAll('[data-copy]')) setText(item, tr(item.dataset.copy));
    $('pickBlock').setAttribute('aria-label', tr('pick'));
    $('speed').setAttribute('aria-label', t('Toggle double speed','切换两倍速'));
    $('battleMap').setAttribute('aria-label', t('Burnside campus battlefield; select a block to build','Burnside 校园战场；选择 Block 建塔'));
    $('turnLeft').setAttribute('aria-label',t('Rotate model left','向左旋转炮台'));
    $('turnRight').setAttribute('aria-label',t('Rotate model right','向右旋转炮台'));
    for (const button of $('towerShop').querySelectorAll('[data-tower]')) {
      const type = button.dataset.tower;
      button.setAttribute('aria-label', tr(type) + ' · ' + tr(type + 'Desc') + ' · ' + game.towers[type].cost);
    }
    $('pickBlock').replaceChildren(...game.pads.map(p => new Option(padName(p,true), p.id)));
    finishText.textContent=t('Tower finish','炮塔涂装');
    finishSelect.setAttribute('aria-label',t('Tower finish','炮塔涂装'));
    finishSelect.replaceChildren(new Option(t('Original','原版'),'original'),new Option(t('Neon','霓虹'),'neon'),new Option(t('Arctic','极地'),'arctic'));
    finishSelect.value=finish;
    $('app').dataset.towerFinish=finish;
    setModel(modelType, modelAngle);
    render();
    setMinimized(minimized);
  }

  let modelType = 'pulse', modelAngle = 2, modelDrag = null;
  const stage = $('modelStage').parentElement;
  function setModel(type, angle = 2) {
    modelType = type;
    modelAngle = wrapAngle(angle);
    $('modelStage').dataset.model = type;
    thumbAngle($('modelStage'), modelAngle);
    setText($('modelTitle'), tr(type));
    $('modelFile').href = mesh(type, 'glb');
    $('modelFile').setAttribute('download', type + '.glb');
    for (const button of $('modelTypes').querySelectorAll('[data-inspect]')) button.setAttribute('aria-pressed', String(button.dataset.inspect === type));
  }
  $('inspectModels').addEventListener('click', () => {
    pause();
    setModel(s.units.get(selected)?.type || modelType);
    $('modelDialog').showModal();
  });
  for (const button of $('modelTypes').querySelectorAll('[data-inspect]')) {
    button.addEventListener('click', () => setModel(button.dataset.inspect));
  }
  $('turnLeft').addEventListener('click', () => setModel(modelType, modelAngle - 1));
  $('turnRight').addEventListener('click', () => setModel(modelType, modelAngle + 1));
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    modelDrag = {id:event.pointerId, x:event.clientX, angle:modelAngle};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (modelDrag?.id === event.pointerId) setModel(modelType, modelDrag.angle + Math.round((event.clientX-modelDrag.x)/16));
  });
  stage.addEventListener('lostpointercapture', () => { modelDrag = null; });

  function setMinimized(next) {
    minimized = next;
    deck.classList.toggle('def-minimized', next);
    $('defenseDetails').hidden = next;
    $('defenseMinimize').setAttribute('aria-expanded', String(!next));
    setText($('defenseMinimize'), tr(next ? 'expand' : 'minimize'));
    updateRange();
  }
  $('defenseMinimize').addEventListener('click', () => setMinimized(!minimized));
  $('defenseOverview').addEventListener('click', () => {
    if (mapIsPicking()) return;
    if (playing) {
      playing = false; velocity = 0;
    }
    follow = false; pan = [0,0]; zoom = 1; overviewExtra = campusBounds;
    update(.12);
    setMinimized(true);
  });
  const routeCard = $('bottomCard');
  const reposition = () => {
    $('app').style.setProperty('--def-route-height', Math.ceil(routeCard.getBoundingClientRect().height) + 'px');
  };
  new ResizeObserver(reposition).observe(routeCard);

  function showOverlay(next, {push = false, focus = false} = {}) {
    if (inDefense() === next) return;
    if (!next) {
      pause();
      for (const id of ['modelDialog','helpDialog','resetDialog']) if ($(id).open) $(id).close();
    }
    $('app').classList.toggle('defense-mode', next);
    $('defenseLink').setAttribute('aria-expanded', String(next));
    $('battleMap').setAttribute('aria-hidden', String(!next));
    if (push) {
      const url = new URL(location.href);
      if (next) url.searchParams.set('mode','defense'); else url.searchParams.delete('mode');
      if (lang === 'zh') url.searchParams.set('lang','zh'); else url.searchParams.delete('lang');
      history.pushState(null,'',url);
    }
    if (next) {
      reposition();
      setMinimized(false);
    } else if (overviewExtra === campusBounds) {
      overviewExtra = [];
      update(.12);
    }
    if (focus) $(next ? 'defenseMinimize' : 'defenseLink').focus({preventScroll:true});
  }
  $('defenseLink').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    showOverlay(!inDefense(),{push:true,focus:true});
  });
  $('backToMap').addEventListener('click', () => showOverlay(false,{push:true,focus:true}));
  const urlMode = () => new URLSearchParams(location.search).get('mode') === 'defense';
  window.addEventListener('popstate', () => showOverlay(urlMode()));
  window.DefenseUI = {translate, minimize() { if (inDefense()) setMinimized(true); }};
  translate();
  showOverlay(urlMode());
})();
