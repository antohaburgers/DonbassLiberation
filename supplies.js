import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import {height,randomizer} from './world-data.js?v=02';

const BROWN=new THREE.MeshLambertMaterial({color:0x88724d});
const EDGE=new THREE.MeshLambertMaterial({color:0x544936});
const METAL=new THREE.MeshLambertMaterial({color:0x5b6657});
const GREEN=new THREE.MeshLambertMaterial({color:0x63bb83});
const RED=new THREE.MeshLambertMaterial({color:0xdd6650});
const YELLOW=new THREE.MeshLambertMaterial({color:0xf2c268});
const WHITE=new THREE.MeshLambertMaterial({color:0xf7e8c4});
const box=new THREE.BoxGeometry(1,1,1);
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b));
function part(g,s,p,mat){
 const m=new THREE.Mesh(box,mat);m.scale.set(...s);m.position.set(...p);g.add(m);return m;
}
function crate(type){
 const group=new THREE.Group();
 const c=type==='medkit'?RED:type==='grenade'?GREEN:BROWN;
 part(group,[1.22,.85,.95],[0,.45,0],c);
 for(const x of [-.46,.46])part(group,[.09,.90,1.03],[x,.46,0],EDGE);
 for(const z of [-.43,.43])part(group,[1.30,.10,.11],[0,.73,z],EDGE);
 part(group,[.56,.5,.035],[0,.46,.49],type==='medkit'?WHITE:YELLOW);
 if(type==='medkit'){
  part(group,[.38,.105,.04],[0,.45,.52],RED);
  part(group,[.1,.36,.045],[0,.45,.52],RED);
 }else if(type==='grenade'){
  part(group,[.38,.11,.04],[0,.45,.52],METAL);
  part(group,[.13,.30,.04],[0,.45,.52],METAL);
 }else{
  for(let i=0;i<3;i++)part(group,[.07,.28,.05],[-.17+i*.17,.45,.52],EDGE);
 }
 const halo=new THREE.Mesh(new THREE.RingGeometry(.75,1.0,22),
  new THREE.MeshBasicMaterial({color:type==='medkit'?0xf58d7d:type==='grenade'?0x92e7aa:0xffd77c,
    transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));
 halo.rotation.x=-Math.PI/2;halo.position.y=.05;group.add(halo);
 group.userData={halo};
 return group;
}
export class SupplySystem{
 constructor(scene,map){
  this.scene=scene;this.map=map;
  const rng=randomizer(map.seed^0x39f0b1);
  this.crates=[];
  const create=(x,z,type,poi=-1)=>{
   const mesh=crate(type);mesh.position.set(x,height(x,z)+.13,z);
   scene.add(mesh);
   this.crates.push({x,z,type,poi,mesh,picked:false,phase:rng()*6.28});
  };
  // Ammo, repair and explosives at distinct spots at every capture location.
  for(const poi of map.pois){
   const types=poi.type==='depot'?['ammo','ammo','grenade','medkit']:
    poi.type==='base'?['ammo','medkit','grenade','ammo']:
    poi.type==='camp'?['medkit','grenade','ammo']:
    poi.type==='checkpoint'?['ammo','grenade','medkit']:
    ['medkit','ammo','grenade'];
   for(let i=0;i<types.length;i++){
    let x=poi.x,z=poi.z;
    for(let t=0;t<40;t++){
     const angle=rng()*Math.PI*2,radius=12+rng()*28;
     const px=poi.x+Math.cos(angle)*radius,pz=poi.z+Math.sin(angle)*radius;
     const bad=map.buildings.some(b=>Math.abs(px-b.x)<b.w/2+3&&Math.abs(pz-b.z)<b.d/2+3);
     const duplicate=this.crates.some(c=>Math.hypot(c.x-px,c.z-pz)<7);
     if(!bad&&!duplicate&&Math.abs(px)<487&&Math.abs(pz)<487){x=px;z=pz;break;}
    }
    create(x,z,types[i],poi.id);
   }
  }
  // One guaranteed starter ammo box just outside the first village approach.
  const entry=map.roads[5].points[26];create(entry.x+3,entry.z+2,'ammo');
 }
 update(dt,player,apply,now){
  for(const box of this.crates){
   if(box.picked)continue;
   const distance=Math.hypot(box.x-player.x,box.z-player.z);
   box.mesh.visible=distance<125;
   if(distance<2.5&&Math.abs(player.jumpY||0)<3){
    const taken=apply(box.type);
    if(taken){
     box.picked=true;this.scene.remove(box.mesh);
     box.mesh.traverse?.(o=>{if(o.geometry&&o.geometry!==crate.prototype)o.geometry.dispose?.();});
     continue;
    }
   }
   if(box.mesh.visible){
    box.mesh.rotation.y+=dt*.25;
    box.mesh.position.y=height(box.x,box.z)+.13+Math.sin(now*2+box.phase)*.13;
    box.mesh.userData.halo.material.opacity=.4+Math.sin(now*3+box.phase)*.12;
   }
  }
 }
 remaining(){return this.crates.filter(c=>!c.picked).length;}
}