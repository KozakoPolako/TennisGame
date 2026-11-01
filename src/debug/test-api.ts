import { Application, Graphics } from 'pixi.js';
import { createState, type GameState, type PlayerCount } from '../core/simulation';
import { project, VIEW } from '../render/court-projection';
import { CourtRenderer } from '../render/court-renderer';
import type { PointCelebration } from '../render/crowd-animation';
import { drawPlayer } from '../render/draw-player';

const PREVIEW_STYLE = 'position:fixed;inset:0;width:640px;height:560px;z-index:100;background:#1b3635';

export interface CourtPreview {
  readonly container: HTMLDivElement;
  readonly renderer: CourtRenderer;
  state: GameState;
  draw(celebration?: PointCelebration | null): void;
}

export interface PreviewOptions {
  id: string;
  players: PlayerCount;
  style?: string;
}

export interface TennisTestApi {
  readonly createState: typeof createState;
  readonly project: typeof project;
  readonly VIEW: typeof VIEW;
  readonly drawPlayer: typeof drawPlayer;
  readonly Application: typeof Application;
  readonly Graphics: typeof Graphics;
  preview: CourtPreview | null;
  openPreview(options: PreviewOptions): Promise<CourtPreview>;
  closePreview(): void;
}

declare global {
  interface Window {
    __tennis?: TennisTestApi;
  }
}

export function installTestApi(): void {
  const api: TennisTestApi = {
    createState,
    project,
    VIEW,
    drawPlayer,
    Application,
    Graphics,
    preview: null,
    async openPreview({ id, players, style = PREVIEW_STYLE }) {
      api.closePreview();
      const container = document.createElement('div');
      container.id = id;
      container.style.cssText = style;
      document.body.append(container);
      const renderer = new CourtRenderer();
      await renderer.init(container);
      const preview: CourtPreview = {
        container,
        renderer,
        state: createState(players),
        draw: (celebration = null) => renderer.draw(preview.state, celebration),
      };
      api.preview = preview;
      return preview;
    },
    closePreview() {
      api.preview?.renderer.dispose();
      api.preview?.container.remove();
      api.preview = null;
    },
  };
  window.__tennis = api;
}
