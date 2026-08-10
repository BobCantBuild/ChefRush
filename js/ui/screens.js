const SCREEN_IDS = ['screen-menu', 'screen-result', 'screen-gameover'];

const el = (id) => document.getElementById(id);

/** Shows one full-screen overlay, or none when passed null. */
export function showScreen(id) {
  for (const s of SCREEN_IDS) {
    const node = el(s);
    if (!node) continue;
    const active = s === id;
    node.hidden = !active;
    node.classList.toggle('is-active', active);
  }
}

/** Toggles the in-game chrome (HUD, recipe card, shelf) as a unit. */
export function showGameChrome(visible) {
  el('hud').hidden = !visible;
  el('tray').hidden = !visible;
  el('recipe').hidden = !visible;
}

export function toast(message, ms = 1400) {
  const node = el('toast');
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('is-visible'), ms);
}
