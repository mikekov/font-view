// tslint:disable-next-line:no-reference
/// <reference path="../utils/resize-observer.d.ts" />
import { Component, OnInit, Input, ViewChild, AfterViewInit, Type, ElementRef, OnDestroy, Output, EventEmitter, NgZone } from '@angular/core';
import { dir } from 'console';

export interface DrawOptions {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	clear(color: string): void;
}

@Component({
	selector: 'canvas-draw',
	templateUrl: './canvas-draw.component.html',
	styleUrls: ['./canvas-draw.component.scss']
})
export class CanvasDrawComponent implements OnInit, AfterViewInit, OnDestroy {

	@Output()
	refresh = new EventEmitter<DrawOptions>();

	@Output()
	resized = new EventEmitter<void>();

	constructor(private zone: NgZone) { }

	get width(): number {
		return this._canvas?.clientWidth || 0;
	}

	get height(): number {
		return this._canvas?.clientHeight || 0;
	}

	dirty() {
		if (this._dirty) window.clearTimeout(this._dirty);
		this._dirty = window.setTimeout(() => { this.redraw(); }, 0);
	}

	ngAfterViewInit(): void {
		const canvas = this._canvasRef.nativeElement;
		this._canvas = canvas;

		const dirty = this.resize();

		// repaint canvas after it's been resized
		this._resize = new ResizeObserver((r: any) => {
			// console.log(r[0].contentRect.width, r);
			this.zone.run(() => {
				this.resize();
				// this.redraw();
				this.dirty();
			});
		});
		this._resize.observe(canvas);

		if (!dirty) this.dirty();
	}

	resize(): boolean {
		if (this.sizeChanged()) {
			this.resized.next();
			this.dirty();
			return true;
		}
		else {
			return false;
		}
	}

	sizeChanged(): boolean {
		if (!this._canvas) return false;

		const host = this._canvas.parentElement;
		let h = host?.clientHeight;
		let w = host?.clientWidth;
		const r = window.devicePixelRatio || 1;
		// const box = this._canvas.getBoundingClientRect();
		if (w && h) {
			w = Math.floor(w * r);
			h = Math.floor(h * r);
			const EPS = 0.05;
			if (Math.abs(this._canvas.width - w) > EPS || Math.abs(this._canvas.height - h) > EPS) {
				this._canvas.width = w;
				this._canvas.height = h;
				return true;
			}
		}
		return false;
	}

	redraw() {
		if (!this._canvas) return;

		// verify that canvas size is updated; resize observer can miss changes
		if (this.resize()) return;

		const ctx = this._canvas.getContext("2d");
		if (ctx) {
			const r = window.devicePixelRatio || 1;
			ctx.setTransform(r, 0, 0, r, 0, 0);

			const width = this._canvas.width / r;
			const height = this._canvas.height / r;

			this.refresh.next({
				canvas: this._canvas,
				ctx,
				width,
				height,
				clear: (style: string) => {
					ctx.fillStyle = style;
					ctx.beginPath();
					ctx.fillRect(0, 0, width, height);
				}
			});
		}
	}

	ngOnInit(): void {
	}

	ngOnDestroy(): void {
		if (this._resize && this._canvas) {
			this._resize.unobserve(this._canvas);
		}
	}

	@ViewChild('canvas') _canvasRef!: ElementRef;
	_canvas: HTMLCanvasElement | undefined;
	_resize: ResizeObserver | undefined;
	_dirty: number | undefined;
}
