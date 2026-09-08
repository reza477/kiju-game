const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

// Additive camera offsets never feed back into the orbit or its smoothed anchor.
// Events use simulation time; direct mouse control always takes precedence.
export class CinematicCamera {
  constructor(mode='cinematic') {this.mode=mode;this.pulses=[];this.entry=null;this.manualTime=0;this.motion=0;this.output={right:0,up:0,dolly:0,yaw:0,fov:0,lead:0,focus:0};}
  setMode(mode){this.mode=mode==='steady'?'steady':'cinematic';this.reset();}
  reset(){this.pulses.length=0;this.entry=null;this.motion=0;}
  transition(kind){this.pulses.length=0;this.entry=this.mode==='cinematic'?{kind,age:0}:null;}
  manual(){this.manualTime=1.1;this.reset();}
  impulse(strength,side=1){if(this.mode!=='cinematic'||this.manualTime>0)return;this.pulses.push({age:0,strength:clamp(strength,0,1.2),side:Math.sign(side)||1});if(this.pulses.length>6)this.pulses.shift();}
  update({dt,time,paused=false,speed=1,view='city',battle=false,moving=false,preview=false,shotAge=-1,impactDelay=.55}){
    const o=this.output;for(const k in o)o[k]=0;
    this.manualTime=Math.max(0,this.manualTime-dt);
    if(this.mode==='steady'||this.manualTime>0||paused)return o;
    const step=clamp(dt,0,.1)*speed;
    this.motion+=(Number(moving)-this.motion)*(1-Math.exp(-step*2.8));
    const broad=battle||view==='world'||view==='carrier';
    // The close building and street cameras stay still for precise selection.
    if(broad||preview){o.yaw=Math.sin(time*.19)*.006;o.up=Math.sin(time*.43)*.035;o.dolly=this.motion*.024;o.lead=this.motion*.3;}
    if(this.entry){const e=this.entry;e.age+=step;const t=clamp(e.age/1.8,0,1),ease=(1-t)**3;
      if(broad||preview){o.dolly+=ease*(e.kind==='battle'?.11:.055);o.yaw+=Math.sin(t*Math.PI)*.055;}
      if(t===1)this.entry=null;
    }
    // Anticipate one real strike, hold its point of contact through impact,
    // then give the tactical overview back. The anchor itself never moves.
    if(battle&&shotAge>=0&&shotAge<impactDelay+1.05){
      const shot=smooth(0,.28,shotAge)*(1-smooth(impactDelay+.12,impactDelay+1.05,shotAge));
      o.focus=shot*.24;o.dolly-=shot*.10;
    }
    for(let i=this.pulses.length-1;i>=0;i--){const p=this.pulses[i];p.age+=step;if(p.age>.9){this.pulses.splice(i,1);continue;}if(!broad)continue;
      const envelope=Math.exp(-p.age*7)*Math.sin(Math.min(1,p.age/.035)*Math.PI/2)*p.strength;
      o.right+=Math.sin(p.age*47)*envelope*p.side;o.up+=Math.cos(p.age*39)*envelope*.6;
      o.dolly+=envelope*.014;o.fov+=envelope*.85;
    }
    o.right=clamp(o.right,-.8,.8);o.up=clamp(o.up,-.55,.55);o.fov=clamp(o.fov,0,1.1);
    return o;
  }
}
