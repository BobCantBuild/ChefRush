import * as THREE from '../../vendor/three.module.js';
import { CONFIG } from '../config.js';
import { Ease, lerp, tween } from '../util/anim.js';
import { blendColors, createIngredientMesh } from './ingredientMesh.js';
import { createContactShadow } from './kitchen.js';

/** Left end of the back counter, where the chef preps the mixing bowl. */
export const BOWL_HOME = new THREE.Vector3(-0.4, 1.03, -2.6);
/** The bowl is authored at radius ~1; the kitchen needs it much smaller. */
export const BOWL_SCALE = 0.42;

/** Where the nth ingredient sits inside the bowl — a loose outward spiral. */
function slotPosition(index) {
  if (index === 0) return new THREE.Vector3(0, 0.34, 0);
  const ring = Math.floor((index - 1) / 5);
  const step = (index - 1) % 5;
  const angle = step * ((Math.PI * 2) / 5) + ring * 0.7;
  const radius = 0.36 + ring * 0.06;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    0.32 + ring * 0.22,
    Math.sin(angle) * radius,
  );
}

export function createBowl() {
  const group = new THREE.Group();
  group.position.copy(BOWL_HOME);
  group.scale.setScalar(BOWL_SCALE);

  const ceramic = new THREE.MeshLambertMaterial({
    color: 0xf4ece0,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.55, 0.72, 24, 1, true),
    ceramic,
  );
  body.position.y = 0.46;
  group.add(body);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.48, 0.14, 20),
    new THREE.MeshLambertMaterial({ color: 0xe4d8c6, flatShading: true }),
  );
  base.position.y = 0.13;
  group.add(base);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.055, 6, 24),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.82;
  group.add(rim);

  const contents = new THREE.Group();
  group.add(contents);

  const shadow = createContactShadow(1.5);
  shadow.position.y = 0.02;
  group.add(shadow);

  let batter = null;

  // --------------------------------------------------------------- api ---
  function reflow() {
    contents.children.forEach((mesh, i) => {
      const target = slotPosition(i);
      const from = mesh.position.clone();
      tween({
        duration: 240,
        ease: Ease.quadOut,
        onUpdate: (t) => mesh.position.lerpVectors(from, target, t),
      });
    });
  }

  /**
   * @param ing ingredient catalog entry
   * @param {THREE.Vector3} [fromWorld] where it is released (the chef's hand);
   *        defaults to straight above the bowl.
   */
  function add(ing, fromWorld) {
    const mesh = createIngredientMesh(ing);
    const target = slotPosition(contents.children.length);

    const start = fromWorld
      ? group.worldToLocal(fromWorld.clone())
      : new THREE.Vector3(0, 2.4, 0.6);
    mesh.position.copy(start);
    contents.add(mesh);

    const spin = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
    );
    const baseScale = mesh.userData.baseScale;

    return tween({
      duration: CONFIG.anim.ingredientDrop,
      ease: Ease.linear,
      onUpdate: (t) => {
        mesh.position.lerpVectors(start, target, t);
        mesh.position.y += 4 * t * (1 - t) * 0.7; // parabolic arc
        mesh.rotation.x += spin.x * 0.016;
        mesh.rotation.y += spin.y * 0.016;
        mesh.rotation.z += spin.z * 0.016;
      },
      onComplete: () => {
        // Squash-and-stretch landing.
        tween({
          duration: 340,
          ease: Ease.elasticOut,
          onUpdate: (t) => {
            const squash = lerp(0.55, 1, t);
            mesh.scale.set(
              baseScale * lerp(1.35, 1, t),
              baseScale * squash,
              baseScale * lerp(1.35, 1, t),
            );
          },
        });
      },
    }).promise;
  }

  function remove(id) {
    const mesh = contents.children.find((m) => m.userData.ingredientId === id);
    if (!mesh) return Promise.resolve();

    const from = mesh.position.clone();
    const baseScale = mesh.userData.baseScale;
    return tween({
      duration: CONFIG.anim.ingredientRemove,
      ease: Ease.quadOut,
      onUpdate: (t) => {
        mesh.position.set(from.x, from.y + t * 1.4, from.z + t * 0.9);
        mesh.scale.setScalar(baseScale * (1 - t));
      },
      onComplete: () => {
        contents.remove(mesh);
        reflow();
      },
    }).promise;
  }

  function clear() {
    contents.clear();
    if (batter) {
      group.remove(batter);
      batter = null;
    }
    group.rotation.y = 0;
    group.position.copy(BOWL_HOME);
    group.scale.setScalar(BOWL_SCALE);
    shadow.visible = true;
  }

  /** Spin, converge the contents, then swap them for a single blended batter. */
  function mix(ingredients) {
    const blended = blendColors(ingredients);
    const meshes = [...contents.children];
    const starts = meshes.map((m) => m.position.clone());
    const startColors = meshes.map((m) => m.material.color.clone());

    return tween({
      duration: CONFIG.anim.mix,
      ease: Ease.linear,
      onUpdate: (t) => {
        // Spin fast, then ease to a stop.
        group.rotation.y = Math.sin(t * Math.PI) * 14 * (1 - t * 0.35) * t;

        const converge = Ease.quadInOut(Math.min(1, t / 0.85));
        meshes.forEach((mesh, i) => {
          mesh.position.set(
            lerp(starts[i].x, 0, converge),
            lerp(starts[i].y, 0.3, converge),
            lerp(starts[i].z, 0, converge),
          );
          mesh.material.color.copy(startColors[i]).lerp(blended, converge);
          if (t > 0.85) {
            const fade = (t - 0.85) / 0.15;
            mesh.scale.setScalar(mesh.userData.baseScale * (1 - fade));
          }
        });
      },
      onComplete: () => {
        contents.clear();
        batter = new THREE.Mesh(
          new THREE.CylinderGeometry(0.74, 0.56, 0.34, 20),
          new THREE.MeshLambertMaterial({ color: blended, flatShading: true }),
        );
        batter.position.y = 0.34;
        group.add(batter);
        group.rotation.y = 0;

        tween({
          duration: 320,
          ease: Ease.backOut,
          onUpdate: (t) => batter.scale.set(1, lerp(0.2, 1, t), 1),
        });
      },
    }).promise;
  }

  /** Fly the bowl from the counter into the oven. */
  function travelTo(target) {
    const from = group.position.clone();
    shadow.visible = false;
    return tween({
      duration: CONFIG.anim.bowlToOven,
      ease: Ease.quadInOut,
      onUpdate: (t) => {
        group.position.lerpVectors(from, target, t);
        group.position.y += Math.sin(Math.PI * t) * 0.5; // lift over the rim
        group.scale.setScalar(lerp(BOWL_SCALE, BOWL_SCALE * 0.8, t));
      },
    }).promise;
  }

  function getBlend(ingredients) {
    return blendColors(ingredients);
  }

  return { group, add, remove, clear, mix, travelTo, getBlend, contents };
}
