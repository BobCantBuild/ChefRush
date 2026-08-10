import { STORES } from '../data/ingredients.js';

// Station switching lives in the DOM rather than relying on a precise 3D tap:
// these are big, reliable thumb targets. Ingredients themselves are still
// tapped directly in the 3D scene.

const ORDER = ['fridge', 'pantry', 'produce'];

let barEl;
let selectHandler = null;
let locked = false;

export function initStationBar(onSelect) {
  barEl = document.getElementById('stations');
  selectHandler = onSelect;

  barEl.addEventListener('click', (ev) => {
    if (locked) return;
    const btn = ev.target.closest('.station-btn');
    if (!btn || !barEl.contains(btn)) return;
    selectHandler?.(btn.dataset.store);
  });
}

/** @param {Record<string, number>} counts remaining item count per store */
export function renderStationBar(counts) {
  barEl.innerHTML = '';
  for (const id of ORDER) {
    const store = STORES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'station-btn';
    btn.dataset.store = id;
    btn.innerHTML =
      `<span class="station-icon">${store.icon}</span>` +
      `<span class="station-name">${store.label}</span>` +
      `<span class="station-count" data-count>${counts[id] ?? 0}</span>`;
    barEl.appendChild(btn);
  }
}

export function setActiveStation(id) {
  for (const btn of barEl.children) {
    btn.classList.toggle('is-active', btn.dataset.store === id);
  }
}

export function updateStationCounts(counts) {
  for (const btn of barEl.children) {
    const el = btn.querySelector('[data-count]');
    const n = counts[btn.dataset.store] ?? 0;
    el.textContent = String(n);
    btn.classList.toggle('is-empty', n === 0);
  }
}

export function lockStationBar(value) {
  locked = value;
  barEl.classList.toggle('is-locked', value);
}
