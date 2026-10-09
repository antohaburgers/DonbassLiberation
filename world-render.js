import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {height,treesForChunk,randomizer} from './world-data.js?v=08';

// Visual direction adapted from DerevnyaRally: natural palette, patterned dirt,
// village rooflines, layered forest, dense grass, fog and soft afternoon light.
const mat=(color,more={})=>new THREE.MeshLambertMaterial({color,...more});
const palette={
 walls:[0xa88a6a,0xaab7a6,0xb0a184,0x9fa99b],
 roofs:[0x824d3c,0x556b6c,0x79675d,0x70513c],
 foliage:[0x2d512f,0x3d6537,0x527947,0x355b43]
};
const stuff={
 timber:mat(0x927957),shade:mat(0x51463c),white:mat(0xcdc5ae),
 glass:mat(0x44616d,{emissive:0x0e1720}),metal:mat(0x6f7570),
 gravel:mat(0x7c806f),hay:mat(0xbda458),straw:mat(0x8e7e49),
 trunk:mat(0x604b36),rock:mat(0x999a83),
 grass:mat(0x708a49,{side:THREE.DoubleSide}),
 flag0:new THREE.MeshBasicMaterial({color:0xf3ba70}),
 flag1:new THREE.MeshBasicMaterial({color:0x85d79c})
};
const unitBox=new THREE.BoxGeometry(1,1,1);
const pine=new THREE.ConeGeometry(1,1,7),trunk=new THREE.CylinderGeometry(.21,.34,1,6);
const crown=new THREE.IcosahedronGeometry(1,1),stone=new THREE.DodecahedronGeometry(1,0);
const bale=new THREE.CylinderGeometry(1,1,1,10),dummy=new THREE.Object3D();
const walls=palette.walls.map(c=>mat(c)),roofs=palette.roofs.map(c=>mat(c,{side:THREE.DoubleSide}));
const pineMat=mat(0xffffff,{flatShading:true}),leafMat=mat(0xffffff,{flatShading:true});
const rand=(x,y)=>{let f=Math.sin(x*127.1+y*311.7)*43758.5453;return f-Math.floor(f);};
function painted(kind){
 // Persistent, repeating procedural albedo; broad detail is visible from eye height.
 const cvs=document.createElement('canvas');cvs.width=cvs.height=512;
 const ctx=cvs.getContext('2d'),pixels=ctx.createImageData(512,512);
 // Tileable noise grids are precomputed once, keeping iPhone startup fast.
 const tables=new Map();
 for(const frequency of [5,21,83]){
  const data=new Float32Array(frequency*frequency);
  for(let j=0;j<frequency;j++)for(let i=0;i<frequency;i++)
   data[i+j*frequency]=rand(i+31*frequency,j+73*frequency);
  tables.set(frequency,data);
 }
 function smoothNoise(x,y,frequency){
  const fx=x/512*frequency,fy=y/512*frequency,ix=Math.floor(fx),iy=Math.floor(fy);
  const a=fx-ix,b=fy-iy,u=a*a*(3-2*a),v=b*b*(3-2*b);
  const data=tables.get(frequency);
  const x0=ix%frequency,x1=(ix+1)%frequency,y0=iy%frequency,y1=(iy+1)%frequency;
  const ab=data[x0+y0*frequency]*(1-u)+data[x1+y0*frequency]*u;
  const cd=data[x0+y1*frequency]*(1-u)+data[x1+y1*frequency]*u;
  return ab*(1-v)+cd*v;
 }
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const large=smoothNoise(x,y,5),medium=smoothNoise(x,y,21),fine=smoothNoise(x,y,83);
  const grit=rand(x+117,y+319)-.5;
  let rgb;
  if(kind==='grass'){
   // Olive grass, shaded moss, dry straw, bare soil: pronounced texture patches.
   const patch=.6*large+.3*medium+.1*fine;
   const bare=Math.max(0,Math.min(1,(patch-.56)*4.5));
   const dry=Math.max(0,Math.min(1,(.37-patch)*3.4));
   const moss=[79,112,63],earth=[139,116,79],straw=[135,133,76];
   const grass=[91+large*21,115+medium*20,62+fine*12];
   rgb=grass.map((v,k)=>v*(1-bare)*(1-dry)+earth[k]*bare+straw[k]*dry);
   const fleck=grit*32+(fine-.5)*27;
   rgb=[rgb[0]+fleck,rgb[1]+fleck*.82,rgb[2]+fleck*.65];
  }else{
   const t=x/512,rut=Math.exp(-Math.pow((t-.30)/.052,2))+Math.exp(-Math.pow((t-.70)/.052,2));
   const edge=Math.min(t,1-t)<.10?18:0;
   const base=kind==='dirt'?[143,126,95]:[129,111,84];
   const grain=(large-.5)*35+(medium-.5)*30+(fine-.5)*20+grit*32;
   rgb=[base[0]+grain-rut*28+edge,base[1]+grain*.9-rut*27+edge,base[2]+grain*.78-rut*23+edge];
  }
  const i=(y*512+x)*4;
  for(let k=0;k<3;k++)pixels.data[i+k]=Math.max(0,Math.min(255,rgb[k]));
  pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 if(kind==='grass'){
  // Sprigs, fallen needles and leaf litter produce readable near-field texture.
  const rng=randomizer(991123);
  for(let i=0;i<3700;i++){
   const x=rng()*512,y=rng()*512;
   ctx.strokeStyle=rng()<.5?'rgba(37,62,27,.30)':'rgba(193,180,113,.28)';
   ctx.lineWidth=.6+rng()*1.8;ctx.beginPath();
   ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*4,y-1-rng()*10);ctx.stroke();
  }
 }else{
  const rng=randomizer(kind==='dirt'?874:664);
  for(let i=0;i<620;i++){
   const x=rng()*512,y=rng()*512;
   ctx.strokeStyle=rng()<.5?'rgba(44,36,28,.23)':'rgba(230,204,149,.20)';
   ctx.lineWidth=.5+rng()*2;ctx.beginPath();ctx.moveTo(x,y);
   ctx.lineTo(x+(rng()-.5)*4,y+7+rng()*27);ctx.stroke();
  }
 }
 const tex=new THREE.CanvasTexture(cvs);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
 tex.generateMipmaps=true;tex.anisotropy=8;return tex;
}
const groundTexture=painted('grass');groundTexture.repeat.set(4,4);
const grassMaterial=mat(0xffffff,{map:groundTexture,vertexColors:true});
const roadMaterial=mat(0xffffff,{map:painted('dirt'),side:THREE.DoubleSide});
const trackMaterial=mat(0xffffff,{map:painted('track'),side:THREE.DoubleSide});
function block(g,w,h,d,x,y,z,material){
 const a=new THREE.Mesh(unitBox,material);a.scale.set(w,h,d);a.position.set(x,y,z);g.add(a);return a;
}
function makeRoof(g,w,d,h,material,rise){
 const width=Math.hypot(w/2+.48,rise),angle=Math.atan2(rise,w/2+.48);
 for(const s of [-1,1]){
  const p=block(g,width,.22,d+1.1,s*w/4,h+rise/2,0,material);
  p.rotation.z=s<0?angle:-angle;
 }
}
function house(b){
 const g=new THREE.Group(),hangar=b.kind==='hangar',tent=b.kind==='tent';
 const w=b.w,d=b.d,h=b.h,side=b.tone%4;
 block(g,w,h,d,0,h/2,0,tent?stuff.straw:hangar?stuff.metal:walls[side]);
 makeRoof(g,w,d,h,roofs[side],hangar?1.15:tent?1.45:2);
 // Foundation, doors, windows, visible weathered timber trim and a chimney.
 block(g,w+.35,.42,d+.35,0,.02,0,stuff.gravel);
 const dw=hangar?w*.48:1.7,dh=hangar?3.5:2.2;
 block(g,dw,dh,.16,0,dh/2,d/2+.12,hangar?stuff.shade:stuff.timber);
 block(g,dw+.24,.17,.22,0,dh+.08,d/2+.17,stuff.white);
 block(g,dw+.65,.16,1.18,0,.1,d/2+.78,stuff.gravel);
 if(!tent){
  for(const sideX of [-1,1]){
   const wx=sideX*w*.3,wy=h*.62;
   block(g,1.52,1.25,.17,wx,wy,d/2+.11,stuff.white);
   block(g,1.29,1.05,.18,wx,wy,d/2+.23,stuff.glass);
   block(g,.07,1.08,.22,wx,wy,d/2+.33,stuff.white);
   block(g,1.76,.12,.34,wx,wy-.69,d/2+.28,stuff.timber);
  }
  block(g,.7,1.1,.7,w*.23,h+1.0,-d*.2,stuff.shade);
  if(!hangar)for(const s of [-1,1])
   block(g,.1,.17,d+.4,s*(w/2-.14),h*.91,0,stuff.timber);
 }
 // A fake contact shadow is cheap enough for WebGL without realtime shadowmaps.
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w+2,d+2),new THREE.MeshBasicMaterial({
  color:0x17231b,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide
 }));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.05;g.add(shadow);
 g.position.set(b.x,height(b.x,b.z),b.z);return g;
}
function roadNetwork(map){
 const root=new THREE.Group();
 for(let r=0;r<map.roads.length;r++){
  const road=map.roads[r],v=[],uv=[],indices=[];let len=0;
  road.points.forEach((p,i)=>{
   const a=road.points[Math.max(i-1,0)],b=road.points[Math.min(i+1,road.points.length-1)];
   const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
   if(i)len+=Math.hypot(p.x-road.points[i-1].x,p.z-road.points[i-1].z);
   for(const sign of [-1,1]){
    const x=p.x+nx*road.width*.5*sign,z=p.z+nz*road.width*.5*sign;
    v.push(x,height(x,z)+.14+r*.002,z);uv.push(sign<0?0:1,len/25);
   }
   if(i){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  root.add(new THREE.Mesh(geo,road.secondary?trackMaterial:roadMaterial));
 }
 return root;
}
function villageExtras(map){
 const g=new THREE.Group(),rng=randomizer(map.seed^0xaabb88);
 for(const b of map.buildings)if(b.kind==='house'&&rng()<.7){
  // Pair of fence rails with upright posts, just like the rally scenery.
  const fence=new THREE.Group(),length=b.d+7;
  for(let i=0;i<6;i++)block(fence,.15,1.2,.15,0,.6,-length/2+i*length/5,stuff.timber);
  for(const y of [.48,.91])block(fence,.13,.12,length,0,y,0,stuff.timber);
  fence.position.set(b.x+b.w/2+3,height(b.x+b.w/2+3,b.z),b.z);g.add(fence);
 }
 for(const c of map.covers||[]){
  const y=height(c.x,c.z),root=new THREE.Group();
  const kind=c.kind;
  const material=kind==='barrier'?stuff.gravel:kind==='sandbag'?stuff.straw:
    kind==='log'?stuff.timber:kind==='container'?stuff.metal:
    kind==='hay'?stuff.hay:kind==='fence'?stuff.timber:stuff.shade;
  block(root,c.w,c.h,c.d,0,c.h/2,0,material);
  if(kind==='container'){
   for(const x of [-c.w*.38,-c.w*.13,c.w*.13,c.w*.38])
    block(root,.065,c.h*.92,c.d+.04,x,c.h*.50,0,stuff.shade);
   for(const z of [-c.d*.48,c.d*.48])
    block(root,c.w*.98,.12,.10,0,c.h*.83,z,stuff.shade);
  }else if(kind==='sandbag'){
   for(let k=0;k<3;k++)
    block(root,c.w*.32,c.h*.45,c.d*.85,(k-1)*c.w*.29,c.h*.74,0,stuff.hay);
  }else if(kind==='barrier'){
   for(const side of [-1,1])block(root,.28,c.h*.62,c.d*.85,side*c.w*.41,c.h*.74,0,stuff.straw);
  }else if(kind==='fence'){
   for(let k=0;k<4;k++)block(root,.13,c.h,.15,-c.w/2+k*c.w/3,c.h/2,0,stuff.timber);
   block(root,c.w,.12,.13,0,c.h*.79,0,stuff.timber);
  }else if(kind==='log'){
   block(root,c.w*.90,.16,.16,0,c.h*.88,0,stuff.shade);
  }else if(kind==='crate'){
   for(const side of [-1,1])block(root,.12,c.h+.03,c.d+.06,side*c.w*.46,c.h/2,0,stuff.timber);
  }
  root.position.set(c.x,y,c.z);root.rotation.y=c.angle||0;g.add(root);
 }
 for(const p of map.pois){
  const x=p.x+19,z=p.z-16,y=height(x,z);
  block(g,.25,6.7,.25,x,y+3.35,z,stuff.timber);
  block(g,2,.17,.19,x,y+6.05,z,stuff.timber);
  for(const s of [-1,1])block(g,.16,.43,.16,x+s*.72,y+6.1,z,stuff.shade);
  if(['base','checkpoint','depot'].includes(p.type)){
   for(const s of [-1,1]){
    const b=block(g,3.5,1,1.3,p.x+s*7,height(p.x+s*7,p.z+10)+.5,p.z+10,stuff.gravel);
    b.rotation.y=s*.22;
   }
  }
  if(['village','camp'].includes(p.type)){
   for(let k=0;k<5;k++){
    const bx=p.x+(rng()-.5)*42,bz=p.z+(rng()-.5)*42;
    const h=new THREE.Mesh(bale,stuff.hay);
    h.scale.set(.88,1.3,.88);h.rotation.z=Math.PI/2;h.position.set(bx,height(bx,bz)+.95,bz);g.add(h);
   }
  }
 }
 return g;
}
function sky(scene){
 const shader=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec3 v;void main(){float t=smoothstep(-.14,.7,normalize(v).y);vec3 c=mix(vec3(.72,.77,.73),vec3(.38,.58,.71),t);gl_FragColor=vec4(c,1.);}'
 });
 const dome=new THREE.Mesh(new THREE.SphereGeometry(385,28,14),shader);dome.renderOrder=-900;
 scene.add(dome);return dome;
}
const grassShape=new THREE.BufferGeometry();
{
 const positions=[],normals=[];
 for(const ang of [0,Math.PI/3,2*Math.PI/3]){
  const c=Math.cos(ang)*.21,s=Math.sin(ang)*.21;
  positions.push(-c,0,-s,c,0,s,.05,1,.04);
  normals.push(0,1,0,0,1,0,0,1,0);
 }
 grassShape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 grassShape.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
}
export class WorldView{
 constructor(scene,map){
  this.scene=scene;this.map=map;this.chunks=new Map();this.activeTrees=[];
  this.dome=sky(scene);this.roads=roadNetwork(map);scene.add(this.roads);
  this.decorations=villageExtras(map);scene.add(this.decorations);
  this.buildings=map.buildings.map(b=>({data:b,node:house(b)}));
  for(const b of this.buildings)scene.add(b.node);
  this.markers=[];
  for(const poi of map.pois){
   const root=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(9,.24,4,32),
    new THREE.MeshBasicMaterial({color:0xecc07c,transparent:true,opacity:.65,depthWrite:false}));
   ring.rotation.x=Math.PI/2;ring.position.y=.3;root.add(ring);
   block(root,.2,9,.2,0,4.5,0,stuff.shade);
   const flag=block(root,2.8,1.4,.1,1.4,8.4,0,stuff.flag0);
   root.position.set(poi.x,height(poi.x,poi.z),poi.z);scene.add(root);
   this.markers.push({poi,root,ring,flag});
  }
  this.cx=Math.floor((map.center.x+500)/125);
  this.cz=Math.floor((map.center.z+500)/125);
  this.rebuild(map.center.x,map.center.z);
 }
 chunk(cx,cz){
  const group=new THREE.Group(),ox=-500+(cx+.5)*125,oz=-500+(cz+.5)*125;
  const geo=new THREE.PlaneGeometry(125,125,36,36);
  geo.rotateX(-Math.PI/2);
  const positions=geo.getAttribute('position'),colors=[];
  for(let i=0;i<positions.count;i++){
   const x=ox+positions.getX(i),z=oz+positions.getZ(i);
   // World-space vertices: without X/Z offsets every terrain tile overlaps at origin.
   positions.setXYZ(i,x,height(x,z),z);
   // Broad biome mottling in continuous world coordinates avoids tile seams.
   const hash=(ix,iz)=>rand(ix+this.map.seed%10007,iz+Math.floor(this.map.seed/10007));
   const noise=(size)=>{
    const sx=x/size,sz=z/size,ax=Math.floor(sx),az=Math.floor(sz);
    const fx=sx-ax,fz=sz-az,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
    const n0=hash(ax,az)*(1-u)+hash(ax+1,az)*u;
    const n1=hash(ax,az+1)*(1-u)+hash(ax+1,az+1)*u;
    return n0*(1-v)+n1*v;
   };
   const nBig=noise(69),nMid=noise(23),nSmall=noise(7.5);
   const meadow=.6*nBig+.4*nMid;
   const dry=Math.max(0,Math.min(1,(meadow-.54)*2.65));
   const moss=Math.max(0,Math.min(1,(.43-meadow)*2.65));
   const variation=(nSmall-.5)*.20;
   const c=new THREE.Color().setRGB(
     .97+dry*.20-moss*.10+variation,
     1.06-dry*.16+moss*.12+variation*.85,
     .90+dry*.03-moss*.08+variation*.55
   );
   colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const ground=new THREE.Mesh(geo,grassMaterial);group.add(ground);
  const trees=treesForChunk(cx,cz,this.map),conifers=trees.filter(t=>t.pine),broadleaf=trees.filter(t=>!t.pine);
  const instances=[];
  function instantiate(arr,geometry,material,pos,scale){
   if(!arr.length)return;
   const mesh=new THREE.InstancedMesh(geometry,material,arr.length);
   mesh.frustumCulled=false;
   arr.forEach((t,i)=>{
    const y=height(t.x,t.z);
    dummy.position.set(...pos(t,y));dummy.rotation.set(0,t.angle,0);dummy.scale.set(...scale(t));dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
    if(material!==stuff.trunk)mesh.setColorAt(i,new THREE.Color(palette.foliage[t.tone]));
   });
   mesh.instanceMatrix.needsUpdate=true;
   if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
   group.add(mesh);instances.push(mesh);
  }
  instantiate(trees,trunk,stuff.trunk,(t,y)=>[t.x,y+t.h*.25,t.z],t=>[.8,t.h*.5,.8]);
  instantiate(conifers,pine,pineMat,(t,y)=>[t.x,y+t.h*.58,t.z],t=>[t.r,t.h*.68,t.r]);
  instantiate(conifers,pine,pineMat,(t,y)=>[t.x,y+t.h*.84,t.z],t=>[t.r*.72,t.h*.45,t.r*.72]);
  instantiate(broadleaf,crown,leafMat,(t,y)=>[t.x,y+t.h*.74,t.z],t=>[t.r*1.4,t.h*.35,t.r*1.4]);
  instantiate(broadleaf,crown,leafMat,(t,y)=>[t.x+t.r*.32,y+t.h*.86,t.z],t=>[t.r,t.h*.23,t.r]);
  const rng=randomizer((this.map.seed^Math.imul(cx+19,39617)^Math.imul(cz+13,8191))>>>0);
  const grassItems=[],rocks=[];
  for(let i=0;i<200;i++){
   const x=-500+(cx+rng())*125,z=-500+(cz+rng())*125;
   if(this.map.buildings.some(b=>Math.abs(x-b.x)<b.w/2+4&&Math.abs(z-b.z)<b.d/2+4))continue;
   if(rng()<.90)grassItems.push({x,z,s:.24+rng()*.6,a:rng()*6.28});
   if(rng()<.04)rocks.push({x,z,s:.3+rng()*.75,a:rng()*6.28});
  }
  if(grassItems.length){
   const mesh=new THREE.InstancedMesh(grassShape,stuff.grass,grassItems.length);
   grassItems.forEach((t,i)=>{
    dummy.position.set(t.x,height(t.x,t.z)+.01,t.z);dummy.rotation.set(0,t.a,0);dummy.scale.set(t.s,t.s,t.s);
    dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;group.add(mesh);instances.push(mesh);
  }
  if(rocks.length){
   const mesh=new THREE.InstancedMesh(stone,stuff.rock,rocks.length);
   rocks.forEach((t,i)=>{
    dummy.position.set(t.x,height(t.x,t.z)+t.s*.3,t.z);dummy.rotation.set(t.a,0,t.a*.5);
    dummy.scale.set(t.s,t.s*.55,t.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;group.add(mesh);instances.push(mesh);
  }
  this.scene.add(group);return{group,ground,instances,trees};
 }
 rebuild(x,z){
  const cx=Math.floor((x+500)/125),cz=Math.floor((z+500)/125),keep=new Set();
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){
   const ix=cx+a,iz=cz+b;if(ix<0||iz<0||ix>7||iz>7)continue;
   const id=ix+','+iz;keep.add(id);if(!this.chunks.has(id))this.chunks.set(id,this.chunk(ix,iz));
  }
  for(const [id,c] of this.chunks)if(!keep.has(id)){
   this.scene.remove(c.group);c.ground.geometry.dispose();
   for(const item of c.instances)item.dispose();this.chunks.delete(id);
  }
  this.activeTrees=Array.from(this.chunks.values()).flatMap(c=>c.trees);
  for(const b of this.buildings)b.node.visible=Math.hypot(b.data.x-x,b.data.z-z)<290;
 }
 blocked(x,z){
  for(const b of [...this.map.buildings,...(this.map.covers||[])])
   if(Math.abs(x-b.x)<b.w/2+.75&&Math.abs(z-b.z)<b.d/2+.75)return true;
  for(const t of this.activeTrees)
   if((t.x-x)**2+(t.z-z)**2<(.42+t.r*.20)**2)return true;
  return false;
 }
 update(x,z,dt,time){
  const cx=Math.floor((x+500)/125),cz=Math.floor((z+500)/125);
  if(cx!==this.cx||cz!==this.cz){this.cx=cx;this.cz=cz;this.rebuild(x,z);}
  this.dome.position.set(x,0,z);
  for(const m of this.markers){
   m.root.visible=Math.hypot(m.poi.x-x,m.poi.z-z)<300;
   m.flag.material=m.poi.scouted?stuff.flag1:stuff.flag0;
   m.ring.material.color.setHex(m.poi.scouted?0x85d79c:0xecc07c);
   m.ring.material.opacity=.52+.16*Math.sin(time*1.7+m.poi.id);
  }
 }
}