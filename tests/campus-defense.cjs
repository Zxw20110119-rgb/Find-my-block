const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ctx = vm.createContext({});
for (const file of ['campus.js','defense-engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../public',file),'utf8'),ctx);
const g = ctx.CampusDefense;
const walkways = vm.runInContext("new Set(chains.flatMap(c => c.slice(1).map((key, i) => [key,c[i]].sort().join('|'))))",ctx);

test('every mapped block is usable and every enemy lane follows real walkway segments', () => {
  const expected = vm.runInContext("Object.keys(places).filter(k=>k.length===1 || k==='pukehinau' || k==='rakipaoa').sort().join(',')",ctx);
  assert.equal([...new Set(g.pads.map(p => p.place))].sort().join(','),expected);
  assert.equal(g.pads.length,16);
  for (const route of Object.values(g.routes)) {
    assert.equal(route.points.at(-1).join(','),g.base.join(','));
    for (let i=1; i<route.keys.length; i++) assert.ok(walkways.has([route.keys[i],route.keys[i-1]].sort().join('|')));
  }
  for (const pad of g.pads) {
    assert.ok(Object.values(g.routes).some(route =>
      route.segments.some(({x,y,dx,dy,size}) => {
        const t = Math.max(0,Math.min(1,((pad.x-x)*dx+(pad.y-y)*dy)/size**2));
        return Math.hypot(x+t*dx-pad.x,y+t*dy-pad.y)<g.towers.burst.range;
      })),pad.id + ' cannot defend any lane');
  }
});

test('building, upgrade limits and selling enforce the credit budget', () => {
  const s = g.state();
  assert.equal(g.start(s),false);
  assert.equal(g.build(s,'unknown','pulse'),false);
  assert.ok(g.build(s,'e','pulse'));
  assert.equal(s.credits,180);
  assert.equal(g.build(s,'e','burst'),false);
  assert.ok(g.upgrade(s,'e'));
  assert.ok(g.upgrade(s,'e'));
  assert.equal(g.upgrade(s,'e'),false);
  assert.equal(g.build(s,'k','burst'),false);
  const credits = s.credits, refund = g.sellValue(s.units.get('e'));
  assert.ok(g.sell(s,'e'));
  assert.equal(s.credits,credits+refund);
  assert.ok(!s.units.has('e'));
});

const finishWave = s => {
  for (let i=0; s.status === 'active' && i<4500; i++) g.advance(s,.025);
  assert.notEqual(s.status,'active','Wave must terminate');
};

test('a mixed defense can clear all eight waves with an ordinary credit budget', () => {
  const s = g.state();
  const builds = [[['e','pulse'],['b','burst']], [['x','pulse']], [['d','burst'],['a','frost']], [['k','frost'],['g','pulse']], [['c','burst']], [['m','pulse'],['n','burst']], [['l','pulse']], [['h','burst']]];
  for (let i=0; i<g.MAX_WAVES; i++) {
    for (const [pad,tower] of builds[i]) assert.ok(g.build(s,pad,tower), 'Afford ' + pad + ' at wave ' + (i+1));
    if (i>=2) g.upgrade(s,i%2 ? 'd' : 'b');
    assert.ok(g.start(s));
    finishWave(s);
    assert.equal(s.cleared,i+1);
  }
  assert.equal(s.status,'won');
  assert.ok(s.integrity>0);
  assert.ok(s.kills>=140);
  assert.equal(g.start(s),false);
});

test('undefended bots drain the Library and end the run', () => {
  const s = g.state();
  assert.ok(g.build(s,'k-east','pulse'));
  while (!g.ended(s)) {
    assert.ok(g.start(s));
    finishWave(s);
  }
  assert.equal(s.status,'lost');
  assert.equal(s.integrity,0);
  assert.equal(g.build(s,'d','burst'),false);
});
