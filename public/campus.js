/* Coordinates traced from the user's red-line map; units are image pixels, not metres. */
const nodes={
w0:[437,390],w1:[480,390],w2:[597,390],p0:[685,390],w3:[695,390],
n0:[695,245],n2:[795,245],nTurn:[808,270],n3:[858,266],n4:[887,251],
g0:[858,373],gHub:[858,317],g1:[805,373],b0:[695,430],b1:[805,430],a0:[597,535],a1:[695,535],a2:[597,583],e0:[480,587],e1:[433,587],e2:[433,562],m0:[591,587],m2:[591,675],m3:[591,707],m4:[591,908],
c0:[805,535],cTop:[805,485],cEast:[983,485],c1:[805,594],c2:[695,594],xBridge:[695,375],q0:[695,657],q0w:[674,657],q1:[805,640],q1e:[900,640],q1n:[900,605],south:[657,707],southLink:[674,707],
s0:[887,272],s2:[948,317],s4:[983,368],s5:[983,585],s6:[935,595],s6h:[983,595]
};
// Extra walkways from the latest red-line markup: X→G and the east side of C Block.
const chains=[
["w0","w1","w2","p0","w3"],["w1","e0"],["w2","a0","a2"],["a2","m0"],["a0","a1"],
["e2","e1","e0","m0","m2","m3","m4"],["m3","south","southLink","q0w","q0"],
["q0","c2","a1","b0","w3","n0"],["b0","b1"],["b1","g1","g0","gHub","n3"],["w3","xBridge","g1"],["b1","cTop","c0","c1"],["cTop","cEast"],["c1","q1"],
["c2","c1"],["q0","q1","q1e","q1n","s6","s6h","s5"],
["n0","n2","nTurn","n3","n4"],["n3","s0","s2","s4","cEast","s5"]
];
const places={
a:{name:"A Block",access:["a1","a2"]},
b:{name:"B Block",access:["b0","b1"]},
c:{name:"C Block",access:["c0","cTop","cEast","c1","s5"]},
d:{name:"D Block",access:["q1e"]},
e:{name:"E Block",access:["w1","e0"]},
g:{name:"G Block",access:["g0","g1","gHub"]},
h:{name:"H Block",access:["n2"]},
k:{name:"K Block",access:["n3","n4"]},
l:{name:"L Block",access:["w2","a0"]},
m:{name:"M Block",access:["m0","m2","m3"]},
n:{name:"N Block",access:["n0"]},
x:{name:"X Block",access:["w3"]},
library:{name:"Library",zh:"图书馆",access:["q1"]},
international:{name:"International Office",zh:"国际部",access:["q0"]},
reception:{name:"Main Reception · nearby path",zh:"接待处附近步道",access:["south"]},
canteen:{name:"Canteen",zh:"食堂",access:["s6"]},
hunter:{name:"Hunter Gym",access:["s2","s4"]},
aurora:{name:"Aurora Centre",access:["m4"]},
rakipaoa:{name:"R Block · Rakipaoa",zh:"R 楼 · Rakipaoa",aliases:["Rakipaoa","R Block"],access:["w0","e2"]},
pukehinau:{name:"Pukehinau",access:["p0"]}
};
