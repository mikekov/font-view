import { Component, OnInit, ViewChild, Input, Inject } from '@angular/core';
import { DrawOptions, CanvasDrawComponent } from '../canvas-draw/canvas-draw.component';
import { Glyph, Font } from 'opentype.js';
import { drawGlyphs } from '../utils/draw-glyph';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
	selector: 'app-glyph',
	templateUrl: './glyph.component.html',
	styleUrls: ['./glyph.component.scss']
})
export class GlyphComponent implements OnInit {

	@Input()
	set font(f: Font) {
		this._font = f;
	}

	@Input()
	set glyph(g: Glyph) {
		if (g !== this._glyph) {
			this._glyph = g;
			this._canvas?.dirty();
		}
	}

	constructor(@Inject(MAT_DIALOG_DATA) data: {font: Font, glyph: Glyph}) {
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
			getGlyph: i => this._glyph
		});
	}

	calcLayout() {}

	@ViewChild('canvas') _canvas: CanvasDrawComponent;
	_glyph: Glyph;
	_font: Font;
}

