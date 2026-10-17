export const PLANT_TYPES = ['pine', 'deciduous', 'palm', 'cactus', 'shrub', 'flowers'];
export const BUILDING_TYPES = ['villa', 'house', 'cottage', 'barn'];

// Retain -forest identifiers for compatibility with existing saved worlds.
export function plantOption(scenery) {
  const [type, density] = scenery.split('-');
  if (!PLANT_TYPES.includes(type) || ![undefined, 'few', 'forest'].includes(density)) return null;
  return { type, count: density === 'forest' ? 14 : density === 'few' ? 5 : 1 };
}

export const VALID_SCENERY = ['none', 'farm', ...BUILDING_TYPES,
  ...PLANT_TYPES.flatMap((type) => [type, `${type}-few`, `${type}-forest`])];
