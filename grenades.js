import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {height} from './world-data.js?v=08';

const shell=new THREE.MeshLambertMaterial({color:0x48574b,metalness:0.2});
const cap=new THREE.MeshLambertMaterial({color:0x303b37});
const flashMaterial=new THREE.MeshBasicMaterial({color:0xffd27d,transparent:true,opacity:.85,depthWrite:false});
const sphere=new THREE.IcosahedronGeometry(1,1);
const casing=new THREE.CylinderGeometry(.14,.14,.36,9);
function grenadeModel(){
 const root=new THREE.Group();
 const body=new THREE.Mesh(casing,shell);root.add(body);
 const lid=new THREE.Mesh(new THREE.BoxGeometry(.22,.07,.22),cap);
 lid.position.y=.2;root.add(lid);return root;
}
export class GrenadeSystem{
 constructor(scene,enemies,onExplosion){
  this.scene=scene;this.enemies=enemies;this.onExplosion=onExplosion;
  this.active=[];this.blasts=[];
 }
 throw(origin,heading){
  const mesh=grenadeModel();this.scene.add(mesh);
  mesh.position.copy(origin);
  const dir=heading.clone().normalize();
  // Arcade throw in sight direction with a little lift.
  const v=dir.multiplyScalar(20);v.y+=5.5;
  this.active.push({mesh,v,remaining:1.85,age:0,bounces:0});
  return true;
 }
 explode(item,player){
  const at=item.mesh.position.clone();
  this.scene.remove(item.mesh);
  item.mesh.children.forEach(x=>x.geometry.dispose());
  const blast=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),flashMaterial.clone());
  blast.position.copy(at);this.scene.add(blast);this.blasts.push({mesh:blast,age:0});
  let knocked=0;
  // It is an arcade robot coolant grenade: small splash radius, no graphic gore.
  for(const bot of this.enemies.bots){
   if(!bot.alive)continue;
   const dist=Math.hypot(bot.x-at.x,bot.z-at.z);
   if(dist>8.5||Math.abs(height(bot.x,bot.z)+1-at.y)>7)continue;
   const power=Math.max(0,1-dist/9.5);
   const direction=new THREE.Vector3(bot.x-at.x,.3,bot.z-at.z).normalize();
   this.enemies.hit(bot,Math.round(205*power+25),direction,false);
   knocked++;
  }
  const distToPlayer=Math.hypot(player.x-at.x,player.z-at.z);
  if(distToPlayer<3.3)player.hp=Math.max(1,player.hp-15);
  this.onExplosion?.(knocked,at);
 }
 update(dt,player){
  for(let i=this.active.length-1;i>=0;i--){
   const gr=this.active[i];
   gr.age+=dt;gr.remaining-=dt;
   gr.v.y-=17*dt;
   gr.mesh.position.addScaledVector(gr.v,dt);
   gr.mesh.rotation.x+=dt*7;gr.mesh.rotation.z+=dt*5;
   const ground=height(gr.mesh.position.x,gr.mesh.position.z)+.18;
   if(gr.mesh.position.y<ground){
    gr.mesh.position.y=ground;
    gr.v.y=Math.abs(gr.v.y)*.33;
    gr.v.x*=.68;gr.v.z*=.68;gr.bounces++;
   }
   if(gr.remaining<=0){
    this.explode(gr,player);
    this.active.splice(i,1);
   }
  }
  for(let i=this.blasts.length-1;i>=0;i--){
   const fx=this.blasts[i];fx.age+=dt;const t=fx.age/.35;
   fx.mesh.scale.setScalar(Math.max(.01,t*5));
   fx.mesh.material.opacity=.85*(1-t);
   if(t>=1){this.scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();this.blasts.splice(i,1);}
  }
 }
}