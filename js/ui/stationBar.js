import { STORES } from '../data/ingredients.js';

// A read-out of how many items are left at each station. It used to be the
// station switcher, but every item is now labelled and tappable directly in
// the kitchen, so there is nothing left to switch — this just tells you where
// the remaining ingredients are.

const ORDER = ['fridge', 'pantry'];

let barEl;

export function initStationBar() {
  barEl = document.getElementById('stations');
}

/** @param {Record<string, number>} counts remaining item count per store */
export function renderStationBar(counts) {
  barEl.innerHTML = '';
  for (const id of ORDER) {
    const store = STORES[id];
    const cell = document.createElement('div');
    cell.className = 'station-btn';
    cell.dataset.store = id;
    cell.innerHTML =
      `<span class="station-icon">${store.icon}</span>` +
      `<span class="station-name">${store.label}</span>` +
      `<span class="station-count" data-count>${counts[id] ?? 0}</span>`;
    barEl.appendChild(cell);
  }
}

export function updateStationCounts(counts) {
  for (const cell of barEl.children) {
    const el = cell.querySelector('[data-count]');
    const n = counts[cell.dataset.store] ?? 0;
    el.textContent = String(n);
    cell.classList.toggle('is-empty', n === 0);
  }
}

export function lockStationBar(value) {
  barEl.classList.toggle('is-locked', value);
}
