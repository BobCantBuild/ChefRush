// Ingredient catalog. Adding a new ingredient is one entry — the 3D mesh is
// generated from `shape` + `color` by scene/ingredientMesh.js, so there is no
// art asset to produce.
//
// shape: sphere | cube | cylinder | cone | torus | slab
// store: fridge | pantry | produce  — which station the chef fetches it from

export const INGREDIENTS = [
  // ---------------------------------------------------------- fridge ---
  { id: 'milk',       label: 'Milk',       icon: '🥛', color: 0xfbfbf7, shape: 'cylinder', scale: 1.0,  store: 'fridge' },
  { id: 'cream',      label: 'Cream',      icon: '🍶', color: 0xf3ead7, shape: 'cylinder', scale: 0.9,  store: 'fridge' },
  { id: 'butter',     label: 'Butter',     icon: '🧈', color: 0xf5df82, shape: 'cube',     scale: 0.8,  store: 'fridge' },
  { id: 'egg',        label: 'Egg',        icon: '🥚', color: 0xfaf3e3, shape: 'sphere',   scale: 0.9,  store: 'fridge' },
  { id: 'cheese',     label: 'Cheese',     icon: '🧀', color: 0xf5c542, shape: 'cube',     scale: 0.95, store: 'fridge' },
  { id: 'chicken',    label: 'Chicken',    icon: '🍗', color: 0xd9a05b, shape: 'cube',     scale: 1.0,  store: 'fridge' },
  { id: 'beef',       label: 'Beef',       icon: '🥩', color: 0xa33b3b, shape: 'cube',     scale: 1.05, store: 'fridge' },
  { id: 'bacon',      label: 'Bacon',      icon: '🥓', color: 0xd9736b, shape: 'slab',     scale: 0.9,  store: 'fridge' },
  { id: 'fish',       label: 'Fish',       icon: '🐟', color: 0x9fb8c9, shape: 'slab',     scale: 1.0,  store: 'fridge' },
  { id: 'shrimp',     label: 'Shrimp',     icon: '🦐', color: 0xf08a6c, shape: 'torus',    scale: 0.75, store: 'fridge' },

  // ---------------------------------------------------------- pantry ---
  { id: 'flour',      label: 'Flour',      icon: '🌾', color: 0xece2cf, shape: 'cube',     scale: 0.9,  store: 'pantry' },
  { id: 'sugar',      label: 'Sugar',      icon: '🍬', color: 0xffffff, shape: 'cube',     scale: 0.7,  store: 'pantry' },
  { id: 'rice',       label: 'Rice',       icon: '🍚', color: 0xf7f4ee, shape: 'cylinder', scale: 0.85, store: 'pantry' },
  { id: 'noodles',    label: 'Noodles',    icon: '🍜', color: 0xe8cf82, shape: 'torus',    scale: 1.05, store: 'pantry' },
  { id: 'honey',      label: 'Honey',      icon: '🍯', color: 0xe0a020, shape: 'cylinder', scale: 0.8,  store: 'pantry' },
  { id: 'soy',        label: 'Soy Sauce',  icon: '🍶', color: 0x4a2c1a, shape: 'cylinder', scale: 0.85, store: 'pantry' },
  { id: 'chocolate',  label: 'Chocolate',  icon: '🍫', color: 0x5b3a24, shape: 'slab',     scale: 0.85, store: 'pantry' },
  { id: 'dough',      label: 'Dough',      icon: '🥟', color: 0xe8c99b, shape: 'slab',     scale: 1.15, store: 'pantry' },
  { id: 'olive',      label: 'Olive',      icon: '🫒', color: 0x4a5d23, shape: 'torus',    scale: 0.8,  store: 'pantry' },
  { id: 'garlic',     label: 'Garlic',     icon: '🧄', color: 0xf0e6dc, shape: 'cone',     scale: 0.75, store: 'pantry' },
  { id: 'corn',       label: 'Corn',       icon: '🌽', color: 0xf2c33d, shape: 'cylinder', scale: 0.9,  store: 'pantry' },

  // --------------------------------------------------------- produce ---
  { id: 'tomato',     label: 'Tomato',     icon: '🍅', color: 0xe23b2e, shape: 'sphere',   scale: 1.0,  store: 'produce' },
  { id: 'basil',      label: 'Basil',      icon: '🌿', color: 0x3fa34d, shape: 'slab',     scale: 0.7,  store: 'produce' },
  { id: 'mushroom',   label: 'Mushroom',   icon: '🍄', color: 0xb9a189, shape: 'cone',     scale: 0.95, store: 'produce' },
  { id: 'onion',      label: 'Onion',      icon: '🧅', color: 0xb98ac4, shape: 'sphere',   scale: 0.95, store: 'produce' },
  { id: 'pepper',     label: 'Pepper',     icon: '🫑', color: 0x2f9e44, shape: 'cone',     scale: 1.0,  store: 'produce' },
  { id: 'chili',      label: 'Chili',      icon: '🌶️', color: 0xd12b1f, shape: 'cone',     scale: 0.85, store: 'produce' },
  { id: 'lettuce',    label: 'Lettuce',    icon: '🥬', color: 0x6fbf4a, shape: 'slab',     scale: 1.1,  store: 'produce' },
  { id: 'cucumber',   label: 'Cucumber',   icon: '🥒', color: 0x4e9b52, shape: 'cylinder', scale: 0.95, store: 'produce' },
  { id: 'carrot',     label: 'Carrot',     icon: '🥕', color: 0xed7014, shape: 'cone',     scale: 1.0,  store: 'produce' },
  { id: 'potato',     label: 'Potato',     icon: '🥔', color: 0xc9a06a, shape: 'sphere',   scale: 1.0,  store: 'produce' },
  { id: 'banana',     label: 'Banana',     icon: '🍌', color: 0xf5d442, shape: 'cylinder', scale: 0.9,  store: 'produce' },
  { id: 'strawberry', label: 'Strawberry', icon: '🍓', color: 0xe63950, shape: 'cone',     scale: 0.8,  store: 'produce' },
];

/** Display metadata for each storage station. */
export const STORES = {
  fridge:  { id: 'fridge',  label: 'Fridge',  icon: '❄️' },
  pantry:  { id: 'pantry',  label: 'Pantry',  icon: '🫙' },
  produce: { id: 'produce', label: 'Produce', icon: '🧺' },
};

const BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id) {
  const ing = BY_ID.get(id);
  if (!ing) throw new Error(`Unknown ingredient: ${id}`);
  return ing;
}

export function allIngredientIds() {
  return INGREDIENTS.map((i) => i.id);
}

/** Groups a list of ingredient ids by the station they live in. */
export function groupByStore(ids) {
  const out = { fridge: [], pantry: [], produce: [] };
  for (const id of ids) out[getIngredient(id).store].push(id);
  return out;
}
