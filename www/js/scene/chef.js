import * as THREE from '../../vendor/three.module.js';
import { Ease, lerp, tween } from '../util/anim.js';

// The chef is assembled from primitives in the same flat-shaded style as the
// food, but rounded off — sphere shoulders, a real face, a neckerchief and
// shoes — so it reads as a friendly kitchen character rather than a blocky
// robot. Reaching points the whole arm at a target rather than solving IK; at
// this scale it looks the same and costs nothing.

export const CHARACTERS = {
  female: {
    id: 'female', label: 'Ava', icon: '👩‍🍳',
    skin: 0xe8b48c, hair: 0x3a2318, apron: 0xef5f8c, shirt: 0xfdf4e8,
    scarf: 0xe4573b, shoulders: 0.44, hairStyle: 'long',
  },
  male: {
    id: 'male', label: 'Leo', icon: '👨‍🍳',
    skin: 0xd99b6c, hair: 0x241a12, apron: 0x3d8bd6, shirt: 0xfdf4e8,
    scarf: 0xd23b32, shoulders: 0.52, hairStyle: 'short',
  },
};

// Far enough back in the aisle that the island top does not clip the chef's
// legs from the wide camera.
const REST_Z = -1.95;
const REST_X = -0.85;
const ARM_LEN = 0.78;

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const darken = (hex, f = 0.82) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
};

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
  hip.add(box(0.2, 0.66, 0.22, mat(0x3b3350), 0, -0.33, 0));       // trouser
  hip.add(box(0.24, 0.14, 0.34, mat(0x2a2530), 0, -0.69, 0.05));   // shoe
  return hip;
}

/** One arm as a group hanging down local -Y from a rounded shoulder. */
function buildArm(preset, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * preset.shoulders, 1.42, 0);

  pivot.add(ball(0.15, mat(preset.shirt), 0, 0, 0));               // shoulder cap
  pivot.add(box(0.17, 0.32, 0.17, mat(preset.shirt), 0, -0.2, 0)); // sleeve
  pivot.add(box(0.155, 0.12, 0.155, mat(darken(preset.shirt, 0.9)), 0, -0.4, 0)); // rolled cuff
  pivot.add(box(0.15, 0.24, 0.15, mat(preset.skin), 0, -0.58, 0)); // forearm
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

  // torso in chef whites, with a soft rounded belly to break up the box
  body.add(box(preset.shoulders * 1.9, 0.74, 0.36, mat(preset.shirt), 0, 1.07, 0));
  const belly = ball(0.32, mat(preset.shirt), 0, 0.82, 0.04);
  belly.scale.set(1.25, 0.72, 1);
  body.add(belly);

  // apron: a bib over the chest and a skirt below the waist tie
  const apronMat = mat(preset.apron);
  body.add(box(preset.shoulders * 1.15, 0.44, 0.05, apronMat, 0, 1.2, 0.2));   // bib
  body.add(box(preset.shoulders * 1.7, 0.5, 0.06, apronMat, 0, 0.72, 0.2));    // skirt
  body.add(box(preset.shoulders * 1.95, 0.11, 0.38, mat(darken(preset.apron, 0.75)), 0, 0.98, 0)); // waist tie
  body.add(box(0.09, 0.34, 0.04, apronMat, -0.14, 1.42, 0.19)); // strap L
  body.add(box(0.09, 0.34, 0.04, apronMat, 0.14, 1.42, 0.19));  // strap R

  // neckerchief (the classic chef's scarf) + a little knot at the throat
  const scarfMat = mat(preset.scarf);
  body.add(box(preset.shoulders * 1.35, 0.13, 0.38, scarfMat, 0, 1.45, 0));
  body.add(box(0.12, 0.12, 0.08, scarfMat, 0, 1.4, 0.22));

  // neck
  body.add(box(0.17, 0.16, 0.17, mat(preset.skin), 0, 1.55, 0));

  // head
  const head = new THREE.Group();
  head.position.y = 1.82;
  body.add(head);
  head.add(ball(0.27, mat(preset.skin)));

  // face — eyes, brows and a smile turn it from a mannequin into a person
  const eyeMat = mat(0x2a2018);
  const eyeWhite = mat(0xfbfbf7);
  [-1, 1].forEach((s) => {
    head.add(ball(0.06, eyeWhite, s * 0.1, 0.03, 0.25));
    head.add(ball(0.032, eyeMat, s * 0.1, 0.03, 0.29));
    head.add(box(0.09, 0.02, 0.02, mat(darken(preset.hair, 0.9)), s * 0.1, 0.11, 0.27)); // brow
  });
  // rosy cheeks
  [-1, 1].forEach((s) => head.add(ball(0.055, mat(0xe89b8f), s * 0.17, -0.05, 0.22)));
  // smile: the lower half of a thin torus, facing the camera
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 12, Math.PI), mat(0x7a3b2f));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.07, 0.25);
  head.add(smile);

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

    // vertical bob + a slight forward lean while striding
    const amp = walking ? 0.06 : 0.018;
    const speed = walking ? 0.014 : 0.004;
    body.position.y = Math.abs(Math.sin(bobT * speed)) * amp;
    body.rotation.x = walking ? 0.06 : 0;

    const swing = walking ? Math.sin(bobT * 0.014) * 0.5 : 0;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;

    // arms swing counter to the legs, but only when they aren't holding
    // something — a hand carrying an item stays where it was aimed.
    if (!posed) {
      armL.rotation.x = -swing * 0.9;
      armR.rotation.x = swing * 0.9;
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
