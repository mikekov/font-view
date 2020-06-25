import { Component, OnInit, Input, Output, EventEmitter, HostBinding, HostListener, ElementRef } from '@angular/core';
import { GalleryItem } from './gallery-item';


@Component({
	selector: 'mk-gallery-item',
	templateUrl: './gallery-item.component.html',
	styleUrls: ['./gallery-item.component.scss'],
})
export class GalleryItemComponent implements OnInit {

	@Input() width: string;
	@Input() height: string;
	@Input() label: string;
	@Input() item: GalleryItem;
	@Input() current: boolean;
	@Output() openItem = new EventEmitter<any>();

	constructor(private el: ElementRef) {
	}

	ngOnInit() {
		if (!this.item) throw { message: 'GalleryItemComponent requires [item] input to be provided.' };
	}

	@HostBinding('class.active')
	get _active() {
		return this.item && this.item.selected;
	}

	@HostBinding('class.current')
	get _current() {
		return this.current;
	}

	getBoundingRect(): ClientRect {
		return this.el.nativeElement.getBoundingClientRect();
	}

	getElementSize(): {width: number, height: number} {
		// todo: consider box sizing
		const el = this.el.nativeElement;
		const style = el.currentStyle || window.getComputedStyle(el);
		const marginWidth = style ? parseFloat(style.marginLeft) + parseFloat(style.marginRight) : 0;
		const marginHeight = style ? parseFloat(style.marginTop) + parseFloat(style.marginBottom) : 0;
		// to complete it:
		// width = element.offsetWidth, // or use style.width
		// padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
		// border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
		// (width + margin - padding + border)
		const size = {width: Math.max(0, el.clientWidth + marginWidth), height: el.clientHeight + marginHeight};
		return size;
	}

	// no drag&drop
	@HostListener('dragstart')
	drag() { return false; }

	@HostListener('dblclick', ['$event'])
	itemDblClicked(event: MouseEvent) {
		this.openItem.next({item: this.item, shift: event.shiftKey, control: event.ctrlKey});
	}
}
