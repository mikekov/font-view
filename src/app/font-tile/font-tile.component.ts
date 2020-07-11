import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { DrawOptions, CanvasDrawComponent } from '../canvas-draw/canvas-draw.component';
import { FontObject } from '../utils/font-object';

@Component({
	selector: 'font-tile',
	templateUrl: './font-tile.component.html',
	styleUrls: ['./font-tile.component.scss']
})
export class FontTileComponent implements OnInit {

	@Input()
	set font(f: FontObject) {
		this._font = f;
	}

	@Input()
	set size(s: number) {
		this._fontSize = s;
		this._canvas?.dirty();
	}

	@Input()
	set text(t: string) {
		this._text = t;
		this._canvas?.dirty();
	}

	constructor() { }

	redraw(opt: DrawOptions) {
		if (this._font) {
			opt.clear('white');
			const size = this._fontSize;
			const bbox = this._font.getPath(this._text, 0, 0, size).getBoundingBox();
			this._font.draw(opt.ctx, this._text, -bbox.x1 + size * 0.05, size, size);
		}
	}

	ngOnInit(): void {
	}

	@ViewChild('canvas') _canvas!: CanvasDrawComponent;
	_font: FontObject | undefined;
	_fontSize = 50;
	_text = "abcg";
}
