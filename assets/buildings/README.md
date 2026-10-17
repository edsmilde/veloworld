# Building library

Three Italian villa and three suburban house variants. Existing Villa and House
builder tools still place one building per tile. The game picks a repeatable
variant from the tile's world coordinates; built-in worlds use them too.

`building-library.blend` is the editable Blender source. GLBs have ground-level
origins and export in glTF Y-up coordinates. Material slots separate walls,
roofing, trim, glass, doors, shutters, stone, and railings where applicable.
Models include pitched roofs, window frames, entry steps and chimneys. Villas
have terracotta tile detail and balconies; suburban houses have garages and
porches. Interiors are not modeled.

Rebuild from the project directory:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/build_houses.py
```

Instances share loaded geometry/materials; each of the six assets downloads
once. Basic procedural buildings remain as a loading/error fallback.
