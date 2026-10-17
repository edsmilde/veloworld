# Tree library

Three pine and three deciduous variants, exported as game-ready GLB assets.
The game selects a repeatable variant and rotation from each tree's location,
while retaining the scenery placement's existing size variation.

Open `tree-library.blend` to edit the models. Each tree uses separate bark and
foliage materials so colors can be changed independently. Origins are at ground
level; the GLB exports use glTF's Y-up convention.

Rebuild the library and preview from the project directory:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/build_trees.py
```

Existing single-tree and forest scenery tools use these assets automatically.
The basic procedural trees remain as a fallback if loading fails.

Three palm and three saguaro cactus variants use the same automatic selection.
Their editable source is `palms-cacti-library.blend`. Palms have curved, ringed
trunks, individual leaflets and coconuts; cacti vary in height and arm layout.
Bark, fronds, coconuts, cactus skin and ribs have independent material slots.
Rebuild these assets with `assets/build_palms_cacti.py` using the command above.
