// transform client (x, y) coordinates to object-relative ones
export function clientToRelative(element: HTMLElement, clientX: number, clientY: number): {x: number, y: number} {
	if (!element) return {x: 0, y: 0};

	let x = clientX - element.offsetLeft + element.scrollLeft;
	let y = clientY - element.offsetTop + element.scrollTop;

	let reference = element.offsetParent as HTMLElement;
	let limit = 99;
	while (reference && limit > 0) {
		x -= reference.offsetLeft;	// TODO: scroll too?
		y -= reference.offsetTop;

		reference = reference.offsetParent as HTMLElement;
		limit--;
	}

	return { x, y };
}

// transform object-relative coordinates into client ones
export function relativeToClient(element: HTMLElement, relX: number, relY: number): {x: number, y: number} {

	let x = relX + element.offsetLeft - element.scrollLeft;
	let y = relY + element.offsetTop - element.scrollTop;

	let reference = element.offsetParent as HTMLElement;
	let limit = 99;
	while (reference && limit > 0) {
		x += reference.offsetLeft;	// TODO: scroll too?
		y += reference.offsetTop;

		reference = reference.offsetParent as HTMLElement;
		limit--;
	}

	return { x, y };
}
