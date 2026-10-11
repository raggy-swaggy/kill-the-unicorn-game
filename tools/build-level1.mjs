// Builds the starting version of public/assets/maps/level1.json (a Tiled map).
// After that the map is meant to be edited in Tiled; this script refuses to
// overwrite an existing map unless --force is given.
//
// Each section is laid out with small helpers in local tile coordinates
// (x from the section's left edge, y = row 0 at the top, ground top at row 10).
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets', 'maps', 'level1.json');
if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.log('skip  maps/level1.json (exists, use --force to rebuild)');
  process.exit(0);
}

const T = 16;
const H = 12;
const TILES_PER_SET = 12;
// Shared tile id convention in every tileset.
const TOP = 0, FILL = 1, BLOCK = 2, ONEWAY = 3, HAZARD = 4;

const TILESETS = ['arcade', 'datahighway', 'catacombs'];
const firstGid = (name) => 1 + TILESETS.indexOf(name) * TILES_PER_SET;

const sections = [];
let cursor = 0;

function section(name, width, opts, build) {
  const s = { name, width, offset: cursor, ...opts, ground: [], decor: [], objects: [] };
  cursor += width;
  sections.push(s);
  const gid = (id) => firstGid(opts.tileset) + id;
  const put = (layer, x, y, id) => { if (x >= 0 && x < width && y >= 0 && y < H) layer.push([s.offset + x, y, gid(id)]); };
  const api = {
    floor(x0, x1, top = 10) { for (let x = x0; x <= x1; x++) { put(s.ground, x, top, TOP); for (let y = top + 1; y < H; y++) put(s.ground, x, y, FILL); } },
    block(x0, y0, w, h) { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) put(s.ground, x, y, BLOCK); },
    oneWay(x0, y, w) { for (let x = x0; x < x0 + w; x++) put(s.ground, x, y, ONEWAY); },
    hazard(x0, x1, y = 10) { for (let x = x0; x <= x1; x++) put(s.ground, x, y, HAZARD); },
    deco(x, y, id) { put(s.decor, x, y, id); },
    /** Entity standing on row `y` (feet at the bottom of that row). */
    ent(type, x, y, props = {}, name = '') {
      s.objects.push({ type, name, x: (s.offset + x) * T + T / 2, y: (y + 1) * T, props });
    },
    walls() { api.block(0, 0, 1, 10); api.block(width - 1, 0, 1, 10); },
    /** Platform that switches on and off with the beat. Pattern: one char per beat, 1 = solid. x/y = left edge, top. */
    beatPlatform(x0, y, w, pattern) {
      s.objects.push({ type: 'beat-platform', name: '', x: (s.offset + x0) * T, y: y * T, props: { pattern, tiles: w } });
    },
    /** Spikes on the ground row that strike with the beat. Pattern: 1 = extended. */
    beatSpikes(x0, x1, pattern, row = 10) {
      for (let x = x0; x <= x1; x++) {
        s.ground.push([s.offset + x, row, 0]);
        s.objects.push({ type: 'beat-trap', name: '', x: (s.offset + x) * T, y: row * T, props: { pattern } });
      }
    },
  };
  build(api);
}

// ---------------------------------------------------------------------------
// 1. Neon arcade at night: tutorial pace, ends at the cursed cabinet.
section('arcade', 100, { title: '1-1 NEON ARCADE', tileset: 'arcade', music: 'music-arcade', background: 'arcade' }, (a) => {
  a.walls();
  a.ent('player-spawn', 3, 9);
  a.floor(0, 22);
  a.deco(5, 9, 6); a.deco(13, 9, 6); a.deco(8, 4, 7); a.deco(9, 4, 7); a.deco(18, 9, 5); a.deco(20, 6, 11);
  a.ent('pickup', 6, 9, { kind: 'cassette' });
  a.block(11, 9, 1, 1);
  a.ent('pickup', 11, 7, { kind: 'cassette' });
  // first gap and first enemy
  a.floor(25, 40);
  a.ent('enemy', 34, 9, { enemyType: 'patrol' });
  a.oneWay(28, 7, 3);
  a.ent('pickup', 29, 6, { kind: 'cassette' });
  a.block(37, 9, 2, 1); a.block(39, 8, 2, 2);
  a.deco(31, 9, 6); a.deco(26, 4, 11);
  // checkpoint, electric floor, first flyer
  a.floor(44, 98);
  a.ent('checkpoint', 46, 9);
  a.hazard(52, 54);
  a.ent('pickup', 53, 7, { kind: 'cassette' });
  a.ent('enemy', 57, 6, { enemyType: 'flyer', patrolDistance: 64 });
  // plateau with a patrol
  a.block(61, 9, 1, 1); a.block(62, 7, 7, 3);
  a.ent('enemy', 66, 6, { enemyType: 'patrol' });
  a.ent('pickup', 64, 6, { kind: 'cassette' });
  a.deco(63, 4, 7); a.deco(67, 4, 7);
  // climb to a high reward
  a.oneWay(72, 7, 3); a.oneWay(76, 4, 3);
  a.ent('pickup', 77, 3, { kind: 'cassette' });
  a.ent('pickup', 73, 6, { kind: 'heart' });
  a.ent('enemy', 80, 9, { enemyType: 'patrol' });
  a.ent('enemy', 83, 5, { enemyType: 'flyer', patrolDistance: 48 });
  // row of cabinets and the stage with the cursed one
  a.ent('checkpoint', 85, 9);
  for (const x of [87, 88]) { a.deco(x, 8, 8); a.deco(x, 9, 9); }
  a.deco(89, 6, 10);
  a.block(90, 9, 7, 1);
  a.ent('portal', 93, 8, { target: 'datahighway-start', effect: 'glitch', sprite: 'cursed-cabinet' });
  a.deco(97, 9, 6);
});

// ---------------------------------------------------------------------------
// 2. Data highway: loading bars and windows over the void, pop-ups and cursors.
section('datahighway', 130, { title: '1-2 DATA HIGHWAY', tileset: 'datahighway', music: 'music-datahighway', background: 'datahighway' }, (a) => {
  a.walls();
  a.ent('spawn', 3, 9, {}, 'datahighway-start');
  a.floor(0, 12);
  a.deco(6, 5, 7); a.deco(9, 9, 5);
  // loading bars over the void
  a.oneWay(15, 9, 4); a.oneWay(21, 8, 3); a.oneWay(26, 9, 4);
  a.ent('pickup', 22, 7, { kind: 'cassette' });
  a.ent('enemy', 24, 5, { enemyType: 'flyer', patrolDistance: 80 });
  // windows to climb
  a.floor(31, 52);
  a.block(33, 7, 3, 1);
  a.ent('pickup', 34, 6, { kind: 'cassette' });
  a.ent('enemy', 40, 9, { enemyType: 'patrol' });
  a.block(44, 8, 3, 2); a.block(47, 6, 2, 4); a.oneWay(49, 4, 4);
  a.ent('pickup', 51, 3, { kind: 'cassette' });
  a.deco(38, 4, 9); a.deco(42, 5, 10);
  // checkpoint and error static
  a.floor(56, 70);
  a.ent('checkpoint', 58, 9);
  a.hazard(63, 65);
  a.ent('pickup', 64, 7, { kind: 'cassette' });
  a.ent('enemy', 66, 6, { enemyType: 'flyer', patrolDistance: 48 });
  a.ent('enemy', 69, 9, { enemyType: 'patrol' });
  a.deco(60, 4, 6); a.deco(68, 3, 11);
  // long stretch with an upper route
  a.floor(73, 105);
  a.oneWay(76, 7, 3); a.oneWay(80, 4, 3);
  a.ent('pickup', 81, 3, { kind: 'cassette' });
  a.ent('pickup', 82, 3, { kind: 'heart' });
  a.ent('enemy', 86, 9, { enemyType: 'patrol' });
  a.ent('enemy', 91, 5, { enemyType: 'flyer', patrolDistance: 64 });
  a.ent('enemy', 96, 9, { enemyType: 'patrol' });
  a.ent('enemy', 101, 6, { enemyType: 'flyer', patrolDistance: 48 });
  a.block(98, 8, 2, 2);
  a.deco(88, 9, 8); a.deco(94, 4, 7); a.deco(103, 9, 5);
  // last jump and the download portal
  a.floor(109, 128);
  a.ent('pickup', 107, 7, { kind: 'cassette' });
  a.ent('checkpoint', 111, 9);
  a.ent('pickup', 116, 9, { kind: 'cassette' });
  a.ent('enemy', 119, 9, { enemyType: 'patrol' });
  a.ent('portal', 124, 9, { target: 'catacombs-start', effect: 'fade', sprite: 'portal' });
  a.deco(122, 5, 11); a.deco(126, 5, 11);
});

// ---------------------------------------------------------------------------
// 3. Occult catacombs: spikes, candles, cursed cards, platforms and traps that follow the beat.
section('catacombs', 130, { title: '1-3 CURSED CATACOMBS', tileset: 'catacombs', music: 'music-catacombs', background: 'catacombs' }, (a) => {
  a.walls();
  a.ent('spawn', 3, 9, {}, 'catacombs-start');
  a.floor(0, 15);
  a.deco(5, 9, 5); a.deco(8, 4, 6); a.deco(10, 9, 5); a.deco(1, 1, 10);
  a.ent('enemy', 13, 9, { enemyType: 'shooter' });
  // spike floor with a bone ledge above
  a.floor(16, 30);
  a.hazard(20, 23);
  a.oneWay(19, 7, 6);
  a.ent('pickup', 21, 6, { kind: 'cassette' });
  a.block(26, 8, 3, 2);
  a.ent('enemy', 27, 7, { enemyType: 'shooter' });
  a.deco(17, 9, 7); a.deco(24, 3, 8); a.deco(24, 4, 8);
  // checkpoint, then a pit with ledges (these become beat platforms in milestone 4)
  a.floor(34, 55);
  a.ent('checkpoint', 36, 9);
  a.ent('enemy', 44, 9, { enemyType: 'patrol' });
  a.ent('pickup', 48, 9, { kind: 'cassette' });
  a.deco(40, 4, 6); a.deco(42, 9, 5); a.deco(52, 9, 5);
  // Platforms over the pit switch with the beat: wait for yours to light up.
  a.beatPlatform(57, 8, 3, '1110'); a.beatPlatform(61, 6, 3, '1011'); a.beatPlatform(65, 8, 2, '1110');
  a.ent('pickup', 62, 5, { kind: 'cassette' });
  a.ent('enemy', 61, 3, { enemyType: 'flyer', patrolDistance: 64 });
  // card gauntlet
  a.floor(67, 90);
  a.ent('enemy', 75, 9, { enemyType: 'shooter' });
  a.ent('enemy', 80, 9, { enemyType: 'patrol' });
  a.beatSpikes(82, 83, '1100');
  a.ent('enemy', 87, 9, { enemyType: 'shooter' });
  a.ent('pickup', 78, 7, { kind: 'cassette' });
  a.ent('pickup', 82, 7, { kind: 'cassette' });
  a.deco(70, 4, 9); a.deco(84, 4, 6); a.deco(72, 9, 7);
  // spike valley between two altars
  a.floor(91, 128);
  a.block(95, 7, 4, 3);
  a.hazard(99, 102);
  a.beatPlatform(99, 7, 4, '1100');
  a.block(103, 7, 4, 3);
  a.ent('pickup', 101, 5, { kind: 'cassette' });
  a.ent('enemy', 105, 6, { enemyType: 'shooter' });
  a.ent('checkpoint', 110, 9);
  a.ent('pickup', 113, 9, { kind: 'heart' });
  a.ent('enemy', 116, 5, { enemyType: 'flyer', patrolDistance: 48 });
  a.deco(97, 3, 6); a.deco(105, 3, 6); a.deco(114, 9, 5); a.deco(118, 9, 5); a.deco(120, 4, 11);
  a.ent('portal', 124, 9, { target: 'boss-start', effect: 'fade', sprite: 'portal' });
});

// ---------------------------------------------------------------------------
// 4. Boss arena: The Unicorn.
section('boss', 24, { title: '1-4 THE UNICORN', tileset: 'catacombs', music: 'music-boss', background: 'catacombs' }, (a) => {
  a.walls();
  a.floor(0, 23);
  a.ent('spawn', 3, 9, {}, 'boss-start');
  a.oneWay(5, 7, 3); a.oneWay(16, 7, 3);
  a.deco(2, 9, 5); a.deco(21, 9, 5); a.deco(11, 2, 6); a.deco(12, 2, 6);
  a.ent('boss', 18, 9);
});

// ---------------------------------------------------------------------------
const W = cursor;
const grid = () => new Array(W * H).fill(0);
const ground = grid(), decor = grid();
for (const s of sections) {
  for (const [x, y, g] of s.ground) ground[y * W + x] = g;
  for (const [x, y, g] of s.decor) decor[y * W + x] = g;
}

let nextId = 1;
const propList = (props) => Object.entries(props).map(([name, value]) => ({
  name, type: typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'string', value,
}));
const entities = sections.flatMap((s) => s.objects).map((o) => ({
  id: nextId++, name: o.name, type: o.type, point: true, x: o.x, y: o.y, width: 0, height: 0, rotation: 0, visible: true,
  properties: propList(o.props),
}));
const sectionObjects = sections.map((s) => ({
  id: nextId++, name: s.name, type: 'section', x: s.offset * T, y: 0, width: s.width * T, height: H * T, rotation: 0, visible: true,
  properties: propList({ title: s.title, music: s.music, background: s.background }),
}));

const bool = (name) => ({ name, type: 'bool', value: true });
const map = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T,
  infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
  tiledversion: '1.10.2', type: 'map', version: '1.10',
  nextlayerid: 5, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'decor', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data: decor },
    { id: 2, name: 'ground', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data: ground },
    { id: 3, name: 'entities', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: entities },
    { id: 4, name: 'sections', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: sectionObjects },
  ],
  tilesets: TILESETS.map((name) => ({
    firstgid: firstGid(name), name, image: `../tiles/${name}.png`, imagewidth: TILES_PER_SET * T, imageheight: T,
    tilewidth: T, tileheight: T, tilecount: TILES_PER_SET, columns: TILES_PER_SET, margin: 0, spacing: 0,
    tiles: [
      { id: TOP, properties: [bool('collides')] },
      { id: FILL, properties: [bool('collides')] },
      { id: BLOCK, properties: [bool('collides')] },
      { id: ONEWAY, properties: [bool('oneWay')] },
      { id: HAZARD, properties: [bool('hazard')] },
    ],
  })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(map));
console.log(`write maps/level1.json (${W}x${H} tiles, ${entities.length} entities)`);
