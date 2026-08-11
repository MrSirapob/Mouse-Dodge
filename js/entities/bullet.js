export class BulletManager{
  constructor(){this.items=[];}
  clear(){this.items.length=0;}
  spawn(x,y,vx,vy,r,color,opts={}){this.items.push({x,y,vx,vy,r,color,grazed:false,grazedBy:0,age:0,splitter:!!opts.splitter,split:false,bounce:!!opts.bounce,bounces:0,maxBounces:opts.maxBounces||3,repulseT:0,repulseStrength:0});}
  remove(i){this.items.splice(i,1)}
}
