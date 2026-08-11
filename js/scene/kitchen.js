import * as THREE from '../../vendor/three.module.js';

// The room itself: floor, back wall, the two counter runs and upper cabinets.
// Stations, chef, bowl and microwave are added separately on top of this.

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function createKitchen() {
  const group = new THREE.Group();

  const counterBase = lambert(0x6d4a8f);
  const counterTop = lambert(0xc98a54);

  // floor + back wall
  group.add(box(16, 0.3, 13, lambert(0x4a3a63), 0, -0.15, -0.5));
  group.add(box(16, 8, 0.3, lambert(0x33254a), 0, 4, -4.7));

  // tiled splashback behind the back counter
  const tile = lambert(0x3e2d59);
  for (let i = -4; i <= 5; i++) {
    group.add(box(0.72, 0.72, 0.1, tile, i * 0.8, 1.5, -4.5));
  }

  // back counter run (the microwave sits on this)
  group.add(box(4.8, 1.0, 1.3, counterBase, 1.3, 0.5, -3.0));
  group.add(box(4.9, 0.12, 1.4, counterTop, 1.3, 1.03, -3.0));

  // Front island (the mixing bowl lives here). Kept shallow on purpose: a
  // deeper top surface cuts the camera's line of sight to the chef standing
  // behind it and hides them from the waist down.
  group.add(box(4.2, 1.0, 1.2, counterBase, -0.5, 0.5, 0.3));
  group.add(box(4.3, 0.12, 1.3, counterTop, -0.5, 1.03, 0.3));

  // upper cabinets
  const cab = lambert(0x5b4780);
  group.add(box(4.6, 1.2, 0.55, cab, 1.4, 4.15, -4.35));
  for (let i = 0; i < 3; i++) {
    group.add(box(0.06, 0.16, 0.08, lambert(0xd9dde4), 0.1 + i * 1.5, 3.62, -4.05));
  }

  return group;
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
