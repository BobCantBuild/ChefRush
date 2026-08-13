import * as THREE from '../../vendor/three.module.js';

// The room itself: floor, back wall, the two counter runs and upper cabinets.
// Stations, chef, bowl and microwave are added separately on top of this.

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// A warm, bright kitchen palette: sage cabinetry, honey-wood floor, cream
// walls, a butcher-block worktop and a cream-tiled splashback.
const FLOOR   = 0x9c6a3c;
const WALL    = 0xece0c6;
const TILE    = 0xf4ecdb;
const CABINET = 0x9fb083;
const WORKTOP = 0xcaa063;
const KNOB    = 0xcbd0d8;

export function createKitchen() {
  const group = new THREE.Group();

  const counterBase = lambert(CABINET);
  const counterTop = lambert(WORKTOP);

  // honey-wood floor + cream back wall, with a warm skirting band
  group.add(box(16, 0.3, 13, lambert(FLOOR), 0, -0.15, -0.5));
  group.add(box(16, 8, 0.3, lambert(WALL), 0, 4, -4.7));
  group.add(box(16, 0.4, 0.14, lambert(0xd8c7a6), 0, 0.2, -4.5)); // skirting

  // tiled splashback — two rows so the wall behind the worktop reads as tiled
  const tile = lambert(TILE);
  const grout = lambert(0xd7ccb6);
  for (let row = 0; row < 2; row++) {
    const y = 1.5 + row * 0.78;
    group.add(box(9.0, 0.76, 0.06, grout, 0.4, y, -4.53)); // grout backing
    for (let i = -4; i <= 5; i++) {
      group.add(box(0.72, 0.72, 0.1, tile, i * 0.8, y, -4.5));
    }
  }

  // The one work counter: the chef preps the bowl at the left end, the
  // microwave sits at the right. (The old front island is gone, so nothing
  // stands between the camera and the chef any more.) Its left edge stops
  // short of the free-standing fridge over at x = -2.05.
  group.add(box(4.8, 1.0, 1.3, counterBase, 1.3, 0.5, -3.0));
  group.add(box(4.9, 0.12, 1.4, counterTop, 1.3, 1.03, -3.0));
  addKnobs(group, 1.3, 4.8, -2.34);

  // upper cabinets with little steel knobs
  const cab = lambert(CABINET);
  group.add(box(4.6, 1.2, 0.55, cab, 1.4, 4.15, -4.35));
  for (let i = 0; i < 3; i++) {
    group.add(box(0.08, 0.18, 0.09, lambert(KNOB), 0.1 + i * 1.5, 3.62, -4.05));
  }

  return group;
}

/** A row of small knobs across the front of a base-cabinet run. */
function addKnobs(group, centerX, width, z) {
  const n = Math.max(2, Math.round(width / 1.2));
  for (let i = 0; i < n; i++) {
    const x = centerX - width / 2 + (width / n) * (i + 0.5);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lambert(KNOB));
    knob.position.set(x, 0.72, z);
    group.add(knob);
  }
}

/** Soft dark ellipse used instead of a shadow map. */
export function createContactShadow(radius = 1.1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.11;
  return mesh;
}
