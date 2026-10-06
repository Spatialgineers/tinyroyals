import {RoyalCamera} from './camera.js';
import {cameraPose,demoPose,clamp} from './motion.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DEFAULT={role:'princess',preset:0,color:'#e9a5c7',skin:'#e8b08d',hair:'#614639',hairStyle:0,crown:true,silly:65,scene:'castle'};
const outfits=[['#e9a5c7','Rosa de cuento'],['#b5a0dc','Lavanda mágica'],['#a4cfbd','Menta encantada'],['#a0c4e4','Azul de cielo'],['#efcb83','Sol dorado']];
const skins=[['#f3d4b5','Claro'],['#e8b08d','Melocotón'],['#c88d63','Caramelo'],['#956146','Castaño'],['#603d30','Profundo']];
const hairs=['#614639','#d8a460','#352c37','#a86d46'];
const presets={princess:[{name:'Luna',color:'#e9a5c7',hair:'#614639',hairStyle:0},{name:'Sol',color:'#b5a0dc',hair:'#d8a460',hairStyle:1}],prince:[{name:'Leo',color:'#a0c4e4',hair:'#352c37',hairStyle:2},{name:'Nico',color:'#a4cfbd',hair:'#a86d46',hairStyle:1}]};
function restore(){
  try{const s=JSON.parse(localStorage.getItem('tiny-royals-look')||'null');if(!s)return {...DEFAULT};
    return {role:['prince','princess'].includes(s.role)?s.role:DEFAULT.role,preset:s.preset===1?1:0,
      color:outfits.some(([c])=>c===s.color)?s.color:DEFAULT.color,skin:skins.some(([c])=>c===s.skin)?s.skin:DEFAULT.skin,
      hair:hairs.includes(s.hair)?s.hair:DEFAULT.hair,hairStyle:[0,1,2].includes(s.hairStyle)?s.hairStyle:0,crown:typeof s.crown==='boolean'?s.crown:true,
      silly:Number.isFinite(s.silly)?clamp(s.silly,0,100):65,scene:['castle','garden','moon'].includes(s.scene)?s.scene:'castle'};
  }catch{return {...DEFAULT};}
}
let state=restore(),theatre,cameraState='off',tracking=null,lastTracked=0,calibration=null,calibrationSamples=[],action='',actionStart=0,drag=null,now=0,frameId,magicCooldown=0,previewHidden=false;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sound=false,audioContext,toastTimer,messageTimer;
function save(){try{localStorage.setItem('tiny-royals-look',JSON.stringify(state));}catch{/* Play still works when storage is disabled. */}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function message(text){$('#magic-message').textContent=text;$('#magic-message').classList.add('visible');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('#magic-message').classList.remove('visible'),2400);}
function chime(kind='magic'){
  if(!sound)return;
  try{audioContext||=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();
    const notes=kind==='magic'?[523.25,659.25,783.99,1046.5]:kind==='jelly'?[440,349,262]:[523,659];
    notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.09;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.38);o.connect(g).connect(audioContext.destination);o.start(t);o.stop(t+.4);});
  }catch{/* Sound is optional. */}
}
function portrait(p,index){
  const princess=state.role==='princess',skin=state.skin,color=index===state.preset?state.color:p.color;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="92" rx="34" ry="5" fill="#dfd3e9" opacity=".45"/><path d="M24 90q0-30 26-30t26 30" fill="${color}"/><path d="M37 66q13 12 26 0" fill="#fff4df"/><ellipse cx="50" cy="42" rx="27" ry="29" fill="${p.hair}"/>${princess?`<ellipse cx="24" cy="57" rx="9" ry="20" fill="${p.hair}"/><ellipse cx="76" cy="57" rx="9" ry="20" fill="${p.hair}"/>`:''}<ellipse cx="50" cy="47" rx="25" ry="26" fill="${skin}"/><path d="M25 35q0-26 26-25 28 0 24 29-7-15-18-12-12 10-32 8" fill="${p.hair}"/><ellipse cx="39" cy="48" rx="2.8" ry="4.1" fill="#483844"/><ellipse cx="61" cy="48" rx="2.8" ry="4.1" fill="#483844"/><circle cx="38" cy="46.8" r=".8" fill="white"/><circle cx="60" cy="46.8" r=".8" fill="white"/><ellipse cx="32" cy="57" rx="4.5" ry="2.3" fill="#e8a1a1" opacity=".75"/><ellipse cx="68" cy="57" rx="4.5" ry="2.3" fill="#e8a1a1" opacity=".75"/><path d="M44 59q6 6 12 0" stroke="#945560" fill="none" stroke-width="1.5" stroke-linecap="round"/><path d="m32 22-2-15 12 8 8-13 8 13 12-8-2 15Z" fill="#efd074"/><circle cx="50" cy="17" r="2.2" fill="#b299d2"/>${princess?'<path d="m50 77-4-4-3 3 7 7 7-7-3-3Z" fill="#efcb83"/>':'<circle cx="50" cy="78" r="2" fill="#efcb83"/><circle cx="50" cy="86" r="2" fill="#efcb83"/>'}</svg>`;
}
function updateUI(){
  $$('[data-role]').forEach(b=>{const selected=b.dataset.role===state.role;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  $('#presets').innerHTML=presets[state.role].map((p,i)=>`<button class="royal-choice ${i===state.preset?'selected':''}" data-preset="${i}" aria-label="${state.role==='princess'?'Princesa':'Príncipe'} ${p.name}" aria-pressed="${i===state.preset}">${portrait(p,i)}<span>${p.name}</span>${i===state.preset?'<span class="choice-tick">✓</span>':''}</button>`).join('');
  for(const [id,colors,key]of [['outfit-colors',outfits,'color'],['skin-colors',skins,'skin']]){
    $('#'+id).innerHTML=colors.map(([c,label])=>`<button class="color-swatch ${state[key]===c?'selected':''}" style="--swatch:${c}" data-${key}="${c}" aria-label="${label}" title="${label}" aria-pressed="${state[key]===c}"></button>`).join('');
  }
  $('#crown').classList.toggle('selected',state.crown);$('#crown').setAttribute('aria-pressed',state.crown);
  $('#hair').setAttribute('aria-label',`Cambiar peinado. Actual: ${['Trenzas','Moñitos','Flequillo'][state.hairStyle]}`);
  $('#silly').value=state.silly;$('#silly').style.background=`linear-gradient(to right,#a68ac7 ${state.silly}%,#dfd7e8 ${state.silly}%)`;
  $('#silly-label').textContent=state.silly<30?'Suave':state.silly>78?'¡Gelatina!':'Wobbly';
  $('#character-name').textContent=(state.role==='princess'?'Princesa ':'Príncipe ')+presets[state.role][state.preset].name;
  $('#character-detail').textContent=state.role==='princess'?'lista para brillar':'listo para brillar';
  $$('[data-scene]').forEach(b=>{const selected=b.dataset.scene===state.scene;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
}
function changeLook(next){state={...state,...next};save();updateUI();theatre?.setRoyal(state);}
function setPreset(role,index){const p=presets[role][index];changeLook({role,preset:index,color:p.color,hair:p.hair,hairStyle:p.hairStyle});chime('look');}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.role)setPreset(b.dataset.role,state.preset);
  if(b.dataset.preset!==undefined)setPreset(state.role,Number(b.dataset.preset));
  if(b.dataset.color){changeLook({color:b.dataset.color});chime('look');}
  if(b.dataset.skin)changeLook({skin:b.dataset.skin});
  if(b.dataset.scene){state.scene=b.dataset.scene;save();updateUI();theatre?.setKingdom(state.scene);chime('look');}
  if(b.dataset.action)perform(b.dataset.action);
  if(b.dataset.dialog)showDialog(b.dataset.dialog);
});
$('#hair').onclick=()=>changeLook({hairStyle:(state.hairStyle+1)%3});
$('#crown').onclick=()=>{changeLook({crown:!state.crown});chime('look');};
$('#silly').oninput=e=>{state.silly=Number(e.target.value);save();updateUI();};
$('#randomize').onclick=()=>{
  const role=Math.random()>.5?'prince':'princess',preset=Math.floor(Math.random()*2);
  changeLook({role,preset,color:outfits[Math.floor(Math.random()*outfits.length)][0],skin:skins[Math.floor(Math.random()*skins.length)][0],hair:hairs[Math.floor(Math.random()*hairs.length)],hairStyle:Math.floor(Math.random()*3),crown:true});
  theatre?.magic();message('¡Una nueva estrella del reino!');chime();
};
function perform(kind){
  if(!theatre)return;
  action=kind;actionStart=now;
  if(kind==='jelly')theatre.puppet.kick();
  if(kind==='magic'){theatre.magic();magicCooldown=performance.now()+2200;}
  message({wave:'¡Un saludo real!',dance:'¡Este reino tiene ritmo!',jelly:'Oops… ¡piernas de gelatina!',magic:'¡Bibbidi, bobbidi, silly!'}[kind]);chime(kind);
}
function cameraStatus(status,detail){
  cameraState=status;const active=status!=='off',live=status==='on';
  $('#camera-button span').textContent=active?(live?'Apagar cámara':'Cancelar'):'Encender cámara';
  $('#mode-badge').classList.toggle('live',live);
  $('#mode-badge').innerHTML=`<span></span> ${live?'TU CÁMARA, TU MAGIA':active?'PREPARANDO MAGIA':'MODO JUEGO'}`;
  $('#camera-title').textContent=live?'¡Tú llevas la corona!':active?'Preparando tu entrada…':'La magia empieza contigo';
  $('#camera-copy').textContent=detail||(live?'Tu cabeza, brazos y sonrisa mueven al royal.':'Enciende la cámara. Tu muñeco te sigue.');
  $('#camera-card').hidden=!active||previewHidden;$('#show-preview').hidden=!active||!previewHidden;
  $('#tracking-label').textContent=live?'¡Te sigo!':status==='starting'?'Abriendo cámara…':'Preparando magia…';
  $('#stage-caption').textContent=live?'Levanta las manos. ¡Lanza un poquito de magia!':'Arrastra el muñeco. ¡Tiene cosquillas!';
  if(status==='off'){tracking=null;calibration=null;calibrationSamples=[];lastTracked=0;$('#camera-notice').hidden=true;}
}
function cameraError(text){
  const notice=$('#camera-notice');notice.textContent=text+' ';
  const link=document.createElement('a');link.href=window.location.origin+'/';link.target='_blank';link.rel='noopener';link.textContent='Abrir teatro en otra pestaña';notice.append(link);
  notice.hidden=false;toast('Seguimos jugando sin cámara ♡');
}
function onTracking(frame){
  const mapped=cameraPose(frame.points,frame.world,frame.aspect,calibration);
  if(!mapped){$('#tracking-label').textContent='Muéstrame tu cabeza y brazos';if(performance.now()-lastTracked>600)tracking=null;return;}
  if(!calibration){calibrationSamples.push(mapped.center);if(calibrationSamples.length>=8)calibration={x:calibrationSamples.reduce((s,v)=>s+v.x,0)/8,y:calibrationSamples.reduce((s,v)=>s+v.y,0)/8};}
  tracking={...mapped,signals:frame.signals||{}};lastTracked=performance.now();
  $('#tracking-label').textContent=mapped.fullBody?'¡Cuerpo completo!':'¡Brazos y cabeza listos!';
  if(mapped.handsUp&&performance.now()>magicCooldown){theatre?.magic();message('¡Manos arriba, magia afuera!');chime();magicCooldown=performance.now()+3500;}
}
const royalCamera=new RoyalCamera($('#camera-video'),{status:cameraStatus,frame:onTracking,error:cameraError,warning:text=>toast(text)});
$('#camera-button').onclick=()=>{
  if(!theatre){toast('El teatro 3D necesita cargar primero.');return;}
  if(royalCamera.active){royalCamera.stop();return;}
  action='';calibration=null;calibrationSamples=[];previewHidden=false;$('#camera-notice').hidden=true;royalCamera.start();
};
$('#demo-button').onclick=()=>{royalCamera.stop();perform('wave');toast('¡Juega con los botones o arrastra tu royal!');};
$('#hide-preview').onclick=()=>{previewHidden=true;$('#camera-card').hidden=true;$('#show-preview').hidden=false;};
$('#show-preview').onclick=()=>{previewHidden=false;$('#camera-card').hidden=false;$('#show-preview').hidden=true;};
$('#calibrate').onclick=()=>{calibration=null;calibrationSamples=[];message('Quédate en el centro un momentito.');};
$('#photo').onclick=async()=>{
  if(!theatre)return;
  try{const blob=await theatre.photo();if(!blob)throw new Error();const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='mi-tiny-royal.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('¡Una foto de tu royal! La cámara no sale.');chime('look');}
  catch{toast('La foto no pudo salir. Inténtalo otra vez.');}
};
$('#fullscreen').onclick=async()=>{
  const el=$('#theatre');
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if(el.classList.contains('focus-mode')){el.classList.remove('focus-mode');document.body.classList.remove('play-focus');theatre?.resize();return;}
  try{if(el.requestFullscreen)await el.requestFullscreen();else throw new Error();}
  catch{el.classList.add('focus-mode');document.body.classList.add('play-focus');theatre?.resize();}
  $('#fullscreen').setAttribute('aria-label','Salir de pantalla completa');
};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa');theatre?.resize();});
$('#sound').onclick=()=>{sound=!sound;$('#sound').classList.toggle('sound-off',!sound);$('#sound').setAttribute('aria-pressed',sound);$('#sound').setAttribute('aria-label',sound?'Silenciar sonidos':'Activar sonidos');if(sound)chime();};
function showDialog(kind){
  const content=kind==='families'?`<div class="dialog-art">♡</div><h2 id="dialog-title" class="dialog-title">Un reino para jugar tranquilos.</h2><p class="dialog-copy">Tiny Royals es un pequeño teatro de imaginación. Un adulto puede ayudar a encender la cámara; después, los movimientos hacen el show.</p><p class="dialog-note">La imagen se procesa en este dispositivo. No enviamos vídeo, no grabamos la cámara y no pedimos nombres ni perfiles infantiles. La foto descargable incluye únicamente el escenario y el muñeco.</p><p class="dialog-copy">Deja espacio para moverse y coloca el dispositivo en una superficie estable. El tracking funciona con una persona a la vez. También se puede jugar enteramente sin cámara.</p>`:`<div class="dialog-art">♛</div><h2 id="dialog-title" class="dialog-title">Tres pasos. Mucha magia.</h2><ol class="dialog-steps"><li><b>1</b><span><strong>Escoge tu royal.</strong>Príncipe o princesa, tus colores y una corona.</span></li><li><b>2</b><span><strong>Enciende la cámara.</strong>Pide ayuda a un adulto para dar permiso. Muéstrale tu cabeza y tus brazos al teatro.</span></li><li><b>3</b><span><strong>¡Haz tu show!</strong>Mueve los brazos, inclina la cabeza y sonríe. Levanta las dos manos para lanzar magia.</span></li></ol><p class="dialog-note">¿Sin cámara? Arrastra al personaje y usa Saluda, Baila, ¡Gelatina! o Magia. Para mover las piernas, da un pasito atrás hasta que la cámara vea tus pies. Con el botón ⊕ de la cámara puedes volver a centrarte.</p>`;
  $('#dialog-content').innerHTML=content;$('#info-dialog').showModal();
}
$('#close-dialog').onclick=$('#dialog-done').onclick=()=>$('#info-dialog').close();
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#reset').onclick=()=>{royalCamera.stop();state={...DEFAULT};save();updateUI();theatre?.setRoyal(state);theatre?.setKingdom(state.scene);toast('Tu pequeño reino empieza de nuevo.');};
const mount=$('#canvas-mount');
mount.addEventListener('pointerdown',e=>{
  if(!theatre)return;const point=theatre.screenPoint(e.clientX,e.clientY);let closest='head',dist=.8;
  for(const k of ['head','handL','handR','chest']){const d=theatre.puppet.points[k].p.distanceTo(point);if(d<dist){closest=k;dist=d;}}
  drag={key:closest,point,pointer:e.pointerId};mount.setPointerCapture(e.pointerId);mount.classList.add('dragging');
});
mount.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.pointer)drag.point=theatre.screenPoint(e.clientX,e.clientY);});
const release=e=>{if(drag&&e.pointerId===drag.pointer){drag=null;mount.classList.remove('dragging');theatre.puppet.crownY.kick(1.1);}};
mount.addEventListener('pointerup',release);mount.addEventListener('pointercancel',release);mount.addEventListener('lostpointercapture',release);
function tick(time){
  frameId=requestAnimationFrame(tick);if(!theatre||document.hidden){previous=time;return;}
  const dt=clamp((time-previous)/1000,0,.05);previous=time;now=time/1000;
  let age=now-actionStart;if(age>({wave:3.5,dance:6,jelly:3.5,magic:2.4}[action]||0))action='';
  const live=tracking&&time-lastTracked<800&&cameraState==='on';
  let targets=live?Object.fromEntries(Object.entries(tracking.pose).map(([k,v])=>[k,[...v]])):demoPose(now,action,age,reduced);
  if(live&&action){const animated=demoPose(now,action,age,reduced),offset=tracking.pose.hip[0];
    if(action==='jelly'||action==='dance')targets=Object.fromEntries(Object.entries(animated).map(([k,v])=>[k,[v[0]+offset,v[1],v[2]]]));
    else for(const k of action==='wave'?['elbowR','handR']:['elbowR','handR','elbowL','handL'])targets[k]=[animated[k][0]+offset,animated[k][1],animated[k][2]];
  }
  if(drag){const p=drag.point;targets[drag.key]=[clamp(p.x,-1.65,1.65),clamp(p.y,.7,3.9),clamp(p.z,-.6,.6)];
    if(drag.key==='head'||drag.key==='chest'){const sway=clamp(p.x,-1.1,1.1);targets.chest[0]+=sway*.30;targets.hip[0]+=sway*.20;}
  }
  const blink=!live&&Math.sin(now*1.43)> .998? .95:0,signals=live?tracking.signals:{};
  const expression=live?{headPitch:tracking.headPitch,headYaw:tracking.headYaw,headRoll:tracking.headRoll,blink:signals.eyeBlinkLeft||0,blinkR:signals.eyeBlinkRight||0,smile:((signals.mouthSmileLeft||0)+(signals.mouthSmileRight||0))/2,jaw:signals.jawOpen||0}:{headPitch:Math.sin(now*.7)*.05,headYaw:Math.sin(now*.6)*.08,headRoll:Math.sin(now*1.4)*.04,blink,smile:.3,jaw:action==='jelly'?.5:0};
  theatre.render(targets,dt,now,action==='jelly'?100:state.silly,expression,action==='magic',reduced);
}
let previous=performance.now();updateUI();
async function initialize(){
  try{const {RoyalTheatre}=await import('./scene.js');theatre=new RoyalTheatre(mount,state);$('#stage-loading').hidden=true;previous=performance.now();frameId=requestAnimationFrame(tick);}
  catch(e){console.error('Tiny Royals could not create the 3D theatre:',e);const overlay=$('#stage-loading');overlay.classList.add('error');overlay.innerHTML='<span class="loading-crown">♛</span><p>El teatro necesita WebGL para mostrar tu royal. Prueba con la aceleración de gráficos activada o abre el enlace en un navegador actualizado.</p><button id="reload-stage">Volver a intentar</button>';$('#reload-stage').onclick=()=>location.reload();}
}
initialize();
window.addEventListener('pagehide',()=>{royalCamera.stop();cancelAnimationFrame(frameId);});
window.addEventListener('pageshow',e=>{if(e.persisted){previous=performance.now();frameId=requestAnimationFrame(tick);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&royalCamera.active){royalCamera.stop();toast('La cámara descansó al salir del teatro. Puedes encenderla de nuevo.');}});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#theatre').classList.contains('focus-mode')){$('#theatre').classList.remove('focus-mode');document.body.classList.remove('play-focus');theatre?.resize();}
  if($('#info-dialog').open||['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const keys={w:'wave',d:'dance',j:'jelly',m:'magic'};if(keys[e.key.toLowerCase()])perform(keys[e.key.toLowerCase()]);
});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
