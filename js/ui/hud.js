import { CONFIG } from '../config.js';

const RING_R = 18;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

let roundEl, scoreEl, ringEl, timerTextEl;
let displayedScore = 0;
let scoreTarget = 0;

export function initHud() {
  roundEl = document.getElementById('hud-round');
  scoreEl = document.getElementById('hud-score');
  ringEl = document.querySelector('#timer-ring .ring-fg');
  timerTextEl = document.getElementById('timer-text');

  ringEl.style.strokeDasharray = `${CIRCUMFERENCE}`;
  setTimer(1, 1);
}

export function setRound(round) {
  roundEl.textContent = `Round ${round}/${CONFIG.roundsPerRun}`;
}

/** Score counts up rather than snapping, so a big round reads as a big gain. */
export function setScore(value, immediate = false) {
  scoreTarget = value;
  if (immediate) {
    displayedScore = value;
    scoreEl.textContent = String(value);
  }
}

export function updateScoreCounter() {
  if (displayedScore === scoreTarget) return;
  const diff = scoreTarget - displayedScore;
  const step = Math.max(1, Math.ceil(Math.abs(diff) / 8));
  displayedScore += Math.sign(diff) * step;
  if (Math.sign(scoreTarget - displayedScore) !== Math.sign(diff)) {
    displayedScore = scoreTarget;
  }
  scoreEl.textContent = String(displayedScore);
}

export function setTimer(leftMs, totalMs) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, leftMs / totalMs)) : 0;
  ringEl.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - ratio)}`;
  timerTextEl.textContent = String(Math.ceil(leftMs / 1000));

  const ring = document.getElementById('timer-ring');
  ring.classList.toggle('is-warning', ratio <= 0.34 && ratio > 0.15);
  ring.classList.toggle('is-danger', ratio <= 0.15);
}
