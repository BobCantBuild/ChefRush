import { CONFIG } from '../config.js';
import { getIngredient } from '../data/ingredients.js';
import { SFX } from '../audio.js';

const el = (id) => document.getElementById(id);

function verdictFor(result) {
  if (result.timedOut) return { title: 'Out of time!', tone: 'bad' };
  if (result.perfect) return { title: result.stars === 3 ? 'Perfect & fast!' : 'Perfect dish!', tone: 'good' };
  if (result.stars === 1) return { title: 'Close enough', tone: 'ok' };
  return { title: 'That is not it', tone: 'bad' };
}

function chipList(ids, kind) {
  return ids
    .map((id) => {
      const ing = getIngredient(id);
      return `<li class="result-chip is-${kind}"><span>${ing.icon}</span>${ing.label}</li>`;
    })
    .join('');
}

export function renderResult(result) {
  const verdict = verdictFor(result);

  el('result-dish-icon').textContent = result.dish.icon;
  el('result-dish-name').textContent = result.dish.name;

  const title = el('result-title');
  title.textContent = verdict.title;
  title.className = `result-title tone-${verdict.tone}`;

  // Stars pop in one at a time.
  const starWrap = el('result-stars');
  starWrap.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.textContent = '★';
    starWrap.appendChild(s);
  }
  [...starWrap.children].forEach((s, i) => {
    if (i < result.stars) {
      setTimeout(() => {
        s.classList.add('is-earned');
        SFX.star(i);
      }, 260 + i * 240);
    }
  });
  if (result.stars === 0) setTimeout(() => SFX.fail(), 260);

  // Breakdown — only show sections that actually have entries.
  const sections = [];
  if (result.correct.length) {
    sections.push(`<div class="result-group"><h4>Correct</h4><ul>${chipList(result.correct, 'good')}</ul></div>`);
  }
  if (result.wrong.length) {
    sections.push(`<div class="result-group"><h4>Should not be there</h4><ul>${chipList(result.wrong, 'bad')}</ul></div>`);
  }
  if (result.missing.length) {
    sections.push(`<div class="result-group"><h4>Missing</h4><ul>${chipList(result.missing, 'warn')}</ul></div>`);
  }
  el('result-breakdown').innerHTML = sections.join('');

  // Score maths, shown so the number never feels arbitrary.
  const rows = [];
  if (!result.timedOut) {
    rows.push(['Correct ingredients', `+${result.base}`, 'good']);
    if (result.penalty > 0) rows.push(['Mistakes', `−${result.penalty}`, 'bad']);
    if (result.timeBonus > 0) rows.push(['Time bonus', `+${result.timeBonus}`, 'good']);
  } else {
    rows.push(['Timer expired', 'no score', 'bad']);
  }
  el('result-math').innerHTML = rows
    .map(([label, value, tone]) => `<li><span>${label}</span><b class="tone-${tone}">${value}</b></li>`)
    .join('');

  el('result-round-score').textContent = `+${result.roundScore}`;
  el('result-total-score').textContent = String(result.totalScore);

  el('result-next').textContent = result.isLastRound ? 'See final score' : 'Next order';
}

export function renderGameOver({ score, stars, isRecord, highScore }) {
  el('go-score').textContent = String(score);
  el('go-stars').textContent = `${stars} / ${CONFIG.roundsPerRun * 3}`;
  el('go-high').textContent = String(highScore);
  el('go-record').hidden = !isRecord;

  const maxStars = CONFIG.roundsPerRun * 3;
  const ratio = maxStars ? stars / maxStars : 0;
  let rank = 'Kitchen Trainee';
  if (ratio >= 0.95) rank = 'Legendary Chef';
  else if (ratio >= 0.8) rank = 'Head Chef';
  else if (ratio >= 0.6) rank = 'Sous Chef';
  else if (ratio >= 0.4) rank = 'Line Cook';
  el('go-rank').textContent = rank;
}
