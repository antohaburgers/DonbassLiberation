// World layout generator. Separate from the old linear rally-track generator.
export const SIZE=1000;
export const POI_TYPES=[
  ['ДЕРЕВНЯ','village'],['БЛОКПОСТ','checkpoint'],['БАЗА','base'],
  ['СКЛАД','depot'],['ЛЕСНОЙ ЛАГЕРЬ','camp'],['ХУТОР','village']
];
export function randomizer(seed){let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function height(x,z){return 3.4*Math.sin(x*.008)*Math.cos(z*.011)+1.8*Math.sin((x+z)*.016)+.7*Math.cos((x-z)*.025);}
export function roadDistance(x,z,roads){
 let best=Infinity;
 for(const road of roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
 }return best;
}
function path(from,to,rng,secondary=false){
 const dx=to.x-from.x,dz=to.z-from.z,side=(rng()-.5)*75;
 const mid={x:(from.x+to.x)/2+(-dz/(Math.hypot(dx,dz)||1))*side,z:(from.z+to.z)/2+(dx/(Math.hypot(dx,dz)||1))*side};
 const pts=[];for(let i=0;i<=36;i++){
  const t=i/36,u=1-t;
  pts.push({x:u*u*from.x+2*u*t*mid.x+t*t*to.x,z:u*u*from.z+2*u*t*mid.z+t*t*to.z});
 }
 return {points:pts,width:secondary?5.5:8.2,secondary};
}
export function generate(seed){
 const rng=randomizer(seed);
 const anchors=[[-290,-285],[290,-280],[310,255],[-310,280],[45,330],[-60,-130]];
 const pois=POI_TYPES.map((entry,i)=>({
  id:i,name:entry[0],type:entry[1],
  x:anchors[i][0]+(rng()-.5)*70,z:anchors[i][1]+(rng()-.5)*70,scouted:false
 }));
 const center={x:(rng()-.5)*60,z:(rng()-.5)*80};
 const roads=pois.map((p,i)=>path(i===5?center:center,p,rng,i>2));
 roads.push(path(pois[0],pois[3],rng,true),path(pois[1],pois[2],rng,true));
 const buildings=[];
 for(const poi of pois){
  const total=poi.type==='village'?10:poi.type==='base'?7:poi.type==='depot'?6:poi.type==='camp'?5:5;
  for(let j=0;j<total;j++){
   let x,z;
   for(let tries=0;tries<20;tries++){
    const angle=rng()*Math.PI*2,radius=20+rng()*(poi.type==='village'?65:43);
    x=poi.x+Math.cos(angle)*radius;z=poi.z+Math.sin(angle)*radius;
    if(roadDistance(x,z,roads)>9 && buildings.every(b=>Math.hypot(b.x-x,b.z-z)>17))break;
   }
   const industrial=['base','depot'].includes(poi.type);
   buildings.push({
    x,z,w:industrial?12+rng()*9:7+rng()*4,d:industrial?10+rng()*7:7+rng()*4,
    h:industrial?5+rng()*3:3.2+rng()*1.2,kind:poi.type==='camp'?'tent':industrial?'hangar':'house',
    tone:Math.floor(rng()*4),poi:poi.id
   });
  }
 }
 const covers=[];
 const blueprints={
  village:[['hay',4],['fence',4]],
  checkpoint:[['barrier',7],['sandbag',4]],
  base:[['barrier',7],['sandbag',5],['crate',4]],
  depot:[['container',3],['crate',9]],
  camp:[['log',7],['sandbag',3]]
 };
 for(const p of pois){
  const type=p.type,plan=blueprints[type]||blueprints.village;
  for(const [kind,n] of plan)for(let i=0;i<n;i++){
   for(let attempts=0;attempts<50;attempts++){
    const a=rng()*Math.PI*2,r=type==='camp'?11+rng()*36:17+rng()*37;
    const x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
    const w=kind==='container'?7:kind==='fence'?4.4:kind==='log'?4.6:kind==='crate'?1.8:kind==='hay'?2.3:kind==='barrier'?3.4:3.8;
    const d=kind==='container'?2.7:kind==='fence'?.25:kind==='log'?.8:kind==='crate'?1.8:kind==='hay'?1.6:kind==='barrier'?.7:1.0;
    const h=kind==='container'?3.1:kind==='fence'?1.25:kind==='log'?.65:kind==='crate'?1.45:kind==='hay'?1.2:kind==='barrier'?1.25:.9;
    if(Math.abs(x)>480||Math.abs(z)>480)continue;
    if(buildings.some(b=>Math.abs(x-b.x)<(w+b.w)/2+2&&Math.abs(z-b.z)<(d+b.d)/2+2))continue;
    if(covers.some(c=>Math.hypot(c.x-x,c.z-z)<Math.max(w,c.w)*.75+1))continue;
    covers.push({x,z,w,d,h,kind,cover:true,poi:p.id,angle:Math.round(a*4)/4});
    break;
   }
  }
 }
 return {seed,pois,roads,buildings,covers,center};
}
export function treesForChunk(cx,cz,map){
 const rng=randomizer((map.seed^Math.imul(cx+11,73856093)^Math.imul(cz+17,19349663))>>>0);
 const trees=[];
 for(let i=0;i<148;i++){
  const x=-500+(cx+rng())*125,z=-500+(cz+rng())*125;
  const nearPoi=map.pois.some(p=>Math.hypot(p.x-x,p.z-z)<
   (p.type==='village'?75:p.type==='camp'?19:63));
  const byRoad=roadDistance(x,z,map.roads)<11;
  const field= Math.sin(x*.017+map.seed*.00001)+Math.cos(z*.019);
  const density=field>.4?.84:field<-.8?.13:.42;
  if(!nearPoi&&!byRoad&&rng()<density)trees.push({x,z,r:1.25+rng()*1.5,h:8+rng()*6,tone:Math.floor(rng()*4),pine:rng()<.56,angle:rng()*6.28});
 }
 return trees;
}