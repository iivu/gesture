export class Gesture {
  constructor(private touchDOM: HTMLElement) {
    this.initEvent();
  }

  initEvent() {
    this.touchDOM.addEventListener('touchstart', this.touchstart);
    this.touchDOM.addEventListener('touchmove', this.touchmove);
    this.touchDOM.addEventListener('touchend', this.touchend);
  }

  touchstart = (e: TouchEvent) => {};

  touchmove = (e: TouchEvent) => {};

  touchend = (e: TouchEvent) => {};

  destroy() {
    this.touchDOM.removeEventListener('touchstart', this.touchstart);
    this.touchDOM.removeEventListener('touchmove', this.touchmove);
    this.touchDOM.removeEventListener('touchend', this.touchend);
  }
}
