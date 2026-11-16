const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('public/defense-art.js','utf8'),ctx);
const a=ctx.DefenseArt, svg=(tag,attrs={})=>({tag,attrs,children:[],append(...nodes){this.children.push(...nodes);}});
for(const type of ['pulse','frost','burst','sniper','tesla','venom']){
 for(const time of [0,.1,.3,.42]){
  const fx={type,born:0,until:.42,x:10,y:20,tx:90,ty:100,splash:24,chain:[{x:120,y:110}]};
  for(const reduced of [true,false]){
   const node=a.shot(svg,fx,time,a.palettes.original[type],reduced);
   assert(!/NaN|undefined|Infinity/.test(JSON.stringify(node)));
   if(time===.42)assert.equal(node.children.length,0);
  }
 }
}
for(const type of ['sniper','tesla','venom']){const data=decodeURIComponent(a.model(type));assert(data.includes('<svg'));assert(!data.includes('undefined'));}
const models=['scout','runner','tank','boss'].map(type=>a.monster(svg,type,'#aaa'));
assert.equal(new Set(models.map(x=>JSON.stringify(x))).size,4);
for(const m of models)assert(m.children.length>=5);
console.log('Six projectile styles and four enemy models passed');
