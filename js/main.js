import * as THREE from '../vendor/three.module.js';

import { CONFIG } from './config.js';
import { SFX, isMuted, setMuted, unlockAudio } from './audio.js';
import { getIngredient, groupByStore } from './data/ingredients.js';
import { Phase, game, on } from './state.js';
import * as State from './state.js';
import { Ease, clearTweens, tween, updateTweens } from './util/anim.js';
import { getCharacter, setCharacter } from './storage.js';

import { createBowl } from './scene/bowl.js';
import { FACE, createChef } from './scene/chef.js';
import { createCameraRig } from './scene/cameraRig.js';
import { createKitchen } from './scene/kitchen.js';
import { createKitchenItems } from './scene/kitchenItems.js';
import { createOven, OVEN_INSIDE } from './scene/oven.js';
import { createPicker } from './scene/picker.js';
import { CHEF_X, createStations } from './scene/stations.js';
import { initRenderer, render, resize } from './scene/renderer.js';

import { initHud, setRound, setScore, setTimer, updateScoreCounter } from './ui/hud.js';
import { initRecipeCard, renderRecipe, updateRecipeProgress } from './ui/recipeCard.js';
import { renderGameOver, renderResult } from './ui/results.js';
import {
  initStationBar, lockStationBar, renderStationBar, updateStationCounts,
} from './ui/stationBar.js';
import { showGameChrome, showScreen, toast } from './ui/screens.js';

const el = (id) => document.getElementById(id);

/** Where the chef releases an ingredient over the bowl (on the back counter). */
const BOWL_DROP = new THREE.Vector3(-0.4, 1.52, -2.6);
/** Where the finished plate is presented on the counter. */
const PLATE_POS = new THREE.Vector3(-0.4, 1.06, -2.55);

let scene, camera, cameraRig, stations, chef, bowl, oven, items, picker;
let currentPlate = null;
let carried = null;          // mesh currently in the chef's hand
let characterId = getCharacter();

let lastFrame = 0;
let elapsed = 0;
let rafId = null;
let lowTimeWarned = false;
let busy = false;            // a fetch animation is in flight

// ============================================================== boot ===
function init() {
  const canvas = el('scene');
  ({ scene, camera } = initRenderer(canvas));

  cameraRig = createCameraRig(camera);
  scene.add(createKitchen());

  stations = createStations();
  scene.add(stations.group);

  bowl = createBowl();
  scene.add(bowl.group);

  oven = createOven();
  scene.add(oven.group);

  items = createKitchenItems(scene, stations);
  picker = createPicker(camera, canvas);

  buildChef();

  initHud();
  initRecipeCard();
  initStationBar();
  wireCanvasInput(canvas);
  wireButtons();
  wireState();

  el('menu-high').textContent = String(game.highScore);
  syncCharacterCards();

  resize();
  observeResize(canvas);
  document.addEventListener('visibilitychange', handleVisibility);

  showScreen('screen-menu');
  showGameChrome(false);
  startLoop();
}

function buildChef() {
  if (chef) scene.remove(chef.root);
  chef = createChef(characterId);
  scene.add(chef.root);
}

function observeResize(canvas) {
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
}

// ======================================================== main loop ===
function startLoop() {
  if (rafId !== null) return;
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}

function stopLoop() {
  if (rafId === null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
}

function frame(now) {
  rafId = requestAnimationFrame(frame);

  const dt = Math.min(50, now - lastFrame);
  lastFrame = now;
  elapsed += dt;

  updateTweens(dt);
  updateScoreCounter();
  chef.update(dt);
  oven.update(elapsed);
  cameraRig.apply();

  // whatever the chef is holding rides along with the hand
  if (carried) carried.position.copy(chef.handWorld());

  if (game.phase === Phase.PICKING) {
    State.tick(dt);
    if (!lowTimeWarned && game.timeLeftMs > 0 && game.timeLeftMs < 5000) {
      lowTimeWarned = true;
      SFX.tick();
    }
  }

  render();
}

function handleVisibility() {
  if (document.hidden) stopLoop();
  else startLoop();
}

// ======================================================== 3D input ===
const TAP_SLOP_PX = 12;

function wireCanvasInput(canvas) {
  let press = null;

  canvas.addEventListener('pointerdown', (ev) => {
    press = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });

  canvas.addEventListener('pointerup', (ev) => {
    const p = press;
    press = null;
    if (!p || ev.pointerId !== p.id) return;
    if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > TAP_SLOP_PX) return;

    unlockAudio();
    const hit = picker.pickAt(ev.clientX, ev.clientY);
    if (!hit) return;

    if (hit.kind === 'ingredient') handleIngredientTap(hit.id);
  });

  canvas.addEventListener('pointercancel', () => { press = null; });
}

/**
 * Rebuilds the tap targets. Every remaining item at both stations is tappable
 * for the whole picking phase — there is no station to drill into any more.
 */
function refreshTargets() {
  picker.clear();
  if (game.phase !== Phase.PICKING) return;
  items.registerTargets(picker);
}

// ========================================================== wiring ===
function wireButtons() {
  el('btn-start').addEventListener('click', () => { unlockAudio(); SFX.press(); beginRun(); });
  el('btn-again').addEventListener('click', () => { SFX.press(); beginRun(); });

  el('btn-menu').addEventListener('click', () => {
    SFX.press();
    State.returnToMenu();
    showGameChrome(false);
    resetScene();
    el('menu-high').textContent = String(game.highScore);
    showScreen('screen-menu');
  });

  el('action-btn').addEventListener('click', () => {
    if (game.phase !== Phase.PICKING || busy) return;
    if (!State.beginMixing()) return;
    SFX.press();
    runCookSequence();
  });

  el('result-next').addEventListener('click', () => {
    SFX.press();
    showScreen(null);
    clearPlate();
    State.nextRound();
  });

  el('char-select').addEventListener('click', (ev) => {
    const card = ev.target.closest('.char-card');
    if (!card) return;
    characterId = card.dataset.char;
    setCharacter(characterId);
    buildChef();
    syncCharacterCards();
    SFX.press();
  });

  const muteBtn = el('btn-mute');
  muteBtn.addEventListener('click', () => {
    setMuted(!isMuted());
    muteBtn.textContent = isMuted() ? '🔇 Sound off' : '🔊 Sound on';
    if (!isMuted()) { unlockAudio(); SFX.press(); }
  });
}

function syncCharacterCards() {
  for (const card of el('char-select').children) {
    card.classList.toggle('is-selected', card.dataset.char === characterId);
  }
}

function wireState() {
  on('phase', handlePhase);
  on('pick', handlePick);
  on('tick', (leftMs) => setTimer(leftMs, game.timeTotalMs));
  on('result', handleResult);
  on('gameover', handleGameOver);
}

function beginRun() {
  clearTweens();
  resetScene();
  showScreen(null);
  showGameChrome(true);
  setScore(0, true);
  State.startRun();
}

function resetScene() {
  clearPlate();
  bowl.clear();
  bowl.group.visible = true;
  items.clear();
  carried = null;
  busy = false;
  chef.resetPose();
  stations.stations.fridge.setOpen(false);
  stations.setSignsVisible(true);
  cameraRig.snapTo('wide');
  picker.clear();
}

// =========================================================== phases ===
function handlePhase(phase) {
  if (phase === Phase.INTRO) setupRound();
}

function remainingCounts() {
  const left = game.shelf.filter((id) => !game.picked.has(id));
  const grouped = groupByStore(left);
  return {
    fridge: grouped.fridge.length,
    pantry: grouped.pantry.length,
  };
}

function setupRound() {
  lowTimeWarned = false;
  busy = false;
  carried = null;

  bowl.clear();
  bowl.group.visible = true;
  oven.swingDoor(false);
  oven.setCooking(false);
  stations.setSignsVisible(true);
  clearPlate();
  chef.resetPose();

  items.build(game.shelf);
  // Everything is readable and tappable from the off: tags up, fridge open.
  items.setLabelsVisible(true);
  stations.stations.fridge.setOpen(true);

  renderRecipe(game.dish);
  renderStationBar(remainingCounts());
  lockStationBar(false);
  updateRecipeProgress(new Set());

  setRound(game.round);
  setTimer(game.timeTotalMs, game.timeTotalMs);
  el('recipe').hidden = false;
  el('cook-status').hidden = true;

  const btn = el('action-btn');
  btn.disabled = true;
  btn.textContent = 'Mix & Cook';

  cameraRig.snapTo('wide');
  toast(`Order up — ${game.dish.name}`);

  tween({ duration: 800 }).promise.then(() => {
    State.beginPicking();
    refreshTargets();
  });
}

// ------------------------------------------------------ ingredients ---
function handleIngredientTap(id) {
  if (game.phase !== Phase.PICKING || busy) return;
  if (game.picked.has(id)) return; // already in the bowl; remove via the chip
  const action = State.togglePick(id);
  if (action === 'added') fetchIngredient(id);
}

/**
 * The chef walks to the station, reaches for the item, carries it back to the
 * island and drops it in the bowl.
 */
async function fetchIngredient(id) {
  const it = items.get(id);
  if (!it) return;

  // The round can end mid-walk (timer expiry), and the whole scene is rebuilt
  // between rounds. Bail out if that happens rather than dropping an ingredient
  // into the next round's bowl — and always release `busy` in a finally, or a
  // single interrupted fetch soft-locks every station for the rest of the run.
  const round = game.round;
  const stale = () => game.round !== round || game.phase !== Phase.PICKING;

  busy = true;
  picker.clear();

  try {
    const { walk, reach, grab } = CONFIG.chef;
    const ing = getIngredient(id);

    await chef.moveTo(CHEF_X[it.store], walk);
    if (stale()) return;

    // Turn to face the shelf before reaching, so the chef works the station
    // head-on instead of grabbing sideways past their own shoulder.
    await chef.turnTo(FACE.shelf, 150);
    await chef.reachAt(it.home, reach);
    if (stale()) return;

    const mesh = items.take(id);
    if (mesh) {
      carried = mesh;
      SFX.add();
    }
    await tween({ duration: grab }).promise;
    if (stale()) return;

    await chef.moveTo(CHEF_X.counter, walk);
    if (stale()) return;

    // The bowl sits on the counter behind the chef, so face it to drop in.
    await chef.turnTo(FACE.shelf, 150);
    await chef.reachAt(BOWL_DROP, reach);
    if (stale()) return;

    const releaseAt = carried ? carried.position.clone() : BOWL_DROP.clone();
    carried = null;
    items.consume(id);
    bowl.add(ing, releaseAt);

    chef.lowerArm(reach);
    chef.turnTo(FACE.camera, 160); // face front again between picks
    updateStationCounts(remainingCounts());
  } finally {
    carried = null;
    if (game.round === round) {
      busy = false;
      refreshTargets();
    }
  }
}

/** Removing is done from the recipe card chip, not by walking back. */
function removeIngredient(id) {
  if (game.phase !== Phase.PICKING || busy) return;
  if (!game.picked.has(id)) return;
  State.togglePick(id);
  bowl.remove(id);
  items.restore(id, true); // tags are always up during picking
  SFX.remove();
  updateStationCounts(remainingCounts());
  refreshTargets();
}

function handlePick({ picked }) {
  updateRecipeProgress(picked);
  el('action-btn').disabled = picked.size === 0;
}

// ------------------------------------------------------------ cook ---
async function runCookSequence() {
  try {
    await cookSequenceBody();
  } finally {
    // Never leave the game locked if an animation step throws or bails early.
    busy = false;
  }
}

async function cookSequenceBody() {
  busy = true;
  picker.clear();
  lockStationBar(true);
  el('action-btn').disabled = true;
  el('recipe').hidden = true;

  items.setLabelsVisible(false);
  stations.stations.fridge.setOpen(false);

  const status = el('cook-status');
  const fill = el('cook-fill');
  const label = el('cook-label');
  status.hidden = false;
  label.textContent = 'Mixing…';
  fill.style.width = '0%';

  const ingredients = [...game.picked].map(getIngredient);

  await chef.moveTo(CHEF_X.counter, 260);
  await chef.turnTo(FACE.shelf, 150); // face the bowl on the counter

  SFX.mix();
  await bowl.mix(ingredients);
  if (game.phase !== Phase.MIXING) return; // round was reset mid-animation

  State.beginCooking();
  label.textContent = 'Into the oven…';

  await chef.carryPose(220);
  await Promise.all([
    oven.swingDoor(true),
    chef.moveTo(CHEF_X.counter + 1.2, 340),
  ]);
  await bowl.travelTo(OVEN_INSIDE);
  await oven.swingDoor(false);
  chef.lowerArm(200);

  bowl.group.visible = false;
  oven.setCooking(true);
  SFX.ovenOn();
  label.textContent = 'Cooking…';

  await tween({
    duration: CONFIG.cook.defaultMs,
    ease: Ease.linear,
    onUpdate: (t) => { fill.style.width = `${(t * 100).toFixed(1)}%`; },
  }).promise;

  oven.setCooking(false);
  SFX.ding();
  status.hidden = true;

  await oven.swingDoor(true);
  revealPlate(ingredients);
  await tween({ duration: 800 }).promise;

  State.finishCooking();
}

function revealPlate(ingredients) {
  clearPlate();
  currentPlate = oven.createPlate(game.dish, bowl.getBlend(ingredients));
  currentPlate.position.copy(PLATE_POS);
  currentPlate.scale.setScalar(0.01);
  scene.add(currentPlate);

  tween({
    duration: CONFIG.anim.plateReveal,
    ease: Ease.backOut,
    onUpdate: (t) => currentPlate.scale.setScalar(t * 0.75),
  });
}

function clearPlate() {
  if (!currentPlate) return;
  scene.remove(currentPlate);
  currentPlate = null;
}

// --------------------------------------------------------- results ---
function handleResult(result) {
  busy = false;
  picker.clear();
  lockStationBar(true);
  el('cook-status').hidden = true;
  el('recipe').hidden = true;
  el('action-btn').disabled = true;

  setScore(result.totalScore);
  renderResult(result);
  showScreen('screen-result');
}

function handleGameOver({ score, stars, isRecord }) {
  showGameChrome(false);
  resetScene();
  renderGameOver({ score, stars, isRecord, highScore: game.highScore });
  showScreen('screen-gameover');
  if (isRecord || stars >= CONFIG.roundsPerRun * 2) SFX.runComplete();
  else SFX.gameover();
}

// Tapping a ticked chip on the recipe card takes that item back out.
document.addEventListener('click', (ev) => {
  const chip = ev.target.closest('#recipe-list .recipe-chip.is-done');
  if (chip) removeIngredient(chip.dataset.id);
});

// =============================================================== go ===
/**
 * If anything in init() throws, the buttons never get wired but the menu still
 * renders from the HTML — leaving a page that looks fine and does nothing.
 * Fail loudly instead.
 */
function showFatal(err) {
  console.error('Chef Rush failed to start:', err);
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'fatal';

  const h = document.createElement('h2');
  h.textContent = 'Chef Rush could not start';
  const p = document.createElement('p');
  p.textContent = String((err && err.message) || err);
  const hint = document.createElement('p');
  hint.className = 'fatal-hint';
  hint.textContent = 'Open the browser console for the full stack trace.';

  box.append(h, p, hint);
  app.appendChild(box);
}

try {
  init();
} catch (err) {
  showFatal(err);
}
