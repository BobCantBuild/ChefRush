// All gameplay tunables live here so balance changes never require touching logic.

export const CONFIG = {
  roundsPerRun: 8,

  // Countdown per round. Shrinks as the run progresses, floored at minMs.
  // Longer than a pure tap game because the chef takes real time to walk to a
  // station and reach for each item.
  timer: {
    baseMs: 34000,
    minMs: 20000,
    decayPerRound: 1700,
  },

  // Extra wrong ingredients seeded into the kitchen. Grows with the round
  // number, and is spread evenly across the three stations.
  decoys: {
    base: 3,
    perRound: 1.1,
    max: 9,
  },

  // How long the chef takes to fetch things (ms).
  chef: {
    walk: 300,
    reach: 190,
    grab: 110,
    fridgeOpen: 260,
  },

  score: {
    perCorrect: 100,
    perWrong: 60,
    perMissing: 40,
    timeBonusDivisor: 100, // ms of remaining time per bonus point
  },

  // Fraction of the clock that must remain for the third star.
  stars: {
    fastThreshold: 0.5,
    partialRatio: 0.5, // share of the recipe needed for one star
    maxWrongForOneStar: 1,
  },

  cook: {
    defaultMs: 2600,
  },

  // Animation durations (ms)
  anim: {
    ingredientDrop: 480,
    ingredientRemove: 260,
    mix: 1500,
    bowlToOven: 900,
    doorSwing: 380,
    plateReveal: 600,
  },
};

export const STORAGE_KEY = 'chefrush.highscore.v1';
