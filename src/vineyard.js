// Identical layout is used by the builder preview and the game.
export function vineyardLayout() {
  return Array.from({ length: 50 }, (_, i) => ({ x: -20.25 + (i % 10) * 4.5, z: -16 + Math.floor(i / 10) * 8 }));
}
