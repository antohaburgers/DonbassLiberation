// Generated WebAudio effects require no MP3 downloads and work after user gesture on iPhone.
export class CombatAudio{
 constructor(){
  this.ctx=null;this.buffers=null;this.master=null;this.muted=false;
 }
 unlock(){
  if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return;}
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  try{
   const ctx=new AudioContext();this.ctx=ctx;
   this.master=ctx.createGain();this.master.gain.value=.57;
   this.master.connect(ctx.destination);
   const rate=ctx.sampleRate;
   // Use cached, differently timed noise bursts to avoid synthetic pure tones.
   this.buffers={};
   for(const [type,duration] of [['shot',.23],['enemy',.18],['hit',.11],['reload',.08],['hurt',.3]]){
    const n=Math.round(rate*duration),b=ctx.createBuffer(1,n,rate),channel=b.getChannelData(0);
    let filtered=0;
    for(let i=0;i<n;i++){
     const t=i/rate,noise=Math.random()*2-1;
     filtered=filtered*.63+noise*.37;
     const attack=Math.min(1,t/.002);
     const decay=type==='shot'?
       .78*Math.exp(-t*45)+.32*Math.exp(-t*12):
       type==='enemy'?Math.exp(-t*30):
       type==='hurt'?Math.exp(-t*10):
       Math.exp(-t*48);
     channel[i]=(noise*.65+filtered*.35)*attack*decay;
    }
    this.buffers[type]=b;
   }
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }catch(e){this.ctx=null;}
 }
 play(type='shot',volume=1,pitch=1){
  const ctx=this.ctx;
  if(!ctx||this.muted||ctx.state==='closed')return;
  try{
   const source=ctx.createBufferSource();source.buffer=this.buffers[type]||this.buffers.shot;
   source.playbackRate.value=pitch;
   const filter=ctx.createBiquadFilter();filter.type=type==='shot'?'highpass':'lowpass';
   filter.frequency.value=type==='shot'?340:type==='enemy'?1300:2000;
   const level=ctx.createGain();
   level.gain.value=Math.min(1,volume);
   source.connect(filter);filter.connect(level);level.connect(this.master);
   const t=ctx.currentTime;source.start(t);
   source.onended=()=>{source.disconnect();filter.disconnect();level.disconnect();};
   if(type==='shot'){
    // A short low-frequency pressure pop gives each bullet some weight.
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(116,t);
    osc.frequency.exponentialRampToValueAtTime(52,t+.09);
    gain.gain.setValueAtTime(.10*volume,t);
    gain.gain.exponentialRampToValueAtTime(.001,t+.095);
    osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+.10);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
   }
  }catch(e){/* Audio isn't guaranteed in background Safari tabs. */ }
 }
 shoot(){this.play('shot',.56,.95+Math.random()*.10);}
 enemy(distance){this.play('enemy',Math.max(.02,.15*(1-distance/140)),.83+Math.random()*.25);}
 hit(){this.play('hit',.21,.8);}
 reload(){this.play('reload',.20,1);}
 hurt(){this.play('hurt',.28,.8);}
 toggle(){this.muted=!this.muted;return this.muted;}
}