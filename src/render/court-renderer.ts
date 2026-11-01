import { Application, Graphics, TextureStyle } from 'pixi.js';
import { BALL_MACHINE, COURT, type GameState } from '../core/simulation';
import { project, VIEW } from './court-projection';
import { PlayerAnimation } from './player-animation';
import { NET } from '../core/court';
import { netProfile } from './net-profile';
import { PlayerFacing } from './player-facing';
import { drawPlayer } from './draw-player';
import { drawBall, drawBallSprite } from './draw-ball';
import { visualSwingTicks } from './swing-animation';
import { drawCrowd, drawStadium } from './stadium';
import type { PointCelebration } from './crowd-animation';
import { viewportLayout } from './viewport';

const WIDTH = VIEW.width;
const HEIGHT = VIEW.height;
const COURT_LINE_WIDTH = 2;
const COLORS = [0xf4ba65, 0x8fd6cf, 0xe7a4bd, 0xd2d881];

export class CourtRenderer {
  private readonly app = new Application();
  private readonly actors = new Graphics();
  private readonly farActors = new Graphics();
  private readonly net = new Graphics();
  private readonly floorBalls = new Graphics();
  private readonly crowd = new Graphics();
  private readonly stadium = new Graphics();
  private readonly foreground = new Graphics();
  private panoramic = false;
  private logicalWidth: number = WIDTH;
  private resizeView: (() => void) | undefined;
  private crowdState: { tick: number; training: boolean; celebration: PointCelebration | null } | undefined;
  private readonly animation = new PlayerAnimation();
  private readonly facing = new PlayerFacing();
  private resizeObserver: ResizeObserver | undefined;

  async init(container: HTMLElement): Promise<void> {
    TextureStyle.defaultOptions.scaleMode = 'nearest';
    await this.app.init({ width: WIDTH, height: HEIGHT, background: 0x1b3635, antialias: false, resolution: 1, autoStart: false, preference: 'webgl' });
    this.app.canvas.tabIndex = 0;
    this.app.canvas.setAttribute('aria-label', 'Kort treningowy. Sterowanie zgodnie z ustawieniami graczy.');
    this.app.canvas.setAttribute('role', 'img');
    container.append(this.app.canvas);
    drawStadium(this.stadium, this.foreground);
    const court = new Graphics();
    const corners = (left: number, top: number, right: number, bottom: number): number[] =>
      [[left, top], [right, top], [right, bottom], [left, bottom]].flatMap(([x = 0, y = 0]) => {
        const point = project(x, y);
        return [point.x, point.y];
      });
    const line = (x1: number, y1: number, x2: number, y2: number): void => {
      const start = project(x1, y1);
      const end = project(x2, y2);
      court.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ width: COURT_LINE_WIDTH, color: 0xf9e8c7 });
    };
    court.poly(corners(0, 0, COURT.width, COURT.length)).fill(0xca7851).stroke({ width: COURT_LINE_WIDTH, color: 0xf9e8c7 });
    court.poly(corners(125, 0, 875, COURT.length)).stroke({ width: COURT_LINE_WIDTH, color: 0xf9e8c7 });
    line(125, 450, 875, 450);
    line(125, 1350, 875, 1350);
    line(500, 450, 500, 1350);
    line(500, 0, 500, -40);
    line(500, COURT.length, 500, COURT.length + 40);
    this.app.stage.addChild(this.stadium, this.crowd, court, this.floorBalls, this.farActors, this.net, this.actors, this.foreground);
    this.resizeView = () => {
      const layout = viewportLayout(container.clientWidth, container.clientHeight, !!container.closest('.is-fullscreen'), this.panoramic);
      if (layout.logicalWidth !== this.logicalWidth) {
        this.logicalWidth = layout.logicalWidth;
        this.app.renderer.resize(this.logicalWidth, HEIGHT);
        this.app.stage.position.x = layout.offset;
        drawStadium(this.stadium.clear(), this.foreground.clear(), this.logicalWidth);
        if (this.crowdState) {
          const { tick, training, celebration } = this.crowdState;
          drawCrowd(this.crowd, tick, training, celebration, this.logicalWidth);
        }
      }
      this.app.canvas.style.width = `${layout.width}px`;
      this.app.canvas.style.height = `${layout.height}px`;
      this.app.render();
    };
    this.resizeObserver = new ResizeObserver(this.resizeView);
    this.resizeObserver.observe(container);
  }

  setPanoramic(enabled: boolean): void {
    this.panoramic = enabled;
    this.resizeView?.();
  }

  draw(state: GameState, celebration: PointCelebration | null = null): void {
    this.actors.clear();
    this.floorBalls.clear();
    const graphics = this.farActors.clear();
    this.crowdState = { tick: state.tick, training: state.training !== null, celebration };
    drawCrowd(this.crowd, state.tick, state.training !== null, celebration, this.logicalWidth);
    this.drawNet(state);
    for (const loose of state.looseBalls) {
      drawBall(this.floorBalls, loose, state.tick);
    }
    if (!state.training) this.drawStaff(state);
    if (state.training) {
      const { x, y } = project(BALL_MACHINE.x, BALL_MACHINE.y);
      graphics.ellipse(x, y + 2, 10, 3).fill({ color: 0x4a352d, alpha: 0.45 });
      graphics.rect(x - 9, y - 3, 4, 6).rect(x + 5, y - 3, 4, 6).fill(0x172428);
      graphics.rect(x - 8, y - 14, 16, 14).fill(0x638d80);
      graphics.rect(x - 7, y - 13, 14, 3).fill(0x8fd6cf);
      graphics.poly([x - 10, y - 23, x + 10, y - 23, x + 6, y - 15, x - 6, y - 15]).fill(0xe4d6b6);
      drawBallSprite(graphics, x - 5, y - 23);
      drawBallSprite(graphics, x, y - 24, 1);
      drawBallSprite(graphics, x + 5, y - 23);
      graphics.rect(x - 4, y - 10, 8, 7).fill(0x172428);
      graphics.rect(x - 3, y - 9, 6, 4).fill(0x334447);
      graphics.rect(x + 5, y - 8, 2, 2).fill(state.training.phase === 'ready' ? 0xf4ba65 : 0xe2ef87);
    }
    for (const player of [...state.players].sort((a, b) => a.y - b.y)) {
      const graphics = player.y < NET.y ? this.farActors : this.actors;
      const visualPlayer = { ...player, swingTicks: visualSwingTicks(player) };
      drawPlayer(graphics, visualPlayer, this.animation.sample(player, state.tick), this.facing.sample(visualPlayer, state), COLORS[player.id] ?? 0xf4ba65);
    }
    if (state.training?.phase !== 'ready') {
      const graphics = state.ball.y < NET.y ? this.farActors : this.actors;
      drawBall(graphics, state.ball, state.tick);
    }
    this.app.render();
  }

  private drawNet(state: GameState): void {
    const graphics = this.net.clear();
    const left = project(NET.left, NET.y);
    const right = project(NET.right, NET.y);
    const points = netProfile(state);
    const topY = project(NET.left, NET.y, NET.postHeight).y;
    graphics.poly([left.x, left.y, right.x, right.y, right.x + 3, right.y + 3, left.x + 3, left.y + 3]).fill({ color: 0x183331, alpha: 0.2 });
    graphics.poly([...points.flatMap(({ x, y }) => [x, y]), right.x, right.y, left.x, left.y]).fill({ color: 0x183331, alpha: 0.42 });
    for (const point of points) graphics.moveTo(point.x, point.y).lineTo(point.x, left.y).stroke({ width: 1, color: 0x304844, alpha: 0.85 });
    for (const depth of [0.3, 0.6, 0.9]) {
      graphics.moveTo(left.x, Math.round(topY + (left.y - topY) * depth));
      for (const point of points) graphics.lineTo(point.x, Math.round(point.y + (left.y - point.y) * depth));
      graphics.stroke({ width: 1, color: 0x72857c, alpha: 0.7 });
    }
    graphics.moveTo(left.x, topY + 1);
    for (const point of points) graphics.lineTo(point.x, point.y + 1);
    graphics.stroke({ width: 2, color: 0x9fae9f });
    graphics.moveTo(left.x, topY);
    for (const point of points) graphics.lineTo(point.x, point.y);
    graphics.stroke({ width: 1, color: 0xf9e8c7 });
    const center = points.find((point) => point.worldX === COURT.width / 2);
    if (center) graphics.rect(center.x, center.y, 1, left.y - center.y + 1).fill(0xdadcc4);
    if (state.players.length !== 4) {
      for (const worldX of [NET.singlesLeft, NET.singlesRight]) {
        const foot = project(worldX, NET.y);
        const top = project(worldX, NET.y, NET.postHeight);
        graphics.rect(foot.x - 1, top.y, 2, foot.y - top.y + 1).fill(0x7a654c);
        graphics.rect(foot.x - 1, top.y, 1, foot.y - top.y).fill(0xe4d6b6);
        graphics.rect(foot.x - 2, top.y - 1, 3, 2).fill(0xf9e8c7);
        graphics.rect(foot.x - 2, foot.y, 3, 1).fill(0x4d4e3c);
      }
    }
    for (const post of [left, right]) {
      const postTop = topY - 2;
      const postLength = post.y - postTop;
      graphics.rect(post.x - 2, postTop, 4, postLength + 4).fill(0x263c3e);
      graphics.rect(post.x - 1, postTop + 1, 2, postLength + 2).fill(0x79958a);
      graphics.rect(post.x - 1, postTop + 1, 1, postLength + 1).fill(0xcbd6bd);
      graphics.rect(post.x - 2, postTop, 4, 2).fill(0xe4d6b6);
      graphics.rect(post.x - 3, post.y + 3, 6, 2).fill(0x263c3e);
      graphics.rect(post.x + (post.x === left.x ? -3 : 2), topY, 2, 3).fill(0x9fae9f);
    }
  }

  private drawStaff(state: GameState): void {
    const graphics = this.actors;
    const chair = project(1190, NET.y);
    graphics.rect(chair.x - 5, chair.y - 12, 2, 18).rect(chair.x + 4, chair.y - 12, 2, 18).fill(0xe4d6b6);
    graphics.rect(chair.x - 5, chair.y - 4, 11, 2).rect(chair.x - 5, chair.y + 2, 11, 2).fill(0xe4d6b6);
    graphics.rect(chair.x - 6, chair.y - 15, 13, 3).fill(0x638d80);
    graphics.rect(chair.x - 3, chair.y - 23, 7, 8).fill(0xfaf0d3);
    graphics.rect(chair.x - 3, chair.y - 22, 2, 6).fill(0xaebfb7);
    graphics.rect(chair.x, chair.y - 21, 1, 4).fill(0x496375);
    graphics.rect(chair.x - 2, chair.y - 28, 5, 5).fill(0xe1ac7a);
    graphics.rect(chair.x - 3, chair.y - 29, 7, 2).fill(0x263c4b);
    graphics.rect(chair.x - 1, chair.y - 26, 1, 1).rect(chair.x + 2, chair.y - 26, 1, 1).fill(0x263c4b);
    graphics.rect(chair.x - 4, chair.y - 17, 10, 2).fill(0xbda378);
    graphics.rect(chair.x - 3, chair.y - 16, 3, 7).rect(chair.x + 2, chair.y - 16, 3, 7).fill(0x263c4b);
    for (const kid of state.ballKids) {
      const position = project(kid.x, kid.y);
      const crouch = kid.phase === 'pickup' ? 4 : 0;
      const moving = kid.phase === 'fetching' || kid.phase === 'returning';
      const stride = moving ? (Math.floor(state.tick / 5) % 2 === 0 ? -2 : 2) : 0;
      graphics.ellipse(position.x, position.y + 1, 5, 2).fill({ color: 0x4a352d, alpha: 0.45 });
      graphics.rect(position.x - 3 - stride, position.y - 4, 3, 5).rect(position.x + 1 + stride, position.y - 4, 3, 5).fill(0xfaf0d3);
      graphics.rect(position.x - 3, position.y - 11 + crouch, 7, 7).fill(0x8fd6cf);
      graphics.rect(position.x - 3, position.y - 10 + crouch, 2, 4).fill(0x558c88);
      graphics.rect(position.x - 1, position.y - 11 + crouch, 3, 1).fill(0xfaf0d3);
      graphics.rect(position.x - 3, position.y - 5, 7, 2).fill(0x263c4b);
      graphics.rect(position.x - 2, position.y - 16 + crouch, 5, 5).fill(0xe1ac7a);
      graphics.rect(position.x - 3, position.y - 17 + crouch, 7, 2).fill(0xfaf0d3);
      graphics.rect(position.x - 2, position.y - 13 + crouch, 1, 1).rect(position.x + 1, position.y - 13 + crouch, 1, 1).fill(0x263c4b);
      if (kid.carrying) drawBallSprite(graphics, position.x + 5, position.y - 8);
    }
  }

  focus(): void { this.app.canvas.focus({ preventScroll: true }); }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeView = undefined;
    this.app.destroy(true, { children: true });
  }
}
