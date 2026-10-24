import * as T from './vendor/three.module.js';
import {REST,Spring,clamp} from './motion.js';
const UP=new T.Vector3(0,1,0),materials=new Map();
const sphereGeo=new T.SphereGeometry(1,24,16),jointGeo=new T.SphereGeometry(1,14,10),limbGeo=new T.CapsuleGeometry(1,1,5,12);
const C={gold:'#ecc968',cream:'#fff5dc',hair:'#583e39',ink:'#483844',white:'#fffdf4'};
function material(color,extras={}){
  if(Object.keys(extras).length)return new T.MeshStandardMaterial({color,roughness:.75,...extras});
  if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.75}));return materials.get(color);
}
function mesh(parent,geometry,color,pos=[0,0,0],scale=[1,1,1]){
  const m=new T.Mesh(geometry,typeof color==='string'?material(color):color);m.position.fromArray(pos);m.scale.fromArray(scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ball(parent,color,pos,scale,small=false){return mesh(parent,small?jointGeo:sphereGeo,color,pos,scale);}
function group(parent,pos=[0,0,0]){const g=new T.Group();g.position.fromArray(pos);parent.add(g);return g;}
function starGeometry(size=.2,depth=.05){
  const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?size*.45:size;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();
  return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:depth*.35,bevelThickness:depth*.35});
}
function heartGeometry(size=.1){
  const s=new T.Shape();s.moveTo(0,-size);s.bezierCurveTo(-size*.4,-size*.65,-size*1.4,size*.2,-size*.7,size*.6);s.bezierCurveTo(-size*.35,size*.9,0,size*.6,0,size*.3);s.bezierCurveTo(0,size*.6,size*.35,size*.9,size*.7,size*.6);s.bezierCurveTo(size*1.4,size*.2,size*.4,-size*.65,0,-size);
  return new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,steps:1});
}
function tubeCurve(parent,points,color,r=.024){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),color);}
function crown(parent,type=0){
  const g=group(parent);const band=mesh(g,new T.TorusGeometry(.43,.047,8,36),C.gold,[0,0,0]);band.rotation.x=Math.PI/2;
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,x=Math.sin(a)*.43,z=Math.cos(a)*.43;
    const tooth=mesh(g,new T.ConeGeometry(.10,.29,4),C.gold,[x,.13,z]);tooth.rotation.y=a+Math.PI/4;
    ball(g,C.gold,[x,.29,z],[.047,.047,.047],true);
    ball(g,i%2?'#a695dc':'#ed98bd',[x,.015,z*1.1],[.04,.055,.03],true);
  }
  if(type===1){const s=mesh(g,starGeometry(.12,.03),C.cream,[0,.21,.47]);s.rotation.z=.08;}
  return g;
}
export function createRoyal({role='princess',color='#e9a5c7',skin='#e8b08d',hair='#614639',hairStyle=0,crown:hasCrown=true,preset=0}={}){
  const root=new T.Group(),rig={root};
  const dress=role==='princess';
  rig.torso=group(root);ball(rig.torso,color,[0,.39,0],[.43,.48,.31]);
  ball(rig.torso,C.cream,[0,.70,.12],[.24,.07,.23]);
  const emblem=mesh(rig.torso,dress?heartGeometry(.10):starGeometry(.13,.025),C.gold,[0,.43,.30]);emblem.rotation.z=-.06;
  if(!dress)for(const y of [.22,.04])ball(rig.torso,C.gold,[0,y,.31],[.035,.035,.028],true);
  const belt=mesh(rig.torso,new T.TorusGeometry(.36,.035,6,32),C.gold,[0,.02,0],[1,1,.78]);belt.rotation.x=Math.PI/2;
  rig.skirt=group(root);
  if(dress){
    mesh(rig.skirt,new T.CylinderGeometry(.34,.70,.91,32),color,[0,-.31,0],[1,1,.80]);
    const hem=mesh(rig.skirt,new T.TorusGeometry(.665,.038,6,40),C.cream,[0,-.75,0],[1,1,.8]);hem.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const a=i*Math.PI*2/12;ball(rig.skirt,color,[Math.sin(a)*.65,-.72,Math.cos(a)*.53],[.11,.08,.10],true);ball(rig.skirt,C.cream,[Math.sin(a)*.65,-.59,Math.cos(a)*.54],[.025,.025,.025],true);}
    const front=mesh(rig.skirt,starGeometry(.07,.015),C.gold,[0,-.24,.47]);front.rotation.z=.1;
  }else{
    ball(rig.skirt,'#e8d9d3',[-.21,-.10,0],[.20,.26,.23]);ball(rig.skirt,'#e8d9d3',[.21,-.10,0],[.20,.26,.23]);
  }
  rig.cape=group(root);
  const capeShape=new T.Shape();capeShape.moveTo(-.34,0);capeShape.quadraticCurveTo(-.43,-.7,-.64,-1.14);capeShape.quadraticCurveTo(0,-1.34,.64,-1.14);capeShape.quadraticCurveTo(.43,-.7,.34,0);capeShape.closePath();
  const capemat=material(dress?new T.Color(color).lerp(new T.Color('#fff6f1'),.45).getStyle():color,{side:T.DoubleSide});
  rig.capeMesh=mesh(rig.cape,new T.ExtrudeGeometry(capeShape,{depth:.025,bevelEnabled:true,bevelSize:.045,bevelThickness:.02,bevelSegments:2,steps:1}),capemat,[0,0,-.26]);
  rig.cape.visible=!dress||preset===1;
  rig.head=group(root);ball(rig.head,skin,[0,0,0],[.64,.67,.57]);
  ball(rig.head,hair,[0,.05,-.13],[.65,.68,.50]);
  // A separate front face keeps facial features in front of the rear hair shell.
  ball(rig.head,skin,[0,-.05,.12],[.575,.565,.465]);
  for(const sign of [-1,1]){ball(rig.head,skin,[sign*.605,-.04,.03],[.115,.16,.105],true);ball(rig.head,'#d88a84',[sign*.654,-.05,.085],[.043,.075,.025],true);}
  const hairCap=mesh(rig.head,new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.44),hair,[0,.02,0],[.655,.69,.59]);
  for(let i=-2;i<=2;i++){const bang=ball(rig.head,hair,[i*.18,.38+Math.abs(i)*.025,.43-Math.abs(i)*.035],[.17,.17,.125],true);bang.rotation.z=i*.19;}
  rig.hair=group(rig.head);
  if(dress&&hairStyle%3===0)for(const sign of [-1,1]){
    const lock=group(rig.hair,[sign*.57,-.05,-.05]);lock.rotation.z=sign*.2;
    for(let i=0;i<3;i++)ball(lock,hair,[sign*.03,-.17-i*.19,0],[.18-i*.015,.25,.19],true);
    ball(lock,color,[0,-.12,.13],[.13,.09,.07],true);
  }
  else if(hairStyle%3===1)for(const sign of [-1,1]){
    ball(rig.hair,hair,[sign*.51,.36,-.05],[.235,.235,.215]);
    const ribbon=mesh(rig.hair,new T.TorusGeometry(.21,.027,6,20),color,[sign*.51,.37,-.015]);ribbon.rotation.x=Math.PI/2;
  }
  else{
    ball(rig.hair,hair,[-.33,.46,.12],[.3,.21,.25]);
    ball(rig.hair,hair,[.08,.48,.18],[.3,.20,.26]);
    if(dress)ball(rig.hair,hair,[0,-.23,-.30],[.58,.58,.35]);
  }
  rig.eyes=[];
  for(const sign of [-1,1]){
    const eye=group(rig.head,[sign*.235,.025,.552]);ball(eye,C.ink,[0,0,0],[.070,.10,.042],true);ball(eye,C.white,[-.018,.026,.039],[.022,.024,.010],true);rig.eyes.push(eye);
    ball(rig.head,'#e6999d',[sign*.34,-.155,.51],[.10,.055,.012],true);
    tubeCurve(rig.head,[[sign*.18,.18,.532],[sign*.24,.195,.538],[sign*.29,.18,.524]],hair,.017);
  }
  ball(rig.head,skin,[0,-.11,.593],[.065,.045,.035],true);
  rig.smile=tubeCurve(rig.head,[[-.13,-.22,.55],[-.07,-.27,.569],[0,-.285,.576],[.07,-.27,.569],[.13,-.22,.55]],'#885359',.018);
  rig.mouth=ball(rig.head,'#834e59',[0,-.245,.567],[.11,.075,.015],true);rig.mouth.visible=false;
  ball(rig.mouth,'#e9a3a8',[0,-.34,.55],[.6,.32,.35],true);
  rig.crown=group(rig.head,[0,.57,0]);rig.crown.add(crown(new T.Group(),preset));rig.crown.visible=hasCrown;
  rig.limbs={};rig.hands={};rig.feet={};rig.puffs={};
  const tights=dress?'#f9ecd9':'#676688';
  for(const side of ['L','R']){
    for(const [name,col,width]of [['upper',color,.11],['lower',skin,.095],['thigh',tights,.14],['shin',tights,.11]]){
      const m=mesh(root,limbGeo,col);rig.limbs[name+side]={mesh:m,width};
    }
    const hand=group(root);ball(hand,skin,[0,0,0],[.145,.17,.125],true);ball(hand,skin,[(side==='L'?1:-1)*.13,-.015,.025],[.065,.08,.065],true);rig.hands[side]=hand;
    const foot=group(root);ball(foot,color,[0,0,.10],[.17,.115,.255],true);if(dress){const bow=mesh(foot,heartGeometry(.055),C.gold,[0,.10,.17]);bow.rotation.x=-.7;}rig.feet[side]=foot;
    rig.puffs[side]=ball(root,dress?'#f5d7e6':color,[0,0,0],[dress?.22:.17,.22,.22],true);
  }
  rig.wand=group(root);const stick=mesh(rig.wand,new T.CylinderGeometry(.022,.022,.58,8),C.gold,[0,.22,0]);
  rig.wandStar=mesh(rig.wand,starGeometry(.15,.05),C.cream,[0,.56,0]);
  rig.wand.visible=false;
  return rig;
}
function disposeGeometries(root){root.traverse(o=>{if(!o.isMesh)return;if(![sphereGeo,jointGeo,limbGeo].includes(o.geometry)&&!o.geometry.userData.shared)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(![...materials.values()].includes(m)&&!m.userData.shared){m.map?.dispose();m.dispose();}});}
const constraints=[['hip','chest',.74,0,.8],['chest','head',.84,.25,1],['chest','shoulderL',.5,.2,1],['chest','shoulderR',.5,.2,1],['shoulderL','elbowL',.59,.15,1],['elbowL','handL',.53,.3,1],['shoulderR','elbowR',.59,.15,1],['elbowR','handR',.53,.3,1],['hip','hipL',.235,0,1],['hip','hipR',.235,0,1],['hipL','kneeL',.64,.1,1],['kneeL','footL',.64,.2,1],['hipR','kneeR',.64,.1,1],['kneeR','footR',.64,.2,1]];
export class PuppetMotion{
  constructor(){this.points=Object.fromEntries(Object.entries(REST).map(([key,v])=>[key,{p:new T.Vector3(...v),springs:v.map(x=>new Spring(x))}]));this.headPitch=new Spring();this.headYaw=new Spring();this.headRoll=new Spring();this.crownRoll=new Spring();this.crownY=new Spring();this.skirtRoll=new Spring();this.capeRoll=new Spring();this.tmp=new T.Vector3();}
  kick(){for(const [k,v]of Object.entries(this.points)){if(k!=='hip'){v.springs[0].kick((Math.random()-.5)*3);v.springs[1].kick(Math.random()*3);}}this.crownY.kick(3);this.crownRoll.kick(3);}
  update(rig,targets,dt,silly,expression={}){
    const soft=silly/100,stiff=145-soft*96,damping=.94-soft*.64;
    for(const [key,node]of Object.entries(this.points)){
      const target=targets[key]||REST[key];for(let i=0;i<3;i++)node.p.setComponent(i,node.springs[i].step(target[i],dt,key==='hip'?200:stiff,damping));
    }
    // Soft distance constraints keep arms and legs attached during overshoot.
    for(let n=0;n<3;n++)for(const [a,b,length,wa,wb]of constraints){
      const p=this.points[a].p,q=this.points[b].p,v=this.tmp.subVectors(q,p),d=v.length();if(d<.00001)continue;
      v.multiplyScalar((d-length)/d*.72);p.addScaledVector(v,wa/(wa+wb));q.addScaledVector(v,-wb/(wa+wb));
    }
    for(const node of Object.values(this.points))for(let i=0;i<3;i++)node.springs[i].value=node.p.getComponent(i);
    const p=k=>this.points[k].p,dir=new T.Vector3().subVectors(p('chest'),p('hip'));
    rig.torso.position.copy(p('hip'));rig.torso.quaternion.setFromUnitVectors(UP,dir.normalize());
    rig.skirt.position.copy(p('hip'));const lean=Math.atan2(p('chest').x-p('hip').x,p('chest').y-p('hip').y);
    rig.skirt.rotation.z=this.skirtRoll.step(-lean*.7,dt,50,.45);
    rig.cape.position.copy(p('chest'));rig.cape.rotation.z=this.capeRoll.step(-lean,dt,35,.4);rig.cape.rotation.x=.14+Math.abs(this.points.hip.springs[0].velocity)*.08;
    rig.head.position.copy(p('head'));rig.head.rotation.set(this.headPitch.step(expression.headPitch||0,dt,90,.6),this.headYaw.step(expression.headYaw||0,dt,90,.6),this.headRoll.step(expression.headRoll||-lean*.8,dt,65,.4));
    rig.crown.rotation.z=this.crownRoll.step(-rig.head.rotation.z*.3,dt,40,.24);
    rig.crown.position.y=.57+clamp(this.crownY.step(Math.min(.12,Math.abs(this.points.head.springs[1].velocity)*.045),dt,48,.22),-.025,.36);
    const blink=expression.blink??0,blinkR=expression.blinkR??blink;
    rig.eyes[0].scale.y=clamp(1-blink*.95,.08,1);rig.eyes[1].scale.y=clamp(1-blinkR*.95,.08,1);
    rig.smile.scale.x=1+(expression.smile||0)*.24;const jaw=expression.jaw||0;rig.mouth.visible=jaw>.18;rig.smile.visible=!rig.mouth.visible;rig.mouth.scale.y=.075+clamp(jaw,0,1)*.17;
    const bone=(name,a,b)=>{const limb=rig.limbs[name],v=new T.Vector3().subVectors(p(b),p(a));limb.mesh.position.copy(p(a)).add(p(b)).multiplyScalar(.5);limb.mesh.quaternion.setFromUnitVectors(UP,v.clone().normalize());limb.mesh.scale.set(limb.width,v.length()/3,limb.width);};
    for(const side of ['L','R']){
      bone('upper'+side,'shoulder'+side,'elbow'+side);bone('lower'+side,'elbow'+side,'hand'+side);bone('thigh'+side,'hip'+side,'knee'+side);bone('shin'+side,'knee'+side,'foot'+side);
      rig.hands[side].position.copy(p('hand'+side));rig.hands[side].quaternion.setFromUnitVectors(UP,new T.Vector3().subVectors(p('elbow'+side),p('hand'+side)).normalize());
      rig.feet[side].position.copy(p('foot'+side));rig.feet[side].position.y=Math.max(.14,rig.feet[side].position.y);rig.feet[side].rotation.z=clamp(-lean*.3,-.3,.3);
      rig.puffs[side].position.copy(p('shoulder'+side));
    }
    rig.wand.position.copy(p('handR'));rig.wand.rotation.z=-.3+lean*.4;
  }
}
function cloud(parent,pos,scale=1,color='#fff9f3'){
  const g=group(parent,pos);g.scale.setScalar(scale);
  ball(g,color,[0,0,0],[.62,.25,.36]);ball(g,color,[-.35,-.02,0],[.31,.21,.28],true);ball(g,color,[.25,.12,0],[.37,.27,.31],true);return g;
}
function castle(parent){
  const g=group(parent,[0,0,-2.6]);g.scale.setScalar(.88);
  const pale='#f4e8f4',trim='#d4b8e5',roof='#c3a4d7',window='#b89ac5';
  mesh(g,new T.BoxGeometry(2.8,2.55,.8),pale,[0,1.4,0]);
  mesh(g,new T.BoxGeometry(1.08,3.65,.85),pale,[0,1.96,-.45]);
  for(const [x,y,h]of [[-1.65,1.5,3],[1.65,1.5,3],[-.64,2.6,2.3],[.64,2.6,2.3]]){
    mesh(g,new T.CylinderGeometry(.37,.39,h,20),pale,[x,y,0]);
    mesh(g,new T.TorusGeometry(.38,.045,6,20),trim,[x,y+h/2-.08,0]).rotation.x=Math.PI/2;
    mesh(g,new T.ConeGeometry(.52,.9,20),roof,[x,y+h/2+.38,0]);
    const flag=group(g,[x,y+h/2+.86,0]);mesh(flag,new T.CylinderGeometry(.015,.015,.4,5),C.gold,[0,.12,0]);
    const s=new T.Shape();s.moveTo(0,.1);s.lineTo(.28,.1);s.lineTo(.21,.26);s.lineTo(0,.26);mesh(flag,new T.ShapeGeometry(s),'#e2acc9');
    mesh(g,new T.CapsuleGeometry(.11,.23,4,12),window,[x,y+.45,.35],[1,1,.18]);
  }
  for(const x of [-1,-.5,.5,1])mesh(g,new T.BoxGeometry(.23,.27,.83),pale,[x,2.8,0]);
  const door=new T.Shape();door.moveTo(-.33,0);door.lineTo(-.33,.82);door.absarc(0,.82,.33,Math.PI,0,true);door.lineTo(.33,0);door.closePath();
  mesh(g,new T.ShapeGeometry(door),'#d0b2dc',[0,.11,.411]);
  for(const x of [-.81,.81])mesh(g,new T.CapsuleGeometry(.11,.25,4,12),window,[x,1.6,.415],[1,1,.12]);
  mesh(g,new T.CapsuleGeometry(.11,.3,4,12),window,[0,3.08,.0],[1,1,.1]);
  return g;
}
function flower(parent,pos,scale=1,color='#f0aac8'){
  const g=group(parent,pos);g.scale.setScalar(scale);mesh(g,new T.CylinderGeometry(.025,.025,.62,7),'#96b4a2',[0,.3,0]);
  ball(g,'#9db6a0',[-.12,.22,0],[.16,.065,.055],true).rotation.z=.4;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,color,[Math.sin(a)*.12,.67+Math.cos(a)*.12,.03],[.115,.13,.035],true);}
  ball(g,C.gold,[0,.67,.07],[.08,.08,.04],true);return g;
}
export function createKingdom(type='castle'){
  const root=new T.Group(),floating=[];
  const themes={castle:{sky:'#ece4f4',ground:'#eaddec',disc:'#e7d5e5'},garden:{sky:'#e5efe9',ground:'#d7e7d6',disc:'#e7e7bf'},moon:{sky:'#363452',ground:'#494462',disc:'#62536e'}};
  const theme=themes[type]||themes.castle;
  const floor=mesh(root,new T.CircleGeometry(25,64),theme.ground,[0,-.06,0]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  const pedestal=mesh(root,new T.CylinderGeometry(1.72,1.82,.15,64),theme.disc,[0,.015,0]);pedestal.castShadow=false;
  const rim=mesh(root,new T.TorusGeometry(1.70,.02,5,64),type==='moon'?'#a990b7':'#f6ecf0',[0,.095,0]);rim.rotation.x=Math.PI/2;
  // Soft contact shadow under the puppet without a post-processing pass.
  const shadowCanvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(shadowCanvas){shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,62);gradient.addColorStop(0,'rgba(93,57,92,.23)');gradient.addColorStop(1,'rgba(93,57,92,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const sm=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});const shadow=mesh(root,new T.PlaneGeometry(2,1.3),sm,[0,.098,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  }
  if(type==='castle'){
    const c=castle(root);c.position.x=-1.8;c.position.z=-3.25;c.rotation.y=.13;
    for(const [pos,s]of [[[2.7,.42,-1.7],1.6],[[-2.7,.35,-.4],1.2],[[1.7,4.1,-2.8],.85],[[-3.3,3.2,-4],.75]])floating.push({mesh:cloud(root,pos,s),base:pos[1],phase:Math.random()*6,speed:.65});
    for(const [pos,r]of [[[2.2,3.4,-1.5],.27],[[-2.5,2.0,-.5],.19],[[3.1,1.8,-2],.18],[[-1.0,4.4,-3],.13]]){
      const st=mesh(root,starGeometry(r,.075),C.gold,pos);st.rotation.z=-.15;floating.push({mesh:st,base:pos[1],phase:Math.random()*6,speed:.9,spin:true});
    }
  }else if(type==='garden'){
    for(const [x,z,s,c]of [[-2.5,-.3,1.5,'#eeafc9'],[2.3,-.3,1.25,'#b69fd4'],[-1.9,-1.8,1,'#eedb88'],[3,-2,1.6,'#e8b0c6'],[-3.2,-2,1.8,'#bc9ed0'],[1.6,-2.2,.8,'#edc589']])flower(root,[x,.05,z],s,c);
    for(const [x,z,s]of [[-3,-2.8,1.4],[3.5,-3,1.9]]){
      mesh(root,new T.CylinderGeometry(.13,.18,2,12),'#bc9784',[x,1,z]);ball(root,'#b6d1b5',[x,2.45,z],[.85*s,1.0*s,.65*s]);ball(root,'#cadbb7',[x+.4,2.8,z+.1],[.58*s,.65*s,.54*s]);
    }
    floating.push({mesh:cloud(root,[1.8,4.2,-4],1.1),base:4.2,phase:1,speed:.4});
    for(let i=0;i<7;i++){const f=mesh(root,starGeometry(.055,.015),'#f5cb69',[(i%2?1:-1)*(1.3+Math.random()*1.4),.8+Math.random()*2.8,-Math.random()*2]);floating.push({mesh:f,base:f.position.y,phase:i,speed:1.4,spin:true});}
  }else{
    const moonShape=new T.Shape();moonShape.absarc(0,0,.62,.5,Math.PI*1.85,false);moonShape.quadraticCurveTo(-.10,-.10,.62*Math.cos(.5),.62*Math.sin(.5));
    const moon=mesh(root,new T.ExtrudeGeometry(moonShape,{depth:.12,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2,steps:1}),material('#f4d9a0',{emissive:'#a47e47',emissiveIntensity:.3}),[2.15,3.65,-2.6]);moon.rotation.z=.1;
    for(let i=0;i<22;i++){const x=(i%2?1:-1)*(1.1+(i*.419)%2.8),y=.65+(i*.619)%4.1;
      const st=mesh(root,starGeometry(.045+(i%3)*.03,.02),i%3?'#f3dcaa':'#d5bde5',[x,y,-2.2-(i%3)]);floating.push({mesh:st,base:y,phase:i,speed:.4,spin:true});
    }
    floating.push({mesh:cloud(root,[-2.8,.4,-1.2],1.3,'#79728d'),base:.4,phase:2,speed:.5});
    floating.push({mesh:cloud(root,[2.3,.35,-.5],1.1,'#85768f'),base:.35,phase:4,speed:.5});
  }
  return {root,floating,theme};
}
export class RoyalTheatre{
  constructor(mount,options){
    this.mount=mount;this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'default'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(36,1,.1,80);
    this.camera.position.set(0,2.9,9.8);this.camera.lookAt(0,2.1,0);
    this.scene.add(new T.HemisphereLight('#fff8ed','#bea4c8',2.4));
    this.light=new T.DirectionalLight('#fff7e6',3.5);this.light.position.set(-3,7,5);this.light.castShadow=true;this.light.shadow.mapSize.set(1024,1024);this.light.shadow.camera.left=-5;this.light.shadow.camera.right=5;this.light.shadow.camera.top=7;this.light.shadow.camera.bottom=-3;this.light.shadow.bias=-.001;this.light.shadow.normalBias=.025;this.scene.add(this.light);
    const fill=new T.DirectionalLight('#ded3ff',1.5);fill.position.set(4,3,2);this.scene.add(fill);
    this.puppet=new PuppetMotion();this.particles=[];this.targets=new Map();this.sparkGeo=starGeometry(.06,.025);this.heartGeo=heartGeometry(.07);this.targetStarGeo=starGeometry(.24,.08);this.targetStarMat=material('#f5c84c',{emissive:'#c48a1a',emissiveIntensity:.45,roughness:.4});this.targetStarGeo.userData.shared=this.targetStarMat.userData.shared=true;this.setRoyal(options);this.setKingdom(options.scene||'castle');
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(mount);this.resize();
  }
  setRoyal(options){if(this.royal){this.scene.remove(this.royal.root);disposeGeometries(this.royal.root);}this.royal=createRoyal(options);this.scene.add(this.royal.root);}
  setKingdom(type){if(this.kingdom){this.scene.remove(this.kingdom.root);disposeGeometries(this.kingdom.root);}this.kingdom=createKingdom(type);if(this.gameMode)this.setGameMode(true);this.scene.add(this.kingdom.root);this.scene.background=new T.Color(this.kingdom.theme.sky);this.scene.fog=new T.Fog(this.kingdom.theme.sky,12,30);}
  resize(){const {width:w,height:h}=this.mount.getBoundingClientRect();if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
    // Portrait screens retain the entire puppet, including its bouncing crown.
    this.camera.position.z=w/h<.83?10.1:9.8;this.camera.fov=36;this.camera.lookAt(0,2.03,0);this.camera.updateProjectionMatrix();}
  screenPoint(x,y){const r=this.mount.getBoundingClientRect(),mouse=new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),ray=new T.Raycaster();ray.setFromCamera(mouse,this.camera);return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),0),new T.Vector3())||new T.Vector3(0,2,0);}
  emit(pos,count,palette,geometry=this.sparkGeo,speed=1,size=1){
    for(let i=0;i<count;i++){const m=mesh(this.scene,geometry,palette[i%palette.length],pos);m.castShadow=false;m.scale.setScalar((.6+Math.random()*1.3)*size);this.particles.push({mesh:m,velocity:new T.Vector3((Math.random()-.5)*4*speed,(Math.random()*3+1)*speed,(Math.random()-.5)*2*speed),life:(2.2+Math.random())*Math.min(1,.45+speed*.4),age:0});}
  }
  magic(){this.emit([0,2.3,.4],46,['#f2c765','#e5acd4','#a5d3c4','#bca2e1','#f8edcf']);}
  hearts(pos=[0,3.1,.5]){this.emit(pos,9,['#ef8fb6','#f6b7cf','#e5acd4'],this.heartGeo,.55);}
  burst(pos,kind='star'){
    if(kind==='storm'){this.emit(pos,14,['#8f88a6','#b3aec4','#f2d46b'],this.sparkGeo,.7,.8);return;}
    this.emit(pos,kind==='crown'?30:14,kind==='crown'?['#f2c765','#fff0b8','#e5acd4']:['#f2c765','#ffe9a6','#fff7dd'],this.sparkGeo,kind==='crown'?.9:.6,kind==='crown'?1.2:.9);
  }
  targetMesh(kind){
    const g=new T.Group();
    if(kind==='crown'){const c=crown(g);c.scale.setScalar(.5);c.rotation.x=.35;}
    else if(kind==='storm'){
      cloud(g,[0,0,0],.62,'#8f88a6');
      const bolt=new T.Shape();bolt.moveTo(.02,0);bolt.lineTo(-.12,-.2);bolt.lineTo(-.01,-.2);bolt.lineTo(-.09,-.42);bolt.lineTo(.13,-.13);bolt.lineTo(.02,-.13);bolt.lineTo(.09,0);bolt.closePath();
      mesh(g,new T.ExtrudeGeometry(bolt,{depth:.04,bevelEnabled:false}),material('#f2d46b',{emissive:'#b48d1f',emissiveIntensity:.6}),[0,-.08,.12]);
      for(const sign of [-1,1])ball(g,C.ink,[sign*.11,.04,.24],[.03,.022,.02],true);
    }else{
      mesh(g,this.targetStarGeo,this.targetStarMat);
      ball(g,C.ink,[-.06,.01,.11],[.022,.032,.012],true);ball(g,C.ink,[.06,.01,.11],[.022,.032,.012],true);
    }
    g.traverse(o=>{o.castShadow=false;});return g;
  }
  syncTargets(targets,time){
    const alive=new Set();
    for(const t of targets){
      alive.add(t.id);let m=this.targets.get(t.id);
      if(!m){m=this.targetMesh(t.kind);this.targets.set(t.id,m);this.scene.add(m);}
      m.position.fromArray(t.pos);
      const appear=Math.min(1,t.age*4),fade=t.age>t.life-.6?Math.max(.15,(t.life-t.age)/.6):1;
      m.scale.setScalar((t.kind==='crown'?1.25:1)*appear*fade*(1+Math.sin(time*6+t.phase)*.06));
      m.rotation.y=t.kind==='storm'?Math.sin(time*2+t.phase)*.3:Math.sin(time*2.4+t.phase)*.55;m.rotation.z=t.kind==='star'?Math.sin(time*3+t.phase)*.15:0;
    }
    for(const [id,m]of this.targets)if(!alive.has(id)){this.scene.remove(m);disposeGeometries(m);this.targets.delete(id);}
  }
  render(targets,dt,time,silly,expression,magic=false,reduced=false){
    this.puppet.update(this.royal,targets,dt,silly,expression);this.royal.wand.visible=magic;this.royal.wandStar.rotation.y=time*1.5;
    for(const f of this.kingdom.floating){if(!reduced){f.mesh.position.y=f.base+Math.sin(time*f.speed+f.phase)*.095;if(f.spin)f.mesh.rotation.y=time*.25;}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>p.life){this.scene.remove(p.mesh);this.particles.splice(i,1);continue;}p.velocity.y-=dt*1.6;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.z+=dt*2;p.mesh.scale.multiplyScalar(1-dt*.35);}
    this.renderer.render(this.scene,this.camera);
  }
  // Decorative scenery stars hide during the game so only catchable stars glow.
  setGameMode(on){this.gameMode=on;for(const f of this.kingdom.floating)if(f.spin)f.mesh.visible=!on;}
  project(pos){const v=new T.Vector3(...pos).project(this.camera),r=this.mount.getBoundingClientRect();return {x:(v.x+1)/2*r.width,y:(1-v.y)/2*r.height};}
  photo(){return new Promise(resolve=>this.renderer.domElement.toBlob(resolve,'image/png'));}
  destroy(){this.resizeObserver.disconnect();this.renderer.dispose();}
}
