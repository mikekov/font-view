import {Point} from './point';


export class Rect {
	constructor(public left: number, public top: number, public right: number, public bottom: number) {
	}

	static normalize(x1: number, y1: number, x2: number, y2: number): Rect {
		return new Rect(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
	}

	static intersect(rectA: ClientRect, rectB: ClientRect): boolean {
		if (!rectA || !rectB) return false;

		return rectA.left < rectB.right && rectA.right > rectB.left &&
				rectA.top < rectB.bottom && rectA.bottom > rectB.top;
	}

	static contains(rect: ClientRect, point: Point): boolean {
		if (!rect || !point) return false;

		return point.x < rect.right && point.x >= rect.left &&
				point.y < rect.bottom && point.y >= rect.top;
	}

	get width() {
		return this.right - this.left;
	}
	get height() {
		return this.bottom - this.top;
	}
}
