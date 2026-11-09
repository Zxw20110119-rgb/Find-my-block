(() => {
  const game = CampusDefense;
  const $ = id => document.getElementById(id);
  const svg = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const copy = {
    mode:['GAME MODE','游戏模式'], back:['← Campus map','← 返回校园地图'], eyebrow:['BURNSIDE HIGH SCHOOL · TOWER DEFENSE','BURNSIDE 高中 · 塔防游戏'],
    title:['Campus Defense','校园塔防'], intro:['Build towers on the school blocks. Stop the bots before they reach the Library.','在各个 Block 建塔，阻止机器人抵达图书馆。'],
    how:['? How to play','? 怎么玩'], credits:['Credits','点数'], integrity:['Library health','图书馆生命'], wave:['Wave','波次'], best:['Best waves cleared','最高通关波数'],
    board:['Campus map','校园地图'], site:['Build site','建塔位置'], lane:['Bot path this wave','本波路线'], library:['Library','图书馆'],
    mission:['Wave control','波次控制'], reset:['Restart','重开'], workshop:['BUILD & UPGRADE','建塔与升级'], pick:['Select a block','选择 Block'],
    pulse:['Pulse','脉冲塔'], pulseDesc:['Fast, single target','快速攻击单个目标'], frost:['Frost','冰冻塔'], frostDesc:['Slows nearby bots','减速附近机器人'], burst:['Burst','爆破塔'], burstDesc:['Long range, area damage','远程范围伤害'],
    credit:['Burnside High School campus map','Burnside 高中校园地图'], local:['Saved on this device','保存在此设备'],
    helpTitle:['How to play','玩法说明'], step1:['Tap a letter on the map or choose a block from the menu. Pick a tower to build it. Hover or focus a tower option to preview its range.','点击地图上的字母或从菜单选 Block，再选择要建的塔。悬停或聚焦塔的选项可预览射程。'],
    step2:['Launch a wave. Towers fire automatically. The dashed lines show the paths bots will take, and each bot that reaches the Library costs health.','开始波次后，防御塔会自动攻击。虚线是机器人的路线，机器人到达图书馆会扣生命。'],
    step3:['Spend earned credits to expand and upgrade. Protect the Library through all eight waves.','用赚到的点数建新塔或升级，守住图书馆八波即可获胜。'],
    gotIt:['Got it','知道了'], resetTitle:['Restart this game?','重新开始这局？'], resetDetail:['Your current run will be reset. Your best score stays saved.','本局进度会重置，最高纪录会保留。'], cancel:['Cancel','取消'],
    ready:['BUILD PHASE','建塔阶段'], active:['WAVE INCOMING','机器人来袭'], paused:['PAUSED','已暂停'], won:['CAMPUS SECURED','防守成功'], lost:['LIBRARY OVERRUN','防守失败'],
  };
  let locale = new URLSearchParams(location.search).get('lang') === 'zh' ? 1 : 0;
  const tr = key => copy[key][locale];
  const setText = (el, value) => { if (el.textContent !== String(value)) el.textContent = value; };
  const t = (en, zh) => locale ? zh : en;
  const key = 'fmb-defense-best-v1';
  let best = 0;
  try { best = Math.max(0, Math.min(game.MAX_WAVES, Math.floor(Number(localStorage.getItem(key)) || 0))); } catch {}
  let s = game.state(), selected = 'e', preview = null, paused = false, last = 0, frame = 0;
  const padElements = new Map(), laneElements = new Map(), gates = new Map(), botElements = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 800px)');
  const referrer = document.referrer && new URL(document.referrer);
  const home = new URL('./', location.href);
  if (referrer && referrer.origin === home.origin && [home.pathname, home.pathname + 'index.html'].includes(referrer.pathname)) $('backToMap').href = referrer.href;

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
    const title = svg('title'), letter = svg('text',{class:'letter'}), badge = svg('g'), level = svg('text', {x:20, y:16, class:'level'});
    letter.textContent = pad.label;
    badge.append(svg('circle', {cx:20, cy:16, r:12, class:'level-bg'}), level);
    el.append(title, svg('rect',{x:-29,y:-27,width:58,height:54,rx:14,fill:'transparent'}),svg('rect',{x:-23,y:-20,width:46,height:40,rx:11,class:'tile'}),letter,badge);
    el.addEventListener('click', () => selectPad(pad.id, true));
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPad(pad.id, true); }
    });
    $('blockMarkers').append(el);
    padElements.set(pad.id,{el,title,badge,level});
  }
  function updateRange() {
    const p = game.pads.find(pad => pad.id === selected), unit = s.units.get(selected);
    const radius = unit ? game.stats(unit.type, unit.level).range : preview ? game.towers[preview].range : 0;
    $('towerRange').replaceChildren(...(radius ? [svg('circle', {cx:p.x, cy:p.y, r:radius, class:'range-ring'})] : []));
  }
  function selectPad(id, fromMap = false) {
    if (!padElements.has(id)) return;
    selected = id;
    preview = null;
    render();
    if (fromMap && compact.matches) $('blockName').closest('.workshop').scrollIntoView({block:'nearest', behavior:reduced.matches ? 'instant' : 'smooth'});
  }
  function updateBoard() {
    const activeLanes = new Set(game.waves[Math.max(0, Math.min(game.MAX_WAVES - 1, s.wave - (s.status === 'ready' ? 0 : 1)))][3]);
    const openGates = new Set([...activeLanes].map(id => game.routes[id].points[0].join('|')));
    for (const [id, line] of laneElements) line.classList.toggle('active', activeLanes.has(id));
    for (const [point, gate] of gates) gate.style.display = openGates.has(point) ? '' : 'none';
    for (const p of game.pads) {
      const {el,title,badge,level} = padElements.get(p.id);
      const unit = s.units.get(p.id);
      el.classList.toggle('selected', p.id === selected);
      el.classList.toggle('built', !!unit);
      const name = padName(p) + (unit ? ' · ' + tr(unit.type) + ' ' + t('level ','等级 ') + unit.level : '');
      el.setAttribute('aria-label', name);
      el.setAttribute('aria-pressed', String(p.id === selected));
      setText(title, name);
      badge.style.display = unit ? '' : 'none';
      if (unit) { el.style.setProperty('--tower', game.towers[unit.type].color); level.textContent = unit.level; }
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
    $('unitIcon').textContent = tower.icon;
    $('unitIcon').className = 'tower-icon ' + unit.type;
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
    setText($('best'), best + ' / ' + game.MAX_WAVES);
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
      $('status').textContent = s.status === 'won' ? t('The Library held! You cleared all eight waves.', '图书馆守住了！你已通过全部八波。') : t('The Library fell. You cleared ' + s.cleared + ' of 8 waves.', '图书馆失守。你守住了 ' + s.cleared + ' / 8 波。');
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
        const el = svg('g'), r = bot.type === 'boss' ? 15 : bot.type === 'tank' ? 12 : 9;
        const shape = bot.type === 'runner' ? svg('path',{d:'M0 -11 10 0 0 11-10 0z'}) : svg('rect',{x:-r,y:-r,width:r*2,height:r*2,rx:bot.type === 'scout' ? 6 : 4});
        shape.setAttribute('fill', game.foes[bot.type].color);
        shape.setAttribute('stroke', '#3b201e');
        shape.setAttribute('stroke-width', '2.5');
        const hp = svg('rect',{x:-13,y:-r-9,width:26,height:4,rx:2,fill:'#a6ffc0'});
        el.append(shape,svg('path',{d:'M-4 -1h2m4 0h2',stroke:'#3b201e','stroke-width':3,'stroke-linecap':'round'}),svg('rect',{x:-13,y:-r-9,width:26,height:4,rx:2,fill:'#2c221e'}),hp);
        $('bots').append(el);
        botElements.set(bot.id,{el,hp,shape});
      }
      const {el,hp,shape} = botElements.get(bot.id);
      el.setAttribute('transform','translate(' + bot.x.toFixed(1) + ' ' + bot.y.toFixed(1) + ')');
      hp.setAttribute('width', (26 * bot.hp / bot.maxHp).toFixed(1));
      shape.setAttribute('stroke', bot.slowedUntil > s.time ? '#ccedff' : '#3b201e');
    }
    for (const [id,{el}] of botElements) if (!onMap.has(id)) { el.remove(); botElements.delete(id); }
    const effects = [];
    if (!reduced.matches) for (const fx of s.effects) {
      const opacity = Math.min(1, (fx.until - s.time) / .18);
      effects.push(svg('line', {x1:fx.x, y1:fx.y, x2:fx.tx, y2:fx.ty, stroke:fx.color, 'stroke-width':4, 'stroke-linecap':'round', opacity}));
      if (fx.splash) effects.push(svg('circle', {cx:fx.tx, cy:fx.ty, r:fx.splash * (1 - opacity * .55), fill:'none', stroke:fx.color, 'stroke-width':2.5, opacity}));
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
    document.documentElement.lang = t('en','zh-CN');
    document.title = tr('title') + ' · Find My Block';
    for (const item of document.querySelectorAll('[data-copy]')) item.textContent = tr(item.dataset.copy);
    $('gameLanguage').textContent = t('中文','EN');
    $('gameLanguage').setAttribute('aria-label',t('Switch to Chinese','切换为英文'));
    $('pickBlock').setAttribute('aria-label', tr('pick'));
    $('speed').setAttribute('aria-label', t('Toggle double speed','切换两倍速'));
    $('battleMap').setAttribute('aria-label', t('Burnside campus battlefield; select a block to build','Burnside 校园战场；选择 Block 建塔'));
    for (const button of $('towerShop').querySelectorAll('[data-tower]')) {
      const type = button.dataset.tower;
      button.setAttribute('aria-label', tr(type) + ' · ' + tr(type + 'Desc') + ' · ' + game.towers[type].cost);
    }
    $('pickBlock').replaceChildren(...game.pads.map(p => new Option(padName(p,true), p.id)));
    render();
  }
  $('gameLanguage').addEventListener('click', () => {
    locale = 1 - locale;
    const url = new URL(location.href);
    if (locale) url.searchParams.set('lang','zh'); else url.searchParams.delete('lang');
    history.replaceState(null,'',url);
    translate();
  });
  const map = $('battleMap');
  function fitMap() {
    const {width,height} = map.getBoundingClientRect();
    const w = Math.max(765, Math.min(1536, 870 * width / Math.max(1,height)));
    map.setAttribute('viewBox', (717 - w / 2) + ' 66 ' + w + ' 870');
  }
  new ResizeObserver(fitMap).observe(map);
  translate();
  fitMap();
})();
