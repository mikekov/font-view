import { Component, OnInit, ViewChild, Input, Inject, HostListener, Output, EventEmitter } from '@angular/core';
import { DrawOptions, CanvasDrawComponent } from '../canvas-draw/canvas-draw.component';
import { drawGlyphs } from '../utils/draw-glyph';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UnicodeService } from '../services/unicode.service';
import { FontObject, ExtGlyph } from '../utils/font-object';

@Component({
	selector: 'app-glyph',
	templateUrl: './glyph.component.html',
	styleUrls: ['./glyph.component.scss']
})
export class GlyphComponent implements OnInit {

	@Input()
	set font(f: FontObject) {
		this._font = f;
	}

	@Input()
	set glyph(g: ExtGlyph) {
		if (g !== this._glyph) {
			this._glyph = g;
			this._canvas?.dirty();
		}
	}
	get glyph(): ExtGlyph {
		return this._glyph;
	}

	@Output() goTo = new EventEmitter<'next'|'prev'>();

	constructor(
		@Inject(MAT_DIALOG_DATA) data: {font: FontObject, glyph: ExtGlyph},
		private unicode: UnicodeService
		) {
		this._font = data.font;
		this._glyph = data.glyph;
	}

	ngOnInit(): void {
	}

	redraw(opt: DrawOptions) {
		opt.clear('#fff');
		if (!this._font) return;

		drawGlyphs(0, 0, this._font, {
			x: 0,
			y: 0,
			width: opt.width,
			height: opt.height,
			ctx: opt.ctx,
			showCharcode: 'long',
			showName: 'long',
			drawMetrics: true,
			getGlyph: i => this._glyph,
			getName: u => this.unicode.getName(u)
		});
	}

	calcLayout() {}

	@HostListener('window:keydown.[')
	@HostListener('window:keydown.arrowleft')
	@HostListener('window:keydown.arrowdown')
	onPrev() {
		this.goTo.next('prev');
	}
	@HostListener('window:keydown.]')
	@HostListener('window:keydown.arrowright')
	@HostListener('window:keydown.arrowup')
	onNext() {
		this.goTo.next('next');
	}
	@ViewChild('canvas') _canvas!: CanvasDrawComponent;
	_glyph: ExtGlyph;
	_font: FontObject;
}

