import * as THREE from '../../vendor/three.module.js';

// Tap targets are spheres tested directly against the camera ray. Keeping them
// as plain maths rather than invisible meshes means zero extra draw calls, and
// lets each target have a hit radius far larger than the item it represents —
// which is what makes small ingredients reliably tappable on a phone.

export function createPicker(camera, canvas) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const toPoint = new THREE.Vector3();
  let targets = [];

  function clear() {
    targets = [];
  }

  /**
   * @param {THREE.Vector3} position world-space centre
   * @param {number} radius generous hit radius, not the visual size
   * @param {*} payload returned by pickAt when hit
   */
  function addTarget(position, radius, payload) {
    targets.push({ pos: position.clone(), r: radius, payload });
  }

  /**
   * @returns {*|null} payload of the nearest target under the pointer
   */
  function pickAt(clientX, clientY) {
    if (!targets.length) return null;

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const { origin, direction } = raycaster.ray;
    let best = null;
    let bestDist = Infinity;

    for (const t of targets) {
      toPoint.copy(t.pos).sub(origin);
      const along = toPoint.dot(direction);
      if (along <= 0) continue; // behind the camera

      // perpendicular distance from the ray to the target centre
      const perpSq = toPoint.lengthSq() - along * along;
      if (perpSq > t.r * t.r) continue;

      if (along < bestDist) {
        bestDist = along;
        best = t.payload;
      }
    }
    return best;
  }

  return { clear, addTarget, pickAt, get count() { return targets.length; } };
}
