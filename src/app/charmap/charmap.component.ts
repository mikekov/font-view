import * as _ from "lodash";
import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { drawGlyphs } from '../utils/draw-glyph';
import { DrawGrid, VirtualGridComponent } from '../virtual-grid/virtual-grid.component';

@Component({
	selector: 'char-map',
	templateUrl: './charmap.component.html',
	styleUrls: ['./charmap.component.scss']
})
export class CharmapComponent implements OnInit {

	@Input()
	set font(font: opentype.Font | null) {
		if (font !== this._font) {
			this._font = font;
			this.applyFilter();
			this._grid?.dirty();
		}
	}

	@Input()
	set filter(text: string | null) {
		if (text !== this._filter) {
			this._filter = text;
			this.applyFilter();
			this._grid?.dirty();
		}
	}
	@Output()
	glyphClicked = new EventEmitter<{ glyph: opentype.Glyph, font: opentype.Font }>();

	@Input()
	set cellSize(size: { width: number, height: number }) {
		if (size && size.width && size.height &&
			size.width !== this._cellSize.width && size.height !== this._cellSize.height) {
			this._cellSize = size;
			this._grid?.dirty();
		}
	}

	@Output()
	cellSizeChanged = new EventEmitter<{ width: number, height: number }>();

	constructor() { }

	ngOnInit(): void {
	}

	onGlyphClicked(i: number) {
		const glyph = this.getGlyph(i);
		const font = this._font;
		if (glyph && font) {
			this.glyphClicked.next({ glyph, font });
		}
	}

	setFilter(text: string) {
		//
		this.filter = text;
	}

	applyFilter() {
		this._glyphs = null;
		const font = this._font;
		if (!font || !this._filter) return;

		const text = this._filter.toLowerCase();
		this._glyphs = [];
		for (let i = 0; i < font.numGlyphs; ++i) {
			const glyph = font.glyphs.get(i);
			if (!glyph) continue;

			if (glyph.name && glyph.name.includes(text) ||
				glyph.unicode && (text === glyph.unicode.toString(10) || text === glyph.unicode.toString(16)) ||
				text === i.toString()) {
				this._glyphs.push(glyph);
			}
		}
	}

	getGlyphCount(): number {
		if (!this._font) return 0;

		return this._glyphs ? this._glyphs.length : this._font.glyphs.length;
	}

	getGlyph(i: number): opentype.Glyph | undefined {
		if (this._glyphs) {
			return this._glyphs[i];
		}
		if (this._font) {
			return this._font.glyphs.get(i);
		}
	}

	drawGridGlyph(event: DrawGrid) {
		const font = this._font;
		if (!font) return;

		drawGlyphs(event.fromCell, event.toCell, font, {
			x: 0, y: 0,
			width: event.cellWidth,
			height: event.cellHeight,
			ctx: event.ctx,
			getArea: event.getCell,
			showCharcode: true,
			drawBorder: true,
			getGlyph: i => this.getGlyph(i)
		});
	}

	setSize(inc: number) {
		const size = _.clamp(this._sizeIndex + inc, 0, 5);
		if (this._sizeIndex !== size) {
			this._sizeIndex = size;
			this.cellSizeChanged.next(this.getCellSize());
		}
	}

	getCellSize(): { width: number, height: number } {
		const width = Math.round(Math.pow(1.2, this._sizeIndex) * 40);
		const height = Math.round(5 / 4 * width);
		if (width !== this._cellSize.width || height !== this._cellSize.height) {
			this._cellSize = { width, height };
		}
		return this._cellSize;
	}

	_font: opentype.Font | null | undefined;
	_cellSize = { width: 40, height: 50 };
	_filter: string | null | undefined;
	_glyphs: opentype.Glyph[] | null = null;
	@ViewChild('grid') _grid: VirtualGridComponent;
	_sizeIndex = 0;
}
