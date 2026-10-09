// DonbassLiberation v0.7 — GitHub Pages / static PWA.
const VERSION='0.7.0';
const ROOT=new URL('./',self.location.href);
const PREFIX='donbass-liberation:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const SHELL=new URL('./index.html',ROOT).href;
const THREE_CDN='https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
const CORE=[
 './index.html',
 './style.css?v=07',
 './game.js?v=07',
 './input.js?v=05',
 './world-data.js?v=02',
 './world-render.js?v=04',
 './weapon.js?v=05',
 './enemies.js?v=06',
 './antifreeze.js?v=06',
 './combat-audio.js?v=05',
 './browser-guard.js?v=07',
 './pwa.js?v=07',
 './manifest.webmanifest',
 './icons/icon-192.png',
 './icons/icon-512.png',
 './icons/icon-maskable-512.png',
 './icons/apple-touch-icon.png'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  // The external 3D engine is optional during install; never break installation
  // if CDN is temporarily unreachable. Cache it when it is reachable.
  try{await cache.add(THREE_CDN);}catch(error){console.warn('Three.js not pre-cached:',error);}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 const externalEngine=url.href===THREE_CDN;
 const local=url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname);
 if(!externalEngine&&!local)return;
 if(externalEngine){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(request);
    if(response.ok)await cache.put(THREE_CDN,response.clone());
    return response;
   }catch{
    return(await cache.match(THREE_CDN))||Response.error();
   }
  })());return;
 }
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){await cache.put(SHELL,response.clone());return response;}
    return(await cache.match(SHELL))||response;
   }catch{
    return(await cache.match(SHELL))||Response.error();
   }
  })());return;
 }
 // Scripts, styles, icons and manifest: freshest online, offline fallback.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok){await cache.put(request,response.clone());return response;}
   return(await cache.match(request))||response;
  }catch{return(await cache.match(request))||Response.error();}
 })());
});
