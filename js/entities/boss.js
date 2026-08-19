export class Boss {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.r = 34;
    this.hue = 0;
    this.name = '';
  }
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.hue = 0;
    this.name = '';
  }
}
