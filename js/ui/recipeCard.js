import { STORES, getIngredient } from '../data/ingredients.js';

let iconEl, nameEl, progressEl, listEl;
let currentDish = null;

export function initRecipeCard() {
  iconEl = document.getElementById('recipe-icon');
  nameEl = document.getElementById('recipe-name');
  progressEl = document.getElementById('recipe-progress');
  listEl = document.getElementById('recipe-list');
}

export function renderRecipe(dish) {
  currentDish = dish;
  iconEl.textContent = dish.icon;
  nameEl.textContent = dish.name;
  listEl.innerHTML = '';

  for (const id of dish.ingredients) {
    const ing = getIngredient(id);
    const store = STORES[ing.store];
    const li = document.createElement('li');
    li.className = 'recipe-chip';
    li.dataset.id = id;
    li.dataset.store = ing.store;
    // The station badge tells the player where to look — without it, hunting
    // an item across three stations under a countdown is pure guesswork.
    li.innerHTML =
      `<span class="chip-icon">${ing.icon}</span>` +
      `<span class="chip-label">${ing.label}</span>` +
      `<span class="chip-store" title="${store.label}">${store.icon}</span>`;
    listEl.appendChild(li);
  }
  updateRecipeProgress(new Set());
}

export function updateRecipeProgress(picked) {
  if (!currentDish) return;
  let done = 0;
  for (const li of listEl.children) {
    const has = picked.has(li.dataset.id);
    li.classList.toggle('is-done', has);
    if (has) done++;
  }
  progressEl.textContent = `${done} of ${currentDish.ingredients.length} in the bowl`;
  progressEl.classList.toggle('is-complete', done === currentDish.ingredients.length);
}
