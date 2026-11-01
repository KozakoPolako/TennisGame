import { VIEW } from './court-projection';

export function viewportLayout(width: number, height: number, fullscreen: boolean, panoramic: boolean) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const logicalWidth = panoramic
    ? fullscreen ? Math.max(VIEW.width, Math.floor(VIEW.height * safeWidth / safeHeight)) : 448
    : VIEW.width;
  const available = fullscreen ? Math.min(safeWidth / logicalWidth, safeHeight / VIEW.height) : safeWidth / logicalWidth;
  const scale = !fullscreen && available >= 1 ? Math.floor(available) : available;
  return { logicalWidth, offset: (logicalWidth - VIEW.width) / 2, width: logicalWidth * scale, height: VIEW.height * scale };
}