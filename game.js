import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {generate,height,clamp,randomizer} from './world-data.js?v=02';
import {WorldView} from './world-render.js?v=04';
import {createInput} from './input.js?v=05';
import {FirstPersonWeapon} from './weapon.js?v=05';
import {EnemySystem} from './enemies.js?v=06';
import {CombatAudio} from './combat-audio.js?v=05';
import {SupplySystem} from './supplies.js?v=08';
import {GrenadeSystem} from './grenades.js?v=08';

const $=id=>document.getElementById(id);
const seedParam=new URLSearchParams(location.search).get('seed');
const seed=seedParam&&/^\d+$/.test(seedParam)?Number(seedParam)>>>0:Math.floor(Math.random()*4294967295);
const rand=randomizer(seed^0x8d1fa3);
let world,scene,camera,renderer,controls,enemies,gun,audio,supplies,grenades,running=false;
const player={x:0,z:0,yaw:0,pitch:0,jumpY:0,vy:0,hp:100,dead:false,respawnTime:0};
const ammo={mag:30,reserve:210,maxMag:30,cooldown:0,reloadTime:0,reloadLength:1.6};
const inventory={grenades:2,maxGrenades:4};
let frameTime=performance.now(),elapsed=0,hudTime=0,fpsSmooth=60,toastTime=0,map,flashHit=0,flashDamage=0,gameWon=false;
const vForward=new THREE.Vector3(),vRight=new THREE.Vector3(),vUp=new THREE.Vector3(),fireRay=new THREE.Vector3();

function showToast(message){
 $('toast').textContent=message;$('toast').classList.add('show');toastTime=2.8;
}
function enemyShot(enemy,hit,dist){
 if(!running||player.dead)return;
 audio.enemy(dist);
 if(hit){
  player.hp=Math.max(0,player.hp-(enemy.damage||7));
  flashDamage=Math.min(.72,flashDamage+.25);
  audio.hurt();
  if(player.hp<=0){
   player.dead=true;player.respawnTime=2.6;
   controls.clearFire();
   showToast('БОЕЦ ВЫБЫЛ • ВОЗРОЖДЕНИЕ');
  }
 }
}
function onKill(enemy,headshot){
 flashHit=.17;
 if(headshot)showToast('ТОЧНО В ГОЛОВУ');
}
function init(){
 map=generate(seed);
 renderer=new THREE.WebGLRenderer({canvas:$('screen'),antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.18;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9db6ad);
 scene.fog=new THREE.Fog(0x9db6ad,150,345);
 scene.add(new THREE.HemisphereLight(0xe6f2e9,0x4b5745,2.25));
 const sun=new THREE.DirectionalLight(0xffefc8,2.4);sun.position.set(-90,155,70);scene.add(sun);
 camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,440);
 camera.rotation.order='YXZ';scene.add(camera);
 const entry=map.roads[5].points[26];player.x=entry.x;player.z=entry.z;
 const first=map.pois[5];player.yaw=Math.atan2(-(first.x-player.x),-(first.z-player.z));
 world=new WorldView(scene,map);controls=createInput($('screen'));
 gun=new FirstPersonWeapon(camera);
 audio=new CombatAudio();
 enemies=new EnemySystem(scene,map,world,enemyShot,onKill);
 supplies=new SupplySystem(scene,map);
 grenades=new GrenadeSystem(scene,enemies,(count)=>{
  audio.explosion();
  if(count)showToast('АНТИФРИЗНЫЙ ФЕЙЕРВЕРК • ПОПАДАНИЙ: '+count);
 });
 addEventListener('resize',resize);
 $('play').addEventListener('click',()=>{
  audio.unlock();running=true;$('menu').classList.add('hidden');
  $('play').textContent='ПРОДОЛЖИТЬ';
  showToast(gameWon?'ВСЕ ТОЧКИ ЗАХВАЧЕНЫ':'ЗАЧИСТИ ОБЪЕКТЫ И ЗАХВАТИ ТОЧКИ');
 });
 $('menuBtn').addEventListener('click',openMenu);
 $('soundBtn').addEventListener('click',()=>{
  audio.unlock();const muted=audio.toggle();$('soundBtn').textContent=muted?'🔇':'🔊';
 });
 $('newMap').addEventListener('click',()=>{location.search='?seed='+Math.floor(Math.random()*4294967295);});
 addEventListener('keydown',e=>{if(e.code==='Escape'&&running)openMenu();});
 updateCamera();drawMap();requestAnimationFrame(loop);
}
function openMenu(){
 running=false;controls.clearFire();document.exitPointerLock?.();
 $('menu').classList.remove('hidden');
}
function resize(){
 renderer.setSize(innerWidth,innerHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
function updateCamera(){
 camera.position.set(player.x,height(player.x,player.z)+1.74+player.jumpY,player.z);
 camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
}
function movement(dt,input){
 player.yaw+=input.dyaw;player.pitch=clamp(player.pitch+input.dpitch,-1.44,1.44);
 const speed=input.sprint?9.5:5.3;
 const dx=(input.strafe*Math.cos(player.yaw)-input.forward*Math.sin(player.yaw))*speed*dt;
 const dz=(-input.strafe*Math.sin(player.yaw)-input.forward*Math.cos(player.yaw))*speed*dt;
 const nx=clamp(player.x+dx,-488,488),nz=clamp(player.z+dz,-488,488);
 if(!world.blocked(nx,player.z))player.x=nx;
 if(!world.blocked(player.x,nz))player.z=nz;
 if(input.jump&&player.jumpY<=.005)player.vy=6.7;
 if(player.vy||player.jumpY){
  player.jumpY+=player.vy*dt;player.vy-=18*dt;
  if(player.jumpY<=0){player.jumpY=0;player.vy=0;}
 }
}
function startReload(){
 if(ammo.reloadTime>0||ammo.mag===ammo.maxMag||ammo.reserve<=0||player.dead)return;
 ammo.reloadTime=ammo.reloadLength;gun.reload(ammo.reloadLength);audio.reload();
 $('reloadStatus').textContent='ПЕРЕЗАРЯДКА...';
}
function finishReload(){
 const add=Math.min(ammo.maxMag-ammo.mag,ammo.reserve);
 ammo.mag+=add;ammo.reserve-=add;$('reloadStatus').textContent='АВТОМАТИЧЕСКИЙ ОГОНЬ';
}
function shoot(){
 if(ammo.cooldown>0||ammo.reloadTime>0||player.dead)return;
 if(ammo.mag<=0){startReload();return;}
 ammo.mag--;ammo.cooldown=.107;
 gun.shot();audio.shoot();
 camera.updateMatrixWorld(true);
 camera.getWorldDirection(vForward);vRight.set(1,0,0).applyQuaternion(camera.quaternion);
 vUp.set(0,1,0).applyQuaternion(camera.quaternion);
 const spread=.0065;
 fireRay.copy(vForward).addScaledVector(vRight,(rand()-.5)*spread)
  .addScaledVector(vUp,(rand()-.5)*spread).normalize();
 const result=enemies.raycast(camera.position,fireRay,172);
 if(result){
  const damage=result.headshot?110:36;
  enemies.hit(result.enemy,damage,fireRay,result.headshot);
  flashHit=.12;audio.hit();
 }
 if(ammo.mag<=0&&ammo.reserve>0)startReload();
}

function pickupSupply(type){
 if(type==='ammo'){
  if(ammo.reserve>=630)return false;
  ammo.reserve=Math.min(630,ammo.reserve+90);
  showToast('ЯЩИК СНАРЯЖЕНИЯ • +90 ПАТРОНОВ');audio.hit();return true;
 }
 if(type==='medkit'){
  if(player.hp>=100)return false;
  player.hp=Math.min(100,player.hp+45);
  showToast('РЕМКОМПЛЕКТ • +45 ЗДОРОВЬЯ');audio.hit();return true;
 }
 if(type==='grenade'){
  if(inventory.grenades>=inventory.maxGrenades)return false;
  inventory.grenades=Math.min(inventory.maxGrenades,inventory.grenades+2);
  showToast('ГРАНАТЫ • ПОПОЛНЕНИЕ ЗАПАСА');audio.reload();return true;
 }
 return false;
}
function throwGrenade(){
 if(player.dead||inventory.grenades<1)return;
 inventory.grenades--;
 camera.updateMatrixWorld(true);
 camera.getWorldDirection(vForward);
 grenades.throw(camera.position.clone().addScaledVector(vForward,.55),vForward);
 audio.reload();
}
function updateCombat(dt,input){
 ammo.cooldown=Math.max(0,ammo.cooldown-dt);
 if(ammo.reloadTime>0){
  ammo.reloadTime-=dt;
  if(ammo.reloadTime<=0){ammo.reloadTime=0;finishReload();}
 }
 if(input.reload)startReload();
 if(input.fire)shoot();
 if(input.grenade)throwGrenade();
 const moving=Math.abs(input.forward)+Math.abs(input.strafe)>.02;
 gun.update(dt,moving,input.sprint,input.dyaw);
}
function capture(){
 for(const poi of map.pois){
  if(poi.scouted)continue;
  const distance=Math.hypot(poi.x-player.x,poi.z-player.z);
  if(distance<52&&enemies.atPoiRemaining(poi.id)===0){
   poi.scouted=true;player.hp=Math.min(100,player.hp+20);
   ammo.reserve+=90;
   const count=map.pois.filter(p=>p.scouted).length;
   showToast('ТОЧКА ЗАХВАЧЕНА: '+poi.name+' • '+count+'/6  +90 ПАТРОНОВ');
  }
 }
 if(!gameWon&&map.pois.every(p=>p.scouted)){
  gameWon=true;showToast('ОПЕРАЦИЯ ЗАВЕРШЕНА! ВСЕ 6 ТОЧЕК ЗАХВАЧЕНЫ');
 }
}
function respawn(){
 player.dead=false;player.hp=100;player.jumpY=0;player.vy=0;
 ammo.mag=30;ammo.reserve=Math.max(90,ammo.reserve);ammo.reloadTime=0;inventory.grenades=Math.max(1,inventory.grenades);
 const entry=map.roads[5].points[26];
 player.x=entry.x;player.z=entry.z;flashDamage=0;showToast('БОЕЦ ВЕРНУЛСЯ В СТРОЙ');
}
function drawMap(){
 const cvs=$('minimap'),ctx=cvs.getContext('2d'),w=cvs.width;
 ctx.clearRect(0,0,w,w);ctx.fillStyle='#546849';ctx.fillRect(0,0,w,w);
 const pos=(x,z)=>[(x+500)*w/1000,(z+500)*w/1000];
 ctx.globalAlpha=.13;ctx.fillStyle='#c2c18c';
 for(let i=0;i<90;i++){
  const x=((i*103+seed%200)%1000)*w/1000,z=((i*217+seed%300)%1000)*w/1000;
  ctx.fillRect(x,z,11,6);
 }
 ctx.globalAlpha=1;
 for(const road of map.roads){
  ctx.strokeStyle=road.secondary?'#c5ab7d':'#d9d4ae';ctx.lineWidth=road.secondary?1.5:2.7;
  ctx.beginPath();road.points.forEach((p,i)=>{const a=pos(p.x,p.z);if(!i)ctx.moveTo(...a);else ctx.lineTo(...a);});ctx.stroke();
 }
 for(const poi of map.pois){
  const [x,y]=pos(poi.x,poi.z);
  ctx.fillStyle=poi.scouted?'#83d399':'#e58c68';ctx.strokeStyle='#fff5d6';ctx.lineWidth=1;
  ctx.fillRect(x-4,y-4,8,8);ctx.strokeRect(x-4,y-4,8,8);
  ctx.font='bold 11px Arial';ctx.fillStyle='#ffffff';ctx.fillText(String.fromCharCode(65+poi.id),x+6,y-4);
 }
 // Near enemies are shown as small red threats, further ones stay hidden.
 for(const enemy of enemies.visiblePositions()){
  if(Math.hypot(enemy.x-player.x,enemy.z-player.z)>120)continue;
  const [x,y]=pos(enemy.x,enemy.z);ctx.fillStyle='#f05d4b';
  ctx.beginPath();ctx.arc(x,y,2.4,0,6.28);ctx.fill();
 }
 const [px,py]=pos(player.x,player.z);
 ctx.save();ctx.translate(px,py);ctx.rotate(-player.yaw);
 ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();
 ctx.fillStyle='#56b7ff';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore();
 ctx.strokeStyle='#e5e5d0';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,w-2);
}
function updateHud(){
 $('scouted').textContent=map.pois.filter(p=>p.scouted).length+' / 6';
 const degrees=((player.yaw*180/Math.PI)%360+360)%360;
 const compass=['С','СЗ','З','ЮЗ','Ю','ЮВ','В','СВ'];
 $('compass').textContent=compass[Math.round(degrees/45)%8];
 const next=map.pois.filter(p=>!p.scouted).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 $('target').textContent=next?next.name+' · '+Math.round(Math.hypot(next.x-player.x,next.z-player.z))+' М':'ВСЕ ОБЪЕКТЫ ЗАХВАЧЕНЫ';
 $('fps').textContent='FPS '+Math.round(fpsSmooth);
 $('health').textContent=player.hp;$('healthFill').style.width=player.hp+'%';
 $('ammo').innerHTML=ammo.mag+' <i>/ '+ammo.reserve+'</i>';
 $('kills').textContent='УСТРАНЕНО: '+enemies.kills+' / '+enemies.bots.length;
 $('grenades').textContent=inventory.grenades;
 const mode=next?.type==='base'?'БАЗА • ТЯЖЁЛЫЕ РОБОТЫ':
   next?.type==='camp'?'ЛЕС • БЫСТРЫЕ РОБОТЫ':
   next?.type==='checkpoint'?'БЛОКПОСТ • ПУЛЕМЁТЧИКИ':
   next?.type==='depot'?'СКЛАД • КОНТЕЙНЕРЫ':'ДЕРЕВНЯ • БОЙ У ДОМОВ';
 $('battleInfo').textContent=next?mode+' • '+enemies.atPoiRemaining(next.id)+' ЗАЩИТНИКОВ':'ВСЕ ТОЧКИ ЗАХВАЧЕНЫ';
 drawMap();
}
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,Math.max(.001,(now-frameTime)/1000));frameTime=now;elapsed+=dt;
 fpsSmooth=fpsSmooth*.92+(1/dt)*.08;
 if(running){
  if(player.dead){
   grenades.update(dt,player);
   player.respawnTime-=dt;if(player.respawnTime<=0)respawn();
  }else{
   const input=controls.frame(dt);
   movement(dt,input);updateCamera();updateCombat(dt,input);
   grenades.update(dt,player);
   enemies.update(dt,player);
   supplies.update(dt,player,pickupSupply,elapsed);
   capture();
  }
 }else{
  gun.update(dt,false,false);
 }
 world.update(player.x,player.z,dt,elapsed);
 updateCamera();
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
 flashHit=Math.max(0,flashHit-dt);$('hitmarker').classList.toggle('visible',flashHit>0);
 flashDamage=Math.max(0,flashDamage-dt*.85);$('damageFlash').style.opacity=flashDamage.toFixed(2);
 hudTime+=dt;if(hudTime>.13){hudTime=0;updateHud();}
 renderer.render(scene,camera);
}
try{init()}catch(e){console.error(e);$('error').textContent='Ошибка запуска: '+(e?.stack||e);$('error').style.display='block';}