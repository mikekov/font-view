import * as _ from "lodash";
import { Component, OnInit, Input, ViewChild, Output, EventEmitter, ChangeDetectorRef, ElementRef } from '@angular/core';
import { drawGlyphs } from '../utils/draw-glyph';
import { DrawGrid, VirtualGridComponent } from '../virtual-grid/virtual-grid.component';
import { UnicodeService } from '../services/unicode.service';
import { FontObject, ExtGlyph } from '../utils/font-object';

@Component({
	selector: 'char-map',
	templateUrl: './charmap.component.html',
	styleUrls: ['./charmap.component.scss']
})
export class CharmapComponent implements OnInit {

	@Input()
	set font(font: FontObject | null | undefined) {
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
	glyphClicked = new EventEmitter<{ glyph: opentype.Glyph, glyphs: ExtGlyph[], font: FontObject }>();

	@Input()
	set cellSize(size: { width: number, height: number }) {
		if (size && size.width && size.height &&
			size.width !== this._cellSize.width && size.height !== this._cellSize.height) {
			this._cellSize = size;
			this._grid?.dirty();
		}
	}

	@Input()
	set cellSizeIndex(size: number) {
		this.setSize(size);
	}

	@Output()
	cellSizeChanged = new EventEmitter<{ width: number, height: number, sizeIndex: number }>();

	constructor(private unicode: UnicodeService, private changes: ChangeDetectorRef) { }

	ngOnInit(): void {
	}

	onGlyphClicked(i: number) {
		const glyph = this.getGlyph(i);
		const font = this._font;
		if (glyph && font) {
			this.glyphClicked.next({ glyph, glyphs: this.getGlyphs(), font });
		}
	}

	cellSelected(cell: any) {
		//
	}

	setFilter(text: string) {
		//
		this.filter = text;
	}

	applyFilter() {
		this._glyphs = null;
		const font = this._font;
		if (!font || !this._filter) return;

		const text = this._filter.toUpperCase();
		this._glyphs = [];
		for (let i = 0; i < font.orderedGlyphs.length; ++i) {
			const glyph = font.orderedGlyphs[i];

			// try matching text against unicode, glyph name or unicode name
			const unicode = glyph.unicode;
			if (glyph.name && glyph.name.toUpperCase().includes(text) ||
				unicode && (text === unicode.toString(10) || text === unicode.toString(16)) ||
				text === i.toString() ||
				(unicode && this.unicode.getName(unicode)?.toUpperCase().includes(text))) {
				this._glyphs.push(glyph);
			}
		}
	}

	private getGlyphs(): ExtGlyph[] {
		// tslint:disable-next-line: no-non-null-assertion
		return this._glyphs ? this._glyphs : (this._font)!.orderedGlyphs;
	}

	getGlyphCount(): number {
		if (!this._font) return 0;

		return this.getGlyphs()?.length;
	}

	getGlyph(i: number): ExtGlyph | undefined {
		if (this._glyphs) {
			return this._glyphs[i];
		}
		if (this._font) {
			return this._font.orderedGlyphs[i];
		}
		return;
	}

	drawGridGlyph(event: DrawGrid) {
		const font = this._font;
		if (!font) return;

		const styles = getComputedStyle(this._sel.nativeElement);

		drawGlyphs(event.fromCell, event.toCell, font, {
			x: 0, y: 0,
			width: event.cellWidth,
			height: event.cellHeight,
			ctx: event.ctx,
			getArea: event.getCell,
			showCharcode: true,
			drawBorder: true,
			selectedCellStyle: styles?.color,
			selectedTextStyle: 'white',
			selectedGlyphStyle: 'white',
			getGlyph: i => this.getGlyph(i),
			getName: u => this.unicode.getName(u)
		});
	}

	setSize(inc: number) {
		const size = _.clamp(this._sizeIndex + inc, 0, 5);
		if (this._sizeIndex !== size) {
			this._sizeIndex = size;
			this.cellSizeChanged.next({...this.getCellSize(), sizeIndex: size});
			// this.changes.detectChanges();
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

	_font: FontObject | null | undefined;
	_cellSize = { width: 40, height: 50 };
	_filter: string | null | undefined;
	_glyphs: ExtGlyph[] | null = null;
	@ViewChild('grid') _grid!: VirtualGridComponent;
	@ViewChild('sel') _sel!: ElementRef;
	_sizeIndex = 0;
}
