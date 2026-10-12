// Generates placeholder music loops and sound effects as 8-bit WAV files.
// Existing files are kept so real tracks are never overwritten; pass --force to regenerate.
// The music is deliberately simple chip-style sketches, one loop per level section.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets', 'audio');
const FORCE = process.argv.includes('--force');
const RATE = 22050;

function writeWav(rel, samples) {
  const file = path.join(ROOT, rel);
  if (fs.existsSync(file) && !FORCE) { console.log(`skip  audio/${rel} (exists)`); return; }
  const n = samples.length;
  const buf = Buffer.alloc(44 + n);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) buf[44 + i] = Math.max(0, Math.min(255, Math.round(128 + samples[i] * 127)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`write audio/${rel} (${(buf.length / 1024).toFixed(0)} KB)`);
}

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let noiseSeed = 1;
const noise = () => ((noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;

const osc = {
  square: (p, duty = 0.5) => ((p % 1) < duty ? 1 : -1),
  triangle: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  saw: (p) => 2 * (p % 1) - 1,
};

/** Adds a note into a sample buffer with a simple attack/decay envelope. */
function note(buf, start, dur, freq, { wave = 'square', duty = 0.5, vol = 0.25, decay = 0, slide = 0, attack = 0.004 } = {}) {
  const s0 = Math.floor(start * RATE);
  const len = Math.floor(dur * RATE);
  let phase = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const f = freq * (1 + slide * (i / len));
    phase += f / RATE;
    let env = Math.min(1, t / attack);
    if (decay > 0) env *= Math.exp(-t / decay);
    env *= Math.min(1, (len - i) / (RATE * 0.004)); // tiny release, avoids clicks
    const v = wave === 'square' ? osc.square(phase, duty) : wave === 'noise' ? noise() : osc[wave](phase);
    buf[s0 + i] += v * vol * env;
  }
}

function kick(buf, t, vol = 0.6) {
  const s0 = Math.floor(t * RATE);
  let phase = 0;
  for (let i = 0; i < RATE * 0.16 && s0 + i < buf.length; i++) {
    const k = i / (RATE * 0.16);
    phase += (150 * (1 - k) + 45) / RATE;
    buf[s0 + i] += Math.sin(phase * Math.PI * 2) * vol * (1 - k);
  }
}
const hat = (buf, t, vol = 0.08) => note(buf, t, 0.04, 1, { wave: 'noise', vol, decay: 0.015 });
const snare = (buf, t, vol = 0.22) => note(buf, t, 0.14, 1, { wave: 'noise', vol, decay: 0.05 });

/**
 * Renders a loop of `bars` 4/4 bars at `bpm`. `fn(step, time, stepDur)` is called for each
 * 16th-note step and places notes; nothing may ring past the loop end.
 */
function loop(bpm, bars, fn) {
  const stepDur = 60 / bpm / 4;
  const steps = bars * 16;
  const buf = new Float32Array(Math.round(steps * stepDur * RATE));
  for (let s = 0; s < steps; s++) fn(s, s * stepDur, stepDur, buf);
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  return buf.map((v) => v * gain);
}
const seq = (str) => str.split(' ').map((n) => (n === '.' ? null : n === '-' ? '-' : Number(n)));

// ---------------------------------------------------------------------------
// Arcade: cheerful chiptune, 140 BPM, C major-ish
writeWav('music/arcade.wav', loop(140, 8, (s, t, d, buf) => {
  const bar = Math.floor(s / 16), st = s % 16;
  const chords = [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]];
  const ch = chords[bar % 4];
  if (st % 4 === 0) note(buf, t, d * 2, midi(ch[0] - 24), { wave: 'triangle', vol: 0.35 });
  if (st % 4 === 2) note(buf, t, d * 2, midi(ch[0] - 12), { wave: 'triangle', vol: 0.25 });
  note(buf, t, d * 0.9, midi(ch[st % 3] + 12), { duty: 0.125, vol: 0.06, decay: 0.05 });
  const melA = seq('72 . 76 . 79 . 76 . 74 . 72 . 71 . 67 .');
  const melB = seq('72 74 76 79 . 81 79 . 77 76 74 . 72 . . .');
  const mel = bar < 4 ? melA : melB;
  if (mel[st] !== null && bar % 2 === 0) note(buf, t, d * 1.8, midi(mel[st]), { duty: 0.25, vol: 0.13, decay: 0.25 });
  if (st % 4 === 0) kick(buf, t, 0.45);
  if (st % 8 === 4) snare(buf, t, 0.15);
  if (st % 2 === 0) hat(buf, t, 0.05);
}));

// Data highway: eurodance-ish, 136 BPM, A minor, four on the floor with offbeat bass
writeWav('music/datahighway.wav', loop(136, 8, (s, t, d, buf) => {
  const bar = Math.floor(s / 16), st = s % 16;
  const roots = [57, 53, 48, 55];
  const root = roots[Math.floor(bar / 2) % 4];
  if (st % 4 === 0) kick(buf, t, 0.6);
  if (st % 4 === 2) note(buf, t, d * 1.6, midi(root - 12), { wave: 'saw', vol: 0.22, decay: 0.12 });
  if (st % 8 === 4) snare(buf, t, 0.18);
  if (st % 4 === 2) hat(buf, t, 0.09);
  const arp = [0, 7, 12, 15, 12, 7, 3, 7];
  note(buf, t, d * 0.8, midi(root + 12 + arp[st % 8]), { duty: 0.5, vol: 0.06, decay: 0.06 });
  const lead = seq('. . 76 . 76 . 74 . 72 . . 72 74 . 76 .');
  if (bar % 2 === 1 && lead[st] !== null) note(buf, t, d * 1.8, midi(lead[st]), { wave: 'saw', vol: 0.09, decay: 0.2 });
}));

// Catacombs: dark, 140 BPM in half-time, D minor drone with low chugs
writeWav('music/catacombs.wav', loop(140, 8, (s, t, d, buf) => {
  const bar = Math.floor(s / 16), st = s % 16;
  if (st === 0) note(buf, t, d * 16, midi(38), { wave: 'saw', vol: 0.1 });
  if (st === 0 || st === 10) kick(buf, t, 0.65);
  if (st === 8) snare(buf, t, 0.25);
  if (st % 4 === 0) hat(buf, t, 0.04);
  const chug = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0];
  if (bar % 4 >= 2 && chug[st]) note(buf, t, d * 0.7, midi(26), { wave: 'square', duty: 0.3, vol: 0.18, decay: 0.08 });
  const bell = seq('74 . . . 77 . . . 76 . . . 69 . . .');
  if (bell[st] !== null) note(buf, t, d * 4, midi(bell[st] + (bar % 2 ? -2 : 0)), { wave: 'triangle', vol: 0.12, decay: 0.4 });
}));

// Boss: fast and aggressive, 160 BPM, E minor
writeWav('music/boss.wav', loop(160, 8, (s, t, d, buf) => {
  const bar = Math.floor(s / 16), st = s % 16;
  const roots = [40, 40, 43, 38];
  const root = roots[Math.floor(bar / 2) % 4];
  if (st % 2 === 0) kick(buf, t, 0.5);
  if (st % 8 === 4) snare(buf, t, 0.25);
  hat(buf, t, 0.05);
  note(buf, t, d * 0.8, midi(root + (st % 4 === 3 ? 12 : 0)), { wave: 'saw', vol: 0.2, decay: 0.07 });
  const lead = seq('76 . 79 . 83 . 79 . 76 . 74 . 71 . 74 .');
  if (lead[st] !== null) note(buf, t, d * 1.6, midi(lead[st] + (bar >= 4 ? 5 : 0)), { duty: 0.25, vol: 0.1, decay: 0.15 });
}));

// Title: slow, heavy intro groove, 100 BPM, E minor with a doomy lead
writeWav('music/title.wav', loop(100, 8, (s, t, d, buf) => {
  const bar = Math.floor(s / 16), st = s % 16;
  const roots = [40, 40, 36, 38];
  const root = roots[Math.floor(bar / 2) % 4];
  if (st === 0 || st === 3 || st === 10) kick(buf, t, 0.6);
  if (st === 8) snare(buf, t, 0.24);
  if (st % 2 === 0) hat(buf, t, 0.04);
  const chug = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
  if (chug[st]) note(buf, t, d * 0.8, midi(root - 12), { wave: 'square', duty: 0.3, vol: 0.16, decay: 0.1 });
  if (st === 0) note(buf, t, d * 16, midi(root), { wave: 'saw', vol: 0.06 });
  const lead = seq('71 . . . 72 . 71 . 67 . . . 64 . . .');
  if (bar >= 4 && lead[st] !== null) note(buf, t, d * 3, midi(lead[st]), { duty: 0.25, vol: 0.1, decay: 0.35 });
}));

// ---------------------------------------------------------------------------
// Sound effects
function sfx(rel, seconds, fn) {
  const buf = new Float32Array(Math.round(seconds * RATE));
  fn(buf);
  writeWav(rel, buf);
}
sfx('sfx/jump.wav', 0.15, (b) => note(b, 0, 0.15, 300, { duty: 0.5, vol: 0.3, slide: 1.2, decay: 0.08 }));
sfx('sfx/shoot.wav', 0.12, (b) => { note(b, 0, 0.1, 880, { duty: 0.25, vol: 0.25, slide: -0.5, decay: 0.05 }); note(b, 0, 0.05, 1, { wave: 'noise', vol: 0.1, decay: 0.02 }); });
sfx('sfx/enemy-hit.wav', 0.08, (b) => note(b, 0, 0.08, 200, { duty: 0.5, vol: 0.3, slide: -0.4, decay: 0.03 }));
sfx('sfx/enemy-die.wav', 0.3, (b) => { [660, 520, 400, 260].forEach((f, i) => note(b, i * 0.06, 0.07, f, { duty: 0.5, vol: 0.25 })); note(b, 0, 0.25, 1, { wave: 'noise', vol: 0.15, decay: 0.08 }); });
sfx('sfx/hurt.wav', 0.3, (b) => { note(b, 0, 0.3, 220, { wave: 'saw', vol: 0.35, slide: -0.6, decay: 0.15 }); note(b, 0, 0.1, 1, { wave: 'noise', vol: 0.2, decay: 0.04 }); });
sfx('sfx/pickup.wav', 0.18, (b) => { note(b, 0, 0.07, 988, { duty: 0.5, vol: 0.2 }); note(b, 0.07, 0.11, 1319, { duty: 0.5, vol: 0.2, decay: 0.08 }); });
sfx('sfx/heart.wav', 0.3, (b) => [523, 659, 784, 1047].forEach((f, i) => note(b, i * 0.06, 0.08, f, { wave: 'triangle', vol: 0.35 })));
sfx('sfx/checkpoint.wav', 0.4, (b) => [392, 523, 659, 784, 1047].forEach((f, i) => note(b, i * 0.07, 0.1, f, { duty: 0.125, vol: 0.2, decay: 0.1 })));
sfx('sfx/glitch.wav', 0.8, (b) => {
  for (let i = 0; i < 16; i++) {
    const f = 100 + ((i * 397) % 1200);
    note(b, i * 0.05, 0.05, f, { duty: 0.1 + (i % 4) * 0.2, vol: 0.2 });
    if (i % 3 === 0) note(b, i * 0.05, 0.04, 1, { wave: 'noise', vol: 0.25 });
  }
});
sfx('sfx/portal.wav', 0.6, (b) => note(b, 0, 0.6, 200, { wave: 'triangle', vol: 0.4, slide: 3, decay: 0.3 }));
sfx('sfx/lose-life.wav', 0.7, (b) => [523, 494, 466, 440, 415, 392].forEach((f, i) => note(b, i * 0.1, 0.12, f / 2, { duty: 0.5, vol: 0.25 })));
// Boss
sfx('sfx/boss-hit.wav', 0.1, (b) => { note(b, 0, 0.1, 140, { duty: 0.5, vol: 0.3, slide: -0.3, decay: 0.04 }); note(b, 0, 0.05, 1, { wave: 'noise', vol: 0.12, decay: 0.02 }); });
sfx('sfx/laser-charge.wav', 0.9, (b) => { note(b, 0, 0.9, 200, { wave: 'saw', vol: 0.18, slide: 3, attack: 0.6 }); note(b, 0, 0.9, 203, { duty: 0.25, vol: 0.1, slide: 3, attack: 0.6 }); });
sfx('sfx/laser.wav', 0.7, (b) => { for (let i = 0; i < 14; i++) note(b, i * 0.05, 0.05, 600 + (i % 2) * 300, { duty: 0.5, vol: 0.18 }); note(b, 0, 0.7, 1, { wave: 'noise', vol: 0.1, decay: 0.4 }); });
sfx('sfx/stomp.wav', 0.4, (b) => { kick(b, 0, 0.9); note(b, 0, 0.35, 1, { wave: 'noise', vol: 0.3, decay: 0.12 }); });
sfx('sfx/roar.wav', 1.0, (b) => { note(b, 0, 1, 110, { wave: 'saw', vol: 0.3, slide: -0.5, attack: 0.1, decay: 0.6 }); note(b, 0, 1, 1, { wave: 'noise', vol: 0.2, decay: 0.5 }); note(b, 0, 1, 166, { duty: 0.3, vol: 0.15, slide: -0.5, decay: 0.5 }); });
sfx('sfx/boss-die.wav', 1.5, (b) => { for (let i = 0; i < 10; i++) { kick(b, i * 0.12, 0.5); note(b, i * 0.12, 0.1, 1, { wave: 'noise', vol: 0.25, decay: 0.05 }); } note(b, 0, 1.5, 880, { duty: 0.5, vol: 0.12, slide: -0.9, decay: 0.8 }); });
sfx('sfx/win.wav', 1.6, (b) => [60, 64, 67, 72, 67, 72, 76, 79].forEach((m, i) => note(b, i * 0.15, i === 7 ? 0.5 : 0.14, midi(m + 12), { duty: 0.25, vol: 0.22, decay: i === 7 ? 0.4 : 0.1 })));
sfx('sfx/1up.wav', 0.6, (b) => [72, 76, 79, 84, 79, 84].forEach((m, i) => note(b, i * 0.08, i === 5 ? 0.2 : 0.08, midi(m + 12), { duty: 0.25, vol: 0.22, decay: i === 5 ? 0.15 : 0 })));
// Menus
sfx('sfx/menu-move.wav', 0.05, (b) => note(b, 0, 0.05, 1320, { duty: 0.5, vol: 0.15, decay: 0.02 }));
sfx('sfx/menu-select.wav', 0.3, (b) => { note(b, 0, 0.08, 784, { duty: 0.25, vol: 0.22 }); note(b, 0.08, 0.2, 1568, { duty: 0.25, vol: 0.22, decay: 0.12 }); });
sfx('sfx/countdown.wav', 0.12, (b) => note(b, 0, 0.12, 440, { duty: 0.125, vol: 0.2, decay: 0.05 }));
sfx('sfx/game-over.wav', 2.0, (b) => [64, 63, 62, 61].forEach((m, i) => note(b, i * 0.38, i === 3 ? 1.0 : 0.34, midi(m), { wave: 'saw', vol: 0.25, decay: i === 3 ? 0.6 : 0.2, slide: i === 3 ? -0.15 : 0 })));
