import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

// A single pooled instanced mesh for stylized robot coolant: no blood decals,
// no one-mesh-per-droplet allocations and bounded work for mobile browsers.
const MAX_DROPS=260;
const palette=[0xe72b26,0xfc5140,0xc9141d,0xff7256,0xb31219,0xe83c2e];
const DROP_GEOMETRY=new THREE.IcosahedronGeometry(1,0);
const DROP_MATERIAL=new THREE.MeshBasicMaterial({
 color:0xffffff,transparent:true,opacity:.96,depthWrite:false
});
const FLOOR_OFFSET=.065;
export class AntifreezeFX{
 constructor(scene,terrain,seedRng=Math.random){
  this.scene=scene;this.terrain=terrain;this.random=seedRng;
  this.mesh=new THREE.InstancedMesh(DROP_GEOMETRY,DROP_MATERIAL,MAX_DROPS);
  this.mesh.frustumCulled=false;
  this.mesh.renderOrder=4;
  this.dummy=new THREE.Object3D();
  this.drops=Array.from({length:MAX_DROPS},()=>({
    active:false,age:0,life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0
  }));
  this.next=0;
  for(let i=0;i<MAX_DROPS;i++){
   this.mesh.setColorAt(i,new THREE.Color(palette[i%palette.length]));
   this.hide(i);
  }
  this.mesh.instanceMatrix.needsUpdate=true;
  if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
  this.mesh.count=MAX_DROPS;
  scene.add(this.mesh);
 }
 hide(i){
  this.dummy.position.set(0,-1000,0);
  this.dummy.scale.set(0,0,0);this.dummy.rotation.set(0,0,0);
  this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
 }
 burst(x,y,z,dir={x:0,y:0,z:1},count=16,force=1){
  const r=this.random,n=Math.min(count,MAX_DROPS);
  for(let i=0;i<n;i++){
   const slot=this.next++%MAX_DROPS,d=this.drops[slot];
   const a=r()*Math.PI*2,speed=(1.8+r()*6.4)*force;
   const lift=(1.5+r()*5.5)*Math.sqrt(force);
   const sx=(r()-.5)*.5,sz=(r()-.5)*.5;
   Object.assign(d,{
    active:true,age:0,life:.65+r()*1.1,
    x:x+sx,y:y+(r()-.5)*.5,z:z+sz,
    vx:Math.cos(a)*speed+dir.x*2.0,
    vy:lift+dir.y,
    vz:Math.sin(a)*speed+dir.z*2.0,
    size:(.08+r()*.13)*(force>.8?1.18:1)
   });
   this.mesh.setColorAt(slot,new THREE.Color(palette[Math.floor(r()*palette.length)]));
  }
  if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
 }
 tick(dt){
  let updated=false;
  const dummy=this.dummy;
  for(let i=0;i<MAX_DROPS;i++){
   const d=this.drops[i];if(!d.active)continue;
   updated=true;
   d.age+=dt;
   if(d.age>=d.life){d.active=false;this.hide(i);continue;}
   d.vy-=15*dt;
   d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;
   const floor=this.terrain(d.x,d.z)+FLOOR_OFFSET;
   if(d.y<floor){
    d.y=floor;
    d.vy=d.vy<-.25?-d.vy*.24:0;
    d.vx*=Math.exp(-dt*9);
    d.vz*=Math.exp(-dt*9);
   }
   const fade=Math.min(1,(d.life-d.age)/.38);
   const sz=d.size*fade;
   dummy.position.set(d.x,d.y,d.z);
   dummy.rotation.set(d.age*11,d.age*7,0);
   dummy.scale.set(sz,sz*(.85+Math.min(1,Math.abs(d.vy)*.06)),sz);
   dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
  }
  if(updated)this.mesh.instanceMatrix.needsUpdate=true;
 }
 get active(){return this.drops.reduce((n,d)=>n+(d.active?1:0),0);}
}