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

/** Silver, bevelled lettering on a transparent canvas — reads as stamped metal. */
function brandLetterTexture(text) {
  const key = `brand:${text}`;
  if (cache.has(key)) return cache.get(key);

  const H = 128;
  const font = Math.floor(H * 0.6);
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `800 ${font}px "Segoe UI", system-ui, sans-serif`;
  const w = Math.ceil(measure.measureText(text).width) + 70;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.font = `800 ${font}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = w / 2;
  const cy = H / 2;

  // drop shadow down-right, then a brushed vertical gradient, giving the
  // letters a raised, machined look rather than flat printed text.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(text, cx + 3, cy + 4);
  const g = ctx.createLinearGradient(0, cy - font / 2, 0, cy + font / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#d6dce4');
  g.addColorStop(0.55, '#a7afba');
  g.addColorStop(1, '#eef2f7');
  ctx.fillStyle = g;
  ctx.fillText(text, cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const entry = { tex, aspect: w / H };
  cache.set(key, entry);
  return entry;
}

/**
 * A brand nameplate built to look like part of the appliance: a dark-chrome
 * plate that catches the scene lighting (so it reads as physical metal, not
 * pasted-on text) with silver, bevelled lettering sitting just proud of it.
 * Returns a group that stays fixed to whatever it is mounted on.
 *
 * @param {string} text
 * @param {number} height world-space height of the lettering
 * @returns {THREE.Group}
 */
export function createBrandPlate(text, height = 0.24) {
  const { tex, aspect } = brandLetterTexture(text);

  const group = new THREE.Group();

  const letterW = height * aspect;
  const plateH = height * 1.5;
  const plateW = letterW + plateH * 0.45;

  // The plate is a lit Lambert box, so it shades with the kitchen and looks
  // machined into the door / panel it sits on.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(plateW, plateH, 0.02),
    new THREE.MeshLambertMaterial({ color: 0x2f333b, flatShading: true }),
  );
  group.add(plate);

  const letters = new THREE.Mesh(
    new THREE.PlaneGeometry(letterW, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  letters.position.z = 0.02;
  group.add(letters);

  group.userData.isBrand = true;
  return group;
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
