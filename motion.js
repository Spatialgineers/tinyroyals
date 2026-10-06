// Camera-to-puppet mapping, independent of rendering. Image coordinates are
// mirrored once here, so the puppet follows the child's mirrored preview.
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const REST = {
  hip:[0,1.55,0],chest:[0,2.29,0],head:[0,3.13,0],
  shoulderL:[-.49,2.38,0],elbowL:[-.76,1.86,0],handL:[-.88,1.35,.08],
  shoulderR:[.49,2.38,0],elbowR:[.76,1.86,0],handR:[.88,1.35,.08],
  hipL:[-.23,1.5,0],kneeL:[-.23,.86,0],footL:[-.23,.22,.1],
  hipR:[.23,1.5,0],kneeR:[.23,.86,0],footR:[.23,.22,.1]
};
export const freshPose = ()=>Object.fromEntries(Object.entries(REST).map(([k,v])=>[k,[...v]]));
const valid = (p,threshold=.4)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>threshold&&(p.presence??1)>threshold;
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
function bone(points,world,a,b,length,aspect,fallback){
  if(!valid(points[a])||!valid(points[b]))return fallback;
  let v;
  if(valid(world?.[a])&&valid(world?.[b]))v=[-(world[b].x-world[a].x),-(world[b].y-world[a].y),-(world[b].z-world[a].z)*.8];
  else v=[-(points[b].x-points[a].x)*aspect,-(points[b].y-points[a].y),-(points[b].z-points[a].z)*.5||0];
  const d=Math.hypot(...v);return d>1e-4?v.map(x=>x/d*length):fallback;
}
const sum=(a,b)=>a.map((v,i)=>v+b[i]);
export function cameraPose(points,world,aspect=4/3,calibration=null){
  if(!valid(points?.[11])||!valid(points?.[12]))return null;
  const pose=freshPose(),s=midpoint(points[11],points[12]);
  const hipsVisible=valid(points[23],.55)&&valid(points[24],.55);
  const h=hipsVisible?midpoint(points[23],points[24]):{x:s.x,y:s.y+.25};
  const moveX=clamp(-(s.x-(calibration?.x??.5))*3.8,-1.25,1.25);
  const jump=calibration?clamp((calibration.y-s.y)*5.5,-.25,.65):0;
  const roll=clamp(Math.atan2(points[11].y-points[12].y,Math.abs(points[11].x-points[12].x)*aspect),-.55,.55);
  const lean=clamp(-(s.x-h.x)*3,-.42,.42);
  pose.hip=[moveX,1.55+jump,0];pose.chest=[moveX+lean,2.29+jump,0];
  pose.head=[moveX+lean*1.35,3.13+jump,0];
  pose.shoulderL=[pose.chest[0]-.49*Math.cos(roll),pose.chest[1]+.09-.49*Math.sin(roll),0];
  pose.shoulderR=[pose.chest[0]+.49*Math.cos(roll),pose.chest[1]+.09+.49*Math.sin(roll),0];
  for(const [side,a,b,c]of [['L',11,13,15],['R',12,14,16]]){
    const sign=side==='L'?-1:1;
    pose['elbow'+side]=sum(pose['shoulder'+side],bone(points,world,a,b,.59,aspect,[sign*.27,-.52,0]));
    pose['hand'+side]=sum(pose['elbow'+side],bone(points,world,b,c,.53,aspect,[sign*.12,-.51,.08]));
    const i=side==='L'?23:24;
    pose['hip'+side]=sum(pose.hip,[sign*.23,-.05,0]);
    if(valid(points[i],.65)&&valid(points[i+2],.65)&&valid(points[i+4],.65)&&points[i+4].y<.99){
      pose['knee'+side]=sum(pose['hip'+side],bone(points,world,i,i+2,.64,aspect,[0,-.64,0]));
      pose['foot'+side]=sum(pose['knee'+side],bone(points,world,i+2,i+4,.64,aspect,[0,-.64,.1]));
      pose['foot'+side][1]=Math.max(.16,pose['foot'+side][1]);
    }else{
      pose['knee'+side]=sum(pose['hip'+side],[0,-.64,0]);
      pose['foot'+side]=sum(pose['knee'+side],[0,-.64,.1]);
    }
  }
  let headRoll=roll,headYaw=0,headPitch=0;
  if(valid(points[7])&&valid(points[8])&&valid(points[0])){
    const w=Math.max(.06,Math.abs(points[7].x-points[8].x));
    headRoll=clamp(Math.atan2(points[7].y-points[8].y,w*aspect),-.6,.6);
    headYaw=clamp(-(points[0].x-(points[7].x+points[8].x)/2)/w*2,-.7,.7);
    headPitch=clamp((points[0].y-(points[7].y+points[8].y)/2)/w-.15,-.3,.35);
  }
  return {pose,headRoll,headYaw,headPitch,roll,center:s,
    handsUp:valid(points[15])&&valid(points[16])&&points[15].y<s.y-.09&&points[16].y<s.y-.09,
    fullBody:valid(points[27],.65)&&valid(points[28],.65)&&points[27].y<.99&&points[28].y<.99};
}
// Stable substeps preserve spring behavior on mobile and after a long frame.
export class Spring {
  constructor(value=0){this.value=value;this.velocity=0;}
  step(target,dt,stiffness=100,damping=.6){
    const n=Math.ceil(clamp(dt,0,.1)*120)||1,h=clamp(dt,0,.1)/n;
    for(let i=0;i<n;i++){
      this.velocity+=(stiffness*(target-this.value)-2*damping*Math.sqrt(stiffness)*this.velocity)*h;
      this.value+=this.velocity*h;
    }return this.value;
  }
  kick(v){this.velocity+=v;}
}
export function demoPose(time,action='',age=0,reduced=false){
  const p=freshPose(),a=reduced?.25:1,sway=Math.sin(time*1.4)*.06*a;
  p.chest[0]=sway;p.head[0]=sway*1.5;p.head[1]+=Math.sin(time*2.3)*.025*a;
  for(const side of ['L','R']){p['hand'+side][2]+=.05*Math.sin(time*2);p['elbow'+side][0]+=sway;}
  if(action==='wave'){
    p.elbowR=[.95,2.6,.05];p.handR=[.87+Math.sin(age*13)*.22,3.14,.18];
    p.head[0]=-.08;
  }
  if(action==='dance'){
    const beat=Math.sin(age*7),bounce=Math.abs(beat)*.2*a;
    for(const v of Object.values(p)){v[0]+=beat*.16*a;v[1]+=bounce;}
    p.elbowL=[-.82+beat*.1,2.3+beat*.28,0];p.handL=[-1.13,2.75+beat*.3,.1];
    p.elbowR=[.82+beat*.1,2.3-beat*.28,0];p.handR=[1.13,2.75-beat*.3,.1];
    p.footL[1]+=.15*Math.max(0,-beat);p.footR[1]+=.15*Math.max(0,beat);
  }
  if(action==='magic'){
    p.elbowL=[-.8,2.6,0];p.handL=[-.64,3.16,.2];
    p.elbowR=[.8,2.6,0];p.handR=[.64,3.16,.2];
  }
  if(action==='jelly'){
    const amount=Math.sin(Math.min(1,age/3.5)*Math.PI)*a,angle=.85*amount,c=Math.cos(angle),s=Math.sin(angle);
    for(const v of Object.values(p)){
      const x=v[0],y=v[1]-1.55;v[0]=x*c-y*s;v[1]=Math.max(.18,1.55-amount*.93+x*s+y*c);
      v[2]+=amount*.16*Math.sin(time*9+v[0]);
    }
  }
  return p;
}
