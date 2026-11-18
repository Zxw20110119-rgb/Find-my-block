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
for(const type of ['pulse','frost','burst','sniper','tesla','venom']){
 const file=fs.readFileSync('public/assets/towers/'+type+'.glb');
 assert.equal(file.toString('ascii',0,4),'glTF');
 assert.equal(file.readUInt32LE(4),2);
 assert.equal(file.readUInt32LE(8),file.length);
 const gltf=JSON.parse(file.toString('utf8',20,20+file.readUInt32LE(12)));
 assert(gltf.meshes.length>=20,type+' has detailed mesh parts');
 assert(gltf.materials.length>=4,type+' has layered materials');
 const atlas=fs.readFileSync('public/assets/towers/'+type+'.webp');
 assert.equal(atlas.toString('ascii',8,16),'WEBPVP8X');
 assert.equal(atlas.readUIntLE(24,3)+1,896);
 assert.equal(atlas.readUIntLE(27,3)+1,672);
}
const models=['scout','runner','tank','boss'].map(type=>a.monster(svg,type,'#aaa'));
assert.equal(new Set(models.map(x=>JSON.stringify(x))).size,4);
for(const m of models)assert(m.children.length>=5);
console.log('Six projectile styles and four enemy models passed');
