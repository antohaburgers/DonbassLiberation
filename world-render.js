import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {SIZE,height,treesForChunk} from './world-data.js';
const grass=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
const roadMat=new THREE.MeshLambertMaterial({color:0x726c5c,side:THREE.DoubleSide});
const dirtMat=new THREE.MeshLambertMaterial({color:0x987d5c,side:THREE.DoubleSide});
const bark=new THREE.MeshLambertMaterial({color:0x5b4936});
const leaf=new THREE.MeshLambertMaterial({color:0xffffff});
const wallColors=[0xc8b99a,0xb1b4a5,0xafa184,0xb5a78c];
const roofColors=[0x575d53,0x7b5a47,0x7d7869,0x55584b];
const roofGeo=new THREE.ConeGeometry(1,1,4);
const trunkGeo=new THREE.CylinderGeometry(.27,.39,3,5);
const crownGeo=new THREE.ConeGeometry(1,1,6);
function box(w,h,d,color){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));}
function surface(map){
 const root=new THREE.Group();
 for(const road of map.roads){
  const positions=[],indices=[];
  for(let i=0;i<road.points.length;i++){
   const p=road.points[i],a=road.points[Math.max(0,i-1)],b=road.points[Math.min(road.points.length-1,i+1)];
   const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz)||1,nx=-dz/dist,nz=dx/dist,w=road.width/2;
   for(const sign of [-1,1]){
    const x=p.x+nx*w*sign,z=p.z+nz*w*sign;
    positions.push(x,height(x,z)+.065,z);
   }
   if(i){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  root.add(new THREE.Mesh(geom,road.secondary?dirtMat:roadMat));
 }return root;
}
function createBuilding(b){
 const group=new THREE.Group(),y=height(b.x,b.z);
 const c=b.tone%4,industrial=b.kind==='hangar',tent=b.kind==='tent';
 const w=b.w,d=b.d,h=b.h;
 const body=box(w,h,d,tent?0x6b735e:industrial?0x93968b:wallColors[c]);
 body.position.y=h/2;group.add(body);
 const roof=new THREE.Mesh(roofGeo,new THREE.MeshLambertMaterial({color:tent?0x5b6e51:roofColors[c],flatShading:true}));
 roof.rotation.y=Math.PI/4;roof.scale.set(Math.max(w,d)*.83,industrial?1.3:2.7,Math.max(w,d)*.83);
 roof.position.y=h+(industrial?.6:1.25);group.add(roof);
 const door=box(Math.min(2.5,w*.27),2.35,.14,industrial?0x4b5956:0x604e3a);
 door.position.set(0,1.18,d/2+.08);group.add(door);
 if(!tent){for(const side of [-1,1]){
  const win=box(1.35,1.15,.13,0x536b70);
  win.position.set(side*w*.31,h*.62,d/2+.08);group.add(win);
 }}
 group.position.set(b.x,y,b.z);return group;
}
export class WorldView{
 constructor(scene,map){
  this.scene=scene;this.map=map;this.chunks=new Map();
  this.roadGroup=surface(map);scene.add(this.roadGroup);
  this.buildings=map.buildings.map(b=>{const node=createBuilding(b);scene.add(node);return{data:b,node};});
  this.markers=[];
  for(const p of map.pois){
   const root=new THREE.Group();
   const ring=new THREE.Mesh(new THREE.TorusGeometry(11,.7,4,32),new THREE.MeshBasicMaterial({color:0xf0b777,transparent:true,opacity:.75}));
   ring.rotation.x=Math.PI/2;ring.position.y=.35;root.add(ring);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,14,6),new THREE.MeshBasicMaterial({color:0xf0b777,transparent:true,opacity:.42}));
   pole.position.y=7;root.add(pole);
   root.position.set(p.x,height(p.x,p.z),p.z);scene.add(root);
   this.markers.push({poi:p,root,ring,pole});
  }
  this.rebuild(map.center.x,map.center.z);
 }
 chunk(cx,cz){
  const node=new THREE.Group(),ox=-500+(cx+.5)*125,oz=-500+(cz+.5)*125;
  const mesh=new THREE.PlaneGeometry(125,125,16,16);
  mesh.rotateX(-Math.PI/2);
  const pos=mesh.getAttribute('position'),colors=[];
  for(let i=0;i<pos.count;i++){
   const x=ox+pos.getX(i),z=oz+pos.getZ(i),y=height(x,z);
   pos.setY(i,y);
   const forest=(Math.sin(x*.017+this.map.seed*.00001)+Math.cos(z*.019))*.5;
   const tint=(Math.sin(x*.031)+Math.cos(z*.027))*.014;
   const c=new THREE.Color().setRGB(.34+forest*.032+tint,.42+forest*.051+tint,.28+forest*.016+tint);
   colors.push(c.r,c.g,c.b);
  }
  mesh.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  mesh.computeVertexNormals();
  const ground=new THREE.Mesh(mesh,grass);node.add(ground);
  const trees=treesForChunk(cx,cz,this.map);
  if(trees.length){
   const trunks=new THREE.InstancedMesh(trunkGeo,bark,trees.length);
   const crowns=new THREE.InstancedMesh(crownGeo,leaf,trees.length);
   const dummy=new THREE.Object3D(),color=new THREE.Color();
   trees.forEach((t,i)=>{
    const y=height(t.x,t.z),top=t.h-3;
    dummy.position.set(t.x,y+1.5,t.z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.set(t.x,y+3+top*.5,t.z);dummy.scale.set(t.r,top,t.r);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
    color.setHex([0x365b3a,0x406e45,0x4c6940,0x527449][t.tone]);crowns.setColorAt(i,color);
   });
   trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;
   if(crowns.instanceColor)crowns.instanceColor.needsUpdate=true;
   node.add(trunks,crowns);
  }
  this.scene.add(node);
  return {node,ground,trees};
 }
 rebuild(x,z){
  const cx=Math.floor((x+500)/125),cz=Math.floor((z+500)/125),keep=new Set();
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){
   const ix=cx+a,iz=cz+b;
   if(ix<0||iz<0||ix>7||iz>7)continue;
   const key=ix+','+iz;keep.add(key);
   if(!this.chunks.has(key))this.chunks.set(key,this.chunk(ix,iz));
  }
  for(const [key,chunk] of this.chunks)if(!keep.has(key)){
   this.scene.remove(chunk.node);chunk.ground.geometry.dispose();this.chunks.delete(key);
  }
  for(const building of this.buildings)building.node.visible=Math.hypot(building.data.x-x,building.data.z-z)<290;
  this.activeTrees=Array.from(this.chunks.values()).flatMap(c=>c.trees);
 }
 blocked(x,z){
  for(const b of this.map.buildings)if(Math.abs(x-b.x)<b.w/2+.65&&Math.abs(z-b.z)<b.d/2+.65)return true;
  for(const t of this.activeTrees||[])if((t.x-x)**2+(t.z-z)**2<1.15**2)return true;
  return false;
 }
 update(x,z,dt,time){
  const cx=Math.floor((x+500)/125),cz=Math.floor((z+500)/125);
  if(cx!==this.cx||cz!==this.cz){this.cx=cx;this.cz=cz;this.rebuild(x,z);}
  for(const m of this.markers){
   m.root.visible=Math.hypot(m.poi.x-x,m.poi.z-z)<320;
   m.ring.material.color.setHex(m.poi.scouted?0x75cb92:0xf0b777);
   m.pole.material.color.setHex(m.poi.scouted?0x75cb92:0xf0b777);
   m.pole.scale.y=1+.06*Math.sin(time*2+m.poi.id);
  }
 }
}