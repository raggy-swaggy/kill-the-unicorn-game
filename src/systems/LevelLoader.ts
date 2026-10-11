import Phaser from 'phaser';
import { getManifest } from './AssetManifest';

export interface LevelSection {
  name: string;
  title: string;
  x: number;
  width: number;
  music: string;
  background: string;
}

export interface LoadedLevel {
  map: Phaser.Tilemaps.Tilemap;
  ground: Phaser.Tilemaps.TilemapLayer;
  spawn: Phaser.Math.Vector2;
  /** Named spawn points, used as portal targets. */
  spawns: Map<string, Phaser.Math.Vector2>;
  sections: LevelSection[];
  objects: Phaser.Types.Tilemaps.TiledObject[];
}

/**
 * Builds a level from a Tiled JSON map.
 * Conventions (see README): tile layers "decor" and "ground", object layers "entities" and "sections".
 * Tile properties: collides (solid), oneWay (solid from above only), hazard (hurts on touch).
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

  const spawns = new Map<string, Phaser.Math.Vector2>();
  for (const o of objects) if (o.type === 'spawn' && o.name) spawns.set(o.name, new Phaser.Math.Vector2(o.x, o.y));

  const sectionObjects = map.getObjectLayer('sections')?.objects ?? [];
  const sections: LevelSection[] = sectionObjects
    .map((o) => ({
      name: o.name,
      title: getProp<string>(o, 'title') ?? '',
      x: o.x ?? 0,
      width: o.width ?? map.widthInPixels,
      music: getProp<string>(o, 'music') ?? '',
      background: getProp<string>(o, 'background') ?? 'arcade',
    }))
    .sort((a, b) => a.x - b.x);
  // A map without sections is treated as one big section.
  if (sections.length === 0) {
    sections.push({ name: 'level', title: '', x: 0, width: map.widthInPixels, music: '', background: 'arcade' });
  }

  return { map, ground, spawn, spawns, sections, objects };
}

/** Reads a custom property set on a Tiled object. */
export function getProp<T extends string | number | boolean>(
  obj: Phaser.Types.Tilemaps.TiledObject,
  name: string,
): T | undefined {
  const props = obj.properties as { name: string; value: unknown }[] | undefined;
  return props?.find((p) => p.name === name)?.value as T | undefined;
}
