export class BulletManager{
  constructor(){this.items=[];}
  clear(){this.items.length=0;}
  spawn(x,y,vx,vy,r,color,opts={}){
    this.items.push({
      x, y, vx, vy, r, color,
      grazed:false,
      grazedBy:0,
      age:0,
      splitter:!!opts.splitter,
      split:false,
      bounce:!!opts.bounce,
      wall:!!opts.wall,
      bounces:0,
      maxBounces:opts.maxBounces||3,
      homing:!!opts.homing,
      homingStrength:opts.homingStrength||0,
       // Homing bullets must have a finite lifetime; otherwise they can
       // keep tracking the player forever and block wave transition.
       maxAge:opts.maxAge ?? (opts.homing ? 7.0 : Infinity),
      repulseT:0,
      repulseStrength:0,
      assistCooldown:0,
      assistUsed:false
    });
  }
  remove(i){this.items.splice(i,1)}
}
