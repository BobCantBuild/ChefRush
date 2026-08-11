import * as THREE from '../../vendor/three.module.js';
import { CONFIG } from '../config.js';
import { Ease, lerp, tween } from '../util/anim.js';
import { createBrandPlate } from './label.js';

/** Sits on the back counter run, to the right of the pantry. */
export const OVEN_POS = new THREE.Vector3(2.25, 1.03, -3.0);
/** Authored at ~3.4 units wide; scaled down to fit the kitchen. */
export const OVEN_SCALE = 0.5;
/** Where the bowl parks inside the cavity, in world space. */
export const OVEN_INSIDE = new THREE.Vector3(2.09, 1.33, -2.92);

/** Renders a character (emoji) to a texture so it can be shown in 3D. */
function makeEmojiSprite(char, px = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.font = `${Math.floor(px * 0.78)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, px / 2, px / 2 + px * 0.04);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.setScalar(1.1);
  return sprite;
}

export function createOven() {
  const group = new THREE.Group();
  group.position.copy(OVEN_POS);
  group.scale.setScalar(OVEN_SCALE);

  const shellMat = new THREE.MeshLambertMaterial({ color: 0xd9dde4, flatShading: true });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 1.8), shellMat);
  shell.position.y = 1.0;
  group.add(shell);

  // Dark cavity, slightly inset so the door reads as a separate part.
  const cavityMat = new THREE.MeshLambertMaterial({ color: 0x1b1226, flatShading: true });
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 1.5), cavityMat);
  cavity.position.set(-0.32, 1.0, 0.16);
  group.add(cavity);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.6, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x413552, flatShading: true }),
  );
  panel.position.set(1.32, 1.0, 0.92);
  group.add(panel);

  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8),
      new THREE.MeshLambertMaterial({ color: 0xff7a3d, flatShading: true }),
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(1.32, 1.42 - i * 0.3, 0.96);
    group.add(btn);
  }

  // IFB brand plate above the control buttons. Fixed to the body (not the door)
  // so it stays put and readable while the microwave door swings.
  const brand = createBrandPlate('IFB', 0.34);
  brand.position.set(1.32, 1.66, 0.965);
  group.add(brand);

  // Door hinges on its left edge, so the pivot sits there rather than at centre.
  const door = new THREE.Group();
  door.position.set(-1.7, 1.0, 0.92);
  group.add(door);

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.7, 0.1), shellMat);
  doorPanel.position.x = 1.25;
  door.add(doorPanel);

  const window = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.2, 0.04),
    new THREE.MeshLambertMaterial({
      color: 0x2a1f3d,
      transparent: true,
      opacity: 0.72,
      flatShading: true,
    }),
  );
  window.position.set(1.15, 0, 0.06);
  door.add(window);

  const glow = new THREE.PointLight(0xffb347, 0, 4.5);
  glow.position.set(-0.3, 1.0, 0.1);
  group.add(glow);

  let isOpen = false;

  function swingDoor(open) {
    if (isOpen === open) return Promise.resolve();
    isOpen = open;
    const from = door.rotation.y;
    const to = open ? -1.95 : 0;
    return tween({
      duration: CONFIG.anim.doorSwing,
      ease: open ? Ease.quadOut : Ease.backOut,
      onUpdate: (t) => { door.rotation.y = lerp(from, to, t); },
    }).promise;
  }

  /** Warm pulsing light while the microwave runs. */
  function setCooking(active) {
    glow.userData.active = active;
    if (!active) glow.intensity = 0;
  }

  function update(elapsedMs) {
    if (glow.userData.active) {
      glow.intensity = 2.2 + Math.sin(elapsedMs * 0.012) * 0.9;
    }
  }

  /** The finished dish: a plate, a blob of food in the blended colour, emoji on top. */
  function createPlate(dish, blendColor) {
    const plate = new THREE.Group();

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.8, 0.1, 24),
      new THREE.MeshLambertMaterial({ color: 0xfbf6ee, flatShading: true }),
    );
    plate.add(disc);

    const food = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 10),
      new THREE.MeshLambertMaterial({ color: blendColor, flatShading: true }),
    );
    food.scale.set(1, 0.5, 1);
    food.position.y = 0.16;
    plate.add(food);

    const sprite = makeEmojiSprite(dish.icon);
    sprite.position.y = 0.62;
    plate.add(sprite);

    return plate;
  }

  return { group, swingDoor, setCooking, update, createPlate };
}
