// defined here until DOM lib picks it up

declare class ResizeObserver {
	constructor(callback: Function);
	observe(element: Element): void;
	unobserve(element: Element): void;
	disconnect(): void;
}
