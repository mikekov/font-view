
export function rectsIntersect(rectA: ClientRect, rectB: ClientRect): boolean {
	if (!rectA || !rectB) return false;

	return rectA.left < rectB.right && rectA.right > rectB.left &&
			rectA.top < rectB.bottom && rectA.bottom > rectB.top;
}
