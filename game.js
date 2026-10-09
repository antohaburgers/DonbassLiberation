import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {generate,height,clamp} from './world-data.js';
import {WorldView} from './world-render.js';
import {createInput} from './input.js';
const $=id=>document.getElementById(id);
const seedParam=new URLSearchParams(location.search).get('seed');
const seed=seedParam&&/^\d+$/.test(seedParam)?Number(seedParam)>>>0:Math.floor(Math.random()*4294967295);
let world,scene,camera,renderer,controls,running=false;
const player={x:0,z:0,yaw:0,pitch:0,jumpY:0,vy:0};
let frameTime=performance.now(),elapsed=0,hudTime=0,fpsSmooth=60,toastTime=0,map;
function init(){
 map=generate(seed);
 renderer=new THREE.WebGLRenderer({canvas:$('screen'),antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
 renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.18;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9db6ad);
 scene.fog=new THREE.Fog(0x9db6ad,150,345);
 scene.add(new THREE.HemisphereLight(0xe6f2e9,0x4b5745,2.25));
 const sun=new THREE.DirectionalLight(0xffefc8,2.4);sun.position.set(-90,155,70);scene.add(sun);
 camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,440);
 camera.rotation.order='YXZ';
 const entry=map.roads[5].points[26];player.x=entry.x;player.z=entry.z;
 const first=map.pois[5];player.yaw=Math.atan2(-(first.x-player.x),-(first.z-player.z));
 world=new WorldView(scene,map);
 controls=createInput($('screen'));
 addEventListener('resize',resize);
 $('play').addEventListener('click',()=>{running=true;$('menu').classList.add('hidden');$('play').textContent='ПРОДОЛЖИТЬ';showToast('РАЗВЕДАЙ 6 ОБЪЕКТОВ');});
 $('menuBtn').addEventListener('click',()=>{running=false;$('menu').classList.remove('hidden');document.exitPointerLock?.();});
 $('newMap').addEventListener('click',()=>{location.search='?seed='+Math.floor(Math.random()*4294967295);});
 addEventListener('keydown',e=>{if(e.code==='Escape'&&running){running=false;$('menu').classList.remove('hidden');}});
 updateCamera();drawMap();requestAnimationFrame(loop);
}
function resize(){
 renderer.setSize(innerWidth,innerHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
function showToast(text){$('toast').textContent=text;$('toast').classList.add('show');toastTime=2.8;}
function updateCamera(){
 camera.position.set(player.x,height(player.x,player.z)+1.74+player.jumpY,player.z);
 camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
}
function movement(dt){
 const input=controls.frame(dt);
 player.yaw+=input.dyaw;player.pitch=clamp(player.pitch+input.dpitch,-1.44,1.44);
 let speed=input.sprint?9.5:5.3;
 const dx=(input.strafe*Math.cos(player.yaw)-input.forward*Math.sin(player.yaw))*speed*dt;
 const dz=(-input.strafe*Math.sin(player.yaw)-input.forward*Math.cos(player.yaw))*speed*dt;
 const nx=clamp(player.x+dx,-488,488),nz=clamp(player.z+dz,-488,488);
 if(!world.blocked(nx,player.z))player.x=nx;
 if(!world.blocked(player.x,nz))player.z=nz;
 if(input.jump&&player.jumpY<=.005){player.vy=6.7;}
 if(player.vy||player.jumpY){player.jumpY+=player.vy*dt;player.vy-=18*dt;if(player.jumpY<=0){player.jumpY=0;player.vy=0;}}
 for(const poi of map.pois){
  if(!poi.scouted&&Math.hypot(poi.x-player.x,poi.z-player.z)<18){
   poi.scouted=true;const n=map.pois.filter(p=>p.scouted).length;
   showToast('ОБЪЕКТ РАЗВЕДАН: '+poi.name+'  •  '+n+'/6');
   if(n===6)setTimeout(()=>showToast('РАЗВЕДКА ЗАВЕРШЕНА!'),1700);
  }
 }
}
function drawMap(){
 const cvs=$('minimap'),ctx=cvs.getContext('2d'),w=cvs.width;
 ctx.clearRect(0,0,w,w);ctx.fillStyle='#546849';ctx.fillRect(0,0,w,w);
 const pos=(x,z)=>[(x+500)*w/1000,(z+500)*w/1000];
 ctx.globalAlpha=.13;ctx.fillStyle='#c2c18c';
 for(let i=0;i<90;i++){const x=((i*103+seed%200)%1000)*w/1000,z=((i*217+seed%300)%1000)*w/1000;ctx.fillRect(x,z,11,6);}
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
 const [px,py]=pos(player.x,player.z);
 ctx.save();ctx.translate(px,py);ctx.rotate(-player.yaw);
 ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();
 ctx.fillStyle='#56b7ff';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore();
 ctx.strokeStyle='#e5e5d0';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,w-2);
}
function updateHud(){
 const count=map.pois.filter(p=>p.scouted).length;$('scouted').textContent=count+' / 6';
 const degrees=((player.yaw*180/Math.PI)%360+360)%360;
 const compass=['С','СЗ','З','ЮЗ','Ю','ЮВ','В','СВ'];
 $('compass').textContent=compass[Math.round(degrees/45)%8];
 const next=map.pois.filter(p=>!p.scouted).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 $('target').textContent=next?next.name+' • '+Math.round(Math.hypot(next.x-player.x,next.z-player.z))+' М':'ВСЕ ОБЪЕКТЫ РАЗВЕДАНЫ';
 $('fps').textContent='FPS '+Math.round(fpsSmooth);
 drawMap();
}
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,Math.max(.001,(now-frameTime)/1000));frameTime=now;elapsed+=dt;
 fpsSmooth=fpsSmooth*.92+(1/dt)*.08;
 if(running)movement(dt);
 world.update(player.x,player.z,dt,elapsed);
 updateCamera();
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
 hudTime+=dt;if(hudTime>.13){hudTime=0;updateHud();}
 renderer.render(scene,camera);
}
try{init()}catch(e){console.error(e);$('error').textContent='Ошибка запуска: '+(e?.stack||e);$('error').style.display='block';}