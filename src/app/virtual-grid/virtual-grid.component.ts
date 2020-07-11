import * as _ from 'lodash';
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { CanvasDrawComponent, DrawOptions } from '../canvas-draw/canvas-draw.component';
import { clientToRelative } from '../utils';

export interface DrawGrid {
	ctx: CanvasRenderingContext2D;
	fromCell: number;
	toCell: number;
	getCell(cell: number): {
		x: number;
		y: number;
		width: number;
		height: number;
		state: 'normal' | 'selected' | 'hover';
	};
	gapSize: number;
	cellWidth: number;
	cellHeight: number;
}

@Component({
	selector: 'virtual-grid',
	templateUrl: './virtual-grid.component.html',
	styleUrls: ['./virtual-grid.component.scss']
})
export class VirtualGridComponent implements OnInit, AfterViewInit {

	@Input()
	set cellSize(size: { width: number, height: number }) {
		this._cellSize = size;
		this.calcLayout();
	}

	@Input()
	set cellCount(n: number) {
		this._cellCount = n;
		// this._currentCellIndex = n ? _.clamp(this._currentCellIndex, 0, n - 1) : -1;
		this._currentCellIndex = -1;
		this.calcLayout();
	}

	@Output()
	draw = new EventEmitter<DrawGrid>();

	@Output()
	openCell = new EventEmitter<{ col: number, row: number, cell: number }>();

	@Output()
	cellSelected = new EventEmitter<{ col: number, row: number, cell: number }>();

	@Output()
	cellHover = new EventEmitter<{ col: number, row: number, cell: number }>();

	constructor(private el: ElementRef) { }

	ngOnInit(): void {
	}

	ngAfterViewInit(): void {
		this.calcLayout();
	}

	dirty() {
		this._canvas?.dirty();
	}

	redraw(opt: DrawOptions) {
		// const styles = getComputedStyle(opt.canvas);
		opt.clear('#fff');

		const layout = this._layout;
		if (!layout.rows || !layout.columns || !this._cellCount) return;

		const firstRow = Math.floor(this._vertScroll / layout.cellHeight);
		const dy = this._vertScroll % layout.cellHeight;

		const fromCell = firstRow * layout.columns;
		const toCell = Math.min(this._cellCount - 1, fromCell + layout.viewportRows * layout.columns + (dy ? layout.columns : 0) - 1);

		this.draw.next({
			ctx: opt.ctx,
			fromCell,
			toCell,
			getCell: index => {
				const cell = index - fromCell;
				let x = 0;
				let y = 0;
				let width = 0;
				if (layout.columns) {
					// distribute/stretch cells horizontally across entire width leaving no gaps
					const w = this._canvas.width / layout.columns;
					const offset = cell % layout.columns;
					x = Math.round(offset * w);
					width = Math.round((offset + 1) * w) - x;
					y = Math.floor(cell / layout.columns) * layout.cellHeight - dy;
				}
				return { x, y, width, height: layout.cellHeight, state: index === this._currentCellIndex ? 'selected' : 'normal' };
			},
			gapSize: this._gap,
			cellWidth: layout?.cellWidth,
			cellHeight: layout?.cellHeight
		});
	}

	calcLayout() {
		const layout = this._layout;
		const canvas = this._canvas;

		if (!canvas || !canvas.height || !canvas.width ||
			this._cellCount <= 0 || !this._cellSize || this._cellSize.width <= 0 || this._cellSize.height <= 0) {
			this._height = 0;
			layout.columns = 0;
			layout.rows = 0;
			layout.viewportItems = 0;
			layout.viewportRows = 0;
			this._vertScroll = 0;
			return;
		}
		else {
			layout.columns = Math.max(1, Math.trunc((canvas.width + this._gap) / (this._cellSize.width + this._gap)));
			layout.cellWidth = canvas.width / layout.columns;
			layout.rows = Math.ceil(this._cellCount / layout.columns);
			layout.cellHeight = this._cellSize.height;

			this._height = layout.rows * this._cellSize.height;
			layout.viewportRows = Math.min(layout.rows, Math.ceil(canvas.height / this._cellSize.height));
			const visRows = Math.min(layout.rows, Math.floor(canvas.height / this._cellSize.height)) || 1;
			layout.viewportItems = visRows * layout.columns;
		}

		canvas.dirty();
	}

	vertScroll(event: Event) {
		// const s = event.srcElement as HTMLDivElement;
		const s = event.target as HTMLDivElement;
		// console.log(s.clientHeight, s.scrollTop);

		this._vertScroll = s.scrollTop;
		this._canvas?.dirty();
	}

	@HostListener('keydown.enter')
	onEnter() {
		const cell = this.indexToCell(this._currentCellIndex);
		if (cell) {
			this.openCell.next(cell);
		}
	}
	@HostListener('dblclick', ['$event'])
	onMouseDoubleClick(event: MouseEvent) {
		const cell = this.pointToCell(clientToRelative(this.el?.nativeElement, event.clientX, event.clientY));
		if (cell) {
			this.openCell.next(cell);
		}
	}

	@HostListener('mousedown', ['$event'])
	onMousedown(event: MouseEvent) {
		const cell = this.pointToCell(clientToRelative(this.el?.nativeElement, event.clientX, event.clientY));
		if (cell) {
			this._currentCellIndex = cell.cell;
			this.cellSelected.next(cell);
			this._canvas?.dirty();
		}
	}

	@HostListener('mousemove', ['$event'])
	onMouseMove(event: MouseEvent) {
		const cell = this.pointToCell(clientToRelative(this.el?.nativeElement, event.clientX, event.clientY));
		if (cell) {
			this.cellHover.next(cell);
		}
	}

	@HostListener('keydown.arrowleft')  onGoLeft()  { this.goTo(this._currentCellIndex, -1); }
	@HostListener('keydown.arrowright') onGoRight() { this.goTo(this._currentCellIndex, +1); }
	@HostListener('keydown.arrowup')    onGoUp()    { this.goTo(this._currentCellIndex, -this._layout.columns); }
	@HostListener('keydown.arrowdown')  onGoDown()  { this.goTo(this._currentCellIndex, +this._layout.columns); }
	@HostListener('keydown.pageup')     onGoPgUp()  { this.goTo(this._currentCellIndex, -this._layout.viewportItems); }
	@HostListener('keydown.pagedown')   onGoPgDn()  { this.goTo(this._currentCellIndex, +this._layout.viewportItems); }

	goTo(index: number, delta: number) {
		const cell = this.indexToCell(index + delta);
		if (cell && cell.cell !== this._currentCellIndex) {
			this._currentCellIndex = cell.cell;
			this.cellSelected.next(cell);
			this.scrollTo(cell.cell);
			this._canvas?.dirty();
		}
	}

	indexToCell(index: number): { col: number, row: number, cell: number } | null {
		const layout = this._layout;
		index = _.clamp(index, 0, this._cellCount - 1);
		if (layout.columns > 0 && index >= 0 && index < this._cellCount) {
			const col = Math.floor(index % layout.columns);
			const row = Math.floor(index / layout.columns);
			const cell = Math.floor(index);
			return {col, row, cell};
		}
		return null;
	}

	// point in element's space to a cell location
	pointToCell(point: { x: number, y: number }): { col: number, row: number, cell: number } | null {
		const layout = this._layout;
		const canvas = this._canvas;
		if (canvas && layout.columns &&
			point.x >= 0 && point.x < canvas.width &&
			point.y >= 0 && point.y < canvas.height) {

			const col = Math.floor(point.x / layout.cellWidth);
			const row = Math.floor((point.y + this._vertScroll) / layout.cellHeight);
			const index = col + row * layout.columns;
			if (index < this._cellCount) return { col, row, cell: index };
		}
		return null;
	}

	scrollTo(cell: number) {
		if (!this._layout.columns || !this._canvas) return;

		const row = Math.floor(cell / this._layout.columns);
		const firstRow = this._vertScroll / this._layout.cellHeight;
		const lastRow = firstRow + this._layout.viewportItems / this._layout.columns;
		let scroll = this._vertScroll;
		if (row < firstRow) {
			// scroll up
			scroll = row * this._layout.cellHeight;
		}
		else if (row + 1 >= lastRow) {
			// scroll down
			scroll = (Math.min(row + 1, this._layout.rows) - this._layout.viewportItems / this._layout.columns) * this._layout.cellHeight;
			const max = Math.max(0, this._height - this._canvas.height);
			if (scroll > max) scroll = max;
		}

		if (scroll !== this._vertScroll) {
			this._vertScroll = scroll;
			this._scrollTop = scroll;
			this._canvas?.dirty();
		}
	}

	@ViewChild('canvas') _canvas!: CanvasDrawComponent;
	_height = 0;
	_cellSize: { width: number, height: number } | undefined;
	_layout = {
		cellWidth: 0, cellHeight: 0,
		columns: 0, rows: 0,
		viewportRows: 0,
		viewportItems: 0
	};
	_cellCount = 0;
	_gap = 1;
	_vertScroll = 0;
	_currentCellIndex = -1;
	_scrollTop = 0;
}
