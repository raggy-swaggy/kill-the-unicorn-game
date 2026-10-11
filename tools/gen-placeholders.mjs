// Generates placeholder PNGs into public/assets.
// Existing files are kept so real art is never overwritten; pass --force to regenerate everything.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets');
const FORCE = process.argv.includes('--force');

// Keep in sync with src/config/palette.ts
const C = {
  void: '#07061a',
  night: '#120f3a',
  deep: '#1f1858',
  purple: '#5b2a86',
  violet: '#8a3fc4',
  pink: '#ff2e97',
  hotpink: '#ff7ac6',
  cyan: '#29e7ff',
  teal: '#138fa8',
  white: '#f4f0ff',
  skin: '#e8b8a0',
  shadow: '#2a1f4a',
};

function rgba(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function canvas(w, h) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  const px = (x, y, hex, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    const [r, g, b, al] = rgba(hex, a);
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = al;
  };
  const rect = (x, y, rw, rh, hex, a = 255) => {
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) px(xx, yy, hex, a);
  };
  return { png, px, rect, w, h };
}

// Adds a 1px dark outline around all opaque pixels, so sprites read against busy backgrounds.
function outline(c, hex = C.void) {
  const { png, w, h } = c;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && png.data[(y * w + x) * 4 + 3] > 0;
  const edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) edge.push([x, y]);
  }
  for (const [x, y] of edge) c.px(x, y, hex);
}

function save(rel, c) {
  const file = path.join(ROOT, rel);
  if (fs.existsSync(file) && !FORCE) { console.log(`skip  ${rel} (exists)`); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(c.png));
  console.log(`write ${rel}`);
}

function saveJson(rel, data) {
  const file = path.join(ROOT, rel);
  if (fs.existsSync(file) && !FORCE) { console.log(`skip  ${rel} (exists)`); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1));
  console.log(`write ${rel}`);
}

// ---------------------------------------------------------------------------
// Player: 8 frames of 16x32. 0-1 idle, 2-5 run, 6 jump, 7 fall.
function drawPlayerFrame(c, ox, frame) {
  const bob = frame === 1 ? 1 : 0;
  const runPhase = frame >= 2 && frame <= 5 ? frame - 2 : -1;
  const air = frame === 6 ? 'jump' : frame === 7 ? 'fall' : null;
  const top = 4 + bob + (runPhase === 1 || runPhase === 3 ? 1 : 0);

  // hood
  c.rect(ox + 4, top, 8, 3, C.purple);
  c.rect(ox + 3, top + 2, 10, 7, C.purple);
  c.px(ox + 11, top - 1, C.purple);
  // face shadow + glowing eyes
  c.rect(ox + 7, top + 4, 5, 4, C.void);
  c.px(ox + 9, top + 5, C.pink);
  c.px(ox + 11, top + 5, C.pink);
  // hoodie body
  c.rect(ox + 4, top + 9, 8, 9, C.violet);
  c.rect(ox + 4, top + 9, 1, 9, C.purple);
  // arm on guitar neck
  c.rect(ox + 10, top + 11, 3, 2, C.violet);
  c.px(ox + 13, top + 11, C.skin);
  // guitar ("axe"): body low left, neck diagonal up right
  c.rect(ox + 2, top + 14, 5, 4, C.cyan);
  c.rect(ox + 3, top + 13, 3, 1, C.cyan);
  c.px(ox + 4, top + 15, C.void);
  for (let i = 0; i < 7; i++) c.px(ox + 7 + i, top + 13 - Math.floor(i / 2), C.teal);
  c.rect(ox + 13, top + 8, 2, 2, C.pink);
  // legs
  const legY = top + 18;
  const legLen = 32 - legY;
  if (air === 'jump') {
    c.rect(ox + 5, legY, 2, legLen - 3, C.shadow);
    c.rect(ox + 9, legY, 2, legLen - 5, C.shadow);
    c.rect(ox + 4, legY + legLen - 3, 3, 1, C.white);
    c.rect(ox + 9, legY + legLen - 5, 3, 1, C.white);
  } else if (air === 'fall') {
    c.rect(ox + 4, legY, 2, legLen - 1, C.shadow);
    c.rect(ox + 10, legY, 2, legLen - 2, C.shadow);
    c.rect(ox + 3, legY + legLen - 1, 3, 1, C.white);
    c.rect(ox + 10, legY + legLen - 2, 3, 1, C.white);
  } else if (runPhase >= 0) {
    const spread = [3, 1, -3, 1][runPhase];
    c.rect(ox + 7 - spread, legY, 2, legLen - 1, C.shadow);
    c.rect(ox + 7 + spread, legY, 2, legLen - 1, C.shadow);
    c.rect(ox + 6 - spread, 31, 3, 1, C.white);
    c.rect(ox + 7 + spread, 31, 3, 1, C.white);
  } else {
    c.rect(ox + 5, legY, 2, legLen - 1, C.shadow);
    c.rect(ox + 9, legY, 2, legLen - 1, C.shadow);
    c.rect(ox + 4, 31, 3, 1, C.white);
    c.rect(ox + 9, 31, 3, 1, C.white);
  }
}

{
  const c = canvas(16 * 8, 32);
  for (let f = 0; f < 8; f++) drawPlayerFrame(c, f * 16, f);
  save('sprites/player.png', c);
}

// ---------------------------------------------------------------------------
// Tilesets: 12 tiles of 16x16 in one row. Shared id convention (see README):
// 0 ground top, 1 ground fill, 2 solid block, 3 one-way platform, 4 hazard, 5-11 decoration.
function line(c, x0, y0, x1, y1, hex) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    c.px(x0, y0, hex);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pattern(c, ox, oy, rows, colors) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) c.px(ox + x, oy + y, colors[ch]); }));
}
function tileset(rel, draws) {
  const c = canvas(16 * 12, 16);
  draws.forEach((fn, i) => fn && fn(c, i * 16));
  save(rel, c);
}

tileset('tiles/arcade.png', [
  (c, x) => { c.rect(x, 0, 16, 16, C.night); c.rect(x, 0, 16, 2, C.cyan); c.rect(x, 2, 16, 1, C.teal); for (let i = 2; i < 16; i += 6) c.px(x + i, 6, C.pink); c.rect(x, 15, 16, 1, C.deep); },
  (c, x) => { c.rect(x, 0, 16, 16, C.night); c.rect(x, 7, 16, 1, C.deep); c.rect(x + 7, 0, 1, 16, C.deep); c.px(x + 3, 3, C.purple); c.px(x + 12, 11, C.purple); },
  (c, x) => { c.rect(x, 0, 16, 16, C.purple); c.rect(x, 0, 16, 1, C.pink); c.rect(x, 15, 16, 1, C.pink); c.rect(x, 0, 1, 16, C.pink); c.rect(x + 15, 0, 1, 16, C.pink); c.rect(x + 3, 3, 10, 10, C.deep); c.rect(x + 5, 5, 6, 6, C.violet); },
  (c, x) => { c.rect(x, 0, 16, 3, C.cyan); c.rect(x, 3, 16, 1, C.teal); for (let i = 1; i < 16; i += 4) c.rect(x + i, 1, 2, 1, C.white); },
  // hazard: electric floor
  (c, x) => { c.rect(x, 8, 16, 8, C.void); for (let i = 0; i < 16; i++) c.px(x + i, 10 + ((i * 7) % 5), i % 3 ? C.cyan : C.white); c.rect(x, 15, 16, 1, C.pink); line(c, x + 2, 15, x + 5, 6, C.white); line(c, x + 11, 15, x + 13, 7, C.cyan); },
  (c, x) => { c.rect(x + 2, 6, 8, 4, C.pink); for (let i = 0; i < 5; i++) c.rect(x + 10 + i, 3 + i, 1, 10 - i * 2, C.pink); },
  (c, x) => { c.rect(x + 7, 4, 2, 12, C.shadow); c.rect(x + 4, 1, 8, 3, C.hotpink); c.rect(x + 5, 4, 6, 1, C.pink, 140); },
  (c, x) => { c.rect(x + 2, 2, 12, 12, C.deep); c.rect(x + 3, 3, 4, 4, C.cyan, 200); c.rect(x + 9, 3, 4, 4, C.hotpink, 200); c.rect(x + 3, 9, 4, 4, C.violet, 200); c.rect(x + 9, 9, 4, 4, C.cyan, 120); },
  // cabinet top (marquee + screen)
  (c, x) => { c.rect(x + 1, 0, 14, 16, C.shadow); c.rect(x + 1, 0, 14, 3, C.pink); c.rect(x + 3, 5, 10, 9, C.void); for (let y = 6; y < 14; y += 2) c.rect(x + 4, y, 8, 1, C.teal); c.px(x + 6, 9, C.pink); c.px(x + 9, 8, C.cyan); },
  // cabinet bottom (controls)
  (c, x) => { c.rect(x + 1, 0, 14, 16, C.shadow); c.rect(x, 0, 16, 3, C.deep); c.rect(x + 3, 0, 1, 2, C.white); c.rect(x + 3, 0, 2, 1, C.pink); c.rect(x + 9, 1, 2, 1, C.cyan); c.rect(x + 12, 1, 2, 1, C.pink); c.rect(x + 6, 8, 4, 3, C.void); c.rect(x + 7, 9, 2, 1, C.hotpink); },
  // coin sign
  (c, x) => { c.rect(x + 3, 3, 10, 10, C.pink); c.rect(x + 4, 2, 8, 12, C.pink); c.rect(x + 5, 4, 6, 8, C.hotpink); c.rect(x + 7, 5, 2, 6, C.void); },
  // poster
  (c, x) => { c.rect(x + 2, 1, 12, 14, C.purple); c.rect(x + 3, 2, 10, 12, C.deep); pattern(c, x + 5, 4, ['..#..', '.###.', '#####', '.#.#.', '#...#'], { '#': C.pink }); c.rect(x + 4, 11, 8, 1, C.cyan); },
]);

const digits = { '4': ['#.#', '#.#', '###', '..#', '..#'], '0': ['###', '#.#', '#.#', '#.#', '###'] };
tileset('tiles/datahighway.png', [
  (c, x) => { c.rect(x, 0, 16, 16, C.deep); c.rect(x, 0, 16, 1, C.white); c.rect(x, 1, 16, 1, C.cyan); for (let i = 0; i < 16; i += 4) c.px(x + i, 5, C.teal); c.rect(x, 15, 16, 1, C.night); },
  (c, x) => { c.rect(x, 0, 16, 16, C.night); c.rect(x, 0, 16, 1, C.teal, 120); c.rect(x, 8, 16, 1, C.teal, 120); c.rect(x, 0, 1, 16, C.teal, 120); c.rect(x + 8, 0, 1, 16, C.teal, 120); },
  // GUI window block
  (c, x) => { c.rect(x, 0, 16, 16, C.white); c.rect(x, 0, 16, 4, C.cyan); c.rect(x + 12, 1, 3, 2, C.pink); c.rect(x + 1, 4, 14, 11, C.deep); c.rect(x + 3, 6, 8, 1, C.teal); c.rect(x + 3, 8, 6, 1, C.teal); c.rect(x + 3, 10, 9, 1, C.teal); },
  // loading bar (one-way)
  (c, x) => { c.rect(x, 0, 16, 6, C.white); c.rect(x, 1, 16, 4, C.void); for (let i = 1; i < 16; i += 3) c.rect(x + i, 2, 2, 2, C.cyan); },
  // hazard: error static
  (c, x) => { let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); c.rect(x, 7, 16, 9, C.void); for (let i = 0; i < 60; i++) c.px(x + Math.floor(r() * 16), 7 + Math.floor(r() * 9), r() > 0.5 ? C.pink : C.white); c.rect(x, 7, 16, 1, C.pink); },
  // folder
  (c, x) => { c.rect(x + 2, 4, 5, 2, C.hotpink); c.rect(x + 2, 6, 12, 8, C.hotpink); c.rect(x + 2, 7, 12, 1, C.pink); },
  // cursor icon
  (c, x) => pattern(c, x + 5, 3, ['#', '##', '#.#', '#..#', '#...#', '#....#', '#..###', '#.#', '##'], { '#': C.void, '.': C.white }),
  // 404
  (c, x) => { c.rect(x + 1, 3, 14, 9, C.void); pattern(c, x + 2, 5, digits['4'], { '#': C.pink }); pattern(c, x + 6, 5, digits['0'], { '#': C.pink }); pattern(c, x + 10, 5, digits['4'], { '#': C.pink }); },
  // empty progress bar
  (c, x) => { c.rect(x, 6, 16, 5, C.white); c.rect(x, 7, 16, 3, C.void); c.rect(x, 7, 5, 3, C.cyan); },
  // mail @
  (c, x) => { c.rect(x + 2, 4, 12, 9, C.white); line(c, x + 2, 4, x + 8, 9, C.teal); line(c, x + 13, 4, x + 8, 9, C.teal); },
  // floppy
  (c, x) => { c.rect(x + 3, 3, 10, 10, C.cyan); c.rect(x + 5, 3, 6, 4, C.white); c.rect(x + 9, 4, 1, 2, C.deep); c.rect(x + 5, 9, 6, 4, C.deep); },
  // sparkle
  (c, x) => { c.rect(x + 7, 3, 2, 10, C.white); c.rect(x + 3, 7, 10, 2, C.white); c.rect(x + 6, 6, 4, 4, C.cyan); },
]);

tileset('tiles/catacombs.png', [
  (c, x) => { c.rect(x, 0, 16, 16, C.deep); c.rect(x, 0, 16, 2, C.violet); c.rect(x, 2, 16, 1, C.purple); c.px(x + 4, 1, C.deep); c.px(x + 11, 0, C.purple); c.rect(x, 9, 16, 1, C.night); c.rect(x + 6, 3, 1, 6, C.night); },
  (c, x) => { c.rect(x, 0, 16, 16, C.night); c.rect(x, 0, 16, 1, C.deep); c.rect(x, 8, 16, 1, C.deep); c.rect(x + 4, 0, 1, 8, C.deep); c.rect(x + 12, 8, 1, 8, C.deep); },
  (c, x) => { c.rect(x, 0, 16, 16, C.purple); c.rect(x, 0, 16, 1, C.violet); c.rect(x, 15, 16, 1, C.deep); c.rect(x + 3, 3, 10, 10, C.deep); line(c, x + 5, 5, x + 10, 10, C.pink); line(c, x + 10, 5, x + 5, 10, C.pink); },
  // bone ledge (one-way)
  (c, x) => { c.rect(x, 1, 16, 3, C.white); c.rect(x, 4, 16, 1, C.violet); c.rect(x + 1, 0, 2, 5, C.white); c.rect(x + 13, 0, 2, 5, C.white); },
  // spikes
  (c, x) => { for (let s = 0; s < 4; s++) { for (let i = 0; i < 4; i++) c.rect(x + s * 4 + i, 16 - (i < 2 ? (i + 1) * 4 : (4 - i) * 4), 1, i < 2 ? (i + 1) * 4 : (4 - i) * 4, i === 1 ? C.white : C.violet); } c.rect(x, 15, 16, 1, C.purple); },
  // candle
  (c, x) => { c.rect(x + 6, 8, 4, 8, C.white); c.rect(x + 6, 15, 4, 1, C.violet); c.rect(x + 7, 4, 2, 4, C.hotpink); c.px(x + 7, 3, C.pink); c.rect(x + 7, 6, 2, 2, C.white); },
  // pentagram
  (c, x) => { const p = [...Array(5)].map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [Math.round(x + 8 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7)]; }); for (let i = 0; i < 5; i++) { const [ax, ay] = p[i], [bx, by] = p[(i + 2) % 5]; line(c, ax, ay, bx, by, C.pink); } },
  // skull
  (c, x) => pattern(c, x + 3, 4, ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '.#.#.#.'], { '#': C.white, '.': null }),
  // chain
  (c, x) => { for (let y = 0; y < 16; y += 4) { c.rect(x + 7, y, 2, 3, C.violet); c.px(x + 6, y + 1, C.violet); c.px(x + 9, y + 1, C.violet); } },
  // rune
  (c, x) => { line(c, x + 8, 3, x + 8, 13, C.cyan); line(c, x + 8, 5, x + 12, 8, C.cyan); line(c, x + 8, 9, x + 4, 12, C.cyan); },
  // cobweb
  (c, x) => { line(c, x, 0, x + 12, 12, C.violet); line(c, x, 0, x + 15, 4, C.violet); line(c, x, 0, x + 4, 15, C.violet); line(c, x + 8, 2, x + 2, 8, C.violet); },
  // eye glyph
  (c, x) => { c.rect(x + 3, 6, 10, 4, C.pink); c.rect(x + 5, 5, 6, 6, C.pink); c.rect(x + 6, 6, 4, 4, C.void); c.rect(x + 7, 7, 2, 2, C.white); },
]);


// ---------------------------------------------------------------------------
// Backgrounds (320x180, tile horizontally)
{
  const c = canvas(320, 180);
  for (let y = 0; y < 180; y++) {
    const col = y < 60 ? C.void : y < 110 ? C.night : C.deep;
    c.rect(0, y, 320, 1, col);
  }
  // stars (deterministic pseudo-random)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) c.px(Math.floor(rnd() * 320), Math.floor(rnd() * 100), rnd() > 0.8 ? C.cyan : C.white, 200);
  // striped neon sun
  const cx = 160, cy = 118, r = 42;
  for (let y = cy - r; y < cy; y++) {
    if ((y - (cy - r)) > 22 && (y % 5 === 0 || y % 5 === 1)) continue;
    const half = Math.floor(Math.sqrt(r * r - (y - cy) * (y - cy)));
    c.rect(cx - half, y, half * 2, 1, y < cy - 20 ? C.hotpink : C.pink);
  }
  save('backgrounds/arcade-far.png', c);
}
{
  const c = canvas(320, 180);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let x = 0;
  while (x < 320) {
    const w = 18 + Math.floor(rnd() * 26);
    const h = 30 + Math.floor(rnd() * 70);
    c.rect(x, 180 - h, w - 2, h, C.void);
    c.rect(x, 180 - h, w - 2, 1, C.purple);
    for (let wy = 180 - h + 4; wy < 176; wy += 6)
      for (let wx = x + 3; wx < x + w - 5; wx += 5)
        if (rnd() > 0.65) c.rect(wx, wy, 2, 2, rnd() > 0.5 ? C.pink : C.cyan, 180);
    x += w;
  }
  save('backgrounds/arcade-near.png', c);
}
{
  // Data highway, far: sky with binary rain and a perspective grid floor
  const c = canvas(320, 180);
  for (let y = 0; y < 180; y++) c.rect(0, y, 320, 1, y < 70 ? C.void : y < 100 ? C.night : C.deep);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) c.rect(Math.floor(rnd() * 320), Math.floor(rnd() * 96), 1, 2 + Math.floor(rnd() * 3), rnd() > 0.7 ? C.cyan : C.teal, 160);
  const horizon = 100;
  c.rect(0, horizon, 320, 1, C.pink);
  for (let k = 1; k < 9; k++) { const y = horizon + Math.round(k * k * 1.1); if (y < 180) c.rect(0, y, 320, 1, C.purple); }
  for (let gx = -320; gx <= 640; gx += 40) line(c, 160 + Math.round((gx - 160) * 0.15), horizon, gx, 180, C.purple);
  save('backgrounds/datahighway-far.png', c);
}
{
  // Data highway, near: floating pop-up windows
  const c = canvas(320, 180);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 7; i++) {
    const w = 30 + Math.floor(rnd() * 30), h = 20 + Math.floor(rnd() * 20);
    const x = Math.floor(i * 46 + rnd() * 10), y = 20 + Math.floor(rnd() * 90);
    c.rect(x, y, w, h, C.night, 200);
    c.rect(x, y, w, 4, C.teal);
    c.rect(x + w - 4, y + 1, 3, 2, C.pink);
    c.rect(x, y, 1, h, C.teal); c.rect(x + w - 1, y, 1, h, C.teal); c.rect(x, y + h - 1, w, 1, C.teal);
    for (let l = y + 7; l < y + h - 3; l += 3) c.rect(x + 3, l, Math.floor(rnd() * (w - 8)) + 2, 1, C.deep);
  }
  save('backgrounds/datahighway-near.png', c);
}
{
  // Catacombs, far: arches and a faint pentagram
  const c = canvas(320, 180);
  for (let y = 0; y < 180; y++) c.rect(0, y, 320, 1, y < 90 ? C.void : C.night);
  for (let ax = 0; ax < 320; ax += 80) {
    for (let y = 40; y < 180; y++) {
      const half = y < 70 ? Math.round(Math.sqrt(Math.max(0, 900 - (70 - y) * (70 - y)))) : 30;
      c.rect(ax + 40 - half - 6, y, 6, 1, C.deep);
      c.rect(ax + 40 + half, y, 6, 1, C.deep);
    }
  }
  const p = [...Array(5)].map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [Math.round(160 + Math.cos(a) * 40), Math.round(80 + Math.sin(a) * 40)]; });
  for (let i = 0; i < 5; i++) line(c, ...p[i], ...p[(i + 2) % 5], C.purple);
  for (let a = 0; a < 360; a += 2) c.px(Math.round(160 + Math.cos((a * Math.PI) / 180) * 44), Math.round(80 + Math.sin((a * Math.PI) / 180) * 44), C.purple);
  save('backgrounds/catacombs-far.png', c);
}
{
  // Catacombs, near: pillars with candle glow
  const c = canvas(320, 180);
  for (let px = 20; px < 320; px += 100) {
    c.rect(px, 30, 18, 150, C.void);
    c.rect(px - 3, 30, 24, 6, C.void);
    c.rect(px + 1, 36, 1, 144, C.deep);
    c.rect(px + 22, 110, 3, 8, C.white, 200); c.rect(px + 23, 106, 1, 4, C.pink);
    for (let r = 1; r < 8; r++) c.rect(px + 23 - r, 107 - r, r * 2, r * 2, C.pink, 18);
  }
  save('backgrounds/catacombs-near.png', c);
}
{
  // Cursed arcade cabinet (level portal), 32x48, 2 frames of screen flicker
  const c = canvas(64, 48);
  for (let f = 0; f < 2; f++) {
    const x = f * 32;
    c.rect(x + 4, 4, 24, 44, C.shadow);
    c.rect(x + 2, 0, 28, 8, C.pink);
    c.rect(x + 4, 2, 24, 4, C.void);
    pattern(c, x + 6, 3, ['#.#.##.#.#.##.#.#'], { '#': f ? C.cyan : C.white });
    c.rect(x + 6, 10, 20, 16, C.void);
    for (let y = 11; y < 26; y += 2) c.rect(x + 7, y, 18, 1, f ? C.purple : C.deep);
    c.rect(x + 10, 15, 4, 3, f ? C.white : C.pink); c.rect(x + 18, 15, 4, 3, f ? C.white : C.pink);
    c.rect(x + 12, 21, 8, 1, C.pink);
    c.rect(x + 2, 28, 28, 5, C.deep);
    c.rect(x + 8, 26, 2, 3, C.white); c.rect(x + 7, 25, 4, 2, C.pink);
    c.rect(x + 18, 29, 3, 2, C.cyan); c.rect(x + 23, 29, 3, 2, C.pink);
    c.rect(x + 12, 38, 8, 5, C.void); c.rect(x + 15, 39, 2, 3, f ? C.hotpink : C.pink);
    c.rect(x + 2, 0, 2, 48, C.pink, 160); c.rect(x + 28, 0, 2, 48, C.pink, 160);
  }
  save('sprites/cursed-cabinet.png', c);
}
{
  // Portal between sections, 16x32, 2 frames
  const c = canvas(32, 32);
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    const cols = f ? [C.cyan, C.pink, C.white, C.violet] : [C.pink, C.white, C.violet, C.cyan];
    for (let r = 0; r < 4; r++) {
      for (let a = 0; a < 360; a += 4) {
        const px = Math.round(x + 8 + Math.cos((a * Math.PI) / 180) * (7 - r * 1.6));
        const py = Math.round(17 + Math.sin((a * Math.PI) / 180) * (14 - r * 3));
        c.px(px, py, cols[r]);
      }
    }
  }
  save('sprites/portal.png', c);
}

// ---------------------------------------------------------------------------
// Enemies, 16x16 frames
{
  // Patrol: angry pop-up window on little legs. 0-1 walk.
  const c = canvas(32, 16);
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    c.rect(x + 1, 1, 14, 11, C.cyan);
    c.rect(x + 2, 2, 12, 2, C.pink);
    c.rect(x + 12, 2, 2, 2, C.white);
    c.rect(x + 2, 4, 12, 7, C.void);
    c.rect(x + 4, 6, 2, 2, C.pink); c.rect(x + 10, 6, 2, 2, C.pink);
    c.rect(x + 4, 5, 3, 1, C.white); c.rect(x + 9, 5, 3, 1, C.white);
    c.rect(x + 6, 9, 4, 1, C.hotpink);
    const l = f === 0 ? 0 : 2;
    c.rect(x + 4 - l / 2, 12, 2, 4 - l / 2, C.white);
    c.rect(x + 10 + l / 2, 12, 2, 4 - l / 2, C.white);
  }
  outline(c);
  save('sprites/enemy-popup.png', c);
}
{
  // Flyer: mouse cursor with flapping wings. 0-1 flap.
  const c = canvas(32, 16);
  const arrow = ['#', '##', '#.#', '#..#', '#...#', '#....#', '#.....#', '#..####', '#.#', '##'];
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    const wy = f === 0 ? 2 : 7;
    c.rect(x + 9, wy, 6, 2, C.hotpink); c.rect(x + 11, wy + 2, 4, 1, C.pink);
    c.rect(x + 0, wy, 4, 2, C.hotpink);
    arrow.forEach((row, y) => [...row].forEach((ch, xx) => {
      if (ch === '#') c.px(x + 4 + xx, 3 + y, C.void);
      else if (ch === '.') c.px(x + 4 + xx, 3 + y, C.white);
    }));
    c.px(x + 6, 7, C.pink);
  }
  outline(c);
  save('sprites/enemy-cursor.png', c);
}
{
  // Shooter: cursed trading card with an eye. 0 idle, 1 shooting.
  // Light card face so it stands out against the dark purple backgrounds.
  const c = canvas(32, 16);
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    const border = f === 1 ? C.white : C.pink;
    c.rect(x + 3, 1, 10, 14, border);
    c.rect(x + 4, 2, 8, 12, C.hotpink);
    c.rect(x + 5, 3, 6, 5, C.void);
    c.rect(x + 5, 10, 6, 1, C.white); c.rect(x + 5, 12, 4, 1, C.white);
    if (f === 0) { c.rect(x + 6, 4, 4, 2, C.cyan); c.rect(x + 7, 4, 2, 2, C.void); }
    else { c.rect(x + 6, 4, 4, 3, C.white); c.rect(x + 7, 5, 2, 1, C.pink); }
  }
  outline(c);
  save('sprites/enemy-card.png', c);
}

// Projectiles, 8x8 frames: 0-1 riff shot (music note), 2 enemy bullet
{
  const c = canvas(24, 8);
  const note = (x, flag) => {
    c.rect(x + 1, 5, 3, 2, C.cyan); c.rect(x + 3, 1, 1, 5, C.cyan);
    c.rect(x + 4, 1, 2, 1, C.cyan); if (flag) c.rect(x + 5, 2, 2, 1, C.cyan);
    c.px(x, 6, C.white);
  };
  note(0, false); note(8, true);
  c.rect(17, 2, 4, 4, C.pink); c.rect(18, 1, 2, 6, C.pink); c.rect(18, 2, 2, 4, C.white); c.rect(17, 3, 4, 2, C.white);
  for (const [x, y] of [[16, 2], [16, 3], [16, 4], [16, 5], [21, 2], [21, 3], [21, 4], [21, 5], [17, 1], [20, 1], [17, 6], [20, 6], [18, 0], [19, 0], [18, 7], [19, 7]]) c.px(x, y, C.void);
  save('sprites/projectiles.png', c);
}

// Pickups, 16x16 frames: 0-1 cassette, 2 heart
{
  const c = canvas(48, 16);
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    c.rect(x + 1, 3, 14, 10, C.violet);
    c.rect(x + 3, 5, 10, 4, C.white);
    c.rect(x + 4, 6, 2, 2, C.void); c.rect(x + 10, 6, 2, 2, C.void);
    c.rect(x + 4, 10, 8, 3, C.deep);
    if (f === 1) { c.px(x + 2, 4, C.white); c.px(x + 13, 4, C.white); c.rect(x + 1, 3, 1, 3, C.white); }
  }
  const heart = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  heart.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch === '#') { c.px(32 + 4 + xx, 5 + y, C.pink); c.px(32 + 4 + xx, 5 + y + 0, C.pink); } }));
  c.px(37, 6, C.white);
  save('sprites/pickups.png', c);
}

// HUD icons, 8x8 frames: 0 heart full, 1 heart empty, 2 cassette, 3 life (hood)
{
  const c = canvas(32, 8);
  const heart = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  heart.forEach((row, y) => [...row].forEach((ch, xx) => {
    if (ch !== '#') return;
    c.px(xx, 1 + y, C.pink);
    const edge = y === 0 || xx === 0 || xx === 6 || heart[y + 1]?.[xx] !== '#' || heart[y - 1]?.[xx] !== '#';
    c.px(8 + xx, 1 + y, edge ? C.purple : C.void);
  }));
  c.px(1, 2, C.white);
  c.rect(16, 1, 8, 6, C.violet); c.rect(17, 2, 6, 2, C.white); c.px(18, 3, C.void); c.px(21, 3, C.void);
  c.rect(25, 0, 6, 8, C.purple); c.rect(26, 3, 4, 3, C.void); c.px(27, 4, C.pink); c.px(29, 4, C.pink);
  save('ui/hud.png', c);
}

// Effects, 16x16 frames: 0-3 pop
{
  const c = canvas(64, 16);
  [2, 4, 6, 7].forEach((r, f) => {
    const x = f * 16 + 8, y = 8;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const px = Math.round(x + Math.cos(ang) * r), py = Math.round(y + Math.sin(ang) * r);
      c.rect(px, py, f < 3 ? 2 : 1, f < 3 ? 2 : 1, a % 2 ? C.cyan : C.pink);
    }
    if (f < 2) c.rect(x - 2 + f, y - 2 + f, 4 - f * 2, 4 - f * 2, C.white);
  });
  save('sprites/fx.png', c);
}

// Checkpoint, 16x32 frames: 0 inactive, 1 active (arcade joystick on a pole)
{
  const c = canvas(32, 32);
  for (let f = 0; f < 2; f++) {
    const x = f * 16;
    const glow = f === 1 ? C.pink : C.purple;
    c.rect(x + 7, 8, 2, 22, C.shadow);
    c.rect(x + 4, 28, 8, 4, C.deep);
    c.rect(x + 3, 2, 10, 7, glow);
    c.rect(x + 5, 4, 6, 3, f === 1 ? C.white : C.deep);
    if (f === 1) { c.rect(x + 1, 0, 2, 2, C.cyan); c.rect(x + 13, 0, 2, 2, C.cyan); }
  }
  save('sprites/checkpoint.png', c);
}

// Pixel font: 3x5 glyphs in 4x6 cells, 16 per row, Phaser RetroFont TEXT_SET2 order.
{
  const CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const G = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
    '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'],
    ':': ['...', '.#.', '...', '.#.', '...'], ';': ['...', '.#.', '...', '.#.', '#..'],
    '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
    '/': ['..#', '..#', '.#.', '#..', '#..'], "'": ['.#.', '.#.', '...', '...', '...'],
    '"': ['#.#', '#.#', '...', '...', '...'], '(': ['.#.', '#..', '#..', '#..', '.#.'],
    ')': ['.#.', '..#', '..#', '..#', '.#.'], '=': ['...', '###', '...', '###', '...'],
    '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
    '*': ['#.#', '.#.', '#.#', '...', '...'], '#': ['#.#', '###', '#.#', '###', '#.#'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
    '$': ['.##', '##.', '.#.', '.##', '##.'], '@': ['###', '#.#', '###', '#..', '###'],
  };
  const c = canvas(64, 24);
  [...CHARS].forEach((ch, i) => {
    const g = G[ch]; if (!g) return;
    const ox = (i % 16) * 4, oy = Math.floor(i / 16) * 6;
    g.forEach((row, y) => [...row].forEach((v, x) => { if (v === '#') c.px(ox + x, oy + y, C.white); }));
  });
  save('fonts/pixel.png', c);
}
