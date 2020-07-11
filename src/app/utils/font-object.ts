import * as _ from 'lodash';
import * as opentype from 'opentype.js';

const require = (window as any).require;

export interface ExtGlyph extends opentype.Glyph {
	// index: number;
	orderedIndex: number;
	leftSideBearing: number;
}

export interface FontObject {
	fontName: string;
	fontFamilyName: string;
	fontSubfamilyName: string;
	fileName: string;
	filePath: string;
	fontOrder: number;
	proportions: number;
	weight: number;
	maxWidth: number;
	orderedGlyphs: ExtGlyph[];
	isItalic: boolean;
	tables: { [tableName: string]: opentype.Table };
	unitsPerEm: number;
	numGlyphs: number;
	draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): void;
	getPath(text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): opentype.Path;
	getEnglishName(key: string): string;
}

function getFileName(path: string): string {
	const { basename } = require && require('path');
	return basename ? basename(path) : path;
}

// const subfamilyOrder = {
// 	Roman: 500,
// 	Regular: 500,
// 	Italic: 1
// };

export class FontObjectEmpty implements FontObject {
	constructor(private error: string, public filePath: string) {}

	getEnglishName(key: string): string {
		if (key === 'loadingStatus') return this.error;
		return '';
	}

	get fileName(): string {
		return getFileName(this.filePath);
	}

	get fontName(): string {
		return getFileName(this.filePath);
	}

	fontFamilyName = '';
	fontSubfamilyName = '';
	fontOrder = 0;
	proportions = 0;
	weight = 0;
	maxWidth = 0;
	orderedGlyphs = [];
	isItalic = false;
	tables = {};
	unitsPerEm = 0;
	numGlyphs = 0;
	draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): void {}
	getPath(text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): opentype.Path {
		return new opentype.Path();
	}
}


const canvas = document.createElement("canvas");
let ctx: CanvasRenderingContext2D | null = null;

export class FontObjectImpl implements FontObject {
	constructor(public font: opentype.Font, public filePath: string) {
		if (!font) throw {message: 'Missing font in FontObject'};

		const sub = this.fontSubfamilyName;
		if (sub) {
			// use header bitfield instead? head.macStyle & 1
			this.isItalic = sub.toLowerCase().includes('italic');
		}
		else {
			this.isItalic = false;
		}
	}

	get fontName(): string {
		const family = this.font.getEnglishName('fontFamily');
		if (!family) {
			return this.fileName;
		}

		return `${family} ${this.font.getEnglishName('fontSubfamily')}`;
	}

	get fileName(): string {
		const { basename } = require && require('path');
		return basename ? basename(this.filePath) : this.filePath;
	}

	get fontFamilyName(): string {
		return this.font.getEnglishName('fontFamily');
	}

	get fontSubfamilyName(): string {
		return this.font.getEnglishName('fontSubfamily');
	}

	get fontOrder(): number {
		const os2 = this.font?.tables.os2;
		let weight = os2?.usWeightClass ?? 0;
		if (this.isItalic) weight++;
		return weight;
	}

	get proportions(): number {
		if (this._proportions === 0) {
			// calculate font proportions
			this._proportions = this.font.getAdvanceWidth("ABCDEFGabcdefg12345", 72);
		}
		return this._proportions;
	}

	get weight(): number {
		if (this._weight === 0) {
			// calculate font weight proxy by drawing text and counting pixels
			if (!ctx) {
				canvas.width = 64;
				canvas.height = 32;
				ctx = canvas.getContext("2d");
			}
			if (ctx) {
				ctx.fillStyle = '#fff';
				ctx.beginPath();
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.fillStyle = '#000';
				this.font.draw(ctx, "Ii", 5, 30, 20, {});
				ctx.closePath();
				const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const size = img.width * img.height * 4;
				let sum = 0;
				for (let i = 0; i < size; i += 4) {
					// traverse RGBA
					// use one chanel from grayscale image (Red);
					// values are already alpha premultiplied so we can ignore Alpha
					const r = img.data[i];
					sum += 255 - r;
				}
				this._weight = sum > 0 ? sum / size : 0.0001;
				// img.data.reduce((p, c) => { p += c; return p; }, 0) / (canvas.width * canvas.height);
			}
		}
		return this._weight;
	}

	// header xmin/xmax records min and max for x *separately*, I need max glyph width instead
	get maxWidth(): number {
		if (this._maxWidth === 0) {
			const font = this.font;
			const glyphs = font.glyphs;
			let max = 0;
			for (let i = 0; i < font.numGlyphs; ++i) {
				const g = glyphs.get(i) as ExtGlyph;
				if (!g) continue;
				// some characters don't have visible glyphs or advance width and left side bearing dominate
				const w = g.advanceWidth - g.leftSideBearing;
				if (w > max) {
					max = w;
				}
				// some characters have glyphs that expand past advance width and/or left side bearing
				const bbox = g.getBoundingBox();
				const gw = bbox.x2 - bbox.x1;
				if (gw > max) {
					max = gw;
				}
			}
			this._maxWidth = max || 1;
		}
		return this._maxWidth;
	}

	get orderedGlyphs(): ExtGlyph[] {
		if (!this._glyphs.length) {
			const font = this.font;
			const glyphs = font.glyphs;
			const temp = [];
			for (let i = 0; i < font.numGlyphs; ++i) {
				const g = glyphs.get(i) as ExtGlyph;
				if (g) {
					g.orderedIndex = i;
					temp.push(g);
				}
			}
			this._glyphs = _.sortBy(temp, g => (g.unicode === undefined ? 0x110000 : g.unicode) * 1000000 + g.orderedIndex);
			this._glyphs.forEach((g, i) => g.orderedIndex = i);
		}
		return this._glyphs;
	}

	draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): void {
		this.font.draw(ctx, text, x, y, fontSize, options);
	}

	getPath(text: string, x: number, y: number, fontSize: number, options?: opentype.RenderOptions): opentype.Path {
		return this.font.getPath(text, x, y, fontSize, options);
	}

	get tables(): { [tableName: string]: opentype.Table } {
		return this.font.tables;
	}

	getEnglishName(key: string): string {
		if (key === 'loadingStatus') return '';
		return this.font.getEnglishName(key);
	}

	get unitsPerEm(): number {
		return this.font.unitsPerEm;
	}

	get numGlyphs(): number {
		return this.font.numGlyphs;
	}

	readonly isItalic: boolean;
	private _proportions = 0;
	private _weight = 0;
	private _maxWidth = 0;
	private _glyphs: ExtGlyph[] = [];
}
