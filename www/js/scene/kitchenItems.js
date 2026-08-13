import * as THREE from '../../vendor/three.module.js';
import { getIngredient, groupByStore } from '../data/ingredients.js';
import { Ease, tween } from '../util/anim.js';
import { createIngredientMesh } from './ingredientMesh.js';
import { createLabel } from './label.js';

// Places the current round's ingredients into their stations and owns their
// name tags. Items sit in world space so the picker and the chef's hand can
// both work with plain world coordinates.

const ITEM_SCALE = 0.62;
// Every name tag is visible at once from the fixed wide camera, so they have to
// stay legible at that distance rather than only when zoomed in.
const LABEL_H = 0.26;

export function createKitchenItems(scene, stations) {
  const group = new THREE.Group();
  scene.add(group);

  /** @type {Map<string, {mesh, label, store, home: THREE.Vector3, taken: boolean}>} */
  const items = new Map();

  function clear() {
    group.clear();
    items.clear();
  }

  /** @param {string[]} ids the round's shelf */
  function build(ids) {
    clear();
    const byStore = groupByStore(ids);

    for (const [store, list] of Object.entries(byStore)) {
      list.forEach((id, i) => {
        const ing = getIngredient(id);

        const mesh = createIngredientMesh(ing);
        mesh.scale.multiplyScalar(ITEM_SCALE);
        mesh.userData.baseScale *= ITEM_SCALE;

        const home = stations.slotWorld(store, i, list.length);
        mesh.position.copy(home);

        // Adjacent columns sit close together on screen but a long name like
        // "Strawberry" renders much wider, so neighbouring tags would collide.
        // Alternating their height keeps every name readable — which matters
        // more now that every tag is on screen at once.
        const stagger = (i % 2) * 0.15;
        const label = createLabel(ing.label, LABEL_H);
        // Fridge and pantry items stand upright on their shelves, so the tag
        // hangs just below each one.
        label.position.copy(home).add(new THREE.Vector3(0, -0.22 - stagger, 0.04));
        label.visible = true;

        group.add(mesh, label);
        items.set(id, { mesh, label, store, home: home.clone(), taken: false });
      });
    }
  }

  /**
   * Shows or hides every name tag at once. Tags stay up for the whole picking
   * phase — you can read the entire kitchen without tapping into a station —
   * and are hidden as a group while the dish is being cooked.
   */
  function setLabelsVisible(visible) {
    for (const it of items.values()) {
      it.label.visible = visible && !it.taken;
    }
  }

  function get(id) {
    return items.get(id);
  }

  /**
   * Registers every still-available item, at both stations, as a tap target.
   * The hit radius is generous: the camera stays in the fixed wide shot, so
   * items are small on screen and need a forgiving tap area. The picker
   * resolves overlaps in favour of the nearest, so neighbours aren't mis-hit.
   */
  function registerTargets(picker) {
    for (const [id, it] of items) {
      if (it.taken) continue;
      picker.addTarget(it.home, 0.34, { kind: 'ingredient', id });
    }
  }

  /** Lifts an item out of its slot; it is then driven by the chef's hand. */
  function take(id) {
    const it = items.get(id);
    if (!it || it.taken) return null;
    it.taken = true;
    it.label.visible = false;
    return it.mesh;
  }

  /** Puts an item back in its slot (player tapped it again to remove it). */
  function restore(id, showLabel = true) {
    const it = items.get(id);
    if (!it) return;
    it.taken = false;
    it.mesh.visible = true;
    it.mesh.position.copy(it.home);
    it.mesh.scale.setScalar(it.mesh.userData.baseScale);
    it.label.visible = !!showLabel;

    tween({
      duration: 260,
      ease: Ease.backOut,
      onUpdate: (t) => it.mesh.scale.setScalar(it.mesh.userData.baseScale * t),
    });
  }

  /** Hides an item once it has been dropped into the bowl. */
  function consume(id) {
    const it = items.get(id);
    if (!it) return;
    it.mesh.visible = false;
  }

  function storesInUse() {
    const set = new Set();
    for (const it of items.values()) set.add(it.store);
    return [...set];
  }

  return { build, clear, get, take, restore, consume, setLabelsVisible, registerTargets, storesInUse };
}
