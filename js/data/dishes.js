// Dish catalog. `difficulty` gates which dishes can appear in which round, so
// early rounds stay short and late rounds get long recipes. Adding a dish is
// one entry and requires no code change.

export const DISHES = [
  { id: 'omelette',  name: 'Cheese Omelette',     icon: '🍳', difficulty: 1, ingredients: ['egg', 'cheese', 'butter'] },
  { id: 'salad',     name: 'Garden Salad',        icon: '🥗', difficulty: 1, ingredients: ['lettuce', 'tomato', 'cucumber'] },
  { id: 'pancakes',  name: 'Pancakes',            icon: '🥞', difficulty: 1, ingredients: ['flour', 'milk', 'egg'] },
  { id: 'smoothie',  name: 'Berry Smoothie',      icon: '🥤', difficulty: 1, ingredients: ['strawberry', 'banana', 'milk', 'honey'] },

  { id: 'pizza',     name: 'Margherita Pizza',    icon: '🍕', difficulty: 2, ingredients: ['dough', 'tomato', 'cheese', 'basil'] },
  { id: 'burger',    name: 'Beef Burger',         icon: '🍔', difficulty: 2, ingredients: ['dough', 'beef', 'cheese', 'lettuce', 'onion'] },
  { id: 'friedrice', name: 'Fried Rice',          icon: '🍛', difficulty: 2, ingredients: ['rice', 'egg', 'carrot', 'soy', 'onion'] },
  { id: 'cake',      name: 'Chocolate Cake',      icon: '🍰', difficulty: 2, ingredients: ['flour', 'sugar', 'egg', 'chocolate', 'butter'] },

  { id: 'risotto',   name: 'Mushroom Risotto',    icon: '🍲', difficulty: 3, ingredients: ['rice', 'mushroom', 'butter', 'garlic', 'cream'] },
  { id: 'tacos',     name: 'Fish Tacos',          icon: '🌮', difficulty: 3, ingredients: ['dough', 'fish', 'lettuce', 'tomato', 'chili'] },
  { id: 'noodlebowl',name: 'Shrimp Noodles',      icon: '🍜', difficulty: 3, ingredients: ['noodles', 'shrimp', 'soy', 'garlic', 'pepper'] },
  { id: 'curry',     name: 'Chicken Curry',       icon: '🍛', difficulty: 3, ingredients: ['chicken', 'onion', 'garlic', 'chili', 'tomato', 'cream'] },
];

/**
 * Highest difficulty tier unlocked for a given round (1-indexed).
 * Rounds 1-2 -> tier 1, rounds 3-5 -> tier 2, rounds 6+ -> tier 3.
 */
export function maxDifficultyForRound(round) {
  if (round <= 2) return 1;
  if (round <= 5) return 2;
  return 3;
}

export function dishesForRound(round) {
  const cap = maxDifficultyForRound(round);
  // Bias toward the newest tier once it unlocks, but keep earlier ones in play.
  const pool = DISHES.filter((d) => d.difficulty <= cap);
  const top = pool.filter((d) => d.difficulty === cap);
  return top.length ? [...pool, ...top] : pool;
}
