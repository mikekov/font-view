import * as _ from "lodash";
import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';

@Component({
	selector: 'kt-scrollbar',
	templateUrl: './scrollbar.component.html',
	styleUrls: ['./scrollbar.component.scss']
})
export class ScrollbarComponent implements OnInit {

	@Input() lineSize = 80;
	@Input() pageSize = 0;
	@Input()
	set position(n: number) {
		this.changePosition(n, false);
	}
	@Input()
	set maximum(max: number) {
		this._maximum = Math.max(0, max);
		this.changePosition(this._position, true);
	}
	@Output() scrollTo = new EventEmitter<number>();
	// if true, display a toggle button to indicate "auto scrolling"; auto scrolling behavior is controlled outside
	@Input() showAutoScrollButton = false;
	@Input() autoScrollOn = false;
	@Output() toggleAutoScroll = new EventEmitter();

	constructor(elementRef: ElementRef) {
		this.el = elementRef.nativeElement;
	}

	ngOnInit() {
	}

	lineUp() {
		this._scroll(1);
	}

	lineDown() {
		this._scroll(-1);
	}

	scrollBy(delta: number) {
		this.changePosition(this._position + delta, true);
	}

	private rangeEnd(): number {
		return Math.max(0, this._maximum - this._pageSize());
	}

	private changePosition(newPos: number, notify: boolean) {
		const end = this.rangeEnd();
		const pos = _.clamp(newPos, 0, end);
		if (pos !== this.position) {
			this._position = pos;

			const t = this.thumbTravel();
			this._currentPos = end && pos * t / end || 0;

			if (notify) {
				if (!this._notifying) {
					this._notifying = true;
					this.scrollTo.next(pos);
					this._notifying = false;
				}
			}
		}
	}

	private _pageSize(): number {
		if (this.pageSize > 0) return this.pageSize;

		const rect = this.el.getBoundingClientRect();
		const amount = rect && (this._vert ? rect.height : rect.width) || this.lineSize;
		return amount;
	}

	_scroll(dir: number) {
		let amount = this.lineSize;
		if (dir === 2 || dir === -2) {
			dir /= 2;
			amount = this._pageSize();
		}
		this.changePosition(this._position + dir * amount, true);
	}

	_thumbLocation(): number {
		const range = this.rangeEnd();
		const f = range > 0 ? this._position / range : 0;
		return f * 100 - f * this._thumbSize();
	}

	_thumbSize(): number {
		if (this._maximum <= 0) return 0;

		const page = this._pageSize();
		const s = 100 * page / this._maximum;
		if (s >= 100) return 0; // hide it when content fits in a viewport
		return Math.max(s, 3);
	}

	private thumbTravel(): number {
		const track = this.trackElement.nativeElement.getBoundingClientRect();
		const thumb = this.thumbElement.nativeElement.getBoundingClientRect();
		return track && thumb && track.height - thumb.height || 0;
	}

	_thumbMoved(pos: number) {
		this._currentPos = pos;
		const t = this.thumbTravel();
		if (t > 0) {
			const p = pos / t * this.rangeEnd();
			this.changePosition(p, true);
		}
	}

	toggleAutoScrollClicked(): void {
		this.toggleAutoScroll.next();
	}

	@ViewChild('track', {static: true}) trackElement;
	@ViewChild('thumb', {static: true}) thumbElement;
	_vert = true;
	_position = 0;
	_maximum = 0;
	el: HTMLElement;
	_currentPos = 0;
	_thumbActive = false;
	_notifying = false;
	_showAutoScrollButton = false;
}
