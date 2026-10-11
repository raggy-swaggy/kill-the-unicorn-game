import Phaser from 'phaser';

export const PIXEL_FONT = 'pixel';

/**
 * Bitmap text snapped to whole pixels. Centred text with an odd width would
 * otherwise land on half pixels and look smeared.
 */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { scale?: number; tint?: number; align?: 'left' | 'center' | 'right' } = {},
): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(0, 0, PIXEL_FONT, text).setScale(opts.scale ?? 1);
  if (opts.tint !== undefined) t.setTint(opts.tint);
  const align = opts.align ?? 'center';
  const place = () => {
    const w = t.width;
    const h = t.height;
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    t.setPosition(Math.round(left), Math.round(y - h / 2));
  };
  place();
  // Keep it snapped when the text changes.
  const setText = t.setText.bind(t);
  t.setText = (value: string | string[]) => {
    setText(value);
    place();
    return t;
  };
  return t;
}
