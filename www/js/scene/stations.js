import * as THREE from '../../vendor/three.module.js';
import { CONFIG } from '../config.js';
import { Ease, lerp, tween } from '../util/anim.js';
import { createLabel } from './label.js';

// The three places ingredients live. Each station owns its furniture, a grid of
// slots to lay items out in, and the camera framing used when it is zoomed in.

const wood     = () => new THREE.MeshLambertMaterial({ color: 0x8a5a38, flatShading: true });
const woodLite = () => new THREE.MeshLambertMaterial({ color: 0xb07a4e, flatShading: true });
const steel    = () => new THREE.MeshLambertMaterial({ color: 0xc9ced8, flatShading: true });
const steelDk  = () => new THREE.MeshLambertMaterial({ color: 0x9aa1ad, flatShading: true });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * Lays items out in a grid with every row centred on the station's axis.
 * Centring per row matters: a row holding a single item would otherwise sit at
 * the far-left column, pushing it (and its name tag) outside the zoomed camera.
 *
 * @param cols items per full row
 * @param gap  horizontal spacing between items
 * @param place (col-offset, row) => THREE.Vector3
 */
function gridSlot(cols, gap, place) {
  return (i, total) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inThisRow = Math.min(cols, Math.max(1, total - row * cols));
    const x = (col - (inThisRow - 1) / 2) * gap;
    return place(x, row);
  };
}

/** Big always-visible sign so you know which station to tap in the wide shot. */
function stationSign(text, y) {
  const sign = createLabel(text, 0.34);
  sign.position.y = y;
  return sign;
}

// ============================================================== fridge ===
function buildFridge() {
  const group = new THREE.Group();
  group.position.set(-2.05, 0, -3.25);

  const W = 1.5, H = 3.1, D = 1.15;

  group.add(box(W, H, D, steel(), 0, H / 2, 0));
  // recessed dark interior
  group.add(box(W - 0.2, H - 0.35, D - 0.12, new THREE.MeshLambertMaterial({ color: 0xe8edf4, flatShading: true }), 0, H / 2, 0.06));

  // interior shelf boards
  for (let i = 0; i < 3; i++) {
    group.add(box(W - 0.26, 0.05, D - 0.2, steelDk(), 0, 0.85 + i * 0.62, 0.06));
  }

  // door, hinged on the left edge so it swings toward the player
  const door = new THREE.Group();
  door.position.set(-W / 2, H / 2, D / 2);
  group.add(door);
  door.add(box(W, H - 0.06, 0.1, steel(), W / 2, 0, 0));
  door.add(box(0.08, 0.7, 0.12, steelDk(), W - 0.16, -0.1, 0.08)); // handle

  const light = new THREE.PointLight(0xfff2d0, 0, 3);
  light.position.set(0, 1.6, 0.2);
  group.add(light);

  let isOpen = false;
  function setOpen(open) {
    if (isOpen === open) return Promise.resolve();
    isOpen = open;
    const from = door.rotation.y;
    const to = open ? -2.0 : 0;
    light.intensity = open ? 1.6 : 0;
    return tween({
      duration: CONFIG.anim.doorSwing,
      ease: open ? Ease.quadOut : Ease.backOut,
      onUpdate: (t) => { door.rotation.y = lerp(from, to, t); },
    }).promise;
  }

  group.add(stationSign('FRIDGE', H + 0.34));

  // 3 across, on the interior boards
  const slot = gridSlot(3, 0.45, (x, row) => new THREE.Vector3(x, 2.02 - row * 0.62, 0.06));

  return { group, slot, setOpen, needsOpen: true };
}

// ============================================================== pantry ===
function buildPantry() {
  const group = new THREE.Group();
  group.position.set(0.75, 0, -4.28);

  // two open boards mounted on the back wall
  for (let i = 0; i < 2; i++) {
    const y = 2.05 + i * 0.78;
    group.add(box(2.6, 0.1, 0.6, woodLite(), 0, y, 0.3));
    group.add(box(0.1, 0.42, 0.55, wood(), -1.25, y - 0.24, 0.3));
    group.add(box(0.1, 0.42, 0.55, wood(), 1.25, y - 0.24, 0.3));
  }

  group.add(stationSign('PANTRY', 3.35));

  // 3 across, top board then bottom board. Spacing is deliberately tighter
  // than the boards are wide: the slot spread plus its name tags has to fit
  // inside the zoomed camera framing, or edge items land off-screen.
  const slot = gridSlot(3, 0.6, (x, row) => new THREE.Vector3(x, 2.98 - row * 0.78, 0.34));

  return { group, slot, setOpen: () => Promise.resolve(), needsOpen: false };
}

// ============================================================= produce ===
function buildProduce() {
  const group = new THREE.Group();
  // Right-hand end of the island: keeps its sign clear of the fridge, which
  // it collided with when the crates sat on the left.
  group.position.set(1.15, 0, -0.05);

  // three shallow crates sitting on the island
  for (let i = 0; i < 3; i++) {
    const x = -0.62 + i * 0.62;
    group.add(box(0.56, 0.1, 0.68, woodLite(), x, 1.05, 0));
    group.add(box(0.56, 0.22, 0.06, wood(), x, 1.14, 0.33));
    group.add(box(0.56, 0.22, 0.06, wood(), x, 1.14, -0.33));
  }

  group.add(stationSign('PRODUCE', 1.72));

  // 3 across x N deep, laid flat in the crates
  // Rows are separated in depth rather than height, so the produce camera
  // looks down steeply — otherwise the second row's name tags overlap the
  // first row's on screen.
  const slot = gridSlot(3, 0.58, (x, row) => new THREE.Vector3(x, 1.22, -0.25 + row * 0.52));

  return { group, slot, setOpen: () => Promise.resolve(), needsOpen: false };
}

// ================================================================ api ===
/** Camera framings, in world space. */
export const FRAMING = {
  wide:    { pos: new THREE.Vector3(0, 5.6, 8.0),      target: new THREE.Vector3(0, 2.85, -2.0) },
  fridge:  { pos: new THREE.Vector3(-1.9, 2.55, 0.55), target: new THREE.Vector3(-2.05, 1.75, -3.25) },
  pantry:  { pos: new THREE.Vector3(0.75, 2.9, 0.15),  target: new THREE.Vector3(0.75, 2.6, -4.28) },
  produce: { pos: new THREE.Vector3(1.15, 4.25, 3.15), target: new THREE.Vector3(1.15, 1.2, -0.05) },
  counter: { pos: new THREE.Vector3(-0.6, 2.8, 3.6),   target: new THREE.Vector3(-0.7, 1.25, -0.8) },
};

/** Where the chef stands to work each station. */
export const CHEF_X = {
  fridge: -2.05,
  pantry: 0.75,
  produce: 1.15,
  counter: -0.85,
};

export function createStations() {
  const stations = {
    fridge: buildFridge(),
    pantry: buildPantry(),
    produce: buildProduce(),
  };

  const group = new THREE.Group();
  for (const s of Object.values(stations)) group.add(s.group);

  /** World-space position of slot `i` of `total` at station `id`. */
  function slotWorld(id, i, total) {
    const s = stations[id];
    return s.slot(i, total).add(s.group.position);
  }

  function setSignsVisible(visible) {
    for (const s of Object.values(stations)) {
      s.group.children.forEach((c) => {
        if (c.isSprite && c.userData.isLabel) c.visible = visible;
      });
    }
  }

  return { group, stations, slotWorld, setSignsVisible };
}
