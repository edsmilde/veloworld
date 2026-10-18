export function sunflowerFieldLayout() {
  return Array.from({ length: 144 }, (_, i) => ({ x: -19.8 + (i % 12) * 3.6, z: -19.8 + Math.floor(i / 12) * 3.6 }));
}
