// https://github.com/AlloyTeam/AlloyFinger

export type GestureEventHandlers = {
  onRotate: ((e: TouchEvent, angle: number) => void) | null;
  onTouchStart: ((e: TouchEvent) => void) | null;
  onMultipointStart: ((e: TouchEvent) => void) | null;
  onMultipointEnd: ((e: TouchEvent) => void) | null;
  onPinch: ((e: TouchEvent, data: { deltaLen: number; deltaScale: number }) => void) | null;
  onSwipe: ((e: TouchEvent, swipeDirection: GestureSwipeDirection) => void) | null;
  onTap: ((e: TouchEvent) => void) | null;
  onDoubleTap: ((e: TouchEvent) => void) | null;
  onLongTap: ((e: TouchEvent) => void) | null;
  onSingleTap: ((e: TouchEvent) => void) | null;
  onPressMove: ((e: TouchEvent, data: { deltaX: number; deltaY: number }) => void) | null;
  onTouchMove: ((e: TouchEvent) => void) | null;
  onTouchEnd: ((e: TouchEvent) => void) | null;
  onTouchCanel: (() => void) | null;
};
export type GestureEvent = keyof GestureEventHandlers;
export enum GestureSwipeDirection {
  Up = 1,
  Right,
  Down,
  Left,
}

class Finger {
  constructor(public x: number, public y: number) {}
}
class Vector2 {
  x = 0;
  y = 0;
  constructor(point1: { x: number; y: number }, point2: { x: number; y: number }) {
    this.x = Math.abs(point1.x - point2.x);
    this.y = Math.abs(point1.y - point2.y);
  }
}

export class Gesture {
  private events: GestureEventHandlers = {
    onRotate: null,
    onTouchStart: null,
    onMultipointStart: null,
    onMultipointEnd: null,
    onPinch: null,
    onSwipe: null,
    onTap: null,
    onDoubleTap: null,
    onLongTap: null,
    onSingleTap: null,
    onPressMove: null,
    onTouchMove: null,
    onTouchEnd: null,
    onTouchCanel: null,
  };
  private startTouchesCount = 0;
  private startFinger1: Finger | null = null;
  private startFinger2: Finger | null = null;
  private preStartFinger1: Finger | null = null;
  private currFinger1: Finger | null = null;
  private startVector2: Vector2 | null = null; // 两指开始向量
  private pinchLenStart = 0; // 两指间的初始距离
  private pinchLen = 0; // 两指间的实时距离
  private timeLastTouch = 0;
  private timeCurrentTouch = 0;
  private timeTouchDelta = 0;
  private isDoubleTap = false;

  private longTapTimer = 0;
  private swipeTimer = 0;
  private tapTimer = 0;
  private touchTimer = 0;

  constructor(private touchDOM: HTMLElement) {
    this.initEvent();
  }

  private initEvent() {
    this.touchDOM.addEventListener('touchstart', this.touchstart);
    this.touchDOM.addEventListener('touchmove', this.touchmove);
    this.touchDOM.addEventListener('touchend', this.touchend);
    this.touchDOM.addEventListener('touchcancel', this.touchcancel);
  }

  private touchstart = (e: TouchEvent) => {
    if (!e.touches) return;
    this.startTouchesCount = e.touches.length;
    this.startFinger1 = new Finger(e.touches[0].pageX, e.touches[0].pageY);
    this.timeCurrentTouch = Date.now();
    this.timeTouchDelta = this.timeCurrentTouch - this.timeLastTouch;
    this.events.onTouchStart?.(e);
    if (this.preStartFinger1 !== null) {
      // 如果之前点击过，则检查是否是产生了双击
      // 两次点击间隔小于250ms且两次点击的坐标距离小于30，则认为是发生了双击
      this.isDoubleTap =
        this.timeTouchDelta > 0 &&
        this.timeTouchDelta <= 250 &&
        Math.abs(this.preStartFinger1.x - this.startFinger1.x) < 30 &&
        Math.abs(this.preStartFinger1.y - this.startFinger1.y) < 30;
    }
    this.preStartFinger1 = { ...this.startFinger1 };
    this.timeLastTouch = this.timeCurrentTouch;
    if (e.touches.length > 1) {
      // 触摸手指大于1
      this.cancelLongTapTimer();
      this.startFinger2 = new Finger(e.touches[1].pageX, e.touches[1].pageY);
      this.startVector2 = new Vector2(this.startFinger1, this.startFinger2);
      // 记录下初始的两指距离
      this.pinchLen = this.pinchLenStart = this.getLen(this.startVector2);
      this.events.onMultipointStart?.(e);
    }
    this.longTapTimer = window.setTimeout(() => {
      this.events.onLongTap?.(e);
    }, 750);
  };

  private touchmove = (e: TouchEvent) => {
    if (!e.touches) return;
    e.stopPropagation();
    e.preventDefault();
    this.currFinger1 = new Finger(e.touches[0].pageX, e.touches[0].pageY);
    if (e.touches.length > 1) {
      // 双指移动
      const currentVector2 = new Vector2({ x: e.touches[1].pageX, y: e.touches[1].pageY }, this.currFinger1);
      if (this.pinchLenStart > 0) {
        const currPinchLen = this.getLen(currentVector2);
        this.pinchLen = currPinchLen;
        this.events.onPinch?.(e, { deltaLen: currPinchLen - this.pinchLenStart, deltaScale: currPinchLen / this.pinchLenStart });
      }
      if (this.startVector2 !== null) {
        this.events.onRotate?.(e, this.getRotateAngle(currentVector2, this.startVector2));
      }
    } else {
      // 单指移动
      const moveDelta = {
        deltaX: this.startFinger1 === null || this.currFinger1 === null ? 0 : this.currFinger1.x - this.startFinger1.x,
        deltaY: this.startFinger1 === null || this.currFinger1 === null ? 0 : this.currFinger1.y - this.startFinger1.y,
      };
      this.events.onPressMove?.(e, moveDelta);
    }
    this.events.onTouchMove?.(e);
    // 如果发生移动了，则取消双击，取消长按
    this.isDoubleTap = false;
    this.cancelLongTapTimer();
  };

  private touchend = (e: TouchEvent) => {
    if (!e.changedTouches) return;
    this.cancelLongTapTimer();
    // 初始触摸的手指数与剩余的手指数差值大于2，则触发onMultipointEnd事件
    if (this.startTouchesCount - e.touches.length >= 2) this.events.onMultipointEnd?.(e);
    this.events.onTouchEnd?.(e);
    if (
      this.currFinger1 !== null &&
      this.startFinger1 != null &&
      (Math.abs(this.currFinger1.x - this.startFinger1.x) > 30 || Math.abs(this.currFinger1.y - this.startFinger1.y) > 30) &&
      e.touches.length === 0
    ) {
      const direction = this.getSwipeDirection(this.startFinger1, this.currFinger1);
      this.swipeTimer = setTimeout(() => this.events.onSwipe?.(e, direction), 0);
    } else {
      this.tapTimer = setTimeout(() => {
        this.events.onTap?.(e);
        if (this.isDoubleTap) {
          this.events.onDoubleTap?.(e);
          clearTimeout(this.touchTimer);
          this.isDoubleTap = false;
        } else {
          this.touchTimer = setTimeout(() => this.events.onSingleTap?.(e), 250);
        }
      }, 0);
    }
  };

  private touchcancel = (e: TouchEvent) => {
    clearTimeout(this.longTapTimer);
    clearTimeout(this.swipeTimer);
    clearTimeout(this.tapTimer);
    clearTimeout(this.touchTimer);
  };

  private cancelLongTapTimer() {
    clearTimeout(this.longTapTimer);
  }

  destroy() {
    this.touchDOM.removeEventListener('touchstart', this.touchstart);
    this.touchDOM.removeEventListener('touchmove', this.touchmove);
    this.touchDOM.removeEventListener('touchend', this.touchend);
    this.touchDOM.removeEventListener('touchcancel', this.touchcancel);
    clearTimeout(this.longTapTimer);
    clearTimeout(this.swipeTimer);
    clearTimeout(this.tapTimer);
    clearTimeout(this.touchTimer);
    this.offAll();
  }

  on<E extends GestureEvent>(event: E, callback: GestureEventHandlers[E]) {
    this.events[event] = callback;
  }

  off<E extends GestureEvent>(event: E) {
    this.events[event] = null;
  }

  offAll() {
    Object.keys(this.events).forEach((k) => (this.events[k as GestureEvent] = null));
  }

  getSwipeDirection(f1: Finger, f2: Finger) {
    return Math.abs(f1.x - f2.x) > Math.abs(f1.y - f2.y)
      ? f1.x - f2.x > 0
        ? GestureSwipeDirection.Left
        : GestureSwipeDirection.Right
      : f1.y - f2.y > 0
      ? GestureSwipeDirection.Up
      : GestureSwipeDirection.Down;
  }

  getRotateAngle(v1: Vector2, v2: Vector2) {
    let angle = this.getAngle(v1, v2);
    if (this.cross(v1, v2) > 0) {
      angle *= -1;
    }
    return (angle * 180) / Math.PI;
  }

  // 获取向量的长度
  getLen(v: Vector2) {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  }

  /**
   * 返回两个向量之间的角度（弧度制）
   * 公式：cosθ = (A·B) / |A||B|
   */
  getAngle(v1: Vector2, v2: Vector2) {
    const mr = this.getLen(v1) * this.getLen(v2);
    if (mr === 0) return 0;
    let r = this.dot(v1, v2) / mr;
    if (r > 1) r = 1;
    return Math.acos(r);
  }

  // 向量点乘
  dot(v1: Vector2, v2: Vector2) {
    return v1.x * v2.x + v1.y + v2.y;
  }

  // 向量叉乘
  cross(v1: Vector2, v2: Vector2) {
    return v1.x * v2.y - v2.x * v1.y;
  }
}
