import { Component, OnInit, Input, Output, ElementRef, EventEmitter, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import * as _ from 'lodash';
import { GalleryGroup } from './gallery-group';
import { GalleryItemComponent } from './gallery-item.component';
import { Point } from './point';
import { Rect } from './rect';

@Component({
	selector: 'mk-gallery-group',
	templateUrl: './gallery-group.component.html',
	styleUrls: ['./gallery-group.component.scss'],
	// tslint:disable-next-line:no-host-metadata-property
	host: {
		'[style.width]': "_virtual ? '100%' : 'auto'",
		'[style.height]': "_virtual ? '100%' : 'auto'"
	}
})
export class GalleryGroupComponent implements OnInit, AfterContentInit {

	@ContentChildren(GalleryItemComponent) content: QueryList<GalleryItemComponent>;
	@Input() title: string;
	@Input() group: GalleryGroup;
	@Output() clicked = new EventEmitter<any>();

	constructor(private el: ElementRef) {
	}

	ngOnInit() {
		if (!this.group) throw { message: 'GalleryGroupComponent requires [group] input to be provided.' };
	}

	ngAfterContentInit() {
		// this.content.forEach((item, index) => {
		//   item.clicked.subscribe(a => this.clicked.next(a));
		// });
		this.scrollItems(0, 0); // this.group && this.group.getYOffset() || 0);
		// const dim = this.calculateSize();
		// this._height = dim ? dim.rows * dim.height : 0;
	}

	// get number of columns (== number of elements in the first row)
	getColumns() {
		let columns = 0;
		if (this.content && this.content.length > 0) {
			const size = this.getClientSize();
			const bbox = this.getBoundingBox();
			const rect = this.content.first.getElementSize();
			if (this._virtual) {
				if (!this.wrapItems) {
					columns = this.group ? this.group.allItems.length : 1;
				}
				else if (size.width && rect && rect.width) {
					columns = Math.max(1, Math.floor(size.width / rect.width));
				}
				else if (bbox && rect && bbox.width && rect.width) {
					columns = Math.max(1, Math.floor(bbox.width / rect.width));
				}
				else {
					columns = 1;
				}
			}
			else {
				const rect = this.content.first.getBoundingRect();
				// count all elements in the same row as the first one
				columns = _.takeWhile(this.content.toArray(), el => el.getBoundingRect().top === rect.top).length;
			}
		}

		return columns;
	}

	getClientSize(): {width: number, height: number} {
		const el = this.el.nativeElement;
		const size = {width: el.clientWidth, height: el.clientHeight};
		return size;
	}

	getBoundingBox(): ClientRect {
		const rect = this.el.nativeElement.getBoundingClientRect();
		if (this._virtual && rect) {
			const offsetY = this._requestedTop;
			const offsetX = this._requestedLeft;
			const top = rect.top + offsetY;
			const left = rect.left + offsetX;
			const moved = { left, top, y: top, x: left, right: rect.right + offsetX, bottom: rect.bottom + offsetY, width: rect.width, height: rect.height };
			return moved;
		}
		return rect;
	}

	getItemBoundingBox(itemIndex: number): ClientRect {
		if (this._virtual) {
			const dim = this.calculateSize();
			if (this.group && dim && dim.complete) {
				if (this.wrapItems) {
					const box = this.getItemBBox(itemIndex - this.group.startItem);
					if (box) return box;

					// rows of items that fit in a view
					const rowsFit = Math.floor(dim.viewHeight / ((dim.height + dim.spaceDy) || dim.viewHeight));
					// gaps: account for spacing between items; 0.5 is half a space at the top/left
					const gaps = Math.floor(_.clamp(itemIndex - this.group.startItem, -rowsFit, rowsFit) / dim.columns) + 0.5;
					const row = Math.floor(itemIndex / dim.columns);
					const col = itemIndex % dim.columns;
					const x = col * dim.width;
					const y = row * dim.height - this._requestedTop + dim.viewTop + gaps * dim.spaceDy;
					const rect = { left: x, top: y, y: y, x: x, right: x + dim.width, bottom: y + dim.height, width: dim.width, height: dim.height };
				// const first = this.getItemBBox(0);
				// const comp = this.getItemBBox(itemIndex);
					return rect;
				}
				else {
					// in horizontal layout
					const colsFit = Math.floor(dim.viewWidth / ((dim.width + dim.spaceDx) || dim.viewWidth));
					// spacing between items
					const gaps = Math.floor(_.clamp(itemIndex - this.group.startItem, -colsFit, colsFit)) + 0.5;
					const col = itemIndex;
					const x = col * dim.width - this._requestedLeft + dim.viewLeft + gaps * dim.spaceDx;
					const y = 0;
					const rect = { left: x, top: y, y: y, x: x, right: x + dim.width, bottom: y + dim.height, width: dim.width, height: dim.height };
				// const first = this.getItemBBox(0);
				// const comp = this.getItemBBox(itemIndex);
					return rect;
				}
			}
			return null;
		}
		else {
			return this.getItemBBox(itemIndex);
		}
	}

	private getItemBBox(index: number): ClientRect {
		const item = this.content.toArray()[index];

		// if (!item && this.itemSize && index === 0) {
		// 	const rect = { left: 0, top: 0, y: 0, x: 0, right: this.itemSize.w, bottom: this.itemSize.h, width: this.itemSize.w, height: this.itemSize.h };
		// 	return rect;
		// }

		return item && item.getBoundingRect();
	}

	getItems(): QueryList<GalleryItemComponent> {
		return this.content;
	}

	findItemIndex(point: Point): number {
		const start = this._virtual ? this.group && this.group.startItem || 0 : 0;
		const index = _.findIndex(this.getItems().toArray(), item => Rect.contains(item.getBoundingRect(), point));
		return index < 0 ? index : start + index;
	}

	wrapItems = true;
	_height = 0; // height for virtual groups
	_width = 0; // width for virtual groups when horz scrolling is used
	// those vars are used to counter scrolling in case of the virtual scrolling grid
	_top = 0;
	_left = 0;
	private _requestedTop = 0;
	private _requestedLeft = 0;

	get _virtual(): boolean {
		return this.group && this.group.virtual;
	}

	private calculateSize() {
		const bbox = this.getBoundingBox();
		const rect = this.getItemBBox(0);
		const columns = this.getColumns() || 1;
		if (!this.group || !bbox || !bbox.width || !bbox.height) return;

		const N = this.group.allItems.length;
		const rows = Math.ceil(N / columns);
		const next = this.getItemBBox(this.wrapItems ? columns : 1);
		// 'magic' 10: if there's no next item (just a single big item), there's no way to know the gap
		// between items, but we still need to accound for selection outline space
		const margin = 10;
		const spaceY = Math.max(0, next && rect && next.top - rect.bottom || margin);
		const spaceX = Math.max(margin, next && rect && next.left - rect.right || 0);
// console.log(rows, columns, N);

		return {
			width: rect && (rect.width + spaceX) || bbox.width,
			height: rect && (rect.height + spaceY) || bbox.height,
			rows,
			columns,
			viewWidth: bbox.width,
			viewHeight: bbox.height,
			viewTop: bbox.top,
			viewLeft: bbox.left,
			totalItems: N,
			spaceDy: 0,
			spaceDx: 0,
			complete: rect && rect.width && rect.height
		};
	}

	scrollItems(offsetX: number, offsetY: number) {
		const dim = this.calculateSize();
// console.log(dim);

		if (!dim) {
			if (this.group && this.group.allItems.length === 0) {
				this._height = 0;
				this._width = 0;
			}
			return;
		}

		let maxOffset = 0;
		if (this.wrapItems) {
			this._height = dim.rows * dim.height;
			this._width = dim.width + dim.spaceDx; // size of a single item plus margin; this is to force horz scrollbar if needed
			maxOffset = this._height - dim.viewHeight;
		}
		else {
			this._width = dim.columns * dim.width;
			this._height = 1;
			maxOffset = this._width - dim.viewWidth;
		}

		let start = 0;
		let end = 0;
		const offset = _.clamp(this.wrapItems ? offsetY : offsetX, 0, Math.max(0, maxOffset));

		if (dim && dim.totalItems && dim.complete) {
			const max = dim.totalItems - 1;

			if (this.wrapItems) {
				// items in rows; vertical scrollbar
				start = _.clamp(Math.floor(offset / dim.height) * dim.columns, 0, max);
				end = _.clamp(Math.ceil((offset + dim.viewHeight) / dim.height) * dim.columns, 0, max);

				this._top = offset - (offset % dim.height);
				this._requestedTop = offset;
	// console.log('top', this._requestedTop, maxOffset);

				this._left = 0;
				this._requestedLeft = 0;
			}
			else {
				// horizontal layout, only one row of items with horz scrolling
				start = _.clamp(Math.floor(offset / dim.width), 0, max);
				end = _.clamp(Math.ceil((offset + dim.viewWidth) / dim.width), 0, max);

				this._left = offset - (offset % dim.width);
				this._requestedLeft = offset;
				this._top = 0;
				this._requestedTop = 0;
			}
		}
		else {
			this._top = 0;
			this._requestedTop = 0;
			this._left = 0;
			this._requestedLeft = 0;
		}

		if (this.group) {
			this.group.setViewportItems(start, end);
		}
	}
}
