import * as _ from "lodash";
import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { FileService } from './services/file-service.service';
import { GalleryGroup } from './gallery/gallery-group';
import { GalleryItem } from './gallery/gallery-item';
import { GalleryComponent, GallerySelectionInfo } from './gallery/gallery.component';
import { FontObject, ExtGlyph } from './utils/font-object';
import { VirtualGridComponent } from './virtual-grid/virtual-grid.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { GlyphComponent } from './glyph/glyph.component';
import { CookiesService } from './services/cookies.service';
import { ProgressBarMode } from '@angular/material/progress-bar';

type FontOrder = 'name' | 'weight' | 'proportions';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	constructor(
		private fs: FileService,
		private changes: ChangeDetectorRef,
		private dialog: MatDialog,
		private cookies: CookiesService,
	) {
		this._groups[0] = this.currentGroup;
	}

	private restoreSettings() {
		this.fontSizeIndex = this.cookies.getNumber('fontSize', this.fontSizeIndex, this.minFontSizeIndex, this.maxFontSizeIndex);
		this.sampleText = this.cookies.getString('sampleText', this.sampleText);
		this._sortBy = this.cookies.getString('sortOrder', this._sortBy) as FontOrder;
		this._gridCellSize = this.cookies.getObject('gridCellSize', this._gridCellSize);
		// TODO: default font path
		this._rootPath = this.cookies.getString('rootPath', this._rootPath);

		this.updateItemSize();
		this.applyFilter(this.filterText);
	}

	ngOnInit() {
		this.cookies.ready.subscribe(() => this.restoreSettings());
		// this.loadFonts();
		this.updateItemSize();
	}

	ngOnDestroy() {
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

	sortBy(order: FontOrder) {
		if (this._sortBy !== order) {
			this._sortBy = order;
			this.sortFonts();
			this.applyFilter(this.filterText);
			this.cookies.setString("sortOrder", order);
		}
	}

	sortFonts() {
		switch (this._sortBy) {
			case 'weight':
				this._fonts.sort((a, b) => a.weight - b.weight);
				break;
			case 'proportions':
				this._fonts.sort((a, b) => a.proportions - b.proportions);
				break;
			default:
				// sort by names/weight
				const names: (keyof FontObject)[] = [
					'fontFamilyName', 'fontOrder', 'fontSubfamilyName', 'fileName', 'filePath'
				];
				this._fonts = _.sortBy(this._fonts, names);
				break;
		}
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
				copyright: 'Copyright',
				loadingStatus: 'Loading Error'
			};
			const getKeys = <T>(t: T): (keyof T)[] => Object.keys(t) as (keyof T)[];
			this._fontInfo = _(getKeys(keys))
				.filter(key => !!font.getEnglishName(key))
				.map(key => ({ name: keys[key], value: font.getEnglishName(key) }))
				.value();
			this._fontInfo.push({ name: 'File Name', value: font.fileName });
			const os2 = font.tables.os2;
			if (os2) {
				this._fontInfo.push({ name: 'Flags', value: `Weight ${os2.usWeightClass}, Width ${os2.usWidthClass}, Glyphs: ${font.numGlyphs}` });
			}
			const created = font.tables.head?.created;
			if (created > 0) { // negative timestamp (date before 1970) is typically bogus, so ignoring it
				this._fontInfo.push({ name: 'Created', value: (new Date(created * 1000)).toLocaleDateString() });
			}
			// this._fontInfo.push({ name: 'W', value: `Weight ${font.weight}, Prop ${font.proportions}` });
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
		this.cookies.setString('sampleText', text);
		this.updateItemSize();
	}

	openGlyphPopup(data: { glyph: opentype.Glyph, glyphs: ExtGlyph[], font: FontObject }) {
		if (this._glyphPopup) {
			// update on the fly
			// todo if needed
			return;
		}

		this._glyphPopup = this.dialog.open(GlyphComponent, {
			width: '450px',
			height: '470px',
			data,
			backdropClass: "none"
		});

		const showGlyph = (dir: 'next'|'prev') => {
			const comp = this._glyphPopup?.componentInstance;
			const glyph = comp?.glyph as ExtGlyph;
			if (glyph && comp) {
				const index = data.glyphs.indexOf(glyph); // glyph.orderedIndex;
				const next = data.glyphs[index + (dir === 'next' ? +1 : -1)];
				if (next) comp.glyph = next;
			}

		};

		this._glyphPopup.afterOpened().subscribe(() => {
			const comp = this._glyphPopup?.componentInstance;
			comp?.goTo.subscribe((dir: any) => showGlyph(dir));
		});

		this._glyphPopup.afterClosed().subscribe(() => { delete this._glyphPopup; });
	}

	gridSizeChanged(size: { width: number, height: number, sizeIndex: number }) {
		this.cookies.setObject('gridSize', size.sizeIndex);
	}

	// color track of the font size slider
	get colorTrack(): string {
		const range = this.maxFontSizeIndex - this.minFontSizeIndex;
		return `track-to-${Math.round(100 * (this.fontSizeIndex - this.minFontSizeIndex) / range)}`;
	}

	installFonts() {}
	uninstallFonts() {}

	selectFontFolder() {
		const require = window.require;
		if (!require) return;
		const electron = require('electron');
		const dialog = electron.remote.dialog;
		const options = {
			title: "Select font folder",
			defaultPath: this.fs.getRootPath(),
			properties: ['openDirectory'] as 'openDirectory'[]
		};
		const p = dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), options);
		console.log(p);
		if (p && p.length === 1 && p[0]) {
			// change folder view
			this._rootPath = p[0];
			this.cookies.setString('rootPath', this._rootPath);
		}
	}

	getDisplayPath(): string {
		return _.trim(this._rootPath, '/').replace(/\//g, ' \u2022 ');
	}

	_glyphPopup: MatDialogRef<GlyphComponent> | undefined;
	@ViewChild('gallery') _gallery!: GalleryComponent;
	@ViewChild('grid') _grid!: VirtualGridComponent;
	_rootPath = '';
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
	_sortBy: FontOrder = 'name';
	_gridCellSize = 1;
	_resize: ResizeObserver | undefined;
}
