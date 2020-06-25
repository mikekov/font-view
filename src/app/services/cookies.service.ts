import * as _ from "lodash";
import { Injectable } from '@angular/core';
import { cookies, options } from "brownies";

@Injectable({
	providedIn: 'root'
})
export class CookiesService {

	constructor() {
		cookies[options] = {
			expires: 9999 * 24 * 3600 // 9999 days
		};
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
		if (key) cookies[key] = val;
	}

	getString(key: string, defaultVal: string): string {
		const val = this.getCookie(key);
		if (!_.isString(val)) return defaultVal;
		return val;
	}

	setString(key: string, val: string) {
		if (key) cookies[key] = val;
	}

	getCookie(key: string): any {
		return key ? cookies[key] : undefined;
	}
}
