import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import * as opentype from 'opentype.js';
import { FontObject } from '../utils/font-object';
import * as path from "path";
import * as fs from "fs";

export interface FolderItem {
	name: string;
	path: string;
	isExpandable: boolean;
	children: FolderItem[] | null;
	read(cb: () => void);
}

class Folder implements FolderItem {
	constructor(public name: string, public path: string) {}

	get isExpandable(): boolean {
		// temp code
		if (!this._folders) return true;

		return !!this._folders?.length;
	}

	// array of subfolders; null if no subfolders (no empty arrays returned)
	get children(): FolderItem[] | null {
		return this._folders?.length ? this._folders : null;
	}

	read(cb: () => void) {
		if (this._folders) {
			cb();
			return;
		}

		fs.readdir(this.path, {withFileTypes: true}, (err, files) => {
			if (err) {
				// console.log('readdir',err);
				this._folders = [];
			}
			else {
				this._folders = files
					.filter(de => de.isDirectory())
					.map(de => new Folder(de.name, path.resolve(this.path, de.name)));
			}
			cb();
		});
	}

	_folders: FolderItem[] | undefined;
}


@Injectable({
	providedIn: 'root'
})
export class FileService {

	constructor() {
		const require = (window as any).require;
		const electron = require && require('electron');
		this.ipc = electron?.ipcRenderer;
		if (!this.ipc) {
			// console.log("No ipc available");
			throw {message: "No IPC"};
		}
		// this.fs = fs.readFile;
	}
/*
	getFont(cb) {
		const fs = require("fs"); // as Node.FileSystem;
		const fontkit = require("fontkit");
		const rf = fs?.readFile;
		if (rf && fontkit) {
			rf("./Syntax-Roman.otf", {}, (err, data) => {
				if (err) {
					console.log(err);
				}
				else if (data) {
					console.log(data);
					//
					const font = fontkit.create(data);
					// fontkit.open("./Syntax-Roman.otf", "syn", (er, font) => {
					cb(font);
					if (font) {
						//
						// const n = font.fullName;
					}
				}
			});
		}
	}
*/
	ipc: IpcRenderer;

	getRoot(): FolderItem[] {
		return [new Folder(path.basename(this._root), this._root)];
	}

	getFolders(path: string): string[] | null {
		return null;
	}

	isExpandable(path): boolean {
		return false;
	}

	getRootPath(): string {
		return this._root;
	}

	_root = "/mnt/rox/archive/Fonty";
	// _root = "/mnt/rox/archive/Fonty/Speciality";
	// _root = "/mnt/rox/archive/Fonty/Sanserif/Accius";

	xgetFolders(path?: string) {
		//
		fs.readdir(path || this._root, {withFileTypes: true}, (err, files) => {
			if (err) {
				//
			}
			else {
				const e = files;
			}
		});
	}

	getFonts(path: string, cb: (phase: 'start'|'next'|'end'|'aborted', index: number, total: number, font: FontObject) => void): {cancel: () => boolean} {
		const dir = path;
		const require = window.require;
		const { resolve, extname } = require('path');
		const { readdir, readFile } = require('fs').promises;
		let abort = false;
		const operation = {cancel: () => abort = true};

		async function* getFiles(dir: string) {
			const dirents = await readdir(dir, { withFileTypes: true });
			if (abort) return;
			for (const dirent of dirents) {
				const res = resolve(dir, dirent.name);
				if (dirent.isDirectory()) {
					yield* getFiles(res);
				} else if (dirent.isFile()) {
					yield res;
				}
			}
		}

		(async () => {
			const fontFiles = [];
			for await (const file of getFiles(dir)) {
				const ext = extname(file);
				if (ext.match(/\.ttf|\.otf/i)) {
					fontFiles.push(file);

					// const data = await readFile(file);
					// const font = opentype.parse(data.buffer);
					// if (font) {
						// cb(new FontObject(font, file));
					// }
				}
			}

			if (abort) {
				cb('aborted', 0, 0, null);
				return;
			}

			cb('start', 0, fontFiles.length, null);

			let index = 0;
			for (const file of fontFiles) {
				const data = await readFile(file);
				try {
					const font = opentype.parse(data.buffer);
					if (font && !abort) {
						cb('next', index, fontFiles.length, new FontObject(font, file));
					}
				}
				catch (err) {
					// todo
					console.warn('error loading font', file, err);
				}
				index++;

				if (abort) {
					cb('aborted', 0, 0, null);
					return;
				}
			}

			cb(abort ? 'aborted' : 'end', 0, 0, null);
		})();

		return operation;

		// cb(files.l)
		// fs.readdir("/mnt/rox/archive/Fonty/Sanserif/", (err, files) => {
		// 	if (err) {
		// 		console.warn(err);

		// 	}
		// 	else {
		// 		//
		// 	}
		// });
	}
}
