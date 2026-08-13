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

/** Translucent pale-blue glass, for the fridge shelves. */
const glassMat = () => new THREE.MeshLambertMaterial({ color: 0xbcd6ea, transparent: true, opacity: 0.4, flatShading: true });

/** The three fridge shelf-surface heights, shared by the shelves and the slots. */
const fridgeShelfYs = () => [2.12, 1.5, 0.88];

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

  // steel body + a bright plastic liner so the inside reads as a real cabinet
  group.add(box(W, H, D, steel(), 0, H / 2, 0));
  const liner = new THREE.MeshLambertMaterial({ color: 0xf1f6fb, flatShading: true });
  group.add(box(W - 0.16, H - 0.3, D - 0.08, liner, 0, H / 2, 0.05));
  // back wall a touch darker for depth
  group.add(box(W - 0.24, H - 0.4, 0.04, new THREE.MeshLambertMaterial({ color: 0xdbe6f0, flatShading: true }), 0, H / 2, -0.42));

  // Glass shelves that clearly span the interior — items are grounded on top of
  // these. A steel lip along the front edge catches the light so each shelf
  // reads as a real, separate surface rather than a faint line.
  const SHELF_Y = fridgeShelfYs();
  const shelfFront = 0.05 + (D - 0.26) / 2;
  for (const y of SHELF_Y) {
    group.add(box(W - 0.22, 0.035, D - 0.26, glassMat(), 0, y, 0.05));
    group.add(box(W - 0.22, 0.055, 0.035, steelDk(), 0, y, shelfFront));
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
  light.position.set(0, 2.0, 0.25);
  group.add(light);

  let isOpen = false;
  function setOpen(open) {
    if (isOpen === open) return Promise.resolve();
    isOpen = open;
    const from = door.rotation.y;
    const to = open ? -2.0 : 0;
    light.intensity = open ? 1.7 : 0;
    return tween({
      duration: CONFIG.anim.doorSwing,
      ease: open ? Ease.quadOut : Ease.backOut,
      onUpdate: (t) => { door.rotation.y = lerp(from, to, t); },
    }).promise;
  }

  group.add(stationSign('FRIDGE', H + 0.34));

  // Stock the shelves so the open fridge looks full. This clutter sits at the
  // back of the top two glass shelves, behind where the round's real items are
  // grounded, so it never lands where a fetchable item goes.
  const [topY, midY] = SHELF_Y;
  [topY, midY].forEach((by, r) => {
    for (let c = 0; c < 3; c++) {
      group.add(canister((c - 1) * 0.42, by, -0.26, 0.12, 0.26 - (c % 2) * 0.06, DECO[(r * 3 + c) % DECO.length]));
    }
  });

  // pull-out crisper drawer at the very bottom, with a few vegetables in it
  const drawer = new THREE.MeshLambertMaterial({ color: 0xe6eef6, transparent: true, opacity: 0.55, flatShading: true });
  group.add(box(W - 0.24, 0.36, D - 0.3, drawer, 0, 0.42, 0.05));
  group.add(box(W - 0.24, 0.05, 0.03, steelDk(), 0, 0.42, shelfFront)); // drawer lip
  [[-0.32, 0xe4573b], [0, 0x6fae5b], [0.32, 0xf2b134], [0.16, 0xd98f3d]].forEach(([x, c]) => {
    const veg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), decoMat(c));
    veg.position.set(x, 0.5, 0.05);
    group.add(veg);
  });

  // items are grounded on the three shelf surfaces, 3 across
  const slot = gridSlot(3, 0.45, (x, row) => new THREE.Vector3(x, SHELF_Y[Math.min(row, 2)], 0.08));

  return { group, slot, setOpen };
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

  // 3 across, on the two board surfaces (grounded on top). Spacing is tighter
  // than the boards are wide so the spread plus its name tags stays on screen.
  const PY = [2.88, 2.10];
  const slot = gridSlot(3, 0.6, (x, row) => new THREE.Vector3(x, PY[Math.min(row, 1)], 0.34));

  return { group, slot, setOpen: () => Promise.resolve() };
}

// ================================================================ api ===
/**
 * Camera framings, in world space.
 *
 * `wide` is the only one the game uses now: it is angled in close enough that
 * every name tag at both stations is readable without tapping into a station,
 * while still keeping the counter, the bowl and the whole chef in shot. Moving
 * it further out shrinks the tags past legibility, so change it with care.
 */
export const FRAMING = {
  wide:    { pos: new THREE.Vector3(-0.4, 4.3, 5.6),  target: new THREE.Vector3(-0.4, 2.25, -3.2) },
};

/** Where the chef stands to work each station. */
export const CHEF_X = {
  fridge: -2.05,
  pantry: 0.75,
  counter: -0.4, // in front of the bowl on the back counter
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
