import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { DrawOptions, CanvasDrawComponent } from '../canvas-draw/canvas-draw.component';

@Component({
	selector: 'font-tile',
	templateUrl: './font-tile.component.html',
	styleUrls: ['./font-tile.component.scss']
})
export class FontTileComponent implements OnInit {

	@Input()
	set font(f: opentype.Font) {
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
			const size = this._fontSize;
			this._font.draw(opt.ctx, this._text, size * 0.10, size, size);
		}
	}

	ngOnInit(): void {
	}

	@ViewChild('canvas') _canvas: CanvasDrawComponent;
	_font: opentype.Font | undefined;
	_fontSize = 50;
	_text = "abcg";
}
