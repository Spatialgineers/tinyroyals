import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {REST,Spring,cameraPose,demoPose,freshPose} from '../dist/motion.js';
import {createRoyal,createKingdom,PuppetMotion} from '../dist/scene.js';
import {RoyalCamera} from '../dist/camera.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
let checks=0;
async function check(name,fn){await fn();checks++;process.stdout.write('✓ '+name+'\n');}
await check('All application scripts parse',()=>{
  for(const file of ['app.js','camera.js','scene.js','motion.js','sw.js','tracking/worker.js']){
    const p=spawnSync(process.execPath,['--check',path.join(dist,file)],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
  }
});
await check('HTML controls have unique IDs and matching handlers',()=>{
  const html=readFileSync(path.join(dist,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
  const app=readFileSync(path.join(dist,'app.js'),'utf8');
  for(const [,id]of app.matchAll(/\$\('#([a-z-]+)'\)/g))if(!['reload-stage'].includes(id))assert(ids.includes(id),'Missing UI control: '+id);
  for(const [,file]of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))if(file!=='/')assert(existsSync(path.join(dist,file)),'Missing asset: '+file);
});
await check('Runtime module imports and offline shell are local and complete',()=>{
  for(const file of ['app.js','scene.js','camera.js','motion.js','vendor/three.module.js']){
    const source=readFileSync(path.join(dist,file),'utf8');
    for(const [,specifier]of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g))assert(existsSync(path.resolve(path.dirname(path.join(dist,file)),specifier)),'Broken import '+specifier);
  }
  const sw=readFileSync(path.join(dist,'sw.js'),'utf8'),shell=sw.match(/const SHELL=\[([^\]]+)\]/)[1];
  for(const [,file]of shell.matchAll(/'([^']+)'/g))assert(existsSync(path.join(dist,file)),file);
  const manifest=JSON.parse(readFileSync(path.join(root,'.openai/hosting.json')));assert(manifest.static.directory==='dist');assert(!manifest.d1&&!manifest.r2);
});
await check('Local model bundles and WASM are valid binary assets',()=>{
  for(const file of ['pose.task','face.task'])assert(readFileSync(path.join(dist,'tracking',file)).subarray(2,6).toString('hex')==='504b0304');
  for(const file of readdirSync(path.join(dist,'tracking/wasm')).filter(f=>f.endsWith('.wasm')))assert.deepEqual([...readFileSync(path.join(dist,'tracking/wasm',file)).subarray(0,4)],[0,97,115,109]);
});
await check('Every role, hairstyle and world creates finite 3D geometry',()=>{
  for(const role of ['prince','princess'])for(let hairStyle=0;hairStyle<3;hairStyle++)for(const preset of [0,1]){
    const rig=createRoyal({role,hairStyle,preset});assert.equal(rig.eyes.length,2);assert(rig.hands.L&&rig.hands.R);
    rig.root.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));});
  }
  for(const type of ['castle','garden','moon']){const world=createKingdom(type);assert(world.root.children.length>3);world.root.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));});}
});
await check('Springs settle stably at different frame rates and softness settings',()=>{
  for(const dt of [1/120,1/60,1/20,.1])for(const damping of [.25,.94]){
    const s=new Spring(-2);s.kick(7);for(let t=0;t<20;t+=dt)s.step(3,dt,49,damping);assert(Math.abs(s.value-3)<.001);assert(Number.isFinite(s.velocity));
  }
});
const visible=(x,y,z=0,visibility=.99)=>({x,y,z,visibility,presence:.99});
function landmarks(){const p=Array.from({length:33},()=>visible(.5,.5,0,0));
  p[0]=visible(.5,.22);p[7]=visible(.57,.20);p[8]=visible(.43,.20);
  p[11]=visible(.65,.35);p[12]=visible(.35,.35);p[13]=visible(.71,.52);p[14]=visible(.29,.52);p[15]=visible(.73,.68);p[16]=visible(.27,.68);
  p[23]=visible(.57,.63);p[24]=visible(.43,.63);p[25]=visible(.57,.78);p[26]=visible(.43,.78);p[27]=visible(.57,.94);p[28]=visible(.43,.94);return p;
}
await check('Mirrored camera input raises the correct arm for both royal rigs',()=>{
  const points=landmarks();points[13]=visible(.8,.25);points[15]=visible(.82,.08);
  const mapped=cameraPose(points,[],4/3,{x:.5,y:.35});assert(mapped.pose.handL[1]>mapped.pose.shoulderL[1]);assert(mapped.pose.handL[0]<0);assert(mapped.pose.handR[1]<mapped.pose.shoulderR[1]);
  for(const role of ['prince','princess']){
    const rig=createRoyal({role}),motion=new PuppetMotion();for(let i=0;i<180;i++)motion.update(rig,mapped.pose,1/60,65,mapped);
    assert(rig.hands.L.position.y>rig.puffs.L.position.y);assert(rig.hands.R.position.y<rig.puffs.R.position.y);assert(rig.hands.L.position.x<0);
  }
});
await check('Pose confidence, upper-body fallback and raised-hand gesture are correct',()=>{
  assert.equal(cameraPose([],[]),null);const p=landmarks();p[23].visibility=p[24].visibility=p[27].visibility=p[28].visibility=0;
  const upper=cameraPose(p,[]);assert(upper&&!upper.fullBody);assert(Math.abs(upper.pose.footL[1]-.22)<1e-6);
  p[15]=visible(.8,.1);p[16]=visible(.2,.1);assert(cameraPose(p,[]).handsUp);
  p[15].visibility=.05;assert(!cameraPose(p,[]).handsUp);
  p[0].x=.54;assert(cameraPose(p,[]).headYaw<0,'Yaw must follow mirrored preview');
});
await check('Constrained ragdoll remains attached throughout all actions',()=>{
  for(const action of ['','wave','dance','jelly','magic']){
    const rig=createRoyal(),motion=new PuppetMotion();motion.kick();
    for(let i=0;i<720;i++){
      motion.update(rig,demoPose(i/60,action,(i/60)%3.5),1/60,100,{jaw:.5});
      for(const node of Object.values(motion.points))assert(node.p.toArray().every(Number.isFinite));
      const d=motion.points.shoulderL.p.distanceTo(motion.points.elbowL.p);assert(d>.45&&d<.75,'Detached upper arm: '+d);
      assert(rig.feet.L.position.y>=.14);
    }
  }
});
const globals={};for(const key of ['window','document','navigator','Worker','createImageBitmap'])globals[key]=Object.getOwnPropertyDescriptor(globalThis,key);
let workers=[],requested=null,streams=[];
function stream(){const s={tracks:[{stopped:false,onended:null,stop(){this.stopped=true;}}],getTracks(){return this.tracks;},getVideoTracks(){return this.tracks;}};streams.push(s);return s;}
class FakeWorker{constructor(){this.messages=[];this.terminated=false;workers.push(this);}postMessage(data){this.messages.push(data);if(data.type==='init')queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));}terminate(){this.terminated=true;}}
function setup(getUserMedia=async options=>{requested=options;return stream();}){
  workers=[];streams=[];requested=null;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});
  Object.defineProperty(globalThis,'Worker',{configurable:true,value:FakeWorker});
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,writable:true,value:async()=>({closed:false,close(){this.closed=true;}})});
  const video={readyState:2,videoWidth:640,videoHeight:480,currentTime:1,srcObject:null,async play(){},addEventListener(){},removeEventListener(){}};
  const events=[];const camera=new RoyalCamera(video,{status:(s)=>events.push(['status',s]),frame:f=>events.push(['frame',f]),error:s=>events.push(['error',s]),warning:s=>events.push(['warning',s])});return{camera,video,events};
}
try{
  await check('Camera is opt-in, requests no microphone and stops all tracks',async()=>{
    const {camera,video}=setup();assert.equal(requested,null);await camera.start();assert.equal(requested.audio,false);assert(camera.ready&&camera.active);assert(video.srcObject);
    camera.stop();assert(streams.every(s=>s.tracks.every(t=>t.stopped)));assert(workers.every(w=>w.terminated));assert.equal(video.srcObject,null);assert(!camera.active);
  });
  await check('Cancelling camera permission closes a late-arriving stream',async()=>{
    let resolve;const {camera}=setup(()=>new Promise(r=>resolve=r));const starting=camera.start();camera.stop();const late=stream();resolve(late);await starting;assert(late.tracks[0].stopped);assert.equal(workers.length,0);assert(!camera.active);
  });
  await check('Permission denial returns a usable explanation and leaves camera off',async()=>{
    const {camera,events}=setup(async()=>{const error=new Error();error.name='NotAllowedError';throw error;});await camera.start();assert(!camera.active);assert(events.some(([t,m])=>t==='error'&&m.includes('permiso')));
  });
  await check('Only one inference frame can be in flight',async()=>{
    const {camera,video}=setup();await camera.start();await camera.sendFrame();video.currentTime++;await camera.sendFrame();assert.equal(workers[0].messages.filter(m=>m.type==='frame').length,1);
    workers[0].onmessage({data:{type:'result',points:[]}});await camera.sendFrame();assert.equal(workers[0].messages.filter(m=>m.type==='frame').length,2);camera.stop();
  });
  await check('Stopping camera while making a bitmap discards and closes that frame',async()=>{
    const {camera}=setup();await camera.start();let resolve;globalThis.createImageBitmap=()=>new Promise(r=>resolve=r);
    const sending=camera.sendFrame();camera.stop();const bitmap={closed:false,close(){this.closed=true;}};resolve(bitmap);await sending;assert(bitmap.closed);assert.equal(workers[0].messages.filter(m=>m.type==='frame').length,0);
  });
  await check('Repeated inference failure releases the camera and worker',async()=>{
    const {camera,events}=setup();await camera.start();const worker=workers[0];for(let i=0;i<3;i++)worker.onmessage({data:{type:'frame-error'}});
    assert(!camera.active);assert(worker.terminated);assert(streams[0].tracks[0].stopped);assert(events.some(([t])=>t==='error'));
  });
}finally{for(const [key,desc]of Object.entries(globals)){if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];}}
process.stdout.write(`\n${checks} checks passed. Real webcam and WebGL browser verification remains pending.\n`);
