import * as THREE from '../../vendor/three.module.js';
import { Ease, lerp, tween } from '../util/anim.js';

// A simple, clean kitchen character built from primitives in the same
// flat-shaded style as the food: chef whites, an apron, a toque and a plain
// friendly face. Reaching points the whole arm at a target rather than solving
// IK — at this scale it looks the same and costs nothing.

export const CHARACTERS = {
  female: {
    id: 'female', label: 'Ava', icon: '👩‍🍳',
    skin: 0xe8b48c, hair: 0x3a2318, apron: 0xef5f8c, shirt: 0xfdf4e8,
    shoulders: 0.44, hairStyle: 'long',
  },
  male: {
    id: 'male', label: 'Leo', icon: '👨‍🍳',
    skin: 0xd99b6c, hair: 0x241a12, apron: 0x3d8bd6, shirt: 0xfdf4e8,
    shoulders: 0.52, hairStyle: 'short',
  },
};

// Far enough back in the aisle that the island top does not clip the chef's
// legs from the wide camera.
const REST_Z = -1.95;
const REST_X = -0.85;
const ARM_LEN = 0.78;

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const darken = (hex, f = 0.8) => new THREE.Color(hex).multiplyScalar(f).getHex();

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

function ball(r, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), m);
  mesh.position.set(x, y, z);
  return mesh;
}

/** One leg as a group pivoted at the hip, so the whole leg + shoe swings. */
function buildLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.17, 0.72, 0);
  hip.add(box(0.2, 0.66, 0.22, mat(0x3b3350), 0, -0.33, 0));      // trouser
  hip.add(box(0.24, 0.14, 0.34, mat(0x2a2530), 0, -0.69, 0.05));  // shoe
  return hip;
}

/** One arm as a group hanging down local -Y from a rounded shoulder. */
function buildArm(preset, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * preset.shoulders, 1.42, 0);
  pivot.add(ball(0.15, mat(preset.shirt), 0, 0, 0));               // rounded shoulder
  pivot.add(box(0.17, 0.42, 0.17, mat(preset.shirt), 0, -0.24, 0)); // sleeve
  pivot.add(box(0.15, 0.24, 0.15, mat(preset.skin), 0, -0.58, 0));  // forearm
  const hand = ball(0.12, mat(preset.skin), 0, -ARM_LEN, 0);
  pivot.add(hand);
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

  // legs (pivot at the hip so the swing looks like a stride)
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  body.add(legL, legR);

  // torso in chef whites
  body.add(box(preset.shoulders * 1.9, 0.76, 0.36, mat(preset.shirt), 0, 1.07, 0));

  // apron: one front panel with a waist tie and shoulder straps
  const apronMat = mat(preset.apron);
  body.add(box(preset.shoulders * 1.5, 0.92, 0.05, apronMat, 0, 0.98, 0.19));
  body.add(box(preset.shoulders * 1.95, 0.1, 0.38, mat(darken(preset.apron, 0.72)), 0, 0.92, 0));
  body.add(box(0.09, 0.36, 0.04, apronMat, -0.14, 1.4, 0.19));
  body.add(box(0.09, 0.36, 0.04, apronMat, 0.14, 1.4, 0.19));

  // neck
  body.add(box(0.17, 0.16, 0.17, mat(preset.skin), 0, 1.55, 0));

  // head + a plain friendly face
  const head = new THREE.Group();
  head.position.y = 1.82;
  body.add(head);
  head.add(ball(0.27, mat(preset.skin)));

  const eyeMat = mat(0x2a2018);
  head.add(ball(0.045, eyeMat, -0.1, 0.03, 0.25));
  head.add(ball(0.045, eyeMat, 0.1, 0.03, 0.25));
  head.add(box(0.1, 0.025, 0.02, mat(0x7a4a3a), 0, -0.08, 0.255)); // small mouth

  // hair
  if (preset.hairStyle === 'long') {
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(preset.hair)));
    head.add(box(0.46, 0.44, 0.26, mat(preset.hair), 0, -0.16, -0.1));
  } else {
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.46), mat(preset.hair)));
  }

  // chef's toque: a band with a soft puffy crown
  const white = mat(0xffffff);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.16, 14), white);
  band.position.y = 0.3;
  head.add(band);
  const puff = ball(0.3, white, 0, 0.46, 0);
  puff.scale.set(1, 0.82, 1);
  head.add(puff);

  // arms
  const armL = buildArm(preset, -1);
  const armR = buildArm(preset, 1);
  body.add(armL, armR);

  const restQuat = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const UP_DOWN = new THREE.Vector3(0, -1, 0);
  let bobT = 0;
  let walking = false;
  let posed = false; // true while an arm is aimed (reaching / carrying)

  // ------------------------------------------------------------- api ---
  function update(dtMs) {
    bobT += dtMs;

    if (walking) {
      // one phase drives both the stride and a bounce that peaks on each step
      const p = bobT * 0.017;
      const sw = Math.sin(p);
      body.position.y = Math.abs(sw) * 0.05;
      body.rotation.x = 0.05;
      legL.rotation.x = sw * 0.5;
      legR.rotation.x = -sw * 0.5;
      if (!posed) {
        armL.rotation.x = -sw * 0.85;
        armR.rotation.x = sw * 0.85;
      }
    } else {
      // gentle idle breathing
      body.position.y = Math.sin(bobT * 0.0045) * 0.012;
      body.rotation.x = 0;
    }
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
      onComplete: () => {
        walking = false;
        body.rotation.x = 0;
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        if (!posed) { armL.rotation.x = 0; armR.rotation.x = 0; }
      },
    }).promise;
  }

  /** Points the right arm at a world-space target. */
  function reachAt(worldTarget, ms = 220) {
    posed = true;
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
    posed = false;
    const from = armR.quaternion.clone();
    return tween({
      duration: ms,
      ease: Ease.quadOut,
      onUpdate: (t) => { armR.quaternion.copy(from).slerp(restQuat, t); },
    }).promise;
  }

  /** Both arms up, used when carrying the bowl to the microwave. */
  function carryPose(ms = 260) {
    posed = true;
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
    posed = false;
    armL.quaternion.copy(restQuat);
    armR.quaternion.copy(restQuat);
    armL.rotation.x = 0;
    armR.rotation.x = 0;
    root.position.set(REST_X, 0, REST_Z);
    body.position.y = 0;
    body.rotation.x = 0;
    walking = false;
  }

  return { root, update, moveTo, reachAt, lowerArm, carryPose, resetPose, handWorld, preset };
}
