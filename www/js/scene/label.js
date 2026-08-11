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
 * A flat, unlit brand nameplate (an appliance logo). Unlike createLabel it
 * returns a plane rather than a sprite, so it stays fixed to whatever it is
 * mounted on instead of turning to face the camera — and it is drawn unlit so
 * the brand colour reads the same regardless of the dim kitchen lighting.
 *
 * @param {string} text
 * @param {number} height world-space height of the plate
 * @returns {THREE.Mesh}
 */
export function createBrandPlate(text, height = 0.3, bg = '#e4032e', fg = '#ffffff') {
  const key = `brand:${text}:${bg}:${fg}`;
  let entry = cache.get(key);

  if (!entry) {
    const H = 96;
    const font = Math.floor(H * 0.62);
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `800 ${font}px "Segoe UI", system-ui, sans-serif`;
    const w = Math.ceil(measure.measureText(text).width) + 56;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, H - 4, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = `800 ${font}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, H / 2 + 3);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    entry = { tex, aspect: w / H };
    cache.set(key, entry);
  }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(height * entry.aspect, height),
    new THREE.MeshBasicMaterial({ map: entry.tex, transparent: true }),
  );
  mesh.userData.isBrand = true;
  return mesh;
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
