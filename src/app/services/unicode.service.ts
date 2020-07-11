import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Service returning unicode character name

@Injectable({
	providedIn: 'root'
})
export class UnicodeService {

	constructor(http: HttpClient) {
		// read unicode data file (copy of https://www.unicode.org/Public/UNIDATA/UnicodeData.txt)
		http.get("/assets/unicode-data.txt", {responseType: 'text'}).subscribe(data => {
			const lines = data.split('\n');
			this._names = lines.reduce((acc: string[], line) => {
				if (line) {
					const fields = line.split(';');
					const unicode = parseInt(fields[0], 16);
					const name = fields[1];
					const old = fields[10];
					acc[unicode] = (name === '<control>' && old ? old : name) || '';
				}
				return acc;
			}, []);
		}, err => {
			console.log(err);
		});
	}

	getName(unicode: number): string | undefined {
		return this._names[unicode];
	}

	_names: string[] = [];
}
