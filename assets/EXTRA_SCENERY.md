# Additional scenery

`extra-scenery-library.blend` contains three shrubs, three flowering bushes,
three country cottages and three farm barns. Individual GLBs live in `trees/`
and `buildings/`. Material slots keep foliage, blossoms, walls, roofs, trim,
doors, glass and stone independently editable. Interiors are not modeled.

The builder separates Plants, Buildings and Other/erase into collapsible
sections. All six plant types support One (1), Few (5), Dense (14). All four
building types use route-tile roadside placement and face the road.

Regenerate with:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/build_extra_scenery.py
```

The script also saves a studio preview. Runtime instances share geometry and
materials; assets are loaded once per variant, with procedural fallbacks.
