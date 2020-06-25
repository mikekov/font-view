// tslint:disable-next-line:no-reference
/// <reference path="../utils/resize-observer.d.ts" />
import { Component, OnInit, Input, ViewChild, AfterViewInit, Type, ElementRef, OnDestroy, Output, EventEmitter } from '@angular/core';
// import { ResizeObserver } from '../utils/resize-observer';

export interface DrawOptions {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	clear(color: string);
}

@Component({
	selector: 'canvas-draw',
	templateUrl: './canvas-draw.component.html',
	styleUrls: ['./canvas-draw.component.scss']
})
export class CanvasDrawComponent implements OnInit, AfterViewInit, OnDestroy {

	@Input()
	set font(f: opentype.Font) {
		this._font = f;
	}

	@Input()
	set size(s: number) {
		this._fontSize = s;
		this.redraw();
	}

	@Input()
	set text(t: string) {
		this._text = t;
		this.redraw();
	}

	@Output()
	refresh = new EventEmitter<DrawOptions>();

	@Output()
	resized = new EventEmitter<void>();

	constructor() { }

	get width(): number {
		return this._canvas?.clientWidth || 0;
	}

	get height(): number {
		return this._canvas?.clientHeight || 0;
	}

	dirty() {
		setTimeout(() => { this.redraw(); }, 0);
	}

	ngAfterViewInit(): void {
		const canvas = this._canvasRef.nativeElement;
		this._canvas = canvas;

		this.resize();

		// repaint canvas after it's been resized
		this._resize = new ResizeObserver(() => { this.resize(); this.redraw(); });
		this._resize.observe(canvas);

		const bbox = canvas.getBoundingClientRect();
		const r = window.devicePixelRatio || 1;
		canvas.width = bbox.width * r;
		canvas.height = bbox.height * r;
		this.redraw();
	}

	resize() {
		if (!this._canvas) return;

		const host = this._canvas.parentElement;
		const h = host?.clientHeight;
		const w = host?.clientWidth;
		const r = window.devicePixelRatio || 1;
		// const box = this._canvas.getBoundingClientRect();
		if (w && h) {
			this._canvas.width = w * r;
			this._canvas.height = h * r;
		}
		// this._canvas.width
		this.resized.next();
		this.dirty();
	}

	redraw() {
		const ctx = this._canvas?.getContext("2d");
		if (ctx) {
			const r = window.devicePixelRatio || 1;
			ctx.setTransform(r, 0, 0, r, 0, 0);

			const width = this._canvas.width / r;
			const height = this._canvas.height / r;

			this.refresh.next({
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
		if (this._resize) {
			this._resize.unobserve(this._canvas);
		}
	}

	@ViewChild('canvas') _canvasRef: ElementRef;
	_canvas: HTMLCanvasElement;
	_font: opentype.Font | undefined;
	_fontSize = 50;
	_text = "abcg";
	_resize: ResizeObserver | undefined;
}
