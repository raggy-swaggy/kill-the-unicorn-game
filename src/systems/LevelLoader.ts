import Phaser from 'phaser';
import { getManifest } from './AssetManifest';

export interface LoadedLevel {
  map: Phaser.Tilemaps.Tilemap;
  ground: Phaser.Tilemaps.TilemapLayer;
  spawn: Phaser.Math.Vector2;
  objects: Phaser.Types.Tilemaps.TiledObject[];
}

/**
 * Builds a level from a Tiled JSON map.
 * Conventions (see README): tile layers "decor" and "ground", object layer "entities".
 * Tile properties: collides (solid), oneWay (solid from above only).
 */
export function loadLevel(scene: Phaser.Scene, mapKey: string): LoadedLevel {
  const manifest = getManifest(scene);
  const map = scene.make.tilemap({ key: mapKey });

  const tilesets = map.tilesets.map((ts) => {
    const imageKey = manifest.tilesets[ts.name];
    if (!imageKey) throw new Error(`No image registered for tileset "${ts.name}" in manifest.json`);
    return map.addTilesetImage(ts.name, imageKey)!;
  });

  map.createLayer('decor', tilesets);
  const ground = map.createLayer('ground', tilesets) as Phaser.Tilemaps.TilemapLayer;

  ground.forEachTile((tile) => {
    const props = tile.properties as Record<string, unknown>;
    if (props.collides) tile.setCollision(true);
    else if (props.oneWay) tile.setCollision(false, false, true, false);
  });

  const objects = map.getObjectLayer('entities')?.objects ?? [];
  const spawnObj = objects.find((o) => o.type === 'player-spawn');
  const spawn = new Phaser.Math.Vector2(spawnObj?.x ?? 32, spawnObj?.y ?? 0);

  return { map, ground, spawn, objects };
}
