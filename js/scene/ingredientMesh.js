import * as THREE from '../../vendor/three.module.js';

// Ingredients are generated from primitives rather than loaded from models:
// no asset pipeline, no licensing, and a new ingredient costs one data entry.
// Geometries are shared across every instance of a shape; only materials vary.

// Smoother than before — enough segments that the rounded foods read as food
// rather than faceted blobs. Boxes keep hard edges; everything else is smooth.
const GEOMETRIES = {
  sphere:   () => new THREE.SphereGeometry(0.5, 20, 14),
  cube:     () => new THREE.BoxGeometry(0.78, 0.78, 0.78),
  cylinder: () => new THREE.CylinderGeometry(0.4, 0.4, 0.85, 20),
  cone:     () => new THREE.ConeGeometry(0.46, 1.0, 18),
  torus:    () => new THREE.TorusGeometry(0.34, 0.17, 12, 22),
  slab:     () => new THREE.BoxGeometry(0.95, 0.26, 0.7),
};

const SMOOTH = new Set(['sphere', 'cylinder', 'cone', 'torus']);

const geoCache = new Map();
const matCache = new Map();

function geometryFor(shape) {
  if (!geoCache.has(shape)) {
    const make = GEOMETRIES[shape] || GEOMETRIES.sphere;
    geoCache.set(shape, make());
  }
  return geoCache.get(shape);
}

function materialFor(color) {
  if (!matCache.has(color)) {
    // Smooth shading: the rounded foods catch a soft highlight instead of
    // looking faceted. Boxes keep their hard edges either way.
    matCache.set(color, new THREE.MeshLambertMaterial({ color, flatShading: false }));
  }
  return matCache.get(color);
}

/**
 * @param {object} ing entry from data/ingredients.js
 * @param {boolean} upright keep the item standing (shelf) vs tumbled (bowl)
 * @returns {THREE.Mesh} with `userData.ingredientId` set
 */
export function createIngredientMesh(ing, upright = false) {
  const mesh = new THREE.Mesh(geometryFor(ing.shape), materialFor(ing.color).clone());
  const s = (ing.scale ?? 1) * 0.42;
  mesh.scale.setScalar(s);
  mesh.userData.ingredientId = ing.id;
  mesh.userData.baseScale = s;

  if (upright) {
    // Standing on a shelf: just a spin and the faintest tilt, so a row of
    // items looks placed rather than dumped.
    mesh.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
  } else {
    // In the bowl: fully random so a bowlful never looks like a stack of clones.
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  }
  return mesh;
}

/** Weighted-average colour of a set of ingredients — tints the mixed batter. */
export function blendColors(ingredients) {
  const out = new THREE.Color(0, 0, 0);
  if (!ingredients.length) return new THREE.Color(0xcccccc);
  const tmp = new THREE.Color();
  for (const ing of ingredients) {
    tmp.setHex(ing.color);
    out.add(tmp);
  }
  out.multiplyScalar(1 / ingredients.length);
  return out;
}
