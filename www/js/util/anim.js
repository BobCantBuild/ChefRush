// Minimal tween engine. Driven by the main RAF loop so animations pause
// automatically whenever rendering pauses.

const active = [];

export const Ease = {
  linear: (t) => t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  backOut: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

/**
 * @returns {{cancel: () => void, promise: Promise<void>}}
 */
export function tween({ duration, ease = Ease.quadOut, delay = 0, onUpdate, onComplete }) {
  let resolveFn;
  const promise = new Promise((res) => { resolveFn = res; });
  const t = {
    elapsed: -delay,
    duration: Math.max(1, duration),
    ease,
    onUpdate,
    onComplete,
    dead: false,
    resolveFn,
  };
  active.push(t);
  return {
    promise,
    cancel() {
      t.dead = true;
      resolveFn();
    },
  };
}

export function delay(ms) {
  return tween({ duration: ms }).promise;
}

export function updateTweens(dtMs) {
  for (let i = active.length - 1; i >= 0; i--) {
    const t = active[i];
    if (t.dead) { active.splice(i, 1); continue; }

    t.elapsed += dtMs;
    if (t.elapsed < 0) continue; // still in its delay

    const raw = Math.min(1, t.elapsed / t.duration);
    if (t.onUpdate) t.onUpdate(t.ease(raw), raw);

    if (raw >= 1) {
      active.splice(i, 1);
      if (t.onComplete) t.onComplete();
      t.resolveFn();
    }
  }
}

/** Drop every in-flight tween without firing completion callbacks. */
export function clearTweens() {
  while (active.length) {
    const t = active.pop();
    t.dead = true;
    t.resolveFn();
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
