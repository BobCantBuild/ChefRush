# Chef Rush

A mobile cooking game set in a 3D kitchen. An order arrives with its recipe;
you tap what you need and your chef fetches it — from the fridge, the wall
pantry or the produce crates — carries it back and drops it in the bowl. Mix,
microwave, and get graded. Eight orders per run, scored 0–3 stars each.

Built with plain HTML / CSS / JavaScript and **three.js**. There is **no build
step** — the browser loads the modules directly, so what you run locally is
exactly what ships inside the Android app.

## Run it

The game uses ES modules, so it must be served over HTTP (opening
`index.html` from the filesystem will not work — it shows a message telling you
so rather than failing silently).

```bash
py serve.py
```

Then open <http://localhost:8080>. `serve.py` is a plain static server that
sends `no-store`, because the stock `python -m http.server` lets browsers cache
JS and CSS heuristically — which makes an edit look like it did nothing.

## How it plays

| Phase | What happens |
|---|---|
| **Order** | A dish is drawn at random. Its ingredients — plus decoys — are distributed across the three stations, and the countdown starts. |
| **Pick** | Choose a station to zoom into it (the fridge door swings open). Every item wears a name tag; tap one and the chef walks over, picks it up and drops it in the bowl. Tap a ticked chip on the recipe card to take an item back out. |
| **Mix** | "Mix & Cook" spins the bowl and blends the contents into one batter. |
| **Cook** | The chef carries the bowl to the microwave, the door shuts, and the timer runs. |
| **Score** | The plate is revealed and the order is graded. |

Ingredients live in one of three stations, and the recipe card shows a badge
(❄️ 🫙 🧺) next to each item so you know where to look:

- **Fridge** — dairy, eggs, meat and fish. The door has to open first.
- **Pantry** — dry goods on open wall shelves.
- **Produce** — fruit and vegetables in crates on the island.

You pick your chef (Ava or Leo) on the menu; the choice is remembered.

Scoring is a set comparison, so pick order never matters:

```
base      = 100 x correct ingredients
penalty   = 60 x wrong + 40 x missing
timeBonus = remaining time / 100   (perfect orders only)

3 stars = perfect, with more than half the clock left
2 stars = perfect
1 star  = at least half the recipe right, at most one wrong item
0 stars = anything less, or the timer expired
```

Difficulty comes from content rather than new mechanics: later rounds pull
harder dishes and seed the shelf with more decoys, while the clock shortens.

## Layout

```
serve.py                No-cache dev server
capacitor.config.json   Android packaging config (used at milestone 6)
BUILD-ANDROID.md        Toolchain install + APK build steps
www/                    Everything that ships. Capacitor's webDir.
  index.html
  css/style.css
  vendor/three.module.js    three.js r168 (MIT), vendored - no package manager
  js/
    main.js               orchestration: RAF loop, wires state <-> scene <-> UI
    config.js             every gameplay tunable
    state.js              state machine + scoring (no DOM, no three.js)
    audio.js              WebAudio synthesis - no audio files
    storage.js            high score + chef choice persistence
    data/                 dish + ingredient catalogs, incl. each item's station
    scene/
      renderer.js         scene, camera, lights, DPR cap
      cameraRig.js        glides between the wide shot and each station framing
      kitchen.js          room: floor, wall, counter runs, cabinets
      stations.js         fridge / pantry / produce furniture, slot grids, framings
      kitchenItems.js     places a round's ingredients into slots, owns name tags
      chef.js             procedural character + walk / reach animation
      label.js            canvas-texture name tags
      picker.js           ray-vs-sphere tap targets, no extra draw calls
      bowl.js oven.js ingredientMesh.js
    ui/                   DOM: hud, recipe card, station bar, results, screens
    util/anim.js          tween engine driven by the main loop
```

### Layout constraints worth knowing

Three things in the 3D layout are load-bearing and easy to break:

- **The island is deliberately shallow.** A deeper top surface cuts the wide
  camera's line of sight to the chef standing behind it and hides them from the
  waist down.
- **Station slot rows are centred per row** (`gridSlot` in `stations.js`). A row
  holding one item would otherwise sit in the far-left column and fall outside
  the zoomed camera.
- **Name tag width is capped** by aspect ratio in `label.js`. Tags are sized in
  world units by their height, so a long word like "Strawberry" otherwise
  renders wider than the column it sits in and spills off-screen.

`state.js` knows nothing about rendering, and the scene and UI both subscribe to
it via `on(event, fn)`. That split is why the rules can be tested without a
canvas.

## Adding content

Both catalogs are plain data — no code change required.

```js
// www/js/data/ingredients.js
{ id: 'leek', label: 'Leek', icon: '🥬', color: 0x9ccc65, shape: 'cylinder', scale: 1.0 }

// www/js/data/dishes.js
{ id: 'soup', name: 'Leek Soup', icon: '🍲', difficulty: 2,
  ingredients: ['leek', 'potato', 'butter', 'cream'] }
```

`shape` is one of `sphere | cube | cylinder | cone | torus | slab`; the 3D mesh
is generated from it, so there is no model to author.

## Performance notes

- Device pixel ratio is capped at 2 — the single biggest win on high-density phones.
- No shadow maps. The bowl is grounded with a soft gradient sprite instead.
- Geometries are shared per shape; only materials are cloned.
- A full scene is ~24 draw calls and ~900 triangles.
- The render loop stops entirely when the page is hidden.
