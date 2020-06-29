import * as _ from "lodash";
import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FileService } from './services/file-service.service';
import { GalleryGroup } from './gallery/gallery-group';
import { GalleryItem } from './gallery/gallery-item';
import { GalleryComponent, GallerySelectionInfo } from './gallery/gallery.component';
import { FontObject } from './utils/font-object';
import { VirtualGridComponent } from './virtual-grid/virtual-grid.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { GlyphComponent } from './glyph/glyph.component';
import { CookiesService } from './services/cookies.service';
import { ProgressBarMode } from '@angular/material/progress-bar';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	constructor(
		private fs: FileService,
		private changes: ChangeDetectorRef,
		private dialog: MatDialog,
		private cookies: CookiesService
	) {
		this._groups[0] = this.currentGroup;

		this.fontSizeIndex = cookies.getNumber('fontSize', this.fontSizeIndex, this.minFontSizeIndex, this.maxFontSizeIndex);
		this.sampleText = cookies.getString('sampleText', this.sampleText);
	}

	ngOnInit() {
		// this.loadFonts();
		this.updateItemSize();
	}

	loadFonts(path?: string) {
		if (this._pending) {
			this._pending.cancel();
		}

		path = path || this.fs.getRootPath();

		this._fonts = [];
		this.applyFilter("");

		this.operationMode = 'indeterminate';

		this._pending = this.fs.getFonts(path, (phase, i, n, font) => {
			if (phase === 'start') {
				// starting font loading
				this.operationMode = 'determinate';
				this.operationProgress = 0;
			}
			else if (phase === 'next') {
				if (font) this._fonts.push(font);
				// console.log(font.font.names.fullName['en']);
				this.operationProgress = i / n * 100;
			}
			else if (phase === 'end') {
				delete this.operationMode;
				delete this._pending;
				this.sortFonts();
				this.applyFilter(this.filterText);
				this.changes.detectChanges();
			}
			else if (phase === 'aborted') {
				//
				if (!this._pending) {
					delete this.operationMode;
				}
			}
		});
	}

	sortFonts() {
		// sort by names/weight
		const names: (keyof FontObject)[] = [
			'fontFamilyName', 'fontOrder', 'fontSubfamilyName', 'fileName', 'filePath'
		];
		this._fonts = _.sortBy(this._fonts, names);
	}

	getFontCount(): number {
		return this._pending ? this._fonts.length : this._items.length;
	}

	fontSelectionChanged(font: GallerySelectionInfo) {
		// console.log(font);
		this._selectedFont = font.currentItem?.tag;
		this._grid?.dirty();
		this.updateFontInfo(this._selectedFont);
	}

	updateFontInfo(font: FontObject | undefined) {
		if (!font) {
			this._fontInfo = [];
		}
		else {
			// const names = font.font.names;
			const keys = {
				fontFamily: 'Font Family',
				fontSubfamily: 'Font Subfamily',
				designer: 'Designer',
				designerURL: 'Designer URL',
				license: 'License',
				version: 'Version',
				copyright: 'Copyright'
			};
			const getKeys = <T>(t: T): (keyof T)[] => Object.keys(t) as (keyof T)[];
			this._fontInfo = _(getKeys(keys))
				.filter(key => !!font.font.getEnglishName(key))
				.map(key => ({ name: keys[key], value: font.font.getEnglishName(key) }))
				.value();
			this._fontInfo.push({ name: 'File Name', value: font.fileName });
			const os2 = font.font.tables.os2;
			if (os2) {
				this._fontInfo.push({ name: 'Flags', value: `Weight ${os2.usWeightClass}, Width ${os2.usWidthClass}, Glyphs: ${font.font.numGlyphs} ` });
			}
		}
	}

	setFontSize(size: string, inc?: number) {
		const s = +size + (inc ?? 0);
		this.fontSizeIndex = _.clamp(s, this.minFontSizeIndex, this.maxFontSizeIndex);
		this.cookies.setNumber('fontSize', this.fontSizeIndex);
		this.updateItemSize();
	}

	get fontSize(): number {
		return Math.pow(this.fontSizeIndex / 10, 2);
	}

	updateItemSize() {
		const s = this.fontSize;
		const w = _.clamp(Math.round(s * this.sampleText.length * 0.7 + 10), 100, 1000);
		const h = Math.round(s * 1.25 + 20);
		const size = { w, h };
		if (_.isEqual(size, this.galleryItemSize)) return;

		this.galleryItemSize = size;
		if (this._gallery) {
			this._gallery.loadVisibleImages();
		}
	}

	setFilterText(text: string) {
		this.filterText = text;
		this.applyFilter(text);
		// this.changes.detectChanges();
	}

	applyFilter(text: string) {
		const str = text?.toLowerCase();
		const match = (font: FontObject): boolean => {
			const n = font.fontName;
			return n ? n.toLowerCase().includes(str) : false;
		};

		const fonts = text ? _.filter(this._fonts, match) : this._fonts;

		if (fonts.length === this._items.length) {
			// compare content
			if (_.isEqual(fonts, _.map(this._items, i => i.tag))) return;
		}

		this._items = _.map(fonts, f => new GalleryItem(f));
		this.currentGroup = new GalleryGroup("", 0, this._items);
		this.currentGroup.virtual = true;
		this._groups = [this.currentGroup];
	}

	setSampleText(text: string) {
		this.sampleText = text;
		this.updateItemSize();
	}

	openGlyphPopup(data: { glyph: opentype.Glyph, font: opentype.Font }) {
		if (this._glyphPopup) {
			// update on the fly
			// todo if needed
			return;
		}

		this._glyphPopup = this.dialog.open(GlyphComponent, {
			width: '400px',
			height: '400px',
			data,
			backdropClass: "none"
		});

		this._glyphPopup.afterClosed().subscribe(() => { delete this._glyphPopup; });
	}

	gridSizeChanged(size: { width: number, height: number }) {
		//
	}

	get colorTrack(): string {
		const range = this.maxFontSizeIndex - this.minFontSizeIndex;
		return `track-to-${Math.round(100 * (this.fontSizeIndex - this.minFontSizeIndex) / range)}`;
	}

	_glyphPopup: MatDialogRef<GlyphComponent> | undefined;
	@ViewChild('gallery') _gallery!: GalleryComponent;
	@ViewChild('grid') _grid!: VirtualGridComponent;
	currentGroup = new GalleryGroup("", 0, []);
	_groups: GalleryGroup[] = [];
	galleryItemSize = { w: 200, h: 100 };
	_items: GalleryItem[] = [];
	_fonts: FontObject[] = [];
	_selectedFont: FontObject | undefined;
	_fontInfo: { name: string, value: string }[] = [];
	fontSizeIndex = 100;
	minFontSizeIndex = 30;
	maxFontSizeIndex = 300;
	filterText = '';
	sampleText = "abc";
	operationProgress = 0;
	operationMode: ProgressBarMode | undefined;
	_pending: { cancel: () => void; } | undefined;
}
