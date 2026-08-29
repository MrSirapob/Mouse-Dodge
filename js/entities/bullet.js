export class BulletManager{
  constructor(){
    this.items=[];
    // Pool of retired bullet objects available for reuse. Bullet-hell waves
    // can spawn/retire hundreds of bullets per second, and each bullet
    // object carries ~50 properties (trajectory/perimeter/homing state,
    // etc.) — allocating a fresh one per shot was measurable GC pressure.
    // spawn() now pulls from here first and only allocates `{}` when the
    // pool is empty; remove() returns the retired object to the pool
    // instead of letting it be garbage-collected. See HANDOFF_LOG.md
    // 2026-08-29 for the perf review this came out of.
    this._pool=[];
  }
  clear(){
    // Recycle every currently-active bullet into the pool (wave transitions
    // clear() the whole list at once — no reason to throw those objects
    // away when the next wave will just need that many again).
    for(let i=0;i<this.items.length;i++) this._pool.push(this.items[i]);
    this.items.length=0;
  }
  spawn(x,y,vx,vy,r,color,opts={}){
    const b = this._pool.pop() || {};
    b.x=x; b.y=y; b.vx=vx; b.vy=vy; b.r=r; b.color=color;
    b.grazed=false;
    b.grazedBy=0;
    b.age=0;
    b.splitter=!!opts.splitter;
    b.split=false;
    b.bounce=!!opts.bounce;
    b.wall=!!opts.wall;
    b.bounces=0;
    b.maxBounces=opts.maxBounces||3;
    b.homing=!!opts.homing;
    b.homingStrength=opts.homingStrength||0;
    // Homing bullets must have a finite lifetime; otherwise they can
    // keep tracking the player forever and block wave transition.
    b.maxAge=opts.maxAge ?? (opts.homing ? 7.0 : Infinity);

    // Custom trajectory / boss-pattern state.
    b.trajectory=opts.trajectory || null;
    // trajAge is lazily read/written elsewhere as `b.trajAge = (b.trajAge
    // || 0) + dt` (see Game.updateBullets()) — a brand-new object literal
    // never had this property, so that fallback always started it at 0.
    // A *reused* pooled object might still be carrying a stale value from
    // its previous life, so it must be explicitly zeroed here too.
    b.trajAge=0;
    b.originX=opts.originX;
    b.amplitude=opts.amplitude;
    b.frequency=opts.frequency;
    b.dir=opts.dir;
    b.accel=opts.accel;
    b.stopAfter=opts.stopAfter;
    b.pause=opts.pause;
    b.resumeSpeed=opts.resumeSpeed;
    b.resumed=false;
    b.reverseAfter=opts.reverseAfter;
    b.reversed=false;
    b.angle=opts.angle;
    b.centerX=opts.centerX;
    b.centerY=opts.centerY;
    b.radius=opts.radius;
    b.orbitSpeed=opts.orbitSpeed;
    b.skipNormalMove=false;
    b.curve=opts.curve || 0;
    b.gravityX=opts.gravityX;
    b.gravityY=opts.gravityY;
    b.gravityStrength=opts.gravityStrength || 0;
    b.flipAfter=opts.flipAfter ?? null;
    b.gravityFlipped=false;
    b.splitDelay=opts.splitDelay;
    b.splitCount=opts.splitCount;
    // If set, split children use this speed instead of deriving from vx/vy.
    b.splitSpeed=opts.splitSpeed ?? null;

    // W10 perimeter formation state.
    b.perimeterBullet=!!opts.perimeterBullet;
    b.perimeterHold=!!opts.perimeterHold;
    b.perimeterReleased=false;
    b.releaseDelay=opts.releaseDelay ?? 0;
    b.perimeterSpeed=opts.perimeterSpeed ?? 0;

    // Fly-to-position: bullet spawns at boss and travels to a fixed spot
    // before holding still. Set flyToX/Y at spawn; once arrived the bullet
    // holds at that position until the pattern's fire callback releases it.
    b.flyToX=opts.flyToX ?? null;
    b.flyToY=opts.flyToY ?? null;
    b.flyToSpeed=opts.flyToSpeed ?? 0;
    b.flyToArrived=opts.flyToX == null; // true from birth if no target

    b.repulseT=0;
    b.repulseStrength=0;
    b.assistCooldown=0;
    b.assistUsed=false;

    this.items.push(b);
  }
  /**
   * Removes the bullet at index i in O(1) instead of O(n): swap the last
   * element into slot i, then pop the (now-duplicate) last element off,
   * rather than Array.splice(i,1) which has to shift every element after i
   * down by one. Bullet draw/update order is never meaningful (there's no
   * z-ordering or turn-order dependency between bullets), so reordering is
   * safe — the ONLY requirement this places on callers is: when removing
   * several indices in one pass over the same array, they must be removed
   * in descending index order (so that an index you haven't gotten to yet
   * is never the one silently relocated by an earlier swap). Every current
   * caller already satisfies this — the reverse `for (i = len-1; i >= 0;
   * i--)` loops in Game.updateBullets()/removeBulletsInRadius(), and
   * Game.cleanupBulletsForCapacity()'s explicit `selected.sort((a,b) =>
   * b.index - a.index)` before its removal loop.
   */
  remove(i){
    const b = this.items[i];
    if (!b) return;
    const last = this.items.length - 1;
    if (i !== last) this.items[i] = this.items[last];
    this.items.pop();
    this._pool.push(b);
  }
}
