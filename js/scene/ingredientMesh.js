import * as THREE from '../../vendor/three.module.js';

// Ingredients are generated from primitives rather than loaded from models:
// no asset pipeline, no licensing, and a new ingredient costs one data entry.
// Geometries are shared across every instance of a shape; only materials vary.

const GEOMETRIES = {
  sphere:   () => new THREE.SphereGeometry(0.5, 12, 9),
  cube:     () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
  cylinder: () => new THREE.CylinderGeometry(0.4, 0.4, 0.85, 12),
  cone:     () => new THREE.ConeGeometry(0.45, 1.0, 10),
  torus:    () => new THREE.TorusGeometry(0.36, 0.17, 8, 14),
  slab:     () => new THREE.BoxGeometry(0.95, 0.24, 0.7),
};

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
    matCache.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  }
  return matCache.get(color);
}

/**
 * @param {object} ing entry from data/ingredients.js
 * @returns {THREE.Mesh} with `userData.ingredientId` set
 */
export function createIngredientMesh(ing) {
  const mesh = new THREE.Mesh(geometryFor(ing.shape), materialFor(ing.color).clone());
  const s = (ing.scale ?? 1) * 0.42;
  mesh.scale.setScalar(s);
  mesh.userData.ingredientId = ing.id;
  mesh.userData.baseScale = s;
  // A little random tilt so a bowlful never looks like a stack of clones.
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
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
