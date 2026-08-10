import * as THREE from '../../vendor/three.module.js';
import { Ease, tween } from '../util/anim.js';
import { FRAMING } from './stations.js';

// Owns where the camera is looking. Framings are declared in stations.js;
// this just glides between them and keeps lookAt applied.

export function createCameraRig(camera) {
  const target = FRAMING.wide.target.clone();
  camera.position.copy(FRAMING.wide.pos);
  camera.lookAt(target);

  let current = 'wide';
  let move = null;

  function apply() {
    camera.lookAt(target);
  }

  /**
   * @param {keyof FRAMING} name
   * @returns {Promise<void>}
   */
  function moveTo(name, ms = 520) {
    const framing = FRAMING[name];
    if (!framing) return Promise.resolve();
    if (current === name && !move) return Promise.resolve();

    current = name;
    if (move) move.cancel();

    const fromPos = camera.position.clone();
    const fromTarget = target.clone();

    move = tween({
      duration: ms,
      ease: Ease.quadInOut,
      onUpdate: (t) => {
        camera.position.lerpVectors(fromPos, framing.pos, t);
        target.lerpVectors(fromTarget, framing.target, t);
        apply();
      },
      onComplete: () => { move = null; },
    });
    return move.promise;
  }

  function snapTo(name) {
    const framing = FRAMING[name];
    if (!framing) return;
    if (move) { move.cancel(); move = null; }
    current = name;
    camera.position.copy(framing.pos);
    target.copy(framing.target);
    apply();
  }

  return {
    moveTo,
    snapTo,
    apply,
    get current() { return current; },
    isWide: () => current === 'wide',
  };
}
