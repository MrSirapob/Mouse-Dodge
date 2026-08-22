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

      // Custom trajectory / boss-pattern state.
      trajectory: opts.trajectory || null,
      originX: opts.originX,
      amplitude: opts.amplitude,
      frequency: opts.frequency,
      dir: opts.dir,
      accel: opts.accel,
      stopAfter: opts.stopAfter,
      pause: opts.pause,
      resumeSpeed: opts.resumeSpeed,
      resumed: false,
      reverseAfter: opts.reverseAfter,
      reversed: false,
      angle: opts.angle,
      centerX: opts.centerX,
      centerY: opts.centerY,
      radius: opts.radius,
      orbitSpeed: opts.orbitSpeed,
      skipNormalMove: false,
      curve: opts.curve || 0,
      gravityX: opts.gravityX,
      gravityY: opts.gravityY,
      gravityStrength: opts.gravityStrength || 0,
      flipAfter: opts.flipAfter ?? null,
      gravityFlipped: false,
      splitDelay: opts.splitDelay,
      splitCount: opts.splitCount,
      // If set, split children use this speed instead of deriving from vx/vy.
      splitSpeed: opts.splitSpeed ?? null,

      // W10 perimeter formation state.
      perimeterBullet: !!opts.perimeterBullet,
      perimeterHold: !!opts.perimeterHold,
      perimeterReleased: false,
      releaseDelay: opts.releaseDelay ?? 0,
      perimeterSpeed: opts.perimeterSpeed ?? 0,

      // Fly-to-position: bullet spawns at boss and travels to a fixed spot
      // before holding still. Set flyToX/Y at spawn; once arrived the bullet
      // holds at that position until the pattern's fire callback releases it.
      flyToX: opts.flyToX ?? null,
      flyToY: opts.flyToY ?? null,
      flyToSpeed: opts.flyToSpeed ?? 0,
      flyToArrived: opts.flyToX == null, // true from birth if no target

      repulseT:0,
      repulseStrength:0,
      assistCooldown:0,
      assistUsed:false
    });
  }
  remove(i){this.items.splice(i,1)}
}
