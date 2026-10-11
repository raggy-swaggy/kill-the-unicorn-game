import Phaser from 'phaser';

/** Shape of public/assets/manifest.json. All paths are relative to public/assets/. */
export interface AssetManifest {
  images: { key: string; url: string }[];
  spritesheets: { key: string; url: string; frameWidth: number; frameHeight: number }[];
  tilemaps: { key: string; url: string }[];
  /** Tiled tileset name -> image key, used when a map is built. */
  tilesets: Record<string, string>;
  animations: { key: string; sheet: string; frames: number[]; frameRate: number; repeat: number }[];
}

export const ASSET_BASE = 'assets/';
export const MANIFEST_KEY = 'manifest';

export function getManifest(scene: Phaser.Scene): AssetManifest {
  return scene.cache.json.get(MANIFEST_KEY) as AssetManifest;
}

export function queueManifest(scene: Phaser.Scene, manifest: AssetManifest): void {
  const load = scene.load;
  load.setPath(ASSET_BASE);
  for (const img of manifest.images) load.image(img.key, img.url);
  for (const sheet of manifest.spritesheets) {
    load.spritesheet(sheet.key, sheet.url, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
  }
  for (const map of manifest.tilemaps) load.tilemapTiledJSON(map.key, map.url);
}

export function createAnimations(scene: Phaser.Scene, manifest: AssetManifest): void {
  for (const anim of manifest.animations) {
    if (scene.anims.exists(anim.key)) continue;
    scene.anims.create({
      key: anim.key,
      frames: anim.frames.map((frame) => ({ key: anim.sheet, frame })),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
    });
  }
}
