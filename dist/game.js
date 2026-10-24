// "¡Atrapa estrellas!": a gentle catch game, independent of rendering so it can
// be verified without WebGL. Positions use the same world units as motion.js.
import {clamp,REST} from './motion.js';
export const ROUND=45;
export const KINDS={
  star:{points:1,radius:.34,life:4.6},
  crown:{points:5,radius:.38,life:3.4},
  storm:{points:0,radius:.36,life:4.2}
};
// Hands catch everything; head and feet make silly bonus catches possible.
const CATCHERS={handL:.42,handR:.42,head:.46,footL:.36,footR:.36};
export const CATCHER_KEYS=Object.keys(CATCHERS);
export function crownsFor(score){return score>=45?3:score>=22?2:score>=8?1:0;}
export class StarGame{
  constructor(random=Math.random){this.random=random;this.reset();}
  reset(){this.state='idle';this.time=0;this.countdown=0;this.score=0;this.caught=0;this.combo=0;this.bestCombo=0;this.targets=[];this.nextSpawn=0;this.id=0;this.storms=0;}
  start(){this.reset();this.state='countdown';this.countdown=3;}
  stop(){this.state='idle';this.targets=[];}
  get active(){return this.state==='countdown'||this.state==='playing';}
  get remaining(){return Math.max(0,ROUND-this.time);}
  get multiplier(){return this.combo>=12?3:this.combo>=5?2:1;}
  spawn(){
    const r=this.random,kindRoll=r(),late=this.time>12;
    const kind=late&&kindRoll<.13?'storm':kindRoll>.9?'crown':'star';
    // A few low stars invite kicks; the rest sit within arm's reach.
    const low=kind==='star'&&r()<.16;
    // Never spawn where a resting royal would already touch it, so every catch needs a move.
    let pos;
    for(let tries=0;tries<20;tries++){
      pos=[(r()*2-1)*1.85,low?.35+r()*.45:1.0+r()*2.55,.12];
      if(CATCHER_KEYS.every(k=>Math.hypot(REST[k][0]-pos[0],REST[k][1]-pos[1])>.8))break;
    }
    const target={id:++this.id,kind,pos,base:[...pos],age:0,life:KINDS[kind].life*(kind==='storm'?1:1-Math.min(.25,this.time/ROUND*.25)),phase:r()*6,drift:(r()-.5)*.35};
    this.targets.push(target);return target;
  }
  // points: {handL:[x,y,z],...}. Returns events for the UI and renderer.
  update(dt,points){
    const events=[];dt=clamp(dt,0,.1);
    if(this.state==='countdown'){
      const before=Math.ceil(this.countdown);this.countdown-=dt;const after=Math.ceil(this.countdown);
      if(after!==before&&after>0)events.push({type:'tick',value:after});
      if(this.countdown<=0){this.state='playing';this.nextSpawn=.2;events.push({type:'go'});}
      return events;
    }
    if(this.state!=='playing')return events;
    this.time+=dt;this.nextSpawn-=dt;
    const busy=this.targets.length,maximum=this.time>25?5:4;
    if(this.nextSpawn<=0&&busy<maximum){this.spawn();this.nextSpawn=clamp(1.15-this.time*.013,.55,1.15);}
    for(let i=this.targets.length-1;i>=0;i--){
      const t=this.targets[i];t.age+=dt;
      t.pos[0]=t.base[0]+Math.sin(t.age*1.3+t.phase)*.12+t.drift*t.age*.3;
      t.pos[1]=t.base[1]+Math.sin(t.age*2.1+t.phase)*.08;
      let by=null;
      for(const key of CATCHER_KEYS){const p=points?.[key];if(!p)continue;
        if(Math.hypot(p[0]-t.pos[0],p[1]-t.pos[1])<CATCHERS[key]+KINDS[t.kind].radius-.25){by=key;break;}
      }
      if(by){
        this.targets.splice(i,1);
        if(t.kind==='storm'){this.combo=0;this.storms++;events.push({type:'storm',pos:[...t.pos],by});continue;}
        this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.caught++;
        const gained=KINDS[t.kind].points*this.multiplier;this.score+=gained;
        events.push({type:'catch',kind:t.kind,pos:[...t.pos],by,gained,combo:this.combo,multiplier:this.multiplier});
        continue;
      }
      if(t.age>t.life){
        this.targets.splice(i,1);
        if(t.kind!=='storm'){if(this.combo>=3)events.push({type:'combo-lost',combo:this.combo});this.combo=0;}
        events.push({type:'expire',kind:t.kind,id:t.id});
      }
    }
    if(this.time>=ROUND){
      this.state='done';this.targets=[];
      events.push({type:'end',score:this.score,caught:this.caught,bestCombo:this.bestCombo,crowns:crownsFor(this.score),storms:this.storms});
    }
    return events;
  }
}
