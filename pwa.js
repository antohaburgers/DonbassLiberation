// PWA registration and explicit safe updates. Game state stays in memory.
const APP_VERSION='0.8';
const scope=new URL('./',location.href).href;
const button=document.getElementById('refresh-game');
const status=document.getElementById('update-status');
const installButton=document.getElementById('install-game');
const installHint=document.getElementById('install-hint');
let installEvent=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function setStatus(value){if(status)status.textContent=value;}
function installText(){
 if(standalone()){
  if(installButton)installButton.hidden=true;
  if(installHint)installHint.textContent='PWA установлено. Игра открывается отдельно от Safari.';
 }else if(/iphone|ipad|ipod/i.test(navigator.userAgent)){
  if(installHint)installHint.textContent='iPhone: Safari → Поделиться → На экран «Домой». Игра откроется на весь экран, в горизонтальном режиме.';
 }else if(installEvent){
  if(installButton)installButton.hidden=false;
  if(installHint)installHint.textContent='Можно установить игру как отдельное приложение.';
 }else if(installHint){
  installHint.textContent='Android/ПК: меню браузера → Установить приложение. iPhone: Safari → Поделиться → На экран «Домой».';
 }
}
setStatus('ВЕРСИЯ '+APP_VERSION);
installText();
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();installEvent=event;installText();
});
window.addEventListener('appinstalled',()=>{installEvent=null;installText();});
installButton?.addEventListener('click',async()=>{
 if(installEvent){
  const event=installEvent;installEvent=null;
  await event.prompt();installText();return;
 }
 installText();
});
if('serviceWorker' in navigator&&window.isSecureContext){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
   .then(async registration=>{
    try{await registration.update();}catch(error){console.warn('PWA update failed:',error);}
   }).catch(error=>{
    setStatus('ОФЛАЙН-РЕЖИМ НЕДОСТУПЕН');
    console.warn('ServiceWorker registration error:',error);
   });
 });
}
button?.addEventListener('click',async()=>{
 if(button.disabled)return;
 button.disabled=true;setStatus('ПРОВЕРЯЮ ОБНОВЛЕНИЯ…');
 try{
  if(navigator.onLine===false)throw new Error('НУЖНО ПОДКЛЮЧЕНИЕ К ИНТЕРНЕТУ');
  const test=new URL('./index.html',scope);
  test.searchParams.set('check',String(Date.now()));
  const response=await fetch(test,{cache:'no-store'});
  if(!response.ok)throw new Error('СТРАНИЦА ЕЩЁ НЕ ОПУБЛИКОВАНА: '+response.status);
  const page=await response.text();
  if(!page.includes('id="refresh-game"')||!page.includes('game.js?v=08'))
    throw new Error('НОВАЯ ВЕРСИЯ ЕЩЁ НЕ ОПУБЛИКОВАНА');
  setStatus('ОБНОВЛЯЮ ФАЙЛЫ…');
  if('serviceWorker' in navigator){
   const registration=await navigator.serviceWorker.getRegistration(scope);
   if(registration){
    await registration.update();
    if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
   }
  }
  // New worker precaches v0.7 assets. Explicit navigation avoids stale iOS tabs.
  const url=new URL('./index.html',scope);
  url.searchParams.set('updated',String(Date.now()));
  location.replace(url.href);
 }catch(error){
  setStatus(error?.message||'ОБНОВЛЕНИЕ НЕ УДАЛОСЬ');
  button.disabled=false;
 }
});
