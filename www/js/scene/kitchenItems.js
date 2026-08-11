import * as THREE from '../../vendor/three.module.js';
import { getIngredient, groupByStore } from '../data/ingredients.js';
import { Ease, tween } from '../util/anim.js';
import { createIngredientMesh } from './ingredientMesh.js';
import { createLabel } from './label.js';

// Places the current round's ingredients into their stations and owns their
// name tags. Items sit in world space so the picker and the chef's hand can
// both work with plain world coordinates.

const ITEM_SCALE = 0.62;

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

        // Adjacent columns sit ~70px apart on screen but a long name like
        // "Strawberry" renders ~90px wide, so neighbouring tags would collide.
        // Alternating their height keeps every name readable.
        const stagger = (i % 2) * 0.135;
        const label = createLabel(ing.label, 0.165);
        // Fridge and pantry items stand upright on their shelves, so the tag
        // hangs just below each one.
        label.position.copy(home).add(new THREE.Vector3(0, -0.2 - stagger, 0.02));
        label.visible = false;

        group.add(mesh, label);
        items.set(id, { mesh, label, store, home: home.clone(), taken: false });
      });
    }
  }

  /** Name tags are only shown for the station currently zoomed in on. */
  function showLabelsFor(store) {
    for (const it of items.values()) {
      it.label.visible = !it.taken && it.store === store;
    }
  }

  function get(id) {
    return items.get(id);
  }

  /** Registers every still-available item at `store` as a tap target. */
  function registerTargets(picker, store) {
    for (const [id, it] of items) {
      if (it.taken || it.store !== store) continue;
      picker.addTarget(it.home, 0.3, { kind: 'ingredient', id });
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
  function restore(id, showLabel) {
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

  return { build, clear, get, take, restore, consume, showLabelsFor, registerTargets, storesInUse };
}
