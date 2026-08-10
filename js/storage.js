import { STORAGE_KEY } from './config.js';

const CHAR_KEY = 'chefrush.character.v1';

// localStorage is unavailable in some WebView privacy modes; never let that
// break the game.

export function getHighScore() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function setHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export function getCharacter() {
  try {
    const v = localStorage.getItem(CHAR_KEY);
    return v === 'male' || v === 'female' ? v : 'female';
  } catch {
    return 'female';
  }
}

export function setCharacter(id) {
  try {
    localStorage.setItem(CHAR_KEY, id);
  } catch {
    /* ignore */
  }
}
