import type { Graphics } from 'pixi.js';

export type RacketAngle = 'ready' | 'upright' | 'diagonal' | 'flat';

export function readyRacketPose(handSide: -1 | 1): { gripY: number; behindBody: boolean } {
  return { gripY: handSide > 0 ? -10 : -4, behindBody: handSide > 0 };
}

export const RACKET_SPRITES = {
  ready: {
    gripX: 1, gripY: 9,
    pixels: [
      'oho', '.f.', '.h.', '.f.', '.h.',
      '.f.', 'ofo', '.g.', '.w.', '.g.',
    ],
  },
  upright: {
    gripX: 4, gripY: 13,
    pixels: [
      '...ooo...', '..offfo..', '.of.s.ho.', '.os.s.so.', '.ossssso.', '.os.s.so.',
      '.oh.s.fo.', '..offfo..', '...o.o...', '...ofo...', '....g....', '....w....', '....g....', '....g....',
    ],
  },
  diagonal: {
    gripX: 0, gripY: 11,
    pixels: [
      '......ooo..', '.....offfo.', '....of.s.ho', '....os.s.so', '....ossssso', '....oh.s.so',
      '.....offsfo', '....f.oooo.', '...oo......', '..g........', '.w.........', 'g..........',
    ],
  },
  flat: {
    gripX: 0, gripY: 3,
    pixels: [
      '......ooooo..', '.....of.s.fo.', '....of.s.s.ho', 'ggwgfossss.so',
      '....oh.s.s.fo', '.....offfffo.', '......ooooo..',
    ],
  },
} as const;

const PALETTE: Record<string, number> = { o: 0x193039, f: 0x7996a4, h: 0xc9dce2, s: 0x7c9995, w: 0xbac7c9, g: 0x263c4b };

export function drawRacket(graphics: Graphics, x: number, y: number, side: number, angle: RacketAngle): void {
  const sprite = RACKET_SPRITES[angle];
  sprite.pixels.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      const color = PALETTE[row[column] ?? '.'];
      if (color !== undefined) graphics.rect(x + side * (column - sprite.gripX), y + rowIndex - sprite.gripY, 1, 1).fill({ color, alpha: row[column] === 's' ? 0.45 : 1 });
    }
  });
}