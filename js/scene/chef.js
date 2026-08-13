import * as THREE from '../../vendor/three.module.js';
import { Ease, lerp, tween } from '../util/anim.js';

// A simple kitchen character built from primitives in the same flat-shaded
// style as the food. The chef turns on the spot to face where they are walking
// and what they are reaching for, so they read as moving through the kitchen
// rather than sliding sideways.
//
// Yaw convention: the face is built on +Z, so rotation.y = 0 faces the camera.

export const FACE = {
  camera: 0,
  shelf: Math.PI,      // the back wall, where both stations live
  right: Math.PI / 2,
  left: -Math.PI / 2,
};

export const CHARACTERS = {
  female: {
    id: 'female', label: 'Ava', icon: '👩‍🍳',
    skin: 0xe8b48c, hair: 0x3a2318, apron: 0xef5f8c, shirt: 0xfdf4e8,
    shoulders: 0.42, build: 0.95, hairStyle: 'bun',
  },
  male: {
    id: 'male', label: 'Leo', icon: '👨‍🍳',
    skin: 0xd99b6c, hair: 0x241a12, apron: 0x3d8bd6, shirt: 0xfdf4e8,
    shoulders: 0.56, build: 1.06, hairStyle: 'short',
  },
};

// The chef works just in front of the counter (nothing blocks the view now
// that the island is gone), and reaches back to the counter and the stations.
const REST_Z = -1.6;
const REST_X = -0.4;
const ARM_LEN = 0.78;
const TWO_PI = Math.PI * 2;

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
  body.scale.setScalar(preset.build);
  root.add(body);

  // legs (pivot at the hip so the swing looks like a stride)
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  body.add(legL, legR);

  // torso: a white double-breasted chef's coat
  const shirtMat = mat(preset.shirt);
  const w = preset.shoulders * 1.9;
  body.add(box(w, 0.78, 0.36, shirtMat, 0, 1.08, 0));
  // coat overlap seam down the centre and two rows of buttons
  body.add(box(0.06, 0.7, 0.03, mat(darken(preset.shirt, 0.9)), 0, 1.1, 0.185));
  const buttonMat = mat(darken(preset.apron, 0.7));
  for (let r = 0; r < 3; r++) {
    const y = 1.34 - r * 0.19;
    body.add(ball(0.028, buttonMat, -0.1, y, 0.19));
    body.add(ball(0.028, buttonMat, 0.1, y, 0.19));
  }
  // collar
  body.add(box(0.34, 0.1, 0.34, shirtMat, 0, 1.5, 0));

  // waist apron over the lower half of the coat
  const apronMat = mat(preset.apron);
  body.add(box(preset.shoulders * 1.7, 0.5, 0.05, apronMat, 0, 0.68, 0.19));
  body.add(box(preset.shoulders * 1.95, 0.1, 0.38, mat(darken(preset.apron, 0.72)), 0, 0.92, 0));

  // neck
  body.add(box(0.17, 0.14, 0.17, mat(preset.skin), 0, 1.56, 0));

  // head + a plain friendly face
  const head = new THREE.Group();
  head.position.y = 1.82;
  body.add(head);
  head.add(ball(0.27, mat(preset.skin)));

  const eyeMat = mat(0x2a2018);
  head.add(ball(0.045, eyeMat, -0.1, 0.03, 0.25));
  head.add(ball(0.045, eyeMat, 0.1, 0.03, 0.25));
  head.add(box(0.1, 0.025, 0.02, mat(0x7a4a3a), 0, -0.08, 0.255)); // small mouth

  // hair — the clearest way to tell the two characters apart at a glance
  const hairMat = mat(preset.hair);
  if (preset.hairStyle === 'bun') {
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, TWO_PI, 0, Math.PI * 0.6), hairMat));
    head.add(box(0.42, 0.3, 0.22, hairMat, 0, -0.13, -0.11)); // nape
    head.add(ball(0.15, hairMat, 0, 0.06, -0.29));            // bun at the back
  } else {
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 9, 0, TWO_PI, 0, Math.PI * 0.44), hairMat));
    head.add(box(0.04, 0.16, 0.16, hairMat, -0.25, 0.0, 0.04)); // sideburns
    head.add(box(0.04, 0.16, 0.16, hairMat, 0.25, 0.0, 0.04));
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
  let turn = null;

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

  /** Turns the whole chef on the spot to a yaw, always the short way round. */
  function turnTo(yaw, ms = 180) {
    const from = root.rotation.y;
    let delta = (yaw - from) % TWO_PI;
    if (delta > Math.PI) delta -= TWO_PI;
    if (delta < -Math.PI) delta += TWO_PI;
    if (Math.abs(delta) < 0.02) return Promise.resolve();

    if (turn) turn.cancel();
    turn = tween({
      duration: ms,
      ease: Ease.quadOut,
      onUpdate: (t) => { root.rotation.y = from + delta * t; },
      onComplete: () => { turn = null; },
    });
    return turn.promise;
  }

  function moveTo(x, ms = 320) {
    const from = root.position.x;
    const dist = x - from;
    if (Math.abs(dist) < 0.02) return Promise.resolve();

    // Face the way we're about to walk. Deliberately not awaited: the turn
    // plays over the first part of the stride instead of stalling it.
    turnTo(dist > 0 ? FACE.right : FACE.left, Math.min(170, ms * 0.5));

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
    const goalWorld = new THREE.Quaternion().setFromUnitVectors(UP_DOWN, tmpV);

    // armR.quaternion is relative to its parent, so strip the parent's world
    // rotation — without this, turning the chef swings every reach off target.
    const parentInv = armR.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const goal = parentInv.multiply(goalWorld);

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
    if (turn) { turn.cancel(); turn = null; }
    armL.quaternion.copy(restQuat);
    armR.quaternion.copy(restQuat);
    armL.rotation.x = 0;
    armR.rotation.x = 0;
    root.position.set(REST_X, 0, REST_Z);
    root.rotation.y = FACE.camera;
    body.position.y = 0;
    body.rotation.x = 0;
    walking = false;
  }

  return { root, update, moveTo, turnTo, reachAt, lowerArm, carryPose, resetPose, handWorld, preset };
}
