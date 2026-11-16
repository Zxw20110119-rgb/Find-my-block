/* The battle uses the same walkway graph as the campus navigator. All distances are map pixels. */
globalThis.CampusDefense = (() => {
  const MAX_WAVES = 20, MAX_LEVEL = 3, START_CREDITS = 270, START_INTEGRITY = 16;
  const base = nodes.q1;
  const pads = [
    ['a','A',648,605], ['b','B',750,515], ['c','C',880,550],
    ['d','D',892,699], ['d-east','D',977,698], ['e','E',532,485],
    ['g','G',882,406], ['h','H',791,215], ['k','K',835,181],
    ['k-east','K',922,133], ['l','L',645,465], ['m','M',535,694],
    ['n','N',748,331], ['pukehinau','P',632,329], ['rakipaoa','R',418,480], ['x','X',748,396],
  ].map(([id, label, x, y]) => ({id, label, x, y, place: id.replace('-east', '')}));
  const towers = {
    pulse: {cost:90, damage:24, range:118, cooldown:.60, splash:0, slow:0, color:'#6af0ba', icon:'◇'},
    frost: {cost:115, damage:13, range:134, cooldown:.92, splash:29, slow:1.65, color:'#91d4ff', icon:'✳'},
    burst: {cost:145, damage:36, range:155, cooldown:1.20, splash:48, slow:0, color:'#ffc775', icon:'✹'},
  };
  Object.assign(towers,{
    sniper:{cost:185,damage:105,range:245,cooldown:2.1,splash:0,slow:0,color:'#f9a9df'},
    tesla:{cost:170,damage:30,range:132,cooldown:1.05,splash:0,slow:0,chain:3,color:'#bca0ff'},
    venom:{cost:150,damage:12,range:145,cooldown:1.1,splash:24,slow:0,poison:8,color:'#b5ec66'}
  });
  const foes = {
    scout: {hp:58, speed:43, reward:11, hit:1, color:'#ff9c78'},
    runner: {hp:43, speed:75, reward:12, hit:1, color:'#f8dc6b'},
    tank: {hp:188, speed:31, reward:24, hit:2, color:'#d9a5ff'},
    boss: {hp:410, speed:26, reward:60, hit:4, color:'#ffa6c9'},
  };
  const routes = Object.fromEntries(Object.entries({
    west:['e2','e1','e0','w1','w2','p0','w3','b0','a1','c2','q0','q1'],
    north:['n4','n3','nTurn','n2','n0','w3','b0','b1','cTop','c0','c1','q1'],
    gym:['s4','s2','s0','n3','gHub','g0','g1','b1','cTop','c0','c1','q1'],
    east:['s4','cEast','s5','s6h','s6','q1n','q1e','q1'],
    south:['m4','m3','m2','m0','a2','a0','a1','c2','q0','q1'],
  }).map(([id, keys]) => {
    const points = keys.map(k => nodes[k]);
    let length = 0;
    const segments = points.slice(1).map(([x,y], i) => {
      const [ax,ay] = points[i], dx = x - ax, dy = y - ay, size = Math.hypot(dx, dy);
      const start = length;
      length += size;
      return {x:ax, y:ay, dx, dy, size, start, end:length};
    });
    return [id, {keys, points, length, segments}];
  }));
  // Spawn cadence, count, enemy mix, then a repeating list of lanes.
  const waves = [
    [1.15, 8, ['scout'], ['west']],
    [1.01, 12, ['scout','runner'], ['north','west']],
    [.97, 15, ['scout','runner','scout'], ['east','south']],
    [.91, 17, ['scout','tank','runner'], ['north','gym','west']],
    [.78, 20, ['runner','scout','runner','tank'], ['east','south','west']],
    [.72, 24, ['tank','scout','runner','runner'], ['gym','north','east','south']],
    [.64, 27, ['runner','tank','scout','tank'], ['west','east','south','north','gym']],
    [.59, 30, ['tank','runner','boss','scout','runner','tank','scout'], ['north','east','gym','south','west']],
  ];
  for(let i=9;i<=MAX_WAVES;i++){
    const mix=i%5===0?['boss','tank','runner','tank','scout','runner']:i%3===0?['tank','runner','runner','boss']:['scout','tank','runner','runner'];
    waves.push([Math.max(.36,.59-(i-8)*.015),30+(i-8)*2,mix,
      i<13?['north','east','south']:['west','north','gym','east','south']]);
  }
  function state() {
    return {
      credits:START_CREDITS, integrity:START_INTEGRITY, wave:0, cleared:0, status:'ready',
      units:new Map(), enemies:[], effects:[], speed:1, time:0, kills:0, serial:0,
      spawned:0, quota:0, clock:0, lastBonus:0,
    };
  }
  const stats = (type, level) => {
    const tower = towers[type];
    return {...tower, damage:Math.round(tower.damage * (1 + .57 * (level - 1))),
      range:tower.range + 12 * (level - 1), cooldown:tower.cooldown * .87 ** (level - 1)};
  };
  const upgradeCost = unit => unit.level >= MAX_LEVEL ? null : Math.round(towers[unit.type].cost * (.70 + (unit.level - 1) * .35));
  const sellValue = unit => Math.floor(unit.spent * .65);
  const ended = s => s.status === 'lost' || s.status === 'won';
  function build(s, id, type) {
    if (ended(s) || !pads.some(p => p.id === id) || !Object.hasOwn(towers, type) || s.units.has(id) || s.credits < towers[type].cost) return false;
    const cost = towers[type].cost;
    s.credits -= cost;
    s.units.set(id, {type, level:1, spent:cost, cooldown:0});
    return true;
  }
  function upgrade(s, id) {
    const unit = s.units.get(id), cost = unit && upgradeCost(unit);
    if (ended(s) || !cost || s.credits < cost) return false;
    s.credits -= cost;
    unit.spent += cost;
    unit.level++;
    return true;
  }
  function sell(s, id) {
    const unit = s.units.get(id);
    if (ended(s) || !unit) return false;
    s.credits += sellValue(unit);
    s.units.delete(id);
    return true;
  }
  function start(s) {
    if (s.status !== 'ready' || s.wave >= MAX_WAVES || !s.units.size) return false;
    s.status = 'active';
    s.wave++;
    s.quota = waves[s.wave - 1][1];
    s.spawned = 0;
    s.clock = .28;
    s.lastBonus = 0;
    return true;
  }
  function position(route, d) {
    const segment = route.segments.find(p => d <= p.end) || route.segments.at(-1);
    const t = Math.min(1, Math.max(0, (d - segment.start) / segment.size));
    return [segment.x + t * segment.dx, segment.y + t * segment.dy];
  }
  function spawn(s, type, lane) {
    const foe = foes[type], route = routes[lane], [x,y] = route.points[0];
    const hp = Math.round(foe.hp * (1 + .14 * (s.wave - 1)));
    s.enemies.push({id:++s.serial, type, route, x, y, hp, maxHp:hp, distance:0, slowedUntil:0});
  }
  function advance(s, dt) {
    if (s.status !== 'active' || !Number.isFinite(dt) || dt <= 0) return;
    s.time += dt;
    const [cadence, quota, mix, lanes] = waves[s.wave - 1];
    s.clock -= dt;
    while (s.spawned < quota && s.clock <= 0) {
      spawn(s, mix[s.spawned % mix.length], lanes[s.spawned % lanes.length]);
      s.spawned++;
      s.clock += cadence;
    }
    for (const e of s.enemies) {
      if(e.poisonUntil>s.time && e.hp>0){
        e.hp-=e.poisonDamage*dt;
        if(e.hp<=0){s.kills++;s.credits+=foes[e.type].reward;}
      }
    }
    s.enemies=s.enemies.filter(e=>e.hp>0);
    for (const e of s.enemies) {
      e.distance += foes[e.type].speed * dt * (e.slowedUntil > s.time ? .52 : 1);
      [e.x, e.y] = position(e.route, e.distance);
    }
    for (const e of s.enemies) if (e.distance >= e.route.length) s.integrity -= foes[e.type].hit;
    s.enemies = s.enemies.filter(e => e.distance < e.route.length);
    if (s.integrity <= 0) {
      s.integrity = 0;
      s.status = 'lost';
      return;
    }
    for (const pad of pads) {
      const unit = s.units.get(pad.id);
      if (!unit) continue;
      unit.cooldown = Math.max(0, unit.cooldown - dt);
      if (unit.cooldown > 0) continue;
      const tower = stats(unit.type, unit.level);
      let target = null;
      for (const e of s.enemies) {
        if (e.hp <= 0 || Math.hypot(e.x - pad.x, e.y - pad.y) > tower.range) continue;
        if (!target || e.route.length - e.distance < target.route.length - target.distance) target = e;
      }
      if (!target) continue;
      unit.cooldown = tower.cooldown;
      const chained=tower.chain?s.enemies.filter(e=>e!==target&&e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<85)
        .sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y)).slice(0,tower.chain-1):[];
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const direct = e === target;
        if (!direct && !chained.includes(e) && (!tower.splash || Math.hypot(e.x - target.x, e.y - target.y) > tower.splash)) continue;
        e.hp -= direct ? tower.damage : Math.ceil(tower.damage * .55);
        if(tower.poison){e.poisonUntil=s.time+3;e.poisonDamage=tower.poison*(1+.5*(unit.level-1));}
        if (tower.slow) e.slowedUntil = s.time + tower.slow;
        if (e.hp <= 0) {
          s.kills++;
          s.credits += foes[e.type].reward;
        }
      }
      s.effects.push({id:++s.serial, pad:pad.id, type:unit.type, chain:chained.map(e=>({x:e.x,y:e.y})), born:s.time, x:pad.x, y:pad.y, tx:target.x, ty:target.y, color:tower.color, splash:tower.splash, until:s.time + .42});
    }
    s.enemies = s.enemies.filter(e => e.hp > 0);
    s.effects = s.effects.filter(e => e.until > s.time);
    if (s.spawned === quota && !s.enemies.length) {
      s.cleared = s.wave;
      s.lastBonus = 48 + s.wave * 7;
      s.credits += s.lastBonus;
      s.status = s.wave === MAX_WAVES ? 'won' : 'ready';
      s.effects = [];
    }
  }
  return {MAX_WAVES, MAX_LEVEL, START_INTEGRITY, base, pads, towers, foes, routes, waves, state, stats,
    upgradeCost, sellValue, ended, build, upgrade, sell, start, position, advance};
})();
