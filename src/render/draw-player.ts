import type { Graphics } from 'pixi.js';
import { MAX_CHARGE_TICKS, type PlayerState } from '../core/simulation';
import { project } from './court-projection';
import type { RunPose } from './player-animation';
import type { StrokePose } from './player-facing';
import { drawRacket, readyRacketPose } from './racket-sprite';
import { PLAYER_LEG_EXTENSION, strokeBody } from './stroke-body';
import { swingFrame } from './swing-animation';
import { runLegs } from './run-legs';

export function drawPlayer(graphics: Graphics, player: PlayerState, run: RunPose, pose: StrokePose, color: number): void {
  const { x, y } = project(player.x, player.y);
  const { stride, bob, lean } = run;
  const centering = player.swingTicks === 1;
  const { handSide, stroke } = pose;
  const side = centering ? 0 : pose.side;
  const swinging = player.swingTicks > 0;
  const neutral = !swinging && stroke === 'ready';
  const prepared = !swinging && stroke !== 'ready' && side !== 0;
  const frame = !swinging && !neutral
    ? { ...swingFrame(0), gripX: 7, gripY: -7, angle: 'upright' as const }
    : swingFrame(player.swingTicks);
  const body = strokeBody(player.swingTicks, pose);
  const racketSide = side || handSide;
  const bodyX = x + (body ? body.hip.x : lean);
  const bodyY = y + (body ? body.hip.y + 7 : -bob - PLAYER_LEG_EXTENSION + Number(prepared));
  const turned = side !== 0;
  const readyRacket = frame.angle === 'ready' ? readyRacketPose(handSide) : null;
  const racketX = bodyX + racketSide * frame.gripX;
  const racketY = bodyY + (readyRacket?.gripY ?? frame.gripY) + (swinging || prepared ? 0 : Math.abs(stride) / 2);
  const shoulderX = body ? x + body.shoulder.x : bodyX + frame.shoulder * racketSide;
  const shoulderY = body ? y + body.shoulder.y : bodyY - 14;
  const shoulderWidth = body?.shoulderWidth ?? (prepared ? 2 : turned ? 3 : 4);
  const hipWidth = body?.hipWidth ?? (prepared ? 2 : turned ? 3 : 4);
  const tilt = body?.tilt ?? 0;

  const drawArmsAndRacket = (): void => {
    const elbowX = Math.round((shoulderX + handSide * 3 + racketX) / 2);
    graphics.moveTo(shoulderX + handSide * shoulderWidth, shoulderY + 2 + handSide * tilt)
      .lineTo(elbowX, readyRacket ? racketY + 1 : bodyY - (frame.phase === 'follow' ? 13 : 8))
      .lineTo(racketX, racketY).stroke({ width: 2, color: 0xe1ac7a });
    const twoHands = stroke === 'backhand' || neutral || frame.phase === 'recover';
    if (twoHands) {
      graphics.moveTo(shoulderX - handSide * shoulderWidth, shoulderY + 3 - handSide * tilt)
        .lineTo(Math.round((shoulderX + racketX) / 2), racketY + (readyRacket ? 1 : 3))
        .lineTo(racketX - racketSide * 2, racketY + 1).stroke({ width: 2, color: 0xf1dfb6 });
    } else if (body) {
      graphics.moveTo(shoulderX - handSide * shoulderWidth, shoulderY + 2 - handSide * tilt)
        .lineTo(x + body.freeHand.x, y + body.freeHand.y).stroke({ width: 2, color: 0xe1ac7a });
    } else {
      const armStride = prepared ? 0 : stride;
      graphics.moveTo(bodyX - handSide * 3, bodyY - 12).lineTo(bodyX - handSide * (6 + armStride), bodyY - 7 + armStride).stroke({ width: 2, color: 0xe1ac7a });
    }
    drawRacket(graphics, racketX, racketY, frame.phase === 'follow' ? -racketSide : racketSide, frame.angle);
    graphics.rect(racketX - handSide * 2, racketY, 1, 2).fill(0xfaf0d3);
    graphics.rect(racketX - 1, racketY - 1, 2, 2).fill(0xe1ac7a);
    if (twoHands) graphics.rect(racketX - racketSide * 2, racketY - 2, 2, 2).fill(0xf1dfb6);
  };

  if (frame.trail) {
    graphics.moveTo(bodyX + racketSide * 8, bodyY - 20)
      .lineTo(bodyX + racketSide * 13, bodyY - 17)
      .lineTo(bodyX + racketSide * 16, bodyY - 12)
      .stroke({ width: 1, color: 0xfaf0d3, alpha: 0.4 });
    graphics.rect(bodyX + racketSide * 9, bodyY - 18, 1, 1).fill({ color: 0xf4ba65, alpha: 0.6 });
  }

  graphics.ellipse(x, y + 1, 7, 2).fill({ color: 0x4a352d, alpha: 0.45 });
  if (body) {
    const legs = [
      { foot: body.rearFoot, knee: body.rearKnee, lift: body.heelLift },
      { foot: body.leadFoot, knee: body.leadKnee, lift: 0 },
    ].sort((a, b) => a.foot.y - b.foot.y);
    for (const { foot, knee, lift } of legs) {
      const hipX = bodyX + Math.sign(foot.x) * 2;
      graphics.poly([hipX - 1, bodyY - 5, x + knee.x - 1, y + knee.y, x + foot.x - 1, y + foot.y - 1,
        x + foot.x + 2, y + foot.y - 1, x + knee.x + 2, y + knee.y, hipX + 2, bodyY - 5]).fill(0xf1dfb6);
      graphics.rect(x + knee.x - 1, y + knee.y, 1, 2).fill(0xc58c64);
      graphics.rect(x + foot.x - 1, y + foot.y - 3, 3, 2).fill(0xe5ebdb);
      graphics.rect(x + foot.x - 1, y + foot.y - 3, 3, 1).fill(color);
      graphics.rect(x + foot.x - 2, y + foot.y - 1, lift ? 3 : 4, 2).fill(0xfaf0d3);
      graphics.rect(x + foot.x - 2, y + foot.y, lift ? 3 : 4, 1).fill(0x3a5054);
    }
  } else {
    const legs = runLegs(run, handSide, pose).sort((a, b) => a.groundY - b.groundY || b.lift - a.lift);
    for (const { hip, knee, ankle, lift, toe } of legs) {
      graphics.poly([x + hip.x - 1, y + hip.y, x + hip.x + 2, y + hip.y,
        x + knee.x + 2, y + knee.y + 1, x + knee.x - 1, y + knee.y + 1]).fill(0xf1dfb6);
      graphics.poly([x + knee.x - 1, y + knee.y, x + knee.x + 2, y + knee.y,
        x + ankle.x + 1, y + ankle.y, x + ankle.x - 1, y + ankle.y]).fill(0xe1ac7a);
      graphics.rect(x + knee.x - 1, y + knee.y, 1, 2).fill(0xb77f5c);
      graphics.rect(x + knee.x, y + knee.y - 1, 2, 1).fill(0xf1dfb6);
      graphics.rect(x + ankle.x - 1, y + ankle.y - 2, 3, 2).fill(0xe5ebdb);
      graphics.rect(x + ankle.x - 1, y + ankle.y - 2, 3, 1).fill(color);
      const shoeX = x + ankle.x - (toe < 0 ? 2 : 1);
      graphics.rect(shoeX, y + ankle.y, lift >= 3 ? 3 : 4, 2).fill(0xfaf0d3);
      graphics.rect(shoeX, y + ankle.y + 1, lift >= 3 ? 3 : 4, 1).fill(0x3a5054);
    }
  }
  if (readyRacket?.behindBody) drawArmsAndRacket();
  graphics.poly([shoulderX - shoulderWidth, shoulderY - tilt, shoulderX + shoulderWidth, shoulderY + tilt,
    bodyX + hipWidth, bodyY - 7, bodyX - hipWidth, bodyY - 7]).fill(color);
  graphics.rect(shoulderX - shoulderWidth, shoulderY + 1 - tilt, 2, 4).fill({ color: 0x183331, alpha: 0.28 });
  graphics.rect(shoulderX + shoulderWidth - 2, shoulderY + 1 + tilt, 1, 4).fill({ color: 0xffffff, alpha: 0.28 });
  graphics.rect(shoulderX - 1, shoulderY, 3, 1).fill(0xfaf0d3);
  graphics.rect(bodyX - 2, bodyY - 8, 4, 1).fill({ color: 0x183331, alpha: 0.18 });
  graphics.rect(bodyX - hipWidth, bodyY - 7, hipWidth * 2, 3).fill(0x263c4b);
  graphics.rect(bodyX - hipWidth, bodyY - 7, hipWidth * 2, 1).fill(0x496375);
  graphics.rect(bodyX + (body ? Math.sign(body.shoulder.x - body.hip.x) : 0), bodyY - 6, 1, 2).fill(0x172a34);
  if (turned || (body && !centering)) graphics.poly([shoulderX - racketSide * 2, shoulderY + 1, shoulderX - racketSide * 2 + 1, shoulderY + 1,
    bodyX - racketSide + 1, bodyY - 9, bodyX - racketSide, bodyY - 9]).fill(0xfaf0d3);

  const headX = body ? x + body.head.x : bodyX + side;
  graphics.rect(headX - 3, bodyY - 20, 6, 6).fill(0xe1ac7a);
  graphics.rect(headX - 3, bodyY - 18, 1, 3).fill(0xb77f5c);
  graphics.rect(headX - 2, bodyY - 15, 4, 1).fill(0xc68e64);
  graphics.rect(headX - 4, bodyY - 20, 8, 2).fill(0xfaf0d3);
  graphics.rect(headX - 4, bodyY - 19, 8, 1).fill(0xbecbbe);
  if (turned) {
    graphics.rect(headX + (side > 0 ? 3 : -4), bodyY - 17, 1, 2).fill(0xe1ac7a);
    graphics.rect(headX + (side > 0 ? 1 : -2), bodyY - 18, 1, 1).fill(0x263c4b);
  } else if (handSide > 0) {
    graphics.rect(headX - 2, bodyY - 18, 4, 2).fill(0x63432f);
    graphics.rect(headX - 1, bodyY - 16, 2, 1).fill(0x79563b);
  } else {
    graphics.rect(headX - 2, bodyY - 17, 1, 1).rect(headX + 1, bodyY - 17, 1, 1).fill(0x263c4b);
    graphics.rect(headX, bodyY - 16, 1, 1).fill(0xf1c398);
  }

  if (!readyRacket?.behindBody) drawArmsAndRacket();
  graphics.rect(x - 2, y + 5, 4, 2).fill(color);
  if (player.chargeTicks > 0) {
    graphics.rect(x - 7, y + 9, 14, 3).fill(0x263c4b);
    graphics.rect(x - 6, y + 10, Math.max(1, Math.floor(12 * player.chargeTicks / MAX_CHARGE_TICKS)), 1)
      .fill(player.chargeTicks === MAX_CHARGE_TICKS ? 0xfaf0d3 : color);
  }
}