import { plantOption, VALID_SCENERY } from './scenery-options.js?v=2';

export const CUSTOM_WORLD_STORAGE_KEY = 'veloworld-custom-world';
export const GRID_CELL_SIZE_METERS = 50;
// Custom worlds use a direct scale: one value in the builder equals one meter
// in the ride scene. A single grid block spans roughly 50 meters.
export const ELEVATION_SCENE_SCALE = 1;

const THEME_PALETTES = {
  alpine: { sky: '#8bbad5', fog: '#8bbad5', ground: '#6f9259', road: '#3c4245', scenery: 'pine' },
  desert: { sky: '#f3b47f', fog: '#f3b47f', ground: '#c98d55', road: '#4a423d', scenery: 'cactus' },
  tropical: { sky: '#78d2e6', fog: '#78d2e6', ground: '#83b865', road: '#424246', scenery: 'palm' },
  farmland: { sky: '#b8d7eb', fog: '#b8d7eb', ground: '#a7b960', road: '#454647', scenery: 'farm' },
  mediterranean: { sky: '#91cae2', fog: '#91cae2', ground: '#a9ad61', road: '#454247', scenery: 'mediterranean' },
  suburban: { sky: '#a7d2e7', fog: '#a7d2e7', ground: '#79ac69', road: '#3d4143', scenery: 'suburb' },
};

function asInteger(value, fallback = 0) {
  return Number.isInteger(value) ? value : fallback;
}

function validatePoint(point, grid) {
  if (!point || typeof point !== 'object') return null;
  const column = asInteger(point.column, -1);
  const row = asInteger(point.row, -1);
  return column >= 0 && column < grid.columns && row >= 0 && row < grid.rows ? { column, row } : null;
}

export function validateWorldDefinition(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) throw new Error('This is not a VeloWorld builder file (version 1).');
  const columns = asInteger(value.grid?.columns, 0);
  const rows = asInteger(value.grid?.rows, 0);
  if (columns < 3 || columns > 64 || rows < 3 || rows > 64) throw new Error('The world grid has unsupported dimensions.');
  if (!Array.isArray(value.route)) throw new Error('The world file does not contain a route.');

  const grid = { columns, rows };
  const route = value.route.map((point) => validatePoint(point, grid)).filter(Boolean);
  const first = route[0];
  const last = route.at(-1);
  if (route.length > 3 && first.column === last.column && first.row === last.row) route.pop();
  if (route.length < 3) throw new Error('Draw at least three route points before importing.');

  const cells = (Array.isArray(value.cells) ? value.cells : []).map((cell) => {
    const point = validatePoint(cell, grid);
    if (!point) return null;
    const elevation = Math.max(-100, Math.min(100, Number(cell.elevation) || 0));
    const validGround = ['base', 'grass', 'rock', 'sand', 'dirt'];
    return {
      ...point,
      elevation,
      scenery: VALID_SCENERY.includes(cell.scenery) ? cell.scenery : 'none',
      ground: validGround.includes(cell.ground) ? cell.ground : 'base',
    };
  }).filter(Boolean);

  return {
    version: 1,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 60) : 'My Custom World',
    routeName: typeof value.routeName === 'string' && value.routeName.trim() ? value.routeName.trim().slice(0, 60) : 'Custom Loop',
    theme: typeof value.theme === 'string' ? value.theme : 'Alpine',
    grid,
    route,
    cells,
  };
}

export function saveCustomWorld(definition) {
  const validated = validateWorldDefinition(definition);
  localStorage.setItem(CUSTOM_WORLD_STORAGE_KEY, JSON.stringify(validated));
  return validated;
}

export function loadCustomWorld() {
  const saved = localStorage.getItem(CUSTOM_WORLD_STORAGE_KEY);
  if (!saved) return null;
  try {
    return validateWorldDefinition(JSON.parse(saved));
  } catch {
    localStorage.removeItem(CUSTOM_WORLD_STORAGE_KEY);
    return null;
  }
}

function cellPosition(cell, grid) {
  const spacing = GRID_CELL_SIZE_METERS;
  return { x: (cell.column - (grid.columns - 1) / 2) * spacing, z: (cell.row - (grid.rows - 1) / 2) * spacing };
}

function forestRandom(cell, index) {
  const value = Math.sin((cell.column + 1) * 127.1 + (cell.row + 1) * 311.7 + index * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function forestTrees(cell, grid, scenery) {
  const center = cellPosition(cell, grid);
  const { type, count } = plantOption(scenery);
  return Array.from({ length: count }, (_, index) => ({
    scenery: type,
    x: center.x + (forestRandom(cell, index) - .5) * GRID_CELL_SIZE_METERS * .82,
    z: center.z + (forestRandom(cell, index + 29) - .5) * GRID_CELL_SIZE_METERS * .82,
    scale: .65 + forestRandom(cell, index + 57) * .55,
  }));
}

function buildHeightFunction(definition) {
  const heights = new Map(definition.cells.map((cell) => [`${cell.column},${cell.row}`, cell.elevation * ELEVATION_SCENE_SCALE]));
  const { columns, rows } = definition.grid;
  const spacing = GRID_CELL_SIZE_METERS;
  const heightAtCell = (column, row) => heights.get(`${Math.max(0, Math.min(columns - 1, column))},${Math.max(0, Math.min(rows - 1, row))}`) || 0;
  return (x, z) => {
    const column = x / spacing + (columns - 1) / 2;
    const row = z / spacing + (rows - 1) / 2;
    const c0 = Math.floor(column); const r0 = Math.floor(row);
    const tx = column - c0; const tz = row - r0;
    const a = heightAtCell(c0, r0) * (1 - tx) + heightAtCell(c0 + 1, r0) * tx;
    const b = heightAtCell(c0, r0 + 1) * (1 - tx) + heightAtCell(c0 + 1, r0 + 1) * tx;
    return a * (1 - tz) + b * tz;
  };
}

function buildGroundFunction(definition) {
  const grounds = new Map(definition.cells.map((cell) => [`${cell.column},${cell.row}`, cell.ground]));
  const { columns, rows } = definition.grid;
  return (x, z) => {
    const rawColumn = x / GRID_CELL_SIZE_METERS + (columns - 1) / 2;
    const rawRow = z / GRID_CELL_SIZE_METERS + (rows - 1) / 2;
    if (rawColumn < -.5 || rawColumn > columns - .5 || rawRow < -.5 || rawRow > rows - .5) return 'base';
    const column = Math.round(rawColumn);
    const row = Math.round(rawRow);
    return grounds.get(`${column},${row}`) || 'base';
  };
}

export function createCustomWorld(definition) {
  const palette = THEME_PALETTES[definition.theme.toLowerCase()] || THEME_PALETTES.alpine;
  const terrain = buildHeightFunction(definition);
  const groundAt = buildGroundFunction(definition);
  return {
    id: 'custom', label: definition.routeName, ...palette, terrain, groundAt,
    elevationMetersPerSceneUnit: 1 / ELEVATION_SCENE_SCALE,
    groundPatches: definition.cells
      .filter((cell) => cell.ground !== 'base')
      .map((cell) => ({ ...cell, ...cellPosition(cell, definition.grid) })),
    customScenery: definition.cells.filter((cell) => cell.scenery !== 'none').flatMap((cell) => (
      (plantOption(cell.scenery)?.count || 0) > 1
        ? forestTrees(cell, definition.grid, cell.scenery)
        : [{ ...cell, ...cellPosition(cell, definition.grid) }]
    )),
    routePoints: definition.route.map((cell) => cellPosition(cell, definition.grid)),
  };
}
