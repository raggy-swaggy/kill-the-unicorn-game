// Generates placeholder PNGs and the test level into public/assets.
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
// Arcade tileset, 8 tiles of 16x16 in one row (Tiled ids 0-7).
// 0 ground top, 1 ground fill, 2 neon block, 3 one-way platform,
// 4 arrow sign, 5 floor lamp, 6 lit window, 7 cabinet screen
{
  const c = canvas(16 * 8, 16);
  const tile = (i, fn) => fn(i * 16);
  tile(0, (x) => {
    c.rect(x, 0, 16, 16, C.night);
    c.rect(x, 0, 16, 2, C.cyan);
    c.rect(x, 2, 16, 1, C.teal);
    for (let i = 2; i < 16; i += 6) c.px(x + i, 6, C.pink);
    c.rect(x, 15, 16, 1, C.deep);
  });
  tile(1, (x) => {
    c.rect(x, 0, 16, 16, C.night);
    c.rect(x, 7, 16, 1, C.deep);
    c.rect(x + 7, 0, 1, 16, C.deep);
    c.px(x + 3, 3, C.purple); c.px(x + 12, 11, C.purple);
  });
  tile(2, (x) => {
    c.rect(x, 0, 16, 16, C.purple);
    c.rect(x, 0, 16, 1, C.pink); c.rect(x, 15, 16, 1, C.pink);
    c.rect(x, 0, 1, 16, C.pink); c.rect(x + 15, 0, 1, 16, C.pink);
    c.rect(x + 3, 3, 10, 10, C.deep);
    c.rect(x + 5, 5, 6, 6, C.violet);
  });
  tile(3, (x) => {
    c.rect(x, 0, 16, 3, C.cyan);
    c.rect(x, 3, 16, 1, C.teal);
    for (let i = 1; i < 16; i += 4) c.rect(x + i, 1, 2, 1, C.white);
  });
  tile(4, (x) => {
    c.rect(x + 2, 6, 8, 4, C.pink);
    for (let i = 0; i < 5; i++) c.rect(x + 10 + i, 3 + i, 1, 10 - i * 2, C.pink);
  });
  tile(5, (x) => {
    c.rect(x + 7, 4, 2, 12, C.shadow);
    c.rect(x + 4, 1, 8, 3, C.hotpink);
    c.rect(x + 5, 4, 6, 1, C.pink, 140);
  });
  tile(6, (x) => {
    c.rect(x + 2, 2, 12, 12, C.deep);
    c.rect(x + 3, 3, 4, 4, C.cyan, 200);
    c.rect(x + 9, 3, 4, 4, C.hotpink, 200);
    c.rect(x + 3, 9, 4, 4, C.violet, 200);
    c.rect(x + 9, 9, 4, 4, C.cyan, 120);
  });
  tile(7, (x) => {
    c.rect(x, 0, 16, 16, C.shadow);
    c.rect(x + 2, 2, 12, 9, C.void);
    for (let y = 3; y < 11; y += 2) c.rect(x + 3, y, 10, 1, C.teal);
    c.px(x + 6, 6, C.pink); c.px(x + 9, 5, C.cyan);
    c.rect(x + 4, 13, 2, 2, C.pink); c.rect(x + 10, 13, 2, 2, C.cyan);
  });
  save('tiles/arcade.png', c);
}

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

// ---------------------------------------------------------------------------
// Test level as Tiled JSON map. Tile values are Tiled gids (tile id + 1), 0 = empty.
{
  const W = 160, H = 12;
  const ground = new Array(W * H).fill(0);
  const decor = new Array(W * H).fill(0);
  const set = (layer, x, y, id) => { if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = id + 1; };
  const floor = (x0, x1, top = 10) => {
    for (let x = x0; x <= x1; x++) { set(ground, x, top, 0); for (let y = top + 1; y < H; y++) set(ground, x, y, 1); }
  };
  const block = (x0, y0, w, h) => { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) set(ground, x, y, 2); };
  const oneWay = (x0, y, w) => { for (let x = x0; x < x0 + w; x++) set(ground, x, y, 3); };

  // left wall
  block(0, 0, 1, 10);
  // start area
  floor(0, 24);
  set(decor, 6, 9, 5); set(decor, 14, 9, 5); set(decor, 20, 9, 4);
  set(decor, 10, 5, 6); set(decor, 11, 5, 6);
  // small steps
  floor(25, 40); block(26, 9, 2, 1); block(30, 8, 2, 2); block(34, 7, 2, 3);
  // gaps: 2, 3, 4 tiles wide
  floor(43, 50); floor(54, 60); floor(65, 74);
  // one-way platforms above a pit
  oneWay(78, 8, 4); oneWay(84, 6, 4); oneWay(90, 8, 4);
  floor(75, 76); floor(96, 110);
  // jump-height test: walls of 2, 3 and 4 tiles
  block(100, 8, 1, 2); block(104, 7, 1, 3); block(108, 6, 1, 4);
  // staircase of floating blocks
  floor(111, 159);
  block(116, 8, 2, 1); block(120, 6, 2, 1); block(124, 4, 2, 1); oneWay(128, 4, 6);
  // cabinets at the end (future arcade portal)
  set(decor, 150, 9, 7); set(decor, 152, 9, 7); set(decor, 154, 9, 7);
  set(decor, 146, 9, 4);
  block(159, 0, 1, 10);

  const prop = (name, value) => ({ name, type: 'bool', value });
  // Entities are point objects; x/y is where the feet stand.
  const objects = [];
  const obj = (type, x, y, props = {}) => objects.push({
    id: objects.length + 1, name: '', type, point: true, x, y, width: 0, height: 0, rotation: 0, visible: true,
    properties: Object.entries(props).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value })),
  });
  const T = 16;
  obj('player-spawn', 40, 160);
  obj('pickup', 9 * T, 140, { kind: 'cassette' });
  obj('pickup', 31 * T, 116, { kind: 'cassette' });
  obj('pickup', 52 * T, 112, { kind: 'cassette' });
  obj('pickup', 86 * T, 80, { kind: 'cassette' });
  obj('pickup', 125 * T, 48, { kind: 'cassette' });
  obj('pickup', 72 * T, 150, { kind: 'heart' });
  obj('enemy', 18 * T, 160, { enemyType: 'patrol' });
  obj('enemy', 47 * T, 160, { enemyType: 'patrol' });
  obj('enemy', 57 * T, 110, { enemyType: 'flyer', patrolDistance: 64 });
  obj('enemy', 70 * T, 160, { enemyType: 'shooter' });
  obj('enemy', 88 * T, 56, { enemyType: 'flyer', patrolDistance: 96 });
  obj('enemy', 106 * T, 160, { enemyType: 'patrol' });
  obj('enemy', 136 * T, 160, { enemyType: 'shooter' });
  obj('enemy', 142 * T, 120, { enemyType: 'flyer', patrolDistance: 48 });
  obj('checkpoint', 44 * T, 160);
  obj('checkpoint', 112 * T, 160);
  const map = {
    compressionlevel: -1,
    width: W, height: H, tilewidth: 16, tileheight: 16,
    infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
    tiledversion: '1.10.2', type: 'map', version: '1.10',
    nextlayerid: 4, nextobjectid: objects.length + 1,
    layers: [
      { id: 1, name: 'decor', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data: decor },
      { id: 2, name: 'ground', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data: ground },
      {
        id: 3, name: 'entities', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
        objects,
      },
    ],
    tilesets: [{
      firstgid: 1, name: 'arcade', image: '../tiles/arcade.png', imagewidth: 128, imageheight: 16,
      tilewidth: 16, tileheight: 16, tilecount: 8, columns: 8, margin: 0, spacing: 0,
      tiles: [
        { id: 0, properties: [prop('collides', true)] },
        { id: 1, properties: [prop('collides', true)] },
        { id: 2, properties: [prop('collides', true)] },
        { id: 3, properties: [prop('oneWay', true)] },
      ],
    }],
  };
  saveJson('maps/testlevel.json', map);
}
