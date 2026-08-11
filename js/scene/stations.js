import * as THREE from '../../vendor/three.module.js';
import { CONFIG } from '../config.js';
import { Ease, lerp, tween } from '../util/anim.js';
import { createBrandPlate, createLabel } from './label.js';

// The two places ingredients live. Each station owns its furniture, a grid of
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

// --- decorative clutter -------------------------------------------------
// Jars, bottles and canisters that make the shelves and fridge read as fully
// stocked. They are pure set dressing: never registered as tap targets and
// never part of a round's shelf, so they can't be confused with a real
// ingredient. Kept to simple primitives to stay within the draw-call budget.
const DECO = [0xe4573b, 0xf2b134, 0x6fae5b, 0xd9d2c0, 0xc94f7c, 0x4f9dc9, 0xe6c34a, 0x8b5a2b, 0xcf5b4e, 0xa3c76d];
const decoMat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

/** A squat jar / can, standing on its base at (x, y, z). Single mesh. */
function canister(x, y, z, rad = 0.13, h = 0.26, color = 0xd9d2c0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 10), decoMat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}

/** A taller bottle with a narrow neck, standing on its base at (x, y, z). */
function bottle(x, y, z, color = 0x6fae5b) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.34, 8), decoMat(color));
  body.position.y = 0.17;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.13, 8), decoMat(color));
  neck.position.y = 0.4;
  g.add(body, neck);
  g.position.set(x, y, z);
  return g;
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

  // IFB nameplate, centred on the door and clear of the handle. It swings with
  // the door and is a lit metal badge, so it reads as built into the appliance.
  const badge = createBrandPlate('IFB', 0.24);
  badge.position.set(0.75, 0.98, 0.06);
  door.add(badge);

  // bottles on the inside of the door — they ride along when it swings open
  door.add(box(1.0, 0.06, 0.16, steelDk(), 0.66, -0.35, -0.13));
  door.add(bottle(0.42, -0.28, -0.12, 0x6fae5b));
  door.add(bottle(0.9, -0.28, -0.12, 0xe6c34a));

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

  // Stock the interior so an opened fridge looks full. The round's real
  // ingredients occupy the front of the three upper boards (z = 0.06); this
  // clutter sits behind them and in the space below the lowest board, so it
  // never lands where a fetchable item will be placed.
  [2.09, 1.47].forEach((by, r) => {
    for (let c = 0; c < 3; c++) {
      group.add(canister((c - 1) * 0.42, by + 0.03, -0.24, 0.12, 0.28 - (c % 2) * 0.07, DECO[(r * 3 + c) % DECO.length]));
    }
  });
  // crisper drawer with a few vegetables, on the interior floor
  group.add(box(W - 0.34, 0.34, D - 0.4, new THREE.MeshLambertMaterial({ color: 0xdfe7f0, transparent: true, opacity: 0.5, flatShading: true }), 0, 0.36, 0.04));
  [[-0.32, 0xe4573b], [0, 0x6fae5b], [0.32, 0xf2b134]].forEach(([x, c]) => {
    const veg = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), decoMat(c));
    veg.position.set(x, 0.46, 0.04);
    group.add(veg);
  });

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

  // Fill the open shelves so they read as a stocked pantry. A back row of
  // canisters sits behind where the round's ingredients go (they land at
  // z = 0.34, this clutter at z = 0.12), and taller bottles flank the columns
  // beyond the ±0.6 ingredient span — so nothing overlaps a fetchable item.
  [2.10, 2.88].forEach((by, r) => {
    [-1.05, -0.55, 0, 0.55, 1.05].forEach((x, c) => {
      group.add(canister(x, by, 0.12, 0.12, 0.2 + ((c + r) % 2) * 0.08, DECO[(r * 5 + c) % DECO.length]));
    });
    group.add(bottle(-1.16, by, 0.34, DECO[(r * 2) % DECO.length]));
    group.add(bottle(1.16, by, 0.34, DECO[(r * 2 + 3) % DECO.length]));
  });

  // 3 across, top board then bottom board. Spacing is deliberately tighter
  // than the boards are wide: the slot spread plus its name tags has to fit
  // inside the zoomed camera framing, or edge items land off-screen.
  const slot = gridSlot(3, 0.6, (x, row) => new THREE.Vector3(x, 2.98 - row * 0.78, 0.34));

  return { group, slot, setOpen: () => Promise.resolve(), needsOpen: false };
}

// ================================================================ api ===
/** Camera framings, in world space. */
export const FRAMING = {
  wide:    { pos: new THREE.Vector3(0, 5.6, 8.0),      target: new THREE.Vector3(0, 2.85, -2.0) },
  fridge:  { pos: new THREE.Vector3(-1.9, 2.55, 0.55), target: new THREE.Vector3(-2.05, 1.75, -3.25) },
  pantry:  { pos: new THREE.Vector3(0.75, 2.9, 0.15),  target: new THREE.Vector3(0.75, 2.6, -4.28) },
  counter: { pos: new THREE.Vector3(-0.6, 2.8, 3.6),   target: new THREE.Vector3(-0.7, 1.25, -0.8) },
};

/** Where the chef stands to work each station. */
export const CHEF_X = {
  fridge: -2.05,
  pantry: 0.75,
  counter: -0.85,
};

export function createStations() {
  const stations = {
    fridge: buildFridge(),
    pantry: buildPantry(),
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
