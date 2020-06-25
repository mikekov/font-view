// import * as _ from 'lodash';
import { GalleryItem } from './gallery-item';

export class GalleryGroup {
	constructor(public readonly title: string, public readonly start: number, public readonly allItems: GalleryItem[]) {
	}

	get end(): number {
		return this.start + this.allItems.length;
	}

	get last(): number {
		return this.start + this.allItems.length - 1;
	}

	get length(): number {
		return this.allItems.length;
	}

	get items(): GalleryItem[] {
		return this.viewportItems;
	}

	get viewportItems(): GalleryItem[] {
		if (this._virtual) {
			return this.allItems.slice(this._startItem, this._endItem + 1);
		}
		else {
			return this.allItems;
		}
	}

	set virtual(on: boolean) {
		this._virtual = on;
	}

	get virtual(): boolean {
		return this._virtual;
	}

	setViewportItems(start: number, end: number) {
		this._startItem = start;
		this._endItem = end;
	}

	get startItem(): number {
		return this._virtual ? this._startItem : this.start;
	}

	get endItem(): number {
		return this._endItem;
	}

	private _virtual = false;
	private _startItem = 0;
	private _endItem = 0;
}
