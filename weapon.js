import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
// First person, camera-attached, low-poly assault rifle.
// Dimensions are exaggerated slightly so it remains legible on a mobile screen.
const mt=(color,extras={})=>new THREE.MeshStandardMaterial({color,metalness:.42,roughness:.68,...extras});
const m={
 body:mt(0x343a39),steel:mt(0x252c2d),edge:mt(0x656a62),
 wood:mt(0x74503a,{metalness:0,roughness:.9}),
 glove:mt(0x76725b,{metalness:0}),skin:mt(0xa48b6a,{metalness:0}),
 sight:mt(0x191e1f),black:mt(0x141717)
};
const box=new THREE.BoxGeometry(1,1,1),cyl=new THREE.CylinderGeometry(1,1,1,9);
function cube(parent,size,pos,material,rot){
 const mesh=new THREE.Mesh(box,material);
 mesh.scale.set(...size);mesh.position.set(...pos);
 if(rot)mesh.rotation.set(...rot);
 parent.add(mesh);return mesh;
}
function tube(parent,radius,length,pos,material,rotate=0){
 const mesh=new THREE.Mesh(cyl,material);
 mesh.scale.set(radius,length,radius);mesh.position.set(...pos);
 mesh.rotation.x=rotate;parent.add(mesh);return mesh;
}
export class FirstPersonWeapon{
 constructor(camera){
  this.camera=camera;this.root=new THREE.Group();
  this.root.position.set(.30,-.33,-.57);this.root.rotation.set(-.02,-.12,.05);
  camera.add(this.root);
  const g=this.root;
  // Main receiver and long foregrip point away from the camera (-Z).
  cube(g,[.20,.17,.45],[.02,.02,-.28],m.body);
  cube(g,[.24,.13,.22],[.02,.13,-.20],m.steel);
  cube(g,[.16,.14,.38],[.02,.03,-.67],m.wood);
  cube(g,[.22,.16,.25],[.02,-.02,-.49],m.edge);
  tube(g,.033,.64,[.02,.052,-.93],m.steel,Math.PI/2);
  tube(g,.051,.10,[.02,.052,-1.26],m.black,Math.PI/2);
  cube(g,[.06,.20,.21],[.02,-.19,-.22],m.black,[.32,0,0]);
  // Curved 30-round magazine with articulated segments.
  cube(g,[.14,.31,.17],[.025,-.21,-.35],m.steel,[-.20,0,0]);
  cube(g,[.135,.22,.17],[.026,-.42,-.29],m.steel,[.32,0,0]);
  cube(g,[.145,.055,.19],[.026,-.54,-.31],m.edge);
  cube(g,[.17,.15,.48],[.02,-.04,.16],m.wood);
  cube(g,[.20,.12,.16],[.02,-.11,.37],m.wood);
  cube(g,[.065,.085,.10],[.02,.19,-.89],m.black);
  cube(g,[.07,.065,.055],[.02,.22,-.90],m.edge);
  cube(g,[.075,.075,.075],[.02,.23,-.16],m.black);
  cube(g,[.035,.035,.58],[.02,.13,-.57],m.edge);
  // Visible hands and sleeves follow the rifle as one camera-attached viewmodel.
  cube(g,[.22,.23,.26],[-.19,-.27,-.52],m.glove,[.1,-.13,-.3]);
  cube(g,[.27,.24,.36],[-.31,-.43,-.32],m.glove,[.45,-.06,-.38]);
  cube(g,[.21,.24,.28],[.23,-.32,.08],m.glove,[.2,.1,.22]);
  cube(g,[.29,.31,.33],[.32,-.51,.18],m.glove,[.15,.1,.28]);
  // Muzzle flash is deliberately short-lived.
  this.flash=new THREE.Group();
  const flare=new THREE.Mesh(new THREE.OctahedronGeometry(1),
   new THREE.MeshBasicMaterial({color:0xffd264,transparent:true,opacity:.92,depthWrite:false}));
  flare.scale.set(.16,.16,.35);this.flash.add(flare);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),
   new THREE.MeshBasicMaterial({color:0xffefac,transparent:true,opacity:.78,depthWrite:false}));
  halo.scale.set(.13,.13,.13);halo.position.z=-.10;this.flash.add(halo);
  this.flash.position.set(.02,.052,-1.30);
  this.flash.visible=false;g.add(this.flash);
  this.recoil=0;this.flashTime=0;this.bob=0;this.sway=0;
  this.reloadTime=0;this.reloading=false;
 }
 shot(){
  this.recoil=Math.min(1.3,this.recoil+.42);
  this.flashTime=.055;
  this.flash.rotation.z=Math.random()*6.28;
 }
 reload(duration=1.6){
  this.reloadTime=duration;this.reloading=true;
 }
 update(dt,moving,sprinting,lookChange=0){
  const movement=moving?1:0;
  this.bob+=dt*(sprinting?13:9)*movement;
  const targetSway=Math.min(1,Math.abs(lookChange)*6);
  this.sway+=(targetSway-this.sway)*Math.min(1,dt*8);
  this.recoil=Math.max(0,this.recoil-dt*9);
  this.flashTime=Math.max(0,this.flashTime-dt);
  this.flash.visible=this.flashTime>0;
  if(this.reloading){
   this.reloadTime-=dt;
   if(this.reloadTime<=0){this.reloading=false;this.reloadTime=0;}
  }
  const reload=this.reloading?Math.sin(Math.PI*Math.min(1,Math.max(0,1-this.reloadTime/1.6))):0;
  const walk=Math.sin(this.bob)*movement,walk2=Math.cos(this.bob)*movement;
  this.root.position.set(
   .30+walk*.008-this.recoil*.025,
   -.32+Math.abs(walk2)*-.015-this.recoil*.018-reload*.25-(sprinting?.06:0),
   -.58+this.recoil*.10+reload*.06
  );
  this.root.rotation.set(-.025+this.recoil*.055+reload*.33,-.12+walk*.013,.045+walk2*.012+reload*.40);
 }
}