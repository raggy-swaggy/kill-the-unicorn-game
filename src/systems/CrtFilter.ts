import { getSettings, updateSettings } from './Settings';

/**
 * Scanlines and vignette as a CSS overlay above the canvas. It covers every scene
 * (game, HUD, touch buttons) at no GPU cost, and lines up one scanline per game pixel row.
 * The look is defined in index.html (#crt); this keeps it aligned with the canvas.
 */
export function syncCrt(canvas: HTMLCanvasElement, zoom: number): void {
  const overlay = document.getElementById('crt');
  if (!overlay) return;
  const rect = canvas.getBoundingClientRect();
  Object.assign(overlay.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  overlay.style.setProperty('--px', `${zoom}px`);
  applyCrt();
}

export function applyCrt(): void {
  document.body.classList.toggle('crt', getSettings().crt);
}

export function toggleCrt(): boolean {
  updateSettings({ crt: !getSettings().crt });
  applyCrt();
  return getSettings().crt;
}
