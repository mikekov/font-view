import * as _ from 'lodash';
import { Directive, Input, Output, HostListener, ElementRef, EventEmitter } from '@angular/core';
import { CookiesService } from '../services/cookies.service';

// resizing panel directive can be attached to a splitter that moves to adjust size of an adjacent element

@Directive({
	// tslint:disable-next-line:directive-selector
	selector: '[resizePanel]'
})
export class ResizeDirective {
	constructor(el: ElementRef, private cookies: CookiesService) {
		this.el = el && el.nativeElement;
		this.setCallbacks();
	}

	// resizing direction: which way to drag the splitter to grow connected element
	@Input()
	grow!: 'left' | 'right' | 'up' | 'down';

	// minimum size to report
	@Input() minSize = 0;

	// current size of the element splitter is resizing
	@Input() currentSize = 0;

	// resizing step
	@Input() step = 8;

	// component to resize
	@Input()
	set component(c: HTMLElement) {
		this._component = c;
		this.restoreSize();
	}

	@Input() disabled = false;

	// new size
	@Output()
	resizing = new EventEmitter<number>();

	// resizing start (true) and end (false)
	@Output()
	resizingAction = new EventEmitter<boolean>();

	@Input()
	set cookie(key: string) {
		this._cookie = key;
		this.restoreSize();
	}

	@HostListener('mousedown', ['$event'])
	down(ev: MouseEvent): void {
		if (this.disabled) return;
		this.drag = true;
		this.captureMouseEvents(ev);
		this.point = { x: ev.x, y: ev.y };
		this.resizingStartStop(true);
		this.storeSize = this.currentSize;
		if (this._component && _.isFunction(this._component.getBoundingClientRect)) {
			this.storeSize = this.isHorizontal() ? this._component.clientWidth : this._component.clientHeight;
		}
	}

	private isHorizontal(): boolean {
		return this.grow === 'left' || this.grow === 'right';
	}

	private resizingStartStop(start: boolean) {
		if (this.disabled) return;
		this.resizingAction.next(start);
	}

	private preventGlobalMouseEvents() {
		document.body.style.pointerEvents = 'none';
		document.documentElement.classList.add(this.isHorizontal() ? 'resizing-horz' : 'resizing-vert');
	}

	private restoreGlobalMouseEvents() {
		document.body.style.pointerEvents = 'auto';
		document.documentElement.classList.remove(this.isHorizontal() ? 'resizing-horz' : 'resizing-vert');
	}

	private setCallbacks() {
		this.mousemoveListener = (ev: MouseEvent) => {
			ev.stopPropagation();
			// resize a panel
			if (this.drag && this.point) {
				let delta = 0;
				switch (this.grow) {
					case 'right':
						delta = ev.x - this.point.x;
						break;
					case 'left':
						delta = this.point.x - ev.x;
						break;
					case 'down':
						delta = ev.y - this.point.y;
						break;
					case 'up':
						delta = this.point.y - ev.y;
						break;
				}
				const step = +this.step || 1;
				let size = this.storeSize + delta;
				const rem = size % step;
				size -= rem;
				if (rem > step / 2) { size += step; }
				const final = Math.max(+this.minSize, size);
				this.resizing.next(final);
				// console.log('size', final);

				this.resizeComponent(final);

				if (this._cookie) {
					this.cookies.setNumber(this._cookie, final);
				}
			}
		};

		this.mouseupListener = (e: MouseEvent) => {
			this.restoreGlobalMouseEvents();
			document.removeEventListener('mouseup', this.mouseupListener, true);
			document.removeEventListener('mousemove', this.mousemoveListener, true);
			e.stopPropagation();

			if (this.drag) {
				this.drag = false;
				this.resizingStartStop(false);
			}
		};
	}

	private restoreSize() {
		if (this._cookie) {
			const size = this.cookies.getNumber(this._cookie, 0);
			this.resizeComponent(size);
		}
	}

	private resizeComponent(size: number | string) {
		if (!size) return;

		if (this._component && _.isNumber(this._component.clientWidth)) {
			const sizepx = `${size}px`;
			if (this.isHorizontal()) {
				this._component.style.width = sizepx;
			}
			else {
				this._component.style.height = sizepx;
			}
		}
	}

	private captureMouseEvents(e: MouseEvent) {
		this.preventGlobalMouseEvents();
		document.addEventListener('mouseup', this.mouseupListener, true);
		document.addEventListener('mousemove', this.mousemoveListener, true);
		e.preventDefault();
		e.stopPropagation();
	}

	private drag = false;
	private point: {x: number, y: number} | undefined;
	private storeSize = 0;
	readonly el: HTMLElement;
	private mousemoveListener!: (e: MouseEvent) => void;
	private mouseupListener!: (e: MouseEvent) => void;
	private _cookie = '';
	private _component: HTMLElement | undefined;
}

