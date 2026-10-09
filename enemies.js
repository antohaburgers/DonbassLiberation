import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {height,randomizer} from './world-data.js?v=02';
import {AntifreezeFX} from './antifreeze.js?v=06';

// Simple, deliberately inaccurate bots and playful Niva-style flying body parts.
// No real-world unit insignia: olive field uniform with bright blue arm bands.
const material=(hex)=>new THREE.MeshLambertMaterial({color:hex,flatShading:true});
const mats={
 suit:[material(0x656e59),material(0x6b725c),material(0x777766)],
 helmet:material(0x3e493d),boots:material(0x3a352e),gloves:material(0x47493e),
 skin:material(0xc4a384),webbing:material(0x98947b),gun:material(0x272d2c),
 blue:material(0x157de9),blueLight:material(0x3da5ff),
 dust:material(0xaca18a),visor:material(0x293e3e)
};
const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),
 helmetGeo=new THREE.SphereGeometry(1,10,6),cylinder=new THREE.CylinderGeometry(1,1,1,8);
const temp=new THREE.Vector3();
function piece(parent,geo,mt,scale,pos){
 const m=new THREE.Mesh(geo,mt);m.scale.set(...scale);m.position.set(...pos);parent.add(m);return m;
}
// Arms are posed from shoulder -> elbow -> real grip points instead of
// dangling down from their shoulders. The rifle and muzzle sit at CHEST level.
const AXIS_Y=new THREE.Vector3(0,1,0);
function segment(group,a,b,width,depth,material){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const midpoint=start.clone().add(end).multiplyScalar(.5);
 const dir=end.clone().sub(start);
 const length=dir.length();
 const mesh=piece(group,cube,material,[width,length,depth],[midpoint.x,midpoint.y,midpoint.z]);
 mesh.quaternion.setFromUnitVectors(AXIS_Y,dir.normalize());
 return mesh;
}
function interpolate(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
function soldier(){
 const root=new THREE.Group();
 const torso=piece(root,cube,mats.suit[0],[.59,.79,.35],[0,1.14,0]);
 piece(root,cube,mats.webbing,[.65,.16,.39],[0,1.29,.02]);
 piece(root,cube,mats.webbing,[.35,.43,.16],[0,1.03,-.26]); // backpack
 piece(root,cube,mats.suit[1],[.52,.26,.35],[0,.71,0]);
 const head=piece(root,sphere,mats.skin,[.23,.26,.23],[0,1.75,.015]);
 piece(root,helmetGeo,mats.helmet,[.29,.18,.30],[0,1.92,0]);
 piece(root,cube,mats.visor,[.33,.055,.065],[0,1.87,.25]);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.17,.64,0);root.add(leg);
  piece(leg,cube,mats.suit[0],[.23,.63,.27],[0,-.31,0]);
  piece(leg,cube,mats.boots,[.25,.19,.37],[0,-.66,.07]);
  legs.push(leg);
 }
 const gun=new THREE.Group();gun.position.set(.04,1.38,.34);root.add(gun);
 // Stock, receiver, wooden foregrip and barrel all run forward (+Z).
 piece(gun,cube,mats.gun,[.19,.20,.45],[0,0,.01]);
 piece(gun,cube,mats.helmet,[.21,.075,.29],[0,.12,.04]);
 piece(gun,cube,mats.webbing,[.18,.13,.40],[0,-.02,.38]); // handguard
 piece(gun,cube,mats.gun,[.11,.19,.40],[0,-.03,-.35]); // stock
 piece(gun,cube,mats.gun,[.13,.24,.14],[0,-.23,.00]); // magazine
 piece(gun,cube,mats.gloves,[.08,.14,.12],[0,-.17,-.12]); // trigger
 piece(gun,cylinder,mats.gun,[.042,.66,.042],[0,.025,.72]).rotation.x=Math.PI/2;
 piece(gun,cylinder,mats.helmet,[.065,.11,.065],[0,.025,1.075]).rotation.x=Math.PI/2;
 piece(gun,cube,mats.gun,[.07,.09,.07],[0,.16,.26]); // rear sight
 piece(gun,cube,mats.gun,[.07,.11,.07],[0,.16,.87]); // front sight
 // Left hand clamps the front foregrip, right hand is on the trigger.
 const handTargets=[
  {side:-1,shoulder:[-.39,1.48,.015],elbow:[-.46,1.21,.37],hand:[-.11,1.34,.71]},
  {side:1,shoulder:[.39,1.48,.015],elbow:[.44,1.23,.25],hand:[.13,1.29,.33]}
 ];
 for(const side of handTargets){
  const arm=new THREE.Group();root.add(arm);
  segment(arm,side.shoulder,side.elbow,.24,.26,mats.suit[1]);
  segment(arm,side.elbow,side.hand,.20,.22,mats.suit[0]);
  const wrist=piece(arm,cube,mats.gloves,[.21,.18,.21],side.hand);
  // Blue bands wrap the upper sleeve, with a narrow bright edge.
  const bandStart=interpolate(side.shoulder,side.elbow,.18);
  const bandEnd=interpolate(side.shoulder,side.elbow,.46);
  segment(arm,bandStart,bandEnd,.278,.296,mats.blue);
  segment(arm,bandEnd,interpolate(side.shoulder,side.elbow,.52),.280,.302,mats.blueLight);
  arms.push(arm);
 }
 const muzzle=piece(gun,sphere,new THREE.MeshBasicMaterial({color:0xffcf73}),[.15,.15,.20],[0,.025,1.18]);
 muzzle.visible=false;
 root.userData={legs,arms,muzzle,head,torso,gun};
 return root;
}
const between=(n,a,b)=>Math.max(a,Math.min(b,n));
function segmentHitsBuilding(ax,az,bx,bz,building,margin=.5){
 const dx=bx-ax,dz=bz-az;
 let lo=0,hi=1;
 for(const [origin,velocity,min,max] of [
  [ax,dx,building.x-building.w/2-margin,building.x+building.w/2+margin],
  [az,dz,building.z-building.d/2-margin,building.z+building.d/2+margin]]){
  if(Math.abs(velocity)<1e-6){if(origin<min||origin>max)return false;}
  else{let t1=(min-origin)/velocity,t2=(max-origin)/velocity;
   if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}
 }
 return hi>.025&&lo<.975;
}
function isClear(map,ax,az,bx,bz){
 for(const b of map.buildings)
  if(segmentHitsBuilding(ax,az,bx,bz,b))return false;
 return true;
}
function configureSpawns(map){
 const rng=randomizer(map.seed^0x6b7ac031);
 const counts=[12,12,15,13,11,13];
 const bots=[];
 for(const [id,p] of map.pois.entries()){
  for(let n=0;n<counts[id];n++){
   let px=p.x,pz=p.z;
   for(let a=0;a<38;a++){
    const angle=rng()*Math.PI*2,d=14+rng()*42;
    const x=p.x+Math.cos(angle)*d,z=p.z+Math.sin(angle)*d;
    if(Math.abs(x)>480||Math.abs(z)>480)continue;
    if(map.buildings.some(b=>Math.abs(x-b.x)<b.w/2+3&&Math.abs(z-b.z)<b.d/2+3))continue;
    if(bots.some(b=>Math.hypot(b.x-x,b.z-z)<3))continue;
    px=x;pz=z;break;
   }
   bots.push({
    id:bots.length,poi:id,x:px,z:pz,homeX:px,homeZ:pz,
    alive:true,health:100,age:rng()*30,yaw:rng()*6.283,
    cooldown:1+rng()*3,phase:rng()*6.28,moveX:0,moveZ:0,
    aiTime:rng(),shotFlash:0,speed:1.0+rng()*.6
   });
  }
 }
 return bots;
}
const fragKinds=[
 {size:[.54,.57,.30],y:1.14,mt:'suit'},
 {size:[.25,.27,.25],y:1.73,mt:'skin'},
 {size:[.22,.58,.22],y:.37,mt:'suit'},
 {size:[.22,.58,.22],y:.37,mt:'suit'},
 {size:[.22,.55,.22],y:1.30,mt:'suit'},
 {size:[.22,.55,.22],y:1.30,mt:'suit'},
 {size:[.35,.16,.33],y:1.92,mt:'helmet'}
];
export class EnemySystem {
 constructor(scene,map,world,onShot,onKill){
  this.scene=scene;this.map=map;this.world=world;this.onShot=onShot;this.onKill=onKill;
  this.rng=randomizer(map.seed^0xa356c9f5);
  this.bots=configureSpawns(map);
  this.maxActive=matchMedia('(pointer:coarse)').matches?17:24;
  this.slots=Array.from({length:this.maxActive},()=>{const root=soldier();root.visible=false;scene.add(root);return{root,id:-1};});
  this.active=[];this.frags=[];this.coolant=new AntifreezeFX(scene,height,this.rng);this.time=0;this.rebuildTime=0;this.kills=0;this.lastHit=null;
  this.refresh({x:map.center.x,z:map.center.z});
 }
 refresh(player){
  const visible=this.bots.filter(b=>b.alive&&Math.hypot(b.x-player.x,b.z-player.z)<155)
   .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))
   .slice(0,this.maxActive);
  const reserved=new Set(visible.map(b=>b.id));
  for(const slot of this.slots)if(!reserved.has(slot.id)){slot.id=-1;slot.root.visible=false;}
  for(const b of visible){
   if(this.slots.some(s=>s.id===b.id))continue;
   const slot=this.slots.find(s=>s.id===-1);
   if(slot){slot.id=b.id;slot.root.visible=true;}
  }
  this.active=visible;
 }
 obstructed(ax,az,bx,bz){return !isClear(this.map,ax,az,bx,bz);}
 update(dt,player){
  this.time+=dt;this.rebuildTime-=dt;
  if(this.rebuildTime<=0){this.refresh(player);this.rebuildTime=.33;}
  for(const b of this.active){
   if(!b.alive)continue;
   const dx=player.x-b.x,dz=player.z-b.z,dist=Math.hypot(dx,dz);
   b.age+=dt;b.shotFlash=Math.max(0,b.shotFlash-dt);
   b.aiTime-=dt;
   if(b.aiTime<=0){
    b.aiTime=.55+this.rng()*1.1;
    if(dist<56){b.moveX=dx/(dist||1);b.moveZ=dz/(dist||1);}
    else{const a=this.rng()*6.283;b.moveX=Math.cos(a);b.moveZ=Math.sin(a);}
   }
   if(dist<85){
    const desired=Math.atan2(dx,dz);
    let turn=desired-b.yaw;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
    b.yaw+=between(turn,-dt*2.2,dt*2.2);
   }
   // Run slowly at player only when far enough, then stop to fire.
   const speed=dist>13&&dist<60?b.speed:dist>=60?.48:0;
   if(speed>0){
    const nx=b.x+b.moveX*speed*dt,nz=b.z+b.moveZ*speed*dt;
    if(Math.hypot(nx-b.homeX,nz-b.homeZ)<75&&Math.abs(nx)<484&&Math.abs(nz)<484){
     if(!this.world.blocked(nx,b.z))b.x=nx;
     if(!this.world.blocked(b.x,nz))b.z=nz;
    }
   }
   b.cooldown-=dt;
   if(dist<62&&dist>3&&b.cooldown<=0&&isClear(this.map,b.x,b.z,player.x,player.z)){
    b.cooldown=1.2+this.rng()*2.3;
    b.shotFlash=.09;
    // Deliberately bad aim, with more missed shots as distance increases.
    const chance=Math.max(.035,.22-dist*.0024);
    const hit=this.rng()<chance;
    this.onShot(b,hit,dist);
   }
   const slot=this.slots.find(s=>s.id===b.id);
   if(!slot)continue;
   const root=slot.root;
   root.visible=dist<150;root.position.set(b.x,height(b.x,b.z),b.z);
   root.rotation.y=b.yaw;
   const animation=root.userData,moving=speed>.1;
   for(let i=0;i<2;i++){
    const swing=moving?Math.sin(b.age*7+i*Math.PI)*.36:0;
    animation.legs[i].rotation.x=swing;
    animation.arms[i].rotation.x=swing*.045;
   }
   animation.muzzle.visible=b.shotFlash>0;
  }
  this.coolant.tick(dt);
  for(let i=this.frags.length-1;i>=0;i--){
   const f=this.frags[i];f.age+=dt;f.vel.y-=14*dt;
   f.mesh.position.addScaledVector(f.vel,dt);
   f.mesh.rotation.x+=f.spin.x*dt;f.mesh.rotation.z+=f.spin.z*dt;
   const ground=height(f.mesh.position.x,f.mesh.position.z)+.10;
   if(f.mesh.position.y<ground){
    f.mesh.position.y=ground;f.vel.y=Math.abs(f.vel.y)*.20;
    f.vel.x*=.72;f.vel.z*=.72;
   }
   f.mesh.material.transparent=true;f.mesh.material.opacity=Math.min(1,(2.8-f.age)*2);
   if(f.age>=2.8){
    this.scene.remove(f.mesh);f.mesh.material.dispose();
    this.frags.splice(i,1);
   }
  }
 }
 hit(enemy,damage,shotDir,headshot=false){
  if(!enemy?.alive)return false;
  enemy.health-=damage;
  this.coolant.burst(enemy.x,height(enemy.x,enemy.z)+(headshot?1.73:1.15),enemy.z,shotDir,enemy.health<=0?68:13,enemy.health<=0?1.35:.55);
  this.lastHit={x:enemy.x,z:enemy.z,time:this.time};
  if(enemy.health>0)return true;
  enemy.alive=false;this.kills++;
  const slot=this.slots.find(s=>s.id===enemy.id);
  if(slot){slot.root.visible=false;slot.id=-1;}
  const rng=this.rng;
  // Physics-lite comic fragments, inspired by Niva cows/kolkhozniks.
  for(let i=0;i<fragKinds.length;i++){
   const f=fragKinds[i],base=f.mt==='suit'?mats.suit[0]:mats[f.mt],mesh=new THREE.Mesh(i===1||i===6?sphere:cube,base.clone());
   mesh.scale.set(...f.size);
   mesh.position.set(enemy.x+(rng()-.5)*.25,height(enemy.x,enemy.z)+f.y,enemy.z+(rng()-.5)*.25);
   this.scene.add(mesh);
   this.frags.push({
    mesh,age:0,spin:new THREE.Vector3((rng()-.5)*13,0,(rng()-.5)*13),
    vel:new THREE.Vector3(shotDir.x*3+(rng()-.5)*8,3+rng()*6,shotDir.z*3+(rng()-.5)*8)
   });
  }
  if(this.frags.length>100){
   const first=this.frags.splice(0,7);
   for(const f of first){this.scene.remove(f.mesh);f.mesh.material.dispose();}
  }
  this.onKill(enemy,headshot);
  this.rebuildTime=0;
  return true;
 }
 // Ray/sphere hitscan for head and torso. Building cover blocks the ray.
 raycast(origin,dir,maxDistance=170){
  const rayD=dir.clone().normalize();
  let best=null;
  for(const b of this.active){
   if(!b.alive)continue;
   const baseY=height(b.x,b.z);
   const zones=[{y:baseY+1.72,r:.25,head:true},{y:baseY+1.15,r:.44,head:false},{y:baseY+.55,r:.34,head:false}];
   for(const zone of zones){
    const cx=b.x-origin.x,cy=zone.y-origin.y,cz=b.z-origin.z;
    const t=cx*rayD.x+cy*rayD.y+cz*rayD.z;
    if(t<.2||t>maxDistance||best&&t>best.distance+1)continue;
    const r2=cx*cx+cy*cy+cz*cz-t*t,rr=zone.r*zone.r;
    if(r2>rr)continue;
    const distance=t-Math.sqrt(Math.max(0,rr-r2));
    if(!best||distance<best.distance)best={enemy:b,distance,headshot:zone.head};
   }
  }
  if(!best)return null;
  // Occlusion by house/barn silhouettes, using 3-D ray-box slab test.
  for(const b of this.map.buildings){
   const yy=height(b.x,b.z);
   const boundaries=[[b.x-b.w/2,b.x+b.w/2,origin.x,rayD.x],
    [yy-.2,yy+b.h+2.0,origin.y,rayD.y],
    [b.z-b.d/2,b.z+b.d/2,origin.z,rayD.z]];
   let near=0,far=best.distance,hit=true;
   for(const [lo,hi,coordinate,direction] of boundaries){
    if(Math.abs(direction)<1e-7){if(coordinate<lo||coordinate>hi){hit=false;break;}}
    else{
     const aa=(lo-coordinate)/direction,bb=(hi-coordinate)/direction;
     near=Math.max(near,Math.min(aa,bb));far=Math.min(far,Math.max(aa,bb));
     if(near>far){hit=false;break;}
    }
   }
   if(hit&&far>.03&&near<best.distance-.1)return null;
  }
  return best;
 }
 atPoiRemaining(index){return this.bots.filter(b=>b.alive&&b.poi===index).length;}
 alive(){return this.bots.reduce((n,b)=>n+(b.alive?1:0),0);}
 visiblePositions(){return this.active.filter(b=>b.alive);}
}
