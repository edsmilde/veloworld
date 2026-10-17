# Road cyclist asset

`road-cyclist.blend` is the editable Blender source; `road-cyclist.glb` is the
browser asset. `build_cyclist.py` regenerates both with installed Blender.
The preview PNG is a studio render, not part of the runtime asset.

The model is deliberately stylized, with articulated mesh segments and a looping
one-second pedal animation. It is not yet a continuous skinned human mesh.
The game controls animation speed from estimated cadence and rotates the wheels
independently. Blender +Y forward maps to Three.js -Z forward on glTF export.

Color customization uses independent named materials: BikeFrame, KitJersey,
KitShorts, Skin, Hair, Helmet, Shoes, Gloves, Tires, Metal, SaddleAndTape, Eyewear.
`setRiderColors(rig, { BikeFrame: '#00aabb', KitJersey: '#ff6600' })` in
`src/rider.js` changes these materials without rebuilding the model.

To regenerate from the repository directory:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/build_cyclist.py
```
