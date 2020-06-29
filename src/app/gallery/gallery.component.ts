import {
	Component, OnInit, Input, Output, EventEmitter, ElementRef, HostBinding, HostListener, OnDestroy,
	ContentChildren, AfterContentInit, AfterViewInit, QueryList, AfterViewChecked, OnChanges, NgZone, SimpleChanges
} from '@angular/core';
import * as _ from 'lodash';
import { interval, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { GalleryItem } from './gallery-item';
import { GalleryGroup } from './gallery-group';
import { GalleryGroupComponent } from './gallery-group.component';
import { Rect } from './rect';
import { Point } from './point';
import { rectsIntersect, relativeToClient, clientToRelative } from '../utils';

enum GallerySelectionMode { None, Single, Multiple }

export const DOWN =  '5';
export const UP =    '4';
export const RIGHT = '3';
export const LEFT =  '2';
export const NONE =  '1';

enum Direction { None = +NONE, Left = +LEFT, Right = +RIGHT, Up = +UP, Down = +DOWN, Top = 6, Bottom = 7 }
enum Selection { Replace = 1, Extend, Toggle, Preserve }

export interface GallerySelectionInfo {
	currentItem: GalleryItem;
	itemIndex: number;
	selectedItems: GalleryItem[];
	hasSingleSelection(): boolean;
}

class GallerySelectionImpl implements GallerySelectionInfo {
	constructor(private all: GalleryItem[], index: number) {
		this.currentItem = all[index];
		this.itemIndex = index;
	}

	readonly currentItem: GalleryItem;
	readonly itemIndex: number;

	get selectedItems(): GalleryItem[] {
		if (!this._selected) {
			this._selected = _.filter(this.all, item => item.selected);
		}
		return this._selected;
	}

	hasSingleSelection(): boolean {
		const selected = this.selectedItems;
		if (this.currentItem && selected[0] === this.currentItem && selected.length === 1) {
			return true; // only one item is selected and it's a current item
		}
		return false;
	}

	private _selected: GalleryItem[] | undefined;
}

@Component({
	selector: 'mk-gallery',
	templateUrl: './gallery.component.html',
	styleUrls: ['./gallery.component.scss']
	// , host: {'class': 'container'}
	// host: {'[class.someClass]':'someField'}
})
export class GalleryComponent implements OnInit, AfterContentInit, AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {
	@Output() selection = new EventEmitter<GallerySelectionInfo>();
	@Output() itemVisibilityChanged = new EventEmitter<void>();
	@Input()
	set items(v: GalleryItem[]) {
		this._items = v;
	}
	@Input()
	set groups(v: GalleryGroup[]) {
		this._groups = v;
		if (this._virtualGrid && v && v.length === 1) {
			v[0].virtual = true;
		}
		// run this code after DOM gets synchronized and laid out
		setTimeout(() => this.layoutChanged(), 0);
		// if (this.initalSelection) {
		// 	this.changeSelection(0, 0, Selection.Replace);
		// }
		// console.log('grp change');

	}
	@Input()
	set selectionMode(value: string) {
		switch (value) {
			case 'single':
				this._selectionMode = GallerySelectionMode.Single;
				break;
			case 'multiple':
				this._selectionMode = GallerySelectionMode.Multiple;
				break;
			default:
				throw {message: 'Invalid selection mode.'};
		}
	}
	// track mouse and select on 'mouse over'
	@Input() trackSelection = false;
	// if true, first item will be selected after refresh
	@Input() initialSelection = true;
	@Input()
	set wrapItems(wrap: boolean) {
		this._wrapItems = wrap;
		if (this.el) {
			this.el.scrollLeft = 0;
			this.el.scrollTop = 0;
		}
		this.setWrap(wrap);
	}
	@Input() scrollMargin = 5;
	@Input() initiallySelectedItem = 0;
	@Input()
	set virtualGrid(on: boolean) {
		this._virtualGrid = on;
	}

	@ContentChildren(GalleryGroupComponent) elements!: QueryList<GalleryGroupComponent>;

	constructor(
		el: ElementRef,
		private zone: NgZone
		) {
		this.el = el.nativeElement;
		this._scrolling.pipe(debounceTime(250)).subscribe(() => this.visibilityChanged());
	}

	moveToNext() {
		this.goTo(Direction.Right, false, false);
	}

	moveToPrev() {
		this.goTo(Direction.Left, false, false);
	}

	selectItem(index: number): boolean {
		if (this._items && this._items[index] /* && !this._items[index].selected */) {
			this.changeSelection(index, index, Selection.Replace);
			this.scrollToView(index);
			return true;
		}
		return false;
	}

	getSelectedItems(): GalleryItem[] {
		return this._items ? _.filter(this._items, item => item.selected) : [];
	}

	loadVisibleImages() {
		setTimeout(() => this.layoutChanged(), 0);
	}

	private layoutChanged() {
		if (this._destroyed) return;

		if (this._virtualGrid) {
			this.updateItems();
		}
		this.visibilityChanged();
	}

	readonly el: HTMLElement;

	ngOnInit() {
		// check if more items became visible after resize
		window.addEventListener('resize', this._resize, false);
		const parent = this.el.parentElement;
		if (parent && parent.tabIndex !== undefined) {
			// make gallery focusable
			parent.tabIndex = 0;
		}

		// this.el.addEventListener('DOMMouseScroll', this.onMouseWheel, false);	// for Firefox
		// this.el.addEventListener('mousewheel', this.onMouseWheel, false);

		this.resizeObserver = new ResizeObserver(() => {
			this.zone.run(() => setTimeout(() => this.loadVisibleImages(), 10));
		});
		this.resizeObserver.observe(this.el);
	}

	ngOnDestroy() {
		this._destroyed = true;
		window.removeEventListener('resize', this._resize, false);

		if (this.resizeObserver) {
			this.resizeObserver.unobserve(this.el);
			delete this.resizeObserver;
		}
	}

	ngAfterContentInit() {
		this.setWrap(this._wrapItems);
	}

	ngAfterViewInit() {
		this.visibilityChanged();
	}

	// ngAfterContentChecked(): void {
	// 	console.log('after check');
	// }

	ngOnChanges(arg: SimpleChanges) {
		if (this.initialSelection && (arg.items || arg.groups)) {
			// wait for HTML to reflect changes before selecting something
			setTimeout(() => {
				if (this._destroyed) return;

				if (this.selectItem(this.initiallySelectedItem)) {
					this.scrollToView(this.initiallySelectedItem, false);
				}
				else {
					// this case covers sending selection change when gallery is empty
					this.fireSelectionChange();
				}
			}, 0);
		}
	}

	ngAfterViewChecked() {
	}

	private setWrap(wrap: boolean) {
		if (this.elements) {
			this.elements.forEach(group => { group.wrapItems = wrap; });
		}
	}

	itemClicked(index: number, extend: boolean, toggle: boolean) {
		if (index < 0) return;

		let from = this._currentItemIndex;
		let sel = Selection.Replace;
		if (extend) {
			sel = Selection.Extend;
			from = this._anchorIndex;
		}
		else if (toggle) {
			sel = Selection.Toggle;
		}

		this.changeSelection(from, index, sel);
		this.scrollToView(index);
	}

	selecting = false;
	selectRect = new Rect(0, 0, 0, 0);
	clickPoint = new Point(0, 0);
	itemClick = false;
	readonly deltaMove = 4;

	private getPoint(e: MouseEvent): Point {
		const p = clientToRelative(this.el, e.clientX, e.clientY);
		return new Point(p.x, p.y);
	}

	@HostListener('mousedown', ['$event'])
	mouseDown(e: MouseEvent) {
		if (!e.metaKey) {
			const p = this.getPoint(e);
			this.clickPoint = p;
// console.log(p);
// console.log(this.toClientPoint(p));

			this.selectRect = new Rect(p.x, p.y, p.x, p.y);
			this.selecting = false; // wait for mouse to move
			this.itemClick = true;

			// this.el.setPointerCapture && this.el.setPointerCapture((e as any).pointerId);

			return true;
		}
		return false;
	}

	@HostListener('mousemove', ['$event'])
	mouseMove(e: MouseEvent) {
		// tslint:disable-next-line:no-bitwise
		if (!this.selecting && this.itemClick && (e.buttons & 1)) { // left button down?
			const p = this.getPoint(e);
			this.selecting = this._selectionMode === GallerySelectionMode.Multiple &&
				(Math.abs(this.clickPoint.x - p.x) > this.deltaMove || Math.abs(this.clickPoint.y - p.y) > this.deltaMove);
		}

		if (this.selecting) {
			const p = this.getPoint(e);
			this.selectRect = Rect.normalize(this.clickPoint.x, this.clickPoint.y, p.x, p.y);
		}

		if (this.trackSelection) {
			const p = this.getPoint(e);
			const index = this.findItemAt(p);
			if (index >= 0) {
				this.itemClicked(index, false, false);
			}
		}

		return true;
	}

	@HostListener('mouseup', ['$event'])
	mouseUp(e: MouseEvent) {
		const [extendSelection, moveCurrent] = this.decodeShiftCtrl(e.shiftKey, e.ctrlKey);
		if (this.selecting) {
			// this.el.releasePointerCapture && this.el.releasePointerCapture(0);
			this.selectInRect(this.selectRect, extendSelection, moveCurrent);
			this.fireSelectionChange();
		}
		else if (this.itemClick) {
			const index = this.findItemAt(this.clickPoint);
			if (index >= 0) {
				this.itemClicked(index, extendSelection, moveCurrent);
			}
		}
		this.selecting = false;
		this.itemClick = false;

		return true;
	}

	@HostListener('click', ['$event'])
	galleryClicked(e: Event) {
		//    (this.el.nativeElement as HTMLElement).focus();
		// todo: start lasso select
		// console.log('gallery', e);
	}

	@HostListener('DOMMouseScroll', ['$event'])
	mouseScroll(ev: WheelEvent): void {
		const delta = -ev.detail * 40;
		if (this.scrollItems(delta)) {
			ev.preventDefault();
		}
	}

	@HostListener('mousewheel', ['$event'])
	mousewheel(ev: WheelEvent): void {
		const delta = /*ev['wheelDelta'] ||*/ ev.deltaY;
		if (this.scrollItems(delta)) {
			ev.preventDefault();
		}
	}

	scrollItems(horzAmount: number): boolean {
		if (!this._wrapItems) {
			// items laid out horizontally; make mouse wheel scroll horizontally too
			this.el.scrollLeft -= horzAmount;
			return true;
		}
		return false;
	}
	// make gallery focusable
	@HostBinding('tabindex') _tabIndex = 0;

	@HostBinding('scrollTop') scrollTop = 0;
	@HostBinding('scrollLeft') scrollLeft = 0;
	@HostListener('scroll', ['$event.target'])
	scrolled(el: HTMLElement) {
		this.scrollPosX = el.scrollLeft;
		this.scrollPosY = el.scrollTop;
		this._scrolling.next();
		// this.visibilityChanged();
		if (this._virtualGrid) {
			this.updateItems();
		}
	}
	scrollPosX = 0;
	scrollPosY = 0;

	@HostBinding('class.scroll-y') get scrollYenabled(): boolean {
		return this._wrapItems;
	}
	@HostBinding('class.scroll-x') get scrollXenabled(): boolean {
		return !this._wrapItems;
	}
	// @HostListener('onscroll', ['$event'])
	// galleryScrolled2(e) {
	//   console.log('onscroll ' + e);
	// }

	// scrollPos = 0;
	// @HostListener('keydown.ArrowUp',            ['$event', UP,    '{}'])
	// test = () => {
	//   console.log('test hit');
	// }
	decodeShiftCtrl(shift: boolean | undefined, control: boolean | undefined): [boolean, boolean] {
		let extendSelection = !!shift;
		let moveCurrent = !!control;
		if (this._selectionMode === GallerySelectionMode.Single) {
			extendSelection = false;
			moveCurrent = false;
		}
		return [extendSelection, moveCurrent];
	}

	// shortcuts handled by gallery
	@HostListener('keydown.ArrowUp',            [UP,    '{}'])
	@HostListener('keydown.shift.ArrowUp',      [UP,    '{shift:   true}'])
	@HostListener('keydown.control.ArrowUp',    [UP,    '{control: true}'])
	@HostListener('keydown.ArrowDown',          [DOWN,  '{}'])
	@HostListener('keydown.shift.ArrowDown',    [DOWN,  '{shift:   true}'])
	@HostListener('keydown.control.ArrowDown',  [DOWN,  '{control: true}'])
	@HostListener('keydown.ArrowLeft',          [LEFT,  '{}'])
	@HostListener('keydown.shift.ArrowLeft',    [LEFT,  '{shift:   true}'])
	@HostListener('keydown.control.ArrowLeft',  [LEFT,  '{control: true}'])
	@HostListener('keydown.ArrowRight',         [RIGHT, '{}'])
	@HostListener('keydown.shift.ArrowRight',   [RIGHT, '{shift:   true}'])
	@HostListener('keydown.control.ArrowRight', [RIGHT, '{control: true}'])
	@HostListener('keydown.space',              [NONE,  '{}'])
	@HostListener('keydown.control.space',      [NONE,  '{control: true}'])
	private keydown(dir: string, modifiers: {shift?: boolean, control?: boolean}) {
		const [extendSelection, moveCurrent] = this.decodeShiftCtrl(modifiers.shift, modifiers.control);
		this.goTo(parseInt(dir, 10) as Direction, extendSelection, moveCurrent);
		return false; // prevent default
		//    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
	}

	goTo(dir: Direction, extendSelection: boolean, moveCurrent: boolean) {
		if (!dir) return;

		const next = this.findItem(this._currentItemIndex, dir);
		if (next >= 0 && next < this._items.length) {
			// move selection
			let sel = Selection.Replace;

			if (extendSelection) {
				sel = Selection.Extend;
				this.changeSelection(this._anchorIndex, next, sel);
			}
			else if (moveCurrent) {
				sel = dir === Direction.None ? Selection.Toggle : Selection.Preserve;
				this.changeSelection(this._anchorIndex, next, sel);
			}
			else {
				this._anchorIndex = next;
				this.changeSelection(this._currentItemIndex, next, sel);
			}

			this.scrollToView(next);
		}
	}

	scrollToView(itemIndex: number, smooth?: boolean) {
		const rect = this.getItemBoundingBox(itemIndex);
		if (!rect) return;

		const viewBox = this.el.getBoundingClientRect();

		const margin = this.scrollMargin;

		if (this._wrapItems) {
			const top = rect.top - margin;
			const bottom = rect.bottom + margin;
			const scrollTop = this.el.scrollTop;
			let pos = scrollTop;

			if (top < viewBox.top) {
				pos = Math.max(this.scrollPosY - (viewBox.top - top), 0);
			}
			else if (bottom > viewBox.bottom) {
				pos = Math.max(this.scrollPosY + (bottom - viewBox.bottom), 0);
			}

			if (scrollTop !== pos) {
				this.scrollTop = pos;
				this.el.scrollTop = pos;
			}
		}
		else {
			const left = rect.left - margin;
			const right = rect.right + margin;
			const scrollLeft = this.el.scrollLeft;
			let pos = scrollLeft;

			if (left < viewBox.left) {
				pos = Math.max(scrollLeft - (viewBox.left - left), 0);
			}
			else if (right > viewBox.right) {
				pos = Math.max(scrollLeft + (right - viewBox.right), 0);
			}

			if (scrollLeft !== pos) {
				if (smooth === false) {
					this.scrollLeft = pos;
					this.el.scrollLeft = pos;
				}
				else {
					this.smoothScrollTo(pos, this.scrollTop);
				}
			}
		}
	}

	private smoothScrollTo(x: number, y: number) {
		const scrollLeft = this.el.scrollLeft;
		if (scrollLeft !== x) {
			if (this.smooth) {
				this.smooth?.unsubscribe();
				this.smooth = null;
			}

			const delta = x - scrollLeft;
			const start = scrollLeft;
			const steps = Math.min(Math.floor(Math.abs(delta) / 6), 6);
			if (steps === 0) {
				this.scrollLeft = x;
				this.el.scrollLeft = x;
			}
			else {
				this.smooth = interval(35).subscribe(i => {
					this.scrollLeft = start + Math.sin(i * Math.PI / 2 / steps) * delta;
					if (i >= steps) {
						this.scrollLeft = x;
						this.smooth?.unsubscribe();
						this.smooth = null;
					}
				});
			}
		}
	}

	private smooth: Subscription | null = null;

	private visibilityChanged() {
		// console.log('refresh visibility');
		let changed = false;

		if (this._virtualGrid) {
			if (this._groups && this._groups.length === 1) {
				const start = this._groups[0].startItem;
				const end = this._groups[0].endItem;
				_.forEach(this._items, (item, index) => {
					const visible = index >= start && index <= end;
					if (item.inView !== visible) {
						item.inView = visible;
						changed = true;
					}
				});
			}
		}
		else {
			const viewBox = this.el.getBoundingClientRect();

			_.forEach(this._items, (item, index) => {
				const rect = this.getItemBoundingBox(index);
				if (rect) {
					const visible = rectsIntersect(rect, viewBox);
					if (item.inView !== visible) {
						item.inView = visible;
						changed = true;
					}
				}
			});
		}
// console.log('visib chg', changed);

		if (changed) {
			this.itemVisibilityChanged.next();
		}
	}

	// @HostListener('keydown', ['$event'])
	//   onKeyDown(e: KeyboardEvent) {
	//     let dir: Direction = this.keyToDir[e.code];
	//     if (dir) {
	//       let next = this.findItem(this._currentItemIndex, dir);
	//       if (next >= 0 && next < this.items.length) {
	//         // move selection
	//         let sel = Selection.Replace;

	//         if (e.shiftKey) {
	//           sel = Selection.Extend;
	//           this.changeSelection(this._anchorIndex, next, sel);
	//         }
	//         else if (e.ctrlKey) {
	//           sel = dir === Direction.None ? Selection.Toggle : Selection.Preserve;
	//           this.changeSelection(this._anchorIndex, next, sel);
	//         }
	//         else {
	//           this._anchorIndex = next;
	//           this.changeSelection(this._currentItemIndex, next, sel);
	//         }
	//       }

	//       e.preventDefault();
	//     }
	// //   console.log(e);
	//   }

	private findItem(current: number, dir: Direction): number {
		// find next item index based on direction 'dir'

		switch (dir) {
			case Direction.Left:
				return Math.max(current - 1, -1);
			case Direction.Right:
				return Math.min(current + 1, this._items.length);

			case Direction.Up:
				return this.navigateToRow(current, false);
			case Direction.Down:
				return this.navigateToRow(current, true);

			case Direction.Top:
				return 0;
			case Direction.Bottom:
				return this._items.length - 1;

			case Direction.None:
				return current;
		}

		return -1;
	}

	// find group containing itemIndex item
	findGroup(itemIndex: number): [GalleryGroupComponent | null, number, GalleryGroupComponent[] | null] {
		const groupElements = this.elements.toArray();
		const index = _.findIndex(groupElements, el => itemIndex >= el.group.start && itemIndex < el.group.end);
		if (index >= 0 && index < groupElements.length) {
			return [groupElements[index], index, groupElements];
		}
		return [null, -1, null];
	}

	getItemBoundingBox(itemIndex: number): ClientRect | null {
		const [groupElement, groupIndex, groups] = this.findGroup(itemIndex);
		if (!groupElement) return null;

		return groupElement.getItemBoundingBox(itemIndex - groupElement.group.start);
	}

	findPosition(itemIndex: number) {
		const [groupElement, groupIndex, groups] = this.findGroup(itemIndex);
		if (!groupElement) return null;

		const index = itemIndex - groupElement.group.start;
		const columns = groupElement.getColumns() || 1;
		const rows = Math.ceil(groupElement.group.length / columns);
		return {
			row: Math.floor(index / columns),
			column: index % columns,
			columns,
			rows,
			itemIndex: index,
			groupElement,
			groupIndex,
			groups
		};
	}

	// return index of the item in the next/previous row
	navigateToRow(itemIndex: number, nextRow: boolean): number {
		const pos = this.findPosition(itemIndex);
		if (!pos || !pos.groups || !pos.groupElement) return -1;

		const newRow = nextRow ? pos.row + 1 : pos.row - 1;
		if (newRow < 0) {
			// go to previous group
			const groupElement = pos.groups[pos.groupIndex - 1];
			if (groupElement) {
				const prev = this.findPosition(groupElement.group.last);
				if (prev) {
					const group = prev.groupElement.group;
					const index = group.start + prev.row * prev.columns + pos.column;
					return Math.min(index, group.last);
				}
			}
		}
		else if (newRow >= pos.rows) {
			// go to the next group
			const groupElement = pos.groups[pos.groupIndex + 1];
			if (groupElement) {
				const index = groupElement.group.start + pos.column;
				// make sure not to jump over the next group if it is short
				return Math.min(index, groupElement.group.last);
			}
		}
		else if (newRow === pos.rows - 1) {
			// last row in the group
			return Math.min(itemIndex + pos.columns, pos.groupElement.group.last);
		}
		else {
			return itemIndex + (nextRow ? pos.columns : -pos.columns);
		}

		return -1;
	}

	private changeSelection(current: number, next: number, mode: Selection) {
		if (mode === Selection.Replace) {
			// select 'next', unselect everything else
			_.forEach(this._items, (item, index) => {
				item.selected = next === index;
				// item.current = false;
			});
		}
		else if (mode === Selection.Extend) {
			// grow/shrink selection: from current to next
			_.forEach(this._items, (item, index) => {
				item.selected = index <= current && index >= next || index <= next && index >= current;
				// item.current = next === index && next !== current;
			});
		}
		else if (mode === Selection.Toggle) {
			// flip selection
			const item = this._items[next];
			if (item) {
				item.selected = !item.selected;
			}
		}
		else if (mode === Selection.Preserve) {
			// no changes to selection, only current item moves
			// _.forEach(this.items, (item, index) => {
			//   item.current = next === index;
			// });
		}

		this._currentItemIndex = next;
		if (mode !== Selection.Extend) {
			this._anchorIndex = next;
		}

		if (this.elements) {
			this.elements.forEach(group =>
				group.getItems().forEach((item, index) =>
					item.current = this._selectionMode === GallerySelectionMode.Multiple && group.group.startItem + index === next)
			);
		}

		this.fireSelectionChange();
	}

	private fireSelectionChange() {
		const items = this._items;
		// fire notification event
		this.selection.next(new GallerySelectionImpl(items, this._currentItemIndex));
	}

	// intersect(rectA: ClientRect, rectB: ClientRect): boolean {
	//   if (!rectA || !rectB) return false;

	//   return rectA.left < rectB.right && rectA.right > rectB.left &&
	//     rectA.top < rectB.bottom && rectA.bottom > rectB.top;
	// }

	toClientPoint(point: Point): Point {
		const p = relativeToClient(this.el, point.x, point.y);
		return new Point(p.x, p.y);
	}

	toClient(rect: Rect): ClientRect {
		const p = relativeToClient(this.el, rect.left, rect.top);

		return {
			left: p.x,
			top: p.y,
			right: p.x + rect.width,
			bottom: p.y + rect.height,
			width: rect.width,
			height: rect.height
		};
	}

	selectInRect(rect: Rect, extend: boolean, toggle: boolean): void {
		const clientRect = this.toClient(rect);

		if (!extend && !toggle) {
			// unselect all
			_.forEach(this._items, (item, index) => {
				item.selected = false;
			});
		}

		this.elements.forEach(group => {
			if (Rect.intersect(group.getBoundingBox(), clientRect)) {
				group.getItems().forEach(item => {
					if (Rect.intersect(item.getBoundingRect(), clientRect)) {
						item.item.selected = toggle ? !item.item.selected : true;
					}
				});
			}
		});
	}

	// find item under point
	findItemAt(point: Point): number {
		if (!this.elements) return -1;

		const clientPoint = this.toClientPoint(point);

		const group = this.elements.find(g => Rect.contains(g.getBoundingBox(), clientPoint));
		if (!group) return -1;

		const index = group.findItemIndex(clientPoint);
		if (index < 0) return -1;

		return index + group.group.start;
	}

	get currentItem(): GalleryItem {
		return this._items[this._currentItemIndex];
	}

	private updateItems() {
		const group = this.elements.first;
		if (group) {
			group.scrollItems(this.scrollPosX, this.scrollPosY);
		}
	}

	private _resize = () => this.visibilityChanged();
	private _currentItemIndex = 0;
	private _anchorIndex = 0;
	private _selectionMode = GallerySelectionMode.Single;
	private _wrapItems = true;
	private _items: GalleryItem[] = [];
	private _groups: GalleryGroup[] = [];
	private _scrolling = new EventEmitter<void>();
	private _virtualGrid = false;
	private _destroyed = false;
	private resizeObserver: ResizeObserver | undefined;
}
