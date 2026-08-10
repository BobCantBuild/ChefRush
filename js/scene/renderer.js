import * as THREE from '../../vendor/three.module.js';

export const BG_COLOR = 0x241b33;

let renderer, scene, camera, canvas;

export function initRenderer(canvasEl) {
  canvas = canvasEl;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  // Capping DPR is the single biggest win on mid-range phones: a 3x display
  // would otherwise cost ~2.25x the fragment work for no visible gain.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false; // grounded with a fake contact shadow instead

  scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 11, 22);

  camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 3.5, 6.4);
  camera.lookAt(0, 1.05, -0.2);

  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x30204a, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3.5, 7, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff9f6e, 0.55);
  rim.position.set(-4, 2.5, -4);
  scene.add(rim);

  return { scene, camera, renderer };
}

export function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);

  camera.aspect = w / h;
  // Portrait phones are narrow: widen the FOV so the counter still fits.
  camera.fov = camera.aspect < 0.7 ? 58 : 46;
  camera.updateProjectionMatrix();
}

export function render() {
  renderer.render(scene, camera);
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}
