import { Glyph, Font } from 'opentype.js';

export interface GlyphDrawingOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	ctx: CanvasRenderingContext2D;
	getArea?: (i: number) => { x: number, y: number, width: number, height: number };
	showCharcode?: boolean | 'long';
	showIndex?: boolean;
	showName?: boolean | 'long';
	drawBorder?: boolean;
	getGlyph?: (i: number) => opentype.Glyph;
}

export function drawGlyphs(glyphFrom: number, glyphTo: number, font: Font, options: GlyphDrawingOptions) {

	const head = font?.tables.head;
	if (!head) return;

	const ctx = options.ctx;
	const maxHeight = head.yMax - head.yMin;
	const scale = Math.min(options.width / (head.xMax - head.xMin), options.height / maxHeight);
	const fontSize = scale * font.unitsPerEm;
	const fontBaseline = /*cellMarginTop +*/ options.height * head.yMax / maxHeight;

	for (let i = glyphFrom; i <= glyphTo; ++i) {
		const cell = options.getArea ? options.getArea(i) : options;
		const glyph = options.getGlyph ? options.getGlyph(i) : font.glyphs.get(i);
		if (glyph) {
			ctx.fillStyle = '#606060';
			ctx.font = '9px sans-serif';
			const margin = 2;
			const textY = cell.y + cell.height - margin;
			if (options.showCharcode) {
				const u = options.showCharcode === 'long' ? 'unicode: ' : '';
				const name = glyph.unicode ? `${u}${glyph.unicode.toString(16)}` : '-';
				ctx.fillText(name, cell.x + margin, textY);
			}
			if (options.showIndex) {
				const index = `glyph: ${i}`;
				const tm = ctx.measureText(index);
				ctx.fillText(index, cell.x + cell.width - tm.width - margin, textY);
			}
			else if (options.showName && glyph.name) {
				const name = options.showName === 'long' ? `glyph: ${glyph.name}` : glyph.name;
				const tm = ctx.measureText(name);
				ctx.fillText(name, cell.x + cell.width - tm.width - margin, textY);
			}

			const glyphWidth = glyph.advanceWidth * scale;
			const dx = (cell.width - glyphWidth) / 2;
			ctx.fillStyle = '#000';
			glyph.draw(ctx, cell.x + dx, cell.y + fontBaseline, fontSize);
		}

		if (options.drawBorder) {
			ctx.beginPath();
			ctx.moveTo(cell.x + cell.width, cell.y);
			ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
			ctx.lineTo(cell.x, cell.y + cell.height);
			ctx.strokeStyle = '#b0b0b0';
			ctx.stroke();
		}
	}
}
