// Full-screen game should own browser gestures. Pointer events remain available.
(()=>{
  const prevent=e=>{if(e.cancelable)e.preventDefault();};
  // Keep gameplay gestures locked but allow vertical scrolling in the menu.
  // We must retain pinch blocking even when the pause/settings menu is visible.
  document.addEventListener('touchmove',e=>{
    if(e.touches.length===1&&e.target.closest?.('#menu'))return;
    prevent(e);
  },{passive:false});
  for(const kind of ['gesturestart','gesturechange','gestureend'])
    document.addEventListener(kind,prevent,{passive:false});
  document.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey||!e.target.closest?.('#menu'))prevent(e);
  },{passive:false});
  for(const kind of ['contextmenu','selectstart','dragstart','dblclick'])
    document.addEventListener(kind,prevent,{passive:false});
  // Prevent keyboard browser zoom shortcuts without suppressing FPS controls.
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&['Equal','Minus','NumpadAdd','NumpadSubtract','Digit0'].includes(e.code))
      prevent(e);
  },{passive:false});
  // iOS can cancel touches when app switches; release stuck movement/fire.
  const release=()=>window.dispatchEvent(new Event('blur'));
  window.addEventListener('pagehide',release);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')release();
  });
})();