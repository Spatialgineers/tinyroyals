// Sticker album and royal levels. Pure data helpers; app.js handles storage and UI.
export const STICKERS=[
  {id:'hello',art:'👋',name:'¡Hola, reino!',hint:'Saluda a tu público',test:s=>s.wave>=1},
  {id:'rhythm',art:'🎶',name:'Ritmo real',hint:'Baila una vez',test:s=>s.dance>=1},
  {id:'jelly',art:'🍮',name:'Piernas de gelatina',hint:'Activa el modo gelatina',test:s=>s.jelly>=1},
  {id:'wand',art:'🪄',name:'Varita brillante',hint:'Lanza magia 5 veces',test:s=>s.magic>=5},
  {id:'tickle',art:'🤭',name:'¡Cosquillas!',hint:'Toca a tu royal 10 veces',test:s=>s.tickle>=10},
  {id:'travel',art:'🗺️',name:'Viaje por el reino',hint:'Visita los tres reinos',test:s=>s.scenes.length>=3},
  {id:'stylist',art:'🎨',name:'Gran estilista',hint:'Cambia tu look 10 veces',test:s=>s.look>=10},
  {id:'portrait',art:'📸',name:'Retrato real',hint:'Toma una foto',test:s=>s.photo>=1},
  {id:'mirror',art:'🪞',name:'¡Soy yo!',hint:'Mueve a tu royal con la cámara',test:s=>s.camera>=1},
  {id:'first-star',art:'⭐',name:'Primera estrella',hint:'Atrapa una estrella',test:s=>s.stars>=1},
  {id:'kick',art:'🦶',name:'Patada estelar',hint:'Atrapa una estrella con el pie',test:s=>s.kicks>=1},
  {id:'comet',art:'☄️',name:'Combo cometa',hint:'Consigue un combo de 10',test:s=>s.bestCombo>=10},
  {id:'golden',art:'👑',name:'Show de tres coronas',hint:'Gana 3 coronas en un juego',test:s=>s.bestCrowns>=3},
  {id:'collector',art:'🌟',name:'Cazaestrellas',hint:'Atrapa 100 estrellas en total',test:s=>s.stars>=100}
];
const TITLES={
  princess:['Aprendiz real','Damita de las estrellas','Duquesa brillante','Gran princesa','Reina de la magia'],
  prince:['Aprendiz real','Caballerito estelar','Duque brillante','Gran príncipe','Rey de la magia']
};
const LEVELS=[0,25,70,150,280];
export function freshAlbum(){return {stats:{wave:0,dance:0,jelly:0,magic:0,tickle:0,look:0,photo:0,camera:0,stars:0,kicks:0,bestCombo:0,bestCrowns:0,best:0,rounds:0,scenes:[]},unlocked:{}};}
export function restoreAlbum(raw){
  const album=freshAlbum();
  try{
    const s=JSON.parse(raw||'null');if(!s||typeof s!=='object')return album;
    for(const key of Object.keys(album.stats)){
      if(key==='scenes')album.stats.scenes=Array.isArray(s.stats?.scenes)?s.stats.scenes.filter(x=>['castle','garden','moon'].includes(x)):[];
      else if(Number.isFinite(s.stats?.[key]))album.stats[key]=Math.max(0,s.stats[key]);
    }
    for(const sticker of STICKERS)if(s.unlocked?.[sticker.id])album.unlocked[sticker.id]=true;
  }catch{/* A damaged album starts fresh. */}
  return album;
}
// Applies an event and returns any stickers it unlocked.
export function record(album,event,data={}){
  const s=album.stats;
  if(['wave','dance','jelly','magic','tickle','look','photo','camera'].includes(event))s[event]++;
  if(event==='scene'&&!s.scenes.includes(data.scene))s.scenes.push(data.scene);
  if(event==='catch'){s.stars++;if(data.by==='footL'||data.by==='footR')s.kicks++;s.bestCombo=Math.max(s.bestCombo,data.combo||0);}
  if(event==='round'){s.rounds++;s.best=Math.max(s.best,data.score||0);s.bestCrowns=Math.max(s.bestCrowns,data.crowns||0);}
  const fresh=[];
  for(const sticker of STICKERS)if(!album.unlocked[sticker.id]&&sticker.test(s)){album.unlocked[sticker.id]=true;fresh.push(sticker);}
  return fresh;
}
export function stickerCount(album){return STICKERS.filter(s=>album.unlocked[s.id]).length;}
export function level(album,role='princess'){
  const xp=album.stats.stars+stickerCount(album)*10;
  let index=0;while(index<LEVELS.length-1&&xp>=LEVELS[index+1])index++;
  const next=LEVELS[index+1],progress=next?(xp-LEVELS[index])/(next-LEVELS[index]):1;
  return {index,number:index+1,title:(TITLES[role]||TITLES.princess)[index],xp,next,progress};
}
