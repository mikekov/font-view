import * as _ from "lodash";
import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { IpcRenderer, Session, Cookie, CookiesSetDetails } from 'electron';
import { ReplaySubject } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class CookiesService {

	constructor(zone: NgZone) {
		const require = (window as any).require;
		const electron = require && require('electron');
		// this.ipc = electron?.ipcRenderer;
		// if (!this.ipc) {
			// console.warn("No Electron IPC");
		// }
		// else {
		this.session = electron?.remote?.session?.fromPartition("persist:fontview");
		this.session?.cookies.get({}).then((cookies: Cookie[]) => {
				// if (err) {}
				// console.log(cookies);
				cookies.forEach(c => this.jar[c.name] = c.value);
				zone.run(() => this.ready.next());
		});
			// this.ipc.send("loadCookies");
		// }
		// cookies[options] = {
		// 	expires: 9999 * 24 * 3600 // 9999 days
		// };
	}

	readonly ready = new ReplaySubject(1); // EventEmitter();

	private persist(name: string, value: string, flush: boolean) {
		if (!this.session) return;

		const c: CookiesSetDetails = {
			url: "http://www.example.com",
			name,
			value,
			expirationDate: 1e10
		};
		this.session.cookies.set(c);
		if (flush) this.session.flushStorageData();
	}

	getNumber(key: string, defaultVal: number, min?: number, max?: number): number {
		const val = this.getCookie(key);
		if (!val) return defaultVal;

		let n = +val;
		if (!_.isFinite(n)) return defaultVal;

		if (_.isNumber(min) && _.isNumber(max)) {
			if (n < min) n = min;
			if (n > max) n = max;
		}

		return n;
	}

	setNumber(key: string, val: number) {
		if (key) this.setCookie(key, `${val}`);
	}

	getString(key: string, defaultVal: string): string {
		const val = this.getCookie(key);
		if (!_.isString(val)) return defaultVal;
		return val;
	}

	setString(key: string, val: string) {
		if (key) this.setCookie(key, val);
	}

	setObject<T>(key: string, value: T) {
		this.setString(key, JSON.stringify(value));
	}

	getObject<T>(key: string, defaultVal: T): T {
		const str = this.getCookie(key);
		if (!_.isString(str)) return defaultVal;
		const obj = JSON.parse(str);
		return obj as T;
	}

	getCookie(key: string): any {
		return key ? this.jar[key] : undefined;
	}

	private setCookie(key: string, value: string) {
		if (value === undefined) {
			delete this.jar[key];
			this.persist(key, value, true);
		}
		else if (this.jar[key] !== value) {
			this.jar[key] = value;
			this.persist(key, value, true);
		}
	}

	// ipc: IpcRenderer;
	private jar: {[key: string]: string} = {};
	private session: Session;
}
