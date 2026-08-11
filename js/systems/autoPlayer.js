export class AutoPlayer {
  constructor(game) {
    this.game=game;
    this.enabled=false;
    this.level=2;
    this.target={x:640,y:360};
    this.thinkTimer=0;
    this.targetLocked=false;
  }

  toggle(){
    this.enabled=!this.enabled;
    const p=this.game.players[0];
    if(p){this.target.x=p.x;this.target.y=p.y;}
    this.targetLocked=false;
    this.thinkTimer=0;
    return this.enabled;
  }

  setLevel(level){this.level=Math.max(1,Math.min(3,Number(level)||2));}

  update(dt){
    if(!this.enabled||!this.game.devMode.enabled)return;
    const p=this.game.players[0];
    if(!p?.isAlive())return;

    const world={width:1280,height:720};
    this.thinkTimer-=dt;

    // Expert is a survival tester: keep one route until it is actually unsafe.
    // This prevents the old left-right oscillation.
    const routeDanger=this.routeDanger(p,this.target);
    if(!this.targetLocked||this.thinkTimer<=0&&routeDanger){
      const best=this.findExpertTarget(p,world);
      if(best){
        this.target.x=best.x;
        this.target.y=best.y;
        this.targetLocked=true;
      }
      const emergency=this.immediateThreat(p);
      this.thinkTimer=emergency?.025:.08;
      this.useExpertSkill(p,emergency);
    }

    const dx=this.target.x-p.x,dy=this.target.y-p.y;
    const d=Math.hypot(dx,dy);
    if(d>4){
      const speed=900;
      const step=Math.min(d,speed*dt);
      p.x+=dx/d*step;
      p.y+=dy/d*step;
    }

    p.x=Math.max(p.r,Math.min(world.width-p.r,p.x));
    p.y=Math.max(p.r,Math.min(world.height-p.r,p.y));
  }

  findExpertTarget(p,world){
    const points=[{x:p.x,y:p.y},{x:640,y:360}];

    // Dense radial search around the player.
    const rings=[100,180,260,340];
    for(const r of rings){
      for(let i=0;i<24;i++){
        const a=Math.PI*2*i/24;
        points.push({
          x:Math.max(p.r+5,Math.min(world.width-p.r-5,p.x+Math.cos(a)*r)),
          y:Math.max(p.r+5,Math.min(world.height-p.r-5,p.y+Math.sin(a)*r))
        });
      }
    }

    let best=null;
    for(const q of points){
      const result=this.evaluateTrajectory(p,q);
      if(!best || result.score>best.score) best={x:q.x,y:q.y,score:result.score};
    }
    return best;
  }

  evaluateTrajectory(p,q){
    const speed=900;
    const dist=Math.hypot(q.x-p.x,q.y-p.y);
    const travel=Math.min(1.5,dist/speed);
    const horizon=1.5;
    const steps=10;

    // Minimum clearance is more important than average clearance.
    // This makes Expert search for an actual gap when bullets are dense.
    let minClear=9999;
    let totalPenalty=0;

    // Use nearby bullets first; very distant bullets cannot affect this route soon.
    const bullets=[];
    for(const b of this.game.bullets.items){
      const d=Math.hypot(b.x-p.x,b.y-p.y);
      if(d<1100)bullets.push(b);
    }

    for(let i=0;i<=steps;i++){
      const t=horizon*i/steps;
      const moveT=Math.min(t,travel);
      const k=travel>0?moveT/travel:1;
      const px=p.x+(q.x-p.x)*k;
      const py=p.y+(q.y-p.y)*k;

      for(const b of bullets){
        const bx=b.x+b.vx*t*60;
        const by=b.y+b.vy*t*60;
        const clearance=Math.hypot(px-bx,py-by)-p.r-b.r;

        if(clearance<minClear)minClear=clearance;
        if(clearance<65){
          totalPenalty+=(65-clearance)*(65-clearance)*(1+(1-t/horizon)*3);
        }
      }
    }

    // Current warning geometry is authoritative.
    for(const w of this.game.ringWarnings){
      if(typeof w.gapAngle!=="number")continue;
      const a=Math.atan2(q.y-w.y,q.x-w.x);
      const delta=Math.abs(Math.atan2(Math.sin(a-w.gapAngle),Math.cos(a-w.gapAngle)));
      const gap=w.gapWidth||.3;
      if(delta>gap)totalPenalty+=12000;
      else totalPenalty-=4000;
    }

    for(const L of this.game.lasers){
      if(L.state!=="telegraph")continue;
      const d=L.orientation==="h"?Math.abs(q.y-L.pos):Math.abs(q.x-L.pos);
      if(d<90)totalPenalty+=(90-d)*150;
    }

    const z=this.game.zone;
    if(z&&z.t>z.grace){
      const d=Math.hypot(q.x-z.cx,q.y-z.cy);
      if(d>z.curR-p.r-15)totalPenalty+=15000+(d-z.curR)*150;
    }

    // Do not prefer an unnecessarily distant route if two routes are equally safe.
    const movementCost=Math.hypot(q.x-p.x,q.y-p.y)*0.08;

    return {score:minClear*100-totalPenalty-movementCost};
  }

  routeDanger(p,q){
    if(!q)return true;
    const dist=Math.hypot(q.x-p.x,q.y-p.y);
    if(dist<10)return this.immediateThreat(p);
    const speed=900;
    const travel=Math.min(1.0,dist/speed);
    for(let i=1;i<=7;i++){
      const t=travel*i/7;
      const k=travel? t/travel:1;
      const x=p.x+(q.x-p.x)*k;
      const y=p.y+(q.y-p.y)*k;
      for(const b of this.game.bullets.items){
        const bx=b.x+b.vx*t*60;
        const by=b.y+b.vy*t*60;
        if(Math.hypot(x-bx,y-by)<p.r+b.r+35)return true;
      }
    }
    return false;
  }

  immediateThreat(p){
    for(const b of this.game.bullets.items){
      const s2=b.vx*b.vx+b.vy*b.vy;
      if(s2<.01)continue;
      const rx=p.x-b.x,ry=p.y-b.y;
      const frames=(rx*b.vx+ry*b.vy)/s2;
      const t=frames/60;
      if(t<0||t>.7)continue;
      const bx=b.x+b.vx*frames,by=b.y+b.vy*frames;
      if(Math.hypot(p.x-bx,p.y-by)<p.r+b.r+28)return true;
    }
    return false;
  }

  useExpertSkill(p,emergency){
    if(!this.game.skillSystem?.use||p.skillCooldown>0)return;
    const skill=this.game.state.skill;
    let near=0;
    for(const b of this.game.bullets.items){
      if(Math.hypot(b.x-p.x,b.y-p.y)<190)near++;
    }
    let use=false;
    if(skill==="shield"||skill==="phase")use=emergency;
    else if(skill==="pulse"||skill==="nova")use=emergency||near>=5;
    else if(skill==="repulse")use=emergency||near>=4;
    else if(skill==="slow"||skill==="timestop")use=emergency||near>=7;
    else if(skill==="dash")use=emergency;
    else if(skill==="heal")use=p.lives<3&&!emergency&&near<3;
    if(use)this.game.skillSystem.use(p);
  }
}
