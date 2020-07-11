import { Glyph, Font } from 'opentype.js';
import { FontObject, ExtGlyph } from './font-object';

export interface GlyphDrawingOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	ctx: CanvasRenderingContext2D;
	glyphStyle?: string;
	textStyle?: string;
	lineStyle?: string;
	selectedCellStyle?: string;
	selectedGlyphStyle?: string;
	selectedTextStyle?: string;
	getArea?: (i: number) => { x: number, y: number, width: number, height: number, state?: 'normal'|'selected'|'hover' };
	showCharcode?: boolean | 'long';
	showIndex?: boolean;
	showName?: boolean | 'long';
	drawBorder?: boolean;
	drawMetrics?: boolean;
	getGlyph?: (i: number) => ExtGlyph | undefined;
	getName?: (unicode: number) => string | undefined;
	state?: undefined;
}

export function drawGlyphs(glyphFrom: number, glyphTo: number, font: FontObject, options: GlyphDrawingOptions) {
	const head = font?.tables.head;
	if (!head) return;

	const ctx = options.ctx;
	const height = options.height - (options.showName === 'long' ? 20 : 0);
	const maxHeight = head.yMax - head.yMin;
	const maxWidth = font.maxWidth;
	const xScale = options.width / maxWidth;
	const yScale = height / maxHeight;
	const scale = Math.min(xScale, yScale);
	const extent = xScale < yScale ? maxWidth : maxHeight;
	const fontSize = scale * font.unitsPerEm;
	const yPos = (fontUnits: number): number => {
		return height * (1 - (fontUnits - head.yMin) / extent);
	};
	// TODO: fonts with baseline != 0
	const fontBaseline = yPos(0);

	for (let i = glyphFrom; i <= glyphTo; ++i) {
		const cell = options.getArea ? options.getArea(i) : options;
		const glyph = options.getGlyph ? options.getGlyph(i) : font.orderedGlyphs[i];
		if (glyph) {
			let textStyle = options.textStyle;
			let glyphStyle = options.glyphStyle;
			if (cell.state === 'selected') {
				ctx.fillStyle = options.selectedCellStyle || 'blue';
				ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
				textStyle = options.selectedTextStyle;
				glyphStyle = options.selectedGlyphStyle;
			}
			ctx.fillStyle = textStyle || '#606060';
			ctx.font = '9px sans-serif';
			const margin = 2;
			const textY = cell.y + cell.height - margin;
			const glyphWidth = (glyph.advanceWidth - glyph.leftSideBearing) * scale;
			const leftPart = glyph.leftSideBearing * scale;
			const rightPart = glyph.advanceWidth * scale;
			// check real glyph width
			const bbox = glyph.getBoundingBox();
			const gw = (bbox.x2 - bbox.x1) * scale;
			// center glyph in a cell; if drawing metrics then take advance width and left side bearing into
			// account so the lines are shown properly; otherwise use real glyph size to center it perfectly
			const dx = (cell.width - (options.drawMetrics ? Math.max(glyphWidth, gw) : gw)) / 2 - leftPart;

			if (options.showCharcode) {
				const long = options.showCharcode === 'long';
				const unicode = glyph.unicode !== undefined ? glyph.unicode.toString(16) : '';
				const charname = long && options.getName ? options.getName(glyph.unicode) : '';
				const name = glyph.unicode !== undefined ? (long ? `u${unicode}: ${charname}` : unicode) : '-';
				ctx.fillText(name, cell.x + margin, textY);
			}
			if (options.showIndex) {
				const index = `glyph: ${i}`;
				const tm = ctx.measureText(index);
				ctx.fillText(index, cell.x + cell.width - tm.width - margin, textY);
			}
			else if (options.showName && glyph.name && (!options.showCharcode || glyph.unicode === undefined)) {
				const name = options.showName === 'long' ? `glyph: ${glyph.name}` : glyph.name;
				const tm = ctx.measureText(name);
				ctx.fillText(name, cell.x + cell.width - tm.width - margin, textY);
			}
			if (options.drawMetrics) {
				const lineStyle = options.lineStyle || '#ccc';
				ctx.strokeStyle = lineStyle;
				// TODO: offset lines by 0.5px as needed
				const hdraw = (x0: number, y0: number, width: number) => {
					ctx.moveTo(x0, y0);
					ctx.lineTo(x0 + width, y0);
				};
				const vdraw = (x0: number, y0: number, height: number) => {
					ctx.moveTo(x0, y0);
					ctx.lineTo(x0, y0 + height);
				};

				ctx.beginPath();
				ctx.setLineDash([]);
				hdraw(cell.x, fontBaseline, cell.width);
				// const horzHeader = font.tables.hhea;
				const os2 = font.tables.os2;
				if (os2) {
					const asc = yPos(os2.sTypoAscender);
					const des = yPos(-Math.abs(os2.sTypoDescender));
					// os2.sxHeight
					// console.log(asc, des, fontBaseline, yPos(head.yMax), yPos(head.yMin), head.yMax, head.yMin, horzHeader.ascender, horzHeader.descender);
					hdraw(cell.x, asc, cell.width);
					hdraw(cell.x, des, cell.width);
				}
				ctx.stroke();

				ctx.beginPath();
				vdraw(dx + leftPart, cell.y, height);
				vdraw(dx + rightPart, cell.y, height);
				ctx.setLineDash([2, 2]);
				ctx.stroke();
			}

			const path = glyph.getPath(cell.x + dx, cell.y + fontBaseline, fontSize);
			path['fill'] = glyphStyle || '#000';
			path.draw(ctx);
		}

		if (options.drawBorder) {
			ctx.beginPath();
			ctx.moveTo(cell.x + cell.width, cell.y);
			ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
			ctx.lineTo(cell.x, cell.y + cell.height);
			ctx.strokeStyle = 'rgba(0,0,0,0.2)';
			ctx.stroke();
		}
	}
}
