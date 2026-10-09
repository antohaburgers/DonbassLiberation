export function createInput(canvas){
 const keys=new Set(),stick=document.getElementById('stick'),nub=document.getElementById('nub');
 const runBtn=document.getElementById('runBtn'),jumpBtn=document.getElementById('jumpBtn');
 const fireBtn=document.getElementById('fireBtn'),reloadBtn=document.getElementById('reloadBtn');
 const grenadeBtn=document.getElementById('grenadeBtn');
 let leftId=null,lookId=null,lastX=0,lastY=0,sx=0,sy=0;
 let yawDelta=0,pitchDelta=0,jump=false,run=false,shooting=false,reloadRequested=false;
 let gamepadJump=false,gamepadReload=false,gamepadThrow=false,grenadeRequested=false,mouseDown=false,fireTouchId=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function updateStick(e){
  const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=r.width*.35;
  sx=clamp(dx/max,-1,1);sy=clamp(dy/max,-1,1);
  const len=Math.hypot(sx,sy);if(len>1){sx/=len;sy/=len;}
  nub.style.transform='translate('+(sx*max)+'px,'+(sy*max)+'px)';
 }
 stick.addEventListener('pointerdown',e=>{e.preventDefault();leftId=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);});
 stick.addEventListener('pointermove',e=>{if(e.pointerId===leftId)updateStick(e);});
 const stop=e=>{if(e.pointerId===leftId){leftId=null;sx=sy=0;nub.style.transform='';}};
 stick.addEventListener('pointerup',stop);stick.addEventListener('pointercancel',stop);
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'){
   if(document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return;}
   if(e.button===0)mouseDown=true;return;
  }
  if(lookId===null){lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);}
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==lookId)return;
  yawDelta-=(e.clientX-lastX)*.004;
  pitchDelta-=(e.clientY-lastY)*.004;
  lastX=e.clientX;lastY=e.clientY;
 });
 const endLook=e=>{if(e.pointerId===lookId)lookId=null;};
 canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);
 document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;});
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)mouseDown=false;});
 document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===canvas){yawDelta-=e.movementX*.0024;pitchDelta-=e.movementY*.0024;}
 });
 addEventListener('keydown',e=>{
   if(e.code==='KeyG'&&!e.repeat&&!keys.has('KeyG'))grenadeRequested=true;
   keys.add(e.code);
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 });
 addEventListener('keyup',e=>keys.delete(e.code));
 addEventListener('blur',()=>{keys.clear();sx=sy=0;run=false;shooting=false;mouseDown=false;});
 runBtn.addEventListener('pointerdown',e=>{e.preventDefault();run=true;runBtn.setPointerCapture(e.pointerId);});
 for(const type of ['pointerup','pointercancel'])runBtn.addEventListener(type,()=>run=false);
 jumpBtn.addEventListener('pointerdown',e=>{e.preventDefault();jump=true;});
 fireBtn?.addEventListener('pointerdown',e=>{
  e.preventDefault();fireTouchId=e.pointerId;shooting=true;fireBtn.setPointerCapture(e.pointerId);
 });
 const endFire=e=>{if(fireTouchId===e.pointerId){shooting=false;fireTouchId=null;}};
 fireBtn?.addEventListener('pointerup',endFire);fireBtn?.addEventListener('pointercancel',endFire);
 reloadBtn?.addEventListener('pointerdown',e=>{e.preventDefault();reloadRequested=true;});
 grenadeBtn?.addEventListener('pointerdown',e=>{e.preventDefault();grenadeRequested=true;});
 return {
  frame(dt){
   let strafe=sx+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
   let forward=-sy+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
   let sprint=run||keys.has('ShiftLeft')||keys.has('ShiftRight'),fire=shooting||mouseDown;
   let reload=reloadRequested||keys.has('KeyR');
   let grenade=grenadeRequested;
   const pads=navigator.getGamepads?navigator.getGamepads():[];
   const pad=Array.from(pads||[]).find(p=>p&&p.connected);
   if(pad){
    const dz=n=>Math.abs(n)<.15?0:n;
    strafe+=dz(pad.axes[0]||0);forward-=dz(pad.axes[1]||0);
    yawDelta-=dz(pad.axes[2]||0)*dt*2.6;
    pitchDelta-=dz(pad.axes[3]||0)*dt*2.0;
    sprint ||=!!pad.buttons[10]?.pressed;
    if(pad.buttons[0]?.pressed&&!gamepadJump)jump=true;
    gamepadJump=!!pad.buttons[0]?.pressed;
    fire ||=!!pad.buttons[7]?.pressed||(pad.buttons[7]?.value||0)>.18;
    const x=!!pad.buttons[2]?.pressed;
    if(x&&!gamepadReload)reload=true;
    gamepadReload=x;
    const lb=!!pad.buttons[4]?.pressed;
    if(lb&&!gamepadThrow)grenade=true;
    gamepadThrow=lb;
   }
   const mag=Math.max(1,Math.hypot(strafe,forward));strafe/=mag;forward/=mag;
   const result={strafe,forward,sprint,jump:jump||keys.has('Space'),dyaw:yawDelta,dpitch:pitchDelta,fire,reload,grenade};
   yawDelta=0;pitchDelta=0;jump=false;reloadRequested=false;grenadeRequested=false;return result;
  },
  clearFire(){mouseDown=false;shooting=false;reloadRequested=false;grenadeRequested=false;}
 };
}