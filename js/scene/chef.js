import * as THREE from '../../vendor/three.module.js';
import { Ease, lerp, tween } from '../util/anim.js';

// The chef is assembled from primitives in the same flat-shaded style as the
// food. Reaching is done by pointing the whole arm at a target rather than
// solving IK — at this scale it reads exactly the same and costs nothing.

export const CHARACTERS = {
  female: {
    id: 'female', label: 'Ava', icon: '👩‍🍳',
    skin: 0xe8b48c, hair: 0x3a2318, apron: 0xef5f8c, shirt: 0xfdf4e8,
    shoulders: 0.46, hairStyle: 'long',
  },
  male: {
    id: 'male', label: 'Leo', icon: '👨‍🍳',
    skin: 0xd99b6c, hair: 0x241a12, apron: 0x3d8bd6, shirt: 0xfdf4e8,
    shoulders: 0.54, hairStyle: 'short',
  },
};

// Far enough back in the aisle that the island top does not clip the chef's
// legs from the wide camera.
const REST_Z = -1.95;
const REST_X = -0.85;
const ARM_LEN = 0.78;

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Builds one arm as a group that hangs down along local -Y from the shoulder. */
function buildArm(preset, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * preset.shoulders, 1.42, 0);

  const sleeve = box(0.17, 0.34, 0.17, mat(preset.shirt), 0, -0.17, 0);
  const fore = box(0.15, 0.34, 0.15, mat(preset.skin), 0, -0.51, 0);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(preset.skin));
  hand.position.y = -ARM_LEN;

  pivot.add(sleeve, fore, hand);
  pivot.userData.hand = hand;
  return pivot;
}

export function createChef(characterId = 'female') {
  const preset = CHARACTERS[characterId] || CHARACTERS.female;

  const root = new THREE.Group();
  root.name = 'chef';
  root.position.set(REST_X, 0, REST_Z);

  const body = new THREE.Group(); // everything that bobs
  root.add(body);

  // legs
  const legMat = mat(0x3b3350);
  const legL = box(0.19, 0.72, 0.21, legMat, -0.17, 0.36, 0);
  const legR = box(0.19, 0.72, 0.21, legMat, 0.17, 0.36, 0);
  body.add(legL, legR);

  // torso + apron
  body.add(box(preset.shoulders * 1.9, 0.76, 0.34, mat(preset.shirt), 0, 1.08, 0));
  body.add(box(preset.shoulders * 1.6, 0.62, 0.06, mat(preset.apron), 0, 0.95, 0.19));
  body.add(box(0.1, 0.34, 0.04, mat(preset.apron), -0.14, 1.38, 0.18));
  body.add(box(0.1, 0.34, 0.04, mat(preset.apron), 0.14, 1.38, 0.18));

  // head
  const head = new THREE.Group();
  head.position.y = 1.78;
  body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 9), mat(preset.skin)));

  if (preset.hairStyle === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(preset.hair));
    head.add(cap);
    head.add(box(0.44, 0.42, 0.26, mat(preset.hair), 0, -0.16, -0.09));
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.48), mat(preset.hair));
    head.add(cap);
  }

  // chef's hat
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.34, 12), mat(0xffffff));
  hat.position.y = 0.36;
  head.add(hat);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat(0xffffff)).translateY(0.52));

  // arms
  const armL = buildArm(preset, -1);
  const armR = buildArm(preset, 1);
  body.add(armL, armR);

  const restQuat = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const UP_DOWN = new THREE.Vector3(0, -1, 0);
  let bobT = 0;
  let walking = false;

  // ------------------------------------------------------------- api ---
  function update(dtMs) {
    bobT += dtMs;
    const amp = walking ? 0.055 : 0.018;
    const speed = walking ? 0.014 : 0.004;
    body.position.y = Math.sin(bobT * speed) * amp;
    const swing = walking ? Math.sin(bobT * 0.014) * 0.5 : 0;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
  }

  /** World position of the working (right) hand. */
  function handWorld() {
    return armR.userData.hand.getWorldPosition(new THREE.Vector3());
  }

  function moveTo(x, ms = 320) {
    const from = root.position.x;
    if (Math.abs(from - x) < 0.02) return Promise.resolve();
    walking = true;
    return tween({
      duration: ms,
      ease: Ease.quadInOut,
      onUpdate: (t) => { root.position.x = lerp(from, x, t); },
      onComplete: () => { walking = false; legL.rotation.x = 0; legR.rotation.x = 0; },
    }).promise;
  }

  /** Points the right arm at a world-space target. */
  function reachAt(worldTarget, ms = 220) {
    const shoulder = armR.getWorldPosition(new THREE.Vector3());
    tmpV.copy(worldTarget).sub(shoulder).normalize();
    const goal = new THREE.Quaternion().setFromUnitVectors(UP_DOWN, tmpV);
    const from = armR.quaternion.clone();
    return tween({
      duration: ms,
      ease: Ease.quadOut,
      onUpdate: (t) => { armR.quaternion.copy(from).slerp(goal, t); },
    }).promise;
  }

  function lowerArm(ms = 220) {
    const from = armR.quaternion.clone();
    return tween({
      duration: ms,
      ease: Ease.quadOut,
      onUpdate: (t) => { armR.quaternion.copy(from).slerp(restQuat, t); },
    }).promise;
  }

  /** Both arms up, used when carrying the bowl to the microwave. */
  function carryPose(ms = 260) {
    const goal = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.35, 0, 0));
    const fromL = armL.quaternion.clone();
    const fromR = armR.quaternion.clone();
    return tween({
      duration: ms,
      ease: Ease.quadOut,
      onUpdate: (t) => {
        armL.quaternion.copy(fromL).slerp(goal, t);
        armR.quaternion.copy(fromR).slerp(goal, t);
      },
    }).promise;
  }

  function resetPose() {
    armL.quaternion.copy(restQuat);
    armR.quaternion.copy(restQuat);
    root.position.set(REST_X, 0, REST_Z);
    body.position.y = 0;
    walking = false;
  }

  return { root, update, moveTo, reachAt, lowerArm, carryPose, resetPose, handWorld, preset };
}
