// Game state machine + scoring. This module owns the rules and knows nothing
// about the DOM or three.js — both subscribe to it via on().

import { CONFIG } from './config.js';
import { dishesForRound } from './data/dishes.js';
import { allIngredientIds, groupByStore } from './data/ingredients.js';
import { getHighScore, setHighScore } from './storage.js';

export const Phase = {
  MENU: 'MENU',
  INTRO: 'INTRO',
  PICKING: 'PICKING',
  MIXING: 'MIXING',
  COOKING: 'COOKING',
  RESULT: 'RESULT',
  GAMEOVER: 'GAMEOVER',
};

export const game = {
  phase: Phase.MENU,
  round: 0,
  score: 0,
  totalStars: 0,
  dish: null,
  shelf: [],
  picked: new Set(),
  timeLeftMs: 0,
  timeTotalMs: 0,
  lastResult: null,
  highScore: getHighScore(),
};

// ------------------------------------------------------------ events ---
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of set) fn(payload);
}

function setPhase(phase) {
  game.phase = phase;
  emit('phase', phase);
}

// ------------------------------------------------------------ helpers ---
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timerForRound(round) {
  const { baseMs, minMs, decayPerRound } = CONFIG.timer;
  return Math.max(minMs, baseMs - (round - 1) * decayPerRound);
}

function decoyCountForRound(round) {
  const { base, perRound, max } = CONFIG.decoys;
  return Math.min(max, Math.round(base + (round - 1) * perRound));
}

/**
 * Shelf = the dish's real ingredients + decoys drawn from the rest of the
 * catalog. Decoys are dealt round-robin across the three stations so no single
 * shelf ends up overflowing its slots.
 */
function buildShelf(dish, round) {
  const required = new Set(dish.ingredients);
  const pools = groupByStore(allIngredientIds().filter((id) => !required.has(id)));
  for (const key of Object.keys(pools)) pools[key] = shuffle(pools[key]);

  const stores = shuffle(Object.keys(pools));
  const wanted = decoyCountForRound(round);
  const decoys = [];

  let guard = 0;
  while (decoys.length < wanted && guard++ < 100) {
    let tookAny = false;
    for (const store of stores) {
      if (decoys.length >= wanted) break;
      const next = pools[store].pop();
      if (next) { decoys.push(next); tookAny = true; }
    }
    if (!tookAny) break; // catalog exhausted
  }

  return shuffle([...dish.ingredients, ...decoys]);
}

// ------------------------------------------------------------ actions ---
export function startRun() {
  game.round = 0;
  game.score = 0;
  game.totalStars = 0;
  game.lastResult = null;
  nextRound();
}

export function nextRound() {
  if (game.round >= CONFIG.roundsPerRun) {
    endRun();
    return;
  }

  game.round += 1;
  game.dish = pick(dishesForRound(game.round));
  game.shelf = buildShelf(game.dish, game.round);
  game.picked = new Set();
  game.timeTotalMs = timerForRound(game.round);
  game.timeLeftMs = game.timeTotalMs;
  game.lastResult = null;

  setPhase(Phase.INTRO);
  emit('round', game.round);
}

/** Called once the intro animation has finished; starts the clock. */
export function beginPicking() {
  if (game.phase !== Phase.INTRO) return;
  setPhase(Phase.PICKING);
}

/** @returns {'added'|'removed'|null} */
export function togglePick(id) {
  if (game.phase !== Phase.PICKING) return null;
  if (!game.shelf.includes(id)) return null;

  let action;
  if (game.picked.has(id)) {
    game.picked.delete(id);
    action = 'removed';
  } else {
    game.picked.add(id);
    action = 'added';
  }
  emit('pick', { id, action, picked: new Set(game.picked) });
  return action;
}

/** Advances the countdown. Returns true if the timer just expired. */
export function tick(dtMs) {
  if (game.phase !== Phase.PICKING) return false;

  game.timeLeftMs = Math.max(0, game.timeLeftMs - dtMs);
  emit('tick', game.timeLeftMs);

  if (game.timeLeftMs <= 0) {
    game.lastResult = evaluate({ timedOut: true });
    setPhase(Phase.RESULT);
    emit('result', game.lastResult);
    return true;
  }
  return false;
}

export function beginMixing() {
  if (game.phase !== Phase.PICKING) return false;
  if (game.picked.size === 0) return false;
  setPhase(Phase.MIXING);
  return true;
}

export function beginCooking() {
  if (game.phase !== Phase.MIXING) return;
  setPhase(Phase.COOKING);
}

export function finishCooking() {
  if (game.phase !== Phase.COOKING) return;
  game.lastResult = evaluate({ timedOut: false });
  setPhase(Phase.RESULT);
  emit('result', game.lastResult);
}

function endRun() {
  const isRecord = game.score > game.highScore;
  if (isRecord) {
    game.highScore = game.score;
    setHighScore(game.score);
  }
  setPhase(Phase.GAMEOVER);
  emit('gameover', { score: game.score, stars: game.totalStars, isRecord });
}

export function returnToMenu() {
  setPhase(Phase.MENU);
}

// ------------------------------------------------------------ scoring ---
/**
 * The bowl is judged as a set, so pick order never matters. The same
 * correct/wrong/missing split drives both the score and the player-facing
 * breakdown — a low score always comes with a visible reason.
 */
export function evaluate({ timedOut }) {
  const required = new Set(game.dish.ingredients);
  const picked = game.picked;

  const correct = [...picked].filter((id) => required.has(id));
  const wrong = [...picked].filter((id) => !required.has(id));
  const missing = [...required].filter((id) => !picked.has(id));

  const perfect = wrong.length === 0 && missing.length === 0;
  const timeRatio = game.timeTotalMs > 0 ? game.timeLeftMs / game.timeTotalMs : 0;

  let stars;
  if (timedOut) {
    stars = 0;
  } else if (perfect) {
    stars = timeRatio > CONFIG.stars.fastThreshold ? 3 : 2;
  } else if (
    correct.length >= Math.ceil(required.size * CONFIG.stars.partialRatio) &&
    wrong.length <= CONFIG.stars.maxWrongForOneStar
  ) {
    stars = 1;
  } else {
    stars = 0;
  }

  const { perCorrect, perWrong, perMissing, timeBonusDivisor } = CONFIG.score;
  const base = perCorrect * correct.length;
  const penalty = perWrong * wrong.length + perMissing * missing.length;
  const timeBonus = perfect && !timedOut ? Math.round(game.timeLeftMs / timeBonusDivisor) : 0;
  const roundScore = timedOut ? 0 : Math.max(0, base - penalty + timeBonus);

  game.score += roundScore;
  game.totalStars += stars;

  return {
    dish: game.dish,
    correct,
    wrong,
    missing,
    perfect,
    timedOut,
    stars,
    roundScore,
    base,
    penalty,
    timeBonus,
    totalScore: game.score,
    isLastRound: game.round >= CONFIG.roundsPerRun,
  };
}
