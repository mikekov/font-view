const require = (window as any).require;

// const subfamilyOrder = {
// 	Roman: 500,
// 	Regular: 500,
// 	Italic: 1
// };

export class FontObject {
	constructor(public font: opentype.Font, public filePath: string) {
		const sub = this.fontSubfamilyName.toLowerCase();
		this.isItalic = sub.includes('italic');
	}

	get fontName(): string {
		if (!this.font) return '';

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
		if (!this.font) return '';
		return this.font.getEnglishName('fontFamily');
	}

	get fontSubfamilyName(): string {
		if (!this.font) return '';
		return this.font.getEnglishName('fontSubfamily');
	}

	get fontOrder(): number {
		const os2 = this.font?.tables.os2;
		let weight = os2?.usWeightClass ?? 0;
		if (this.isItalic) weight++;
		return weight;
	}

	readonly isItalic: boolean;
}
