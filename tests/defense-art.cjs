const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = {};
vm.runInNewContext(fs.readFileSync('public/defense-art.js','utf8'),ctx);
const art=ctx.DefenseArt;
const svg=(tag,attrs={})=>({tag,attrs,children:[],append(...items){this.children.push(...items);}});
for(const type of ['pulse','frost','burst']) {
  const fx={type,born:1,until:1.42,x:20,y:30,tx:100,ty:120,splash:type==='pulse'?0:40};
  for(const palette of Object.values(art.palettes)) {
    for(const elapsed of [0,.1,.25,.41,.42]) {
      const node=art.shot(svg,fx,1+elapsed,palette[type]);
      const serialized=JSON.stringify(node);
      assert(!/NaN|Infinity|undefined/.test(serialized));
      if(elapsed===.42)assert.equal(node.children.length,0);
    }
    const reduced=art.shot(svg,fx,1.1,palette[type],true);
    assert.equal(reduced.children.length,1);
    assert.equal(reduced.children[0].tag,'circle');
    assert(art.armor(svg,type,3,palette[type]).children.length>art.armor(svg,type,1,palette[type]).children.length);
  }
}
const signatures=['pulse','frost','burst'].map(type=>JSON.stringify(art.shot(svg,{type,born:0,until:.42,x:0,y:0,tx:80,ty:40,splash:20},.1,'#fff')));
assert.equal(new Set(signatures).size,3);
console.log('Tower finishes, three projectile shapes, lifetime and reduced motion: passed');
