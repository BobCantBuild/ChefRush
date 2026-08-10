import * as THREE from '../../vendor/three.module.js';

// Name tags are drawn to a canvas and shown as sprites, so they always face the
// camera without any per-frame billboarding work. Textures are cached by text,
// because the same ingredient reappears across rounds.

const PAD_X = 26;
const FONT_PX = 46;
const H_PX = 84;
// A tag is sized in world units by its height, so a long word makes a very wide
// sprite — "Strawberry" came out wider than the column it sat in and spilled
// off-screen. Capping the aspect ratio bounds every tag to a predictable width.
const MAX_ASPECT = 3.0;

const cache = new Map();

function fitFont(ctx, text) {
  let font = FONT_PX;
  ctx.font = `700 ${font}px "Segoe UI", system-ui, sans-serif`;
  let textW = Math.ceil(ctx.measureText(text).width);

  const maxTextW = MAX_ASPECT * H_PX - PAD_X * 2;
  if (textW > maxTextW) {
    font = Math.max(26, Math.floor(font * (maxTextW / textW)));
    ctx.font = `700 ${font}px "Segoe UI", system-ui, sans-serif`;
    textW = Math.ceil(ctx.measureText(text).width);
  }
  return { font, textW };
}

function makeTexture(text) {
  if (cache.has(text)) return cache.get(text);

  const measure = document.createElement('canvas').getContext('2d');
  const { font: fontPx, textW } = fitFont(measure, text);

  const w = textW + PAD_X * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = H_PX;

  const ctx = canvas.getContext('2d');
  const r = H_PX / 2;

  // pill background
  ctx.fillStyle = 'rgba(20, 13, 30, 0.88)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, H_PX, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${fontPx}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, H_PX / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const entry = { tex, aspect: w / H_PX };
  cache.set(text, entry);
  return entry;
}

/**
 * @param {string} text
 * @param {number} height world-space height of the tag
 * @returns {THREE.Sprite}
 */
export function createLabel(text, height = 0.2) {
  const { tex, aspect } = makeTexture(text);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  // depthTest off keeps tags legible when an item sits behind shelf woodwork;
  // renderOrder keeps them above everything else in the scene.
  sprite.renderOrder = 10;
  sprite.scale.set(height * aspect, height, 1);
  sprite.userData.isLabel = true;
  return sprite;
}
