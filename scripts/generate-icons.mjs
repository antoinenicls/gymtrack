/**
 * Genere les icones PNG de la PWA sans dependance externe.
 *
 * Pourquoi coder l'encodeur plutot que d'installer sharp ou canvas : ces deux
 * paquets embarquent des binaires natifs de plusieurs dizaines de megaoctets
 * et cassent regulierement a l'installation selon la plateforme. Le dessin
 * ici n'est fait que de rectangles a coins arrondis, et zlib est dans Node.
 *
 * Usage : node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');

const ACCENT = [10, 132, 255]; // #0A84FF, le token de la landing.
const WHITE = [255, 255, 255];

/* -------------------------------------------------------------------------- */
/* Encodeur PNG                                                                */
/* -------------------------------------------------------------------------- */

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** rgba : Buffer de size x size x 4 octets. */
function encodePng(rgba, size) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur 8 bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtre adaptatif
  ihdr[12] = 0; // pas d'entrelacement

  // Chaque ligne est prefixee de son type de filtre. 0 = aucun : l'image est
  // faite d'aplats, le gain d'un filtre serait negligeable.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Dessin                                                                      */
/* -------------------------------------------------------------------------- */

function createCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

/**
 * Rectangle a coins arrondis, avec anticrenelage par suréchantillonnage.
 * On teste plusieurs points par pixel et on mélange selon la proportion
 * couverte : sans ça les arrondis sortent en escalier sur une icone de 192 px.
 */
function fillRoundRect(canvas, x, y, w, h, radius, color, alpha = 1) {
  const { size, data } = canvas;
  const SAMPLES = 4;
  const step = 1 / SAMPLES;

  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(size, Math.ceil(x + w));
  const y1 = Math.min(size, Math.ceil(y + h));

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const cx = px + (sx + 0.5) * step;
          const cy = py + (sy + 0.5) * step;
          if (insideRoundRect(cx, cy, x, y, w, h, radius)) covered++;
        }
      }
      if (covered === 0) continue;

      const coverage = (covered / (SAMPLES * SAMPLES)) * alpha;
      const offset = (py * size + px) * 4;

      // Composition « source over » sur ce qui est deja dessine.
      const srcA = coverage;
      const dstA = data[offset + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA === 0) continue;

      for (let c = 0; c < 3; c++) {
        const src = color[c] / 255;
        const dst = data[offset + c] / 255;
        data[offset + c] = Math.round(((src * srcA + dst * dstA * (1 - srcA)) / outA) * 255);
      }
      data[offset + 3] = Math.round(outA * 255);
    }
  }
}

function insideRoundRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) return true;

  // On ne teste la distance que dans les quatre coins.
  const cx = px < x + radius ? x + radius : px > x + w - radius ? x + w - radius : px;
  const cy = py < y + radius ? y + radius : py > y + h - radius ? y + h - radius : py;
  if (cx === px || cy === py) return true;

  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

/**
 * Le motif : une barre chargee vue de face. Coordonnees exprimees sur une
 * grille de 64, mises a l'echelle de la taille demandee, pour rester
 * identiques au favicon.svg.
 */
function drawIcon(size, { maskable = false } = {}) {
  const canvas = createCanvas(size);
  const u = size / 64;

  // Une icone maskable doit survivre a un rognage circulaire agressif : on
  // garde le motif dans les 80 % centraux et on remplit le fond entierement.
  const inset = maskable ? size * 0.1 : 0;
  const scale = maskable ? 0.8 : 1;
  const px = (v) => inset + v * u * scale;
  const len = (v) => v * u * scale;

  if (maskable) {
    fillRoundRect(canvas, 0, 0, size, size, 0, ACCENT);
  } else {
    fillRoundRect(canvas, 0, 0, size, size, 14 * u, ACCENT);
  }

  // Disques exterieurs, plus discrets.
  fillRoundRect(canvas, px(8), px(26), len(5), len(12), len(2), WHITE, 0.55);
  fillRoundRect(canvas, px(51), px(26), len(5), len(12), len(2), WHITE, 0.55);
  // Disques interieurs.
  fillRoundRect(canvas, px(15), px(20), len(7), len(24), len(2.5), WHITE);
  fillRoundRect(canvas, px(42), px(20), len(7), len(24), len(2.5), WHITE);
  // Barre.
  fillRoundRect(canvas, px(24), px(30), len(16), len(4), len(2), WHITE);

  return canvas;
}

/* -------------------------------------------------------------------------- */

mkdirSync(PUBLIC_DIR, { recursive: true });

const targets = [
  { file: 'pwa-192.png', size: 192, maskable: false },
  { file: 'pwa-512.png', size: 512, maskable: false },
  { file: 'pwa-512-maskable.png', size: 512, maskable: true },
  // iOS ignore la transparence et ne sait pas arrondir : l'icone doit deja
  // contenir son fond, ce qui est le cas ici.
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { file, size, maskable } of targets) {
  const canvas = drawIcon(size, { maskable });
  writeFileSync(join(PUBLIC_DIR, file), encodePng(canvas.data, size));
  console.log(`${file} (${size}x${size})`);
}

console.log('Icones generees dans public/.');
