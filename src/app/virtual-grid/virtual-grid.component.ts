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
	};
	gapSize: number;
	cellWidth: number;
	cellHeight: number;
	// columns: number;
	// rows: number;
	state: 'normal' | 'selected' | 'hover';
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
		this.calcLayout();
	}

	@Output()
	draw = new EventEmitter<DrawGrid>();

	@Output()
	cellClicked = new EventEmitter<{ col: number, row: number, cell: number }>();

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
					const w = this._canvas.width / layout.columns;
					const offset = cell % layout.columns;
					x = Math.round(offset * w);
					width = Math.round((offset + 1) * w) - x;
					y = Math.floor(cell / layout.columns) * layout.cellHeight - dy;
				}
				return { x, y, width, height: layout.cellHeight };
			},
			gapSize: this._gap,
			cellWidth: layout?.cellWidth,
			cellHeight: layout?.cellHeight,
			state: 'normal'
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

	@HostListener('mousedown', ['$event'])
	onMousedown(event: MouseEvent) {
		const cell = this.pointToCell(clientToRelative(this.el?.nativeElement, event.clientX, event.clientY));
		if (cell) {
			this.cellClicked.next(cell);
		}
	}

	@HostListener('mousemove', ['$event'])
	onMouseMove(event: MouseEvent) {
		const cell = this.pointToCell(clientToRelative(this.el?.nativeElement, event.clientX, event.clientY));
		if (cell) {
			this.cellHover.next(cell);
		}
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
			// console.log(point, col, row);
			return { col, row, cell: col + row * layout.columns };
		}
		return null;
	}

	@ViewChild('canvas') _canvas: CanvasDrawComponent;
	_height = 0;
	_cellSize: { width: number, height: number } | undefined;
	_layout = {
		cellWidth: 0, cellHeight: 0,
		columns: 0, rows: 0,
		viewportRows: 0
	};
	_cellCount = 0;
	_gap = 1;
	_vertScroll = 0;
}
