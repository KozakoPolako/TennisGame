import type { Graphics } from 'pixi.js';
import { COURT, RUNOFF } from '../core/court';
import { project, VIEW } from './court-projection';
import { spectatorFrame, type PointCelebration } from './crowd-animation';
import { drawSideStands, sideStandPoint, sideStandTiers } from './side-stands';

export interface StadiumSeat {
  x: number;
  y: number;
  row: number;
  column: number;
  facing: -1 | 0 | 1;
  scale: number;
  id: number;
}

export const STADIUM = {
  left: -RUNOFF.side - 100,
  right: COURT.width + RUNOFF.side + 100,
  far: -RUNOFF.baseline - 100,
  near: COURT.length + RUNOFF.baseline + 100,
} as const;

const BACK_SEATS = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 36 }, (_, column): StadiumSeat => ({ x: 17 + column * 8, y: 13 + row * 7, row, column, facing: 0, scale: 1, id: row * 36 + column }))
    .filter(({ column }) => ![8, 9, 17, 18, 26, 27].includes(column)),
).flat();

function sideSeats(width: number): StadiumSeat[] {
  const extra = (width - VIEW.width) / 2;
  const seats: StadiumSeat[] = [];
  for (let row = 0; row < sideStandTiers(width); row++) {
    for (let column = 0; column < 26; column++) {
      const depth = (column + 0.5) / 26;
      if ([0.25, 0.55, 0.85].some((aisle) => Math.abs(depth - aisle) < 0.028)) continue;
      for (const side of [-1, 1] as const) {
        const p = sideStandPoint(side, row + 0.5, depth);
        if (p.x - 6 < -extra || p.x + 6 > VIEW.width + extra || p.y < 65 || p.y > 262) continue;
        seats.push({ ...p, row, column, facing: side === -1 ? 1 : -1, id: 1000 + row * 52 + column * 2 + (side === 1 ? 1 : 0) });
      }
    }
  }
  return seats;
}

export const STADIUM_SEATS = [...BACK_SEATS, ...sideSeats(VIEW.width)];

export function stadiumSeats(width: number): StadiumSeat[] {
  const baseIds = new Set(STADIUM_SEATS.map((seat) => seat.id));
  return [...STADIUM_SEATS, ...sideSeats(width).filter((seat) => !baseIds.has(seat.id))];
}

function drawSideSeat(graphics: Graphics, seat: StadiumSeat): void {
  const { x, y, facing: direction } = seat;
  const size = Math.max(2, Math.round(3 * seat.scale));
  const backX = x - direction * 2;
  const frontX = x + direction * size;
  const slant = direction === 1 ? 1 : -1;
  graphics.poly([backX, y - size, backX + direction, y - size, backX + direction, y + size, backX, y + size]).fill(0xece3c9);
  graphics.poly([backX, y, frontX, y + slant, frontX, y + size + slant, backX, y + size]).fill(0xd5c6a4);
  graphics.moveTo(backX, y).lineTo(frontX, y + slant).stroke({ width: 1, color: 0xfff0d5 });
  graphics.rect(backX, y + size, 1, 2).rect(frontX, y + size + slant, 1, 2).fill(0x68796b);
}

function drawRailing(graphics: Graphics, left: number, right: number, y: number): void {
  graphics.rect(left, y, right - left, 1).fill(0xf6efdc);
  graphics.rect(left, y + 4, right - left, 1).fill(0x617669);
  for (let x = left; x < right; x += 12) graphics.rect(x, y, 1, 5).fill(0x819388);
}

export function drawStadium(graphics: Graphics, foreground: Graphics, width: number = VIEW.width): void {
  const extra = (width - VIEW.width) / 2;
  graphics.rect(-extra, 0, width, VIEW.height).fill(0xbcb59d);
  drawSideStands(graphics, width);
  graphics.rect(-extra, 0, width, 7).fill(0xeee8cf);
  for (let x = -extra; x < VIEW.width + extra; x += 16) {
    graphics.poly([x, 0, x + 7, 0, x + 16, 7, x + 12, 7]).fill(0xa9ad9c);
  }
  for (let row = 0; row < 6; row++) {
    const y = 13 + row * 7;
    graphics.rect(8, y + 3, VIEW.width - 16, 3).fill(0x9d9d88);
    graphics.rect(8, y + 3, VIEW.width - 16, 1).fill(0xe4dcc5);
  }
  for (const x of [80, 152, 224]) {
    graphics.rect(x, 8, 9, 43).fill(0xb8b29b);
    for (let y = 10; y < 51; y += 4) graphics.rect(x, y, 9, 1).fill(0xe5ddc5);
    graphics.rect(x + 4, 8, 1, 43).fill(0x53685c);
    graphics.rect(x - 1, 35, 11, 2).fill(0x65776a);
    graphics.rect(x - 1, 37, 11, 9).fill(0x203c35);
    graphics.rect(x + 2, 38, 5, 1).fill(0xcbd8b3);
  }
  for (const seat of stadiumSeats(width)) {
    if (seat.facing !== 0) { drawSideSeat(graphics, seat); continue; }
    graphics.rect(seat.x, seat.y, 5, 3).fill(seat.row % 2 ? 0xded5b9 : 0xece3c9);
    graphics.rect(seat.x, seat.y + 3, 5, 1).fill(0xb6a984);
    graphics.rect(seat.x + 1, seat.y, 3, 1).fill(0xf4edda);
    graphics.rect(seat.x - 1, seat.y + 2, 1, 2).rect(seat.x + 5, seat.y + 2, 1, 2).fill(0x8c9384);
    graphics.rect(seat.x + 1, seat.y + 4, 1, 1).rect(seat.x + 3, seat.y + 4, 1, 1).fill(0x68796b);
  }

  drawRailing(graphics, -extra, VIEW.width + extra, 29);
  drawRailing(graphics, -extra, VIEW.width + extra, 51);
  graphics.rect(-extra, 56, width, 6).fill(0x807e6d);
  for (let x = -extra + 4; x < VIEW.width + extra - 15; x += 24) {
    graphics.rect(x, 56, 20, 6).fill(0x294d47);
    graphics.rect(x + 1, 57, 18, 2).fill(0x7a9b94);
    graphics.poly([x + 3, 56, x + 7, 56, x + 4, 61, x, 61]).fill({ color: 0xd2dfca, alpha: 0.4 });
    graphics.rect(x + 10, 56, 1, 6).fill(0xe0d7be);
  }

  const farLeft = project(STADIUM.left, STADIUM.far);
  const farRight = project(STADIUM.right, STADIUM.far);
  const nearLeft = project(STADIUM.left, STADIUM.near);
  const nearRight = project(STADIUM.right, STADIUM.near);
  const wallHeight = 12;
  graphics.poly([farLeft.x, farLeft.y, farRight.x, farRight.y, nearRight.x, nearRight.y, nearLeft.x, nearLeft.y]).fill(0xb56847);
  graphics.poly([farLeft.x, farLeft.y - wallHeight, farRight.x, farRight.y - wallHeight, farRight.x, farRight.y, farLeft.x, farLeft.y]).fill(0x244c40);
  graphics.rect(farLeft.x, farLeft.y - wallHeight, farRight.x - farLeft.x, 2).fill(0x507661);
  for (let x = farLeft.x + 1; x < farRight.x; x += 25) {
    graphics.rect(x, farLeft.y - 9, 1, 9).fill(0x193b32);
    graphics.rect(x + 7, farLeft.y - 6, 9, 2).fill(0x749383);
  }
  graphics.rect(146, farLeft.y - 11, 28, 11).fill(0x18352e);
  graphics.rect(148, farLeft.y - 9, 24, 1).fill(0xb6b39b);
  for (const [far, near, direction] of [[farLeft, nearLeft, -1], [farRight, nearRight, 1]] as const) {
    graphics.poly([far.x + direction * 5, far.y - wallHeight, near.x + direction * 5, near.y - 5, near.x, near.y, far.x, far.y]).fill(0x315546);
    graphics.moveTo(far.x + direction * 5, far.y - wallHeight).lineTo(near.x + direction * 5, near.y - 5).stroke({ width: 2, color: 0x779080 });
    for (let t = 1; t < 7; t++) {
      const x = Math.round(far.x + (near.x - far.x) * t / 7);
      const y = Math.round(far.y + (near.y - far.y) * t / 7);
      graphics.moveTo(x, y).lineTo(x + direction * 4, y - 8).stroke({ width: 1, color: 0x193b32 });
    }
  }
  foreground.rect(-extra, nearLeft.y, width, VIEW.height - nearLeft.y).fill(0x244c40);
  foreground.rect(-extra, nearLeft.y, width, 2).fill(0x809382);
  for (let x = -extra + 8; x < VIEW.width + extra; x += 30) {
    foreground.rect(x, nearLeft.y + 3, 1, 8).fill(0x193b32);
    foreground.rect(x + 8, nearLeft.y + 4, 12, 1).fill(0x597a66);
  }
  drawRailing(foreground, -extra, VIEW.width + extra, nearLeft.y + 10);
}

export function drawCrowd(graphics: Graphics, tick: number, training: boolean, celebration: PointCelebration | null, width: number = VIEW.width): void {
  graphics.clear();
  if (training) return;
  const seats = stadiumSeats(width);
  const shirts = [0xdee2d3, 0x587c85, 0xc88969, 0x819779, 0xd9bd79];
  const skins = [0xe1ac7a, 0xb9815e, 0x85563e];
  for (let index = 0; index < seats.length; index++) {
    const seat = seats[index]!;
    const frame = spectatorFrame(tick, celebration, seat.id, training);
    if (!frame.visible || seat.id % 11 === 0) continue;
    const y = seat.y - (frame.raised ? 1 : 0);
    const skin = skins[seat.id % skins.length]!;
    if (seat.facing !== 0) {
      const direction = seat.facing;
      const size = Math.max(2, Math.round(3 * seat.scale));
      const faceX = seat.x + direction;
      graphics.rect(seat.x - 1, y - size, 3, size + 1).fill(shirts[seat.id % shirts.length]!);
      graphics.rect(faceX - 1, y - size - 3, 2, 3).fill(skin);
      graphics.rect(faceX + direction, y - size - 2, 1, 1).fill(skin);
      graphics.rect(faceX - 1, y - size - 3, 2, 1).fill(0x504739);
      const handX = seat.x + direction * (frame.clap ? 2 : size);
      graphics.moveTo(seat.x, y - size + 1).lineTo(handX, frame.raised ? y - size - 4 : y - 1).stroke({ width: 1, color: skin });
      graphics.moveTo(seat.x, y + 1).lineTo(seat.x + direction * size, y + 2).lineTo(seat.x + direction * size, y + 4).stroke({ width: 1, color: 0x526257 });
      continue;
    }
    graphics.rect(seat.x + 1, y - 2, 3, 2).fill(skin);
    graphics.rect(seat.x + 1, y - 3, 3, 1).fill(index % 4 === 0 ? 0xf1e8cf : 0x504739);
    graphics.rect(seat.x, y, 5, 3).fill(shirts[seat.id % shirts.length]!);
    if (frame.raised) {
      graphics.rect(seat.x - 1, y - 2, 1, 3).rect(seat.x + 5, y - 2, 1, 3).fill(skin);
    } else if (frame.clap) {
      graphics.rect(seat.x + 1, y, 3, 1).fill(skin);
    } else {
      graphics.rect(seat.x, y + 1, 1, 2).rect(seat.x + 4, y + 1, 1, 2).fill(skin);
    }
  }
}