export const COURT = { width: 1000, length: 1800 } as const;
export const RUNOFF = { side: 320, baseline: 560 } as const;
export const NET = {
	y: COURT.length / 2, left: -60, right: 1060,
	singlesLeft: 42, singlesRight: 958,
	height: 105, postHeight: 117, ballRadius: 8,
} as const;

export function netHeightAt(x: number, singlesSticks = false): number {
	const halfWidth = singlesSticks ? (NET.singlesRight - NET.singlesLeft) / 2 : (NET.right - NET.left) / 2;
	const distance = Math.min(halfWidth, Math.abs(x - COURT.width / 2));
	return NET.height + Math.floor((NET.postHeight - NET.height) * distance * distance / (halfWidth * halfWidth));
}