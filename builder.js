import { PLANT_TYPES, BUILDING_TYPES, plantOption } from './src/scenery-options.js?v=4';
import { vineyardLayout } from './src/vineyard.js';
import { sunflowerFieldLayout } from './src/sunflower-field.js';
import { isRouteTile } from './src/building-placement.js';

const GRID_COLUMNS = 18;
const GRID_ROWS = 12;
const canvas = document.getElementById('grid');
const context = canvas.getContext('2d');
const cellWidth = canvas.width / GRID_COLUMNS;
const cellHeight = canvas.height / GRID_ROWS;

const state = {
  mode: 'route',
  selected: null,
  hovered: null,
  smoothDrag: null,
  scenery: 'pine',
  ground: 'grass',
  route: [],
  cells: new Map(),
};

const scenerySymbols = { pine: '▲', deciduous: '●', palm: '♣', cactus: '†', shrub: '✦', flowers: '✿', farm: '●', villa: '⌂', house: '⌂', cottage: '⌂', barn: '▣' };
const elevation = document.getElementById('elevation');
const hillElevation = document.getElementById('hill-elevation');
const hillSize = document.getElementById('hill-size');
const sceneryLabels = {
  none: 'Erase scenery', pine: 'Pine tree', 'pine-forest': 'Pine forest', deciduous: 'Deciduous tree',
  'deciduous-forest': 'Deciduous forest', palm: 'Palm tree', cactus: 'Cactus', farm: 'Hay bale', villa: 'Mediterranean villa', house: 'Suburban house',
};
scenerySymbols.grape = '♣'; scenerySymbols.vineyard = '≋';
sceneryLabels.vineyard = 'Vineyard rows';
scenerySymbols.sunflower = '✺'; scenerySymbols['sunflower-field'] = '✺';
sceneryLabels['sunflower-field'] = 'Sunflower field';
sceneryLabels.cottage = 'Country cottage';
sceneryLabels.barn = 'Farm barn';
for (const type of PLANT_TYPES) {
  const name = type === 'grape' ? 'Grapevine' : type[0].toUpperCase() + type.slice(1);
  sceneryLabels[type] = `${name} — One (1)`;
  sceneryLabels[`${type}-few`] = `${name} — Few (5)`;
  sceneryLabels[`${type}-forest`] = `${name} — Dense (14)`;
}
const groundLabels = { base: 'Base theme ground', grass: 'Grass', rock: 'Rock', sand: 'Sand', dirt: 'Dirt' };
const groundColors = { grass: '#6f9259', rock: '#88847a', sand: '#d6b36c', dirt: '#8d5c3b' };

function key(column, row) {
  return `${column},${row}`;
}

function getCell(column, row) {
  const cellKey = key(column, row);
  if (!state.cells.has(cellKey)) state.cells.set(cellKey, { column, row, elevation: 0, scenery: 'none', ground: 'base' });
  return state.cells.get(cellKey);
}

function getCellAtEvent(event) {
  const bounds = canvas.getBoundingClientRect();
  const column = Math.min(GRID_COLUMNS - 1, Math.max(0, Math.floor((event.clientX - bounds.left) * canvas.width / bounds.width / cellWidth)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((event.clientY - bounds.top) * canvas.height / bounds.height / cellHeight)));
  return getCell(column, row);
}

function drawCell(cell) {
  if (cell.ground !== 'base') {
    context.fillStyle = groundColors[cell.ground];
    context.fillRect(cell.column * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);
    const elevationTint = Math.min(.24, Math.abs(cell.elevation) / 100 * .24);
    context.fillStyle = cell.elevation >= 0 ? `rgba(255, 255, 255, ${elevationTint})` : `rgba(0, 0, 0, ${elevationTint})`;
    context.fillRect(cell.column * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);
    return;
  }
  const normalized = (cell.elevation + 100) / 200;
  const hue = 198 - normalized * 92;
  const intensity = Math.round(35 + normalized * 45);
  context.fillStyle = `hsl(${hue}, ${35 + normalized * 18}%, ${intensity}%)`;
  context.fillRect(cell.column * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);
}

function drawGrid() {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) drawCell(getCell(column, row));
  }
  context.strokeStyle = 'rgba(23, 45, 37, .28)';
  context.lineWidth = 1;
  for (let column = 0; column <= GRID_COLUMNS; column += 1) {
    context.beginPath(); context.moveTo(column * cellWidth, 0); context.lineTo(column * cellWidth, canvas.height); context.stroke();
  }
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    context.beginPath(); context.moveTo(0, row * cellHeight); context.lineTo(canvas.width, row * cellHeight); context.stroke();
  }
}

function cellCenter(cell) {
  return { x: (cell.column + .5) * cellWidth, y: (cell.row + .5) * cellHeight };
}

function drawRoute() {
  if (!state.route.length) return;
  context.strokeStyle = '#f7da64';
  context.lineWidth = 7;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  state.route.forEach((cell, index) => {
    const point = cellCenter(cell);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();
  state.route.forEach((cell, index) => {
    const point = cellCenter(cell);
    context.fillStyle = index === 0 ? '#ec8f5a' : '#fff8c9';
    context.beginPath(); context.arc(point.x, point.y, 7, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#293b32'; context.font = 'bold 9px system-ui'; context.textAlign = 'center'; context.fillText(index + 1, point.x, point.y + 3);
  });
}

function drawScenery() {
  state.cells.forEach((cell) => {
    if (cell.scenery === 'none') return;
    if (['vineyard', 'sunflower-field'].includes(cell.scenery)) {
      context.fillStyle = cell.scenery === 'vineyard' ? '#385b27' : '#f4c52e';
      const layout = cell.scenery === 'vineyard' ? vineyardLayout() : sunflowerFieldLayout();
      for (const p of layout) {
        const x = (cell.column + .5 + p.x / 50) * cellWidth;
        const y = (cell.row + .5 + p.z / 50) * cellHeight;
        context.fillRect(x - 1.5, y - 1, 3, 2);
      }
      return;
    }
    const plant = plantOption(cell.scenery);
    if (plant && plant.count > 1) {
      drawForestPreview(cell, plant.type, plant.count);
      return;
    }
    const point = cellCenter(cell);
    context.fillStyle = cell.scenery === 'cactus' ? '#2e6538' : cell.scenery === 'farm' ? '#e2ba48' : cell.scenery === 'deciduous' ? '#426d34' : '#1d5136';
    context.font = '25px system-ui'; context.textAlign = 'center'; context.fillText(scenerySymbols[cell.scenery], point.x, point.y + 8);
  });
}

function forestRandom(cell, index) {
  const value = Math.sin((cell.column + 1) * 127.1 + (cell.row + 1) * 311.7 + index * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function drawForestPreview(cell, type, count) {
  context.fillStyle = type === 'pine' ? '#194c33' : '#426d34';
  for (let index = 0; index < count; index += 1) {
    const x = (cell.column + .13 + forestRandom(cell, index) * .74) * cellWidth;
    const y = (cell.row + .16 + forestRandom(cell, index + 29) * .68) * cellHeight;
    if (type === 'pine') {
      context.beginPath(); context.moveTo(x, y - 7); context.lineTo(x - 5, y + 5); context.lineTo(x + 5, y + 5); context.closePath(); context.fill();
    } else if (type === 'deciduous') {
      context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.fill();
    } else {
      context.font = '14px system-ui'; context.textAlign = 'center';
      context.fillText(scenerySymbols[type], x, y + 5);
    }
  }
}

function drawSelection() {
  if (!state.selected) return;
  context.strokeStyle = '#ffffff'; context.lineWidth = 3;
  context.strokeRect(state.selected.column * cellWidth + 2, state.selected.row * cellHeight + 2, cellWidth - 4, cellHeight - 4);
}

function drawHoverPreview() {
  if (!state.hovered) return;
  const cells = state.mode === 'hill'
    ? hillStampCells(state.hovered)
    : state.mode === 'smooth' && state.smoothDrag
      ? rectangleCells(state.smoothDrag.start, state.smoothDrag.end)
      : [state.hovered];
  context.fillStyle = 'rgba(255, 248, 185, .22)';
  context.strokeStyle = '#fff3a7';
  context.lineWidth = 2;
  cells.forEach((cell) => {
    context.fillRect(cell.column * cellWidth + 1, cell.row * cellHeight + 1, cellWidth - 2, cellHeight - 2);
    context.strokeRect(cell.column * cellWidth + 2, cell.row * cellHeight + 2, cellWidth - 4, cellHeight - 4);
  });
}

function render() {
  drawGrid(); drawRoute(); drawScenery(); drawHoverPreview(); drawSelection(); updateSummary();
}

function updateSummary() {
  document.getElementById('route-count').textContent = state.route.length;
  const populated = [...state.cells.values()].filter((cell) => cell.scenery !== 'none');
  document.getElementById('scenery-count').textContent = populated.length;
  const heights = [...state.cells.values()].map((cell) => cell.elevation);
  document.getElementById('elevation-range').textContent = `${Math.min(...heights)}–${Math.max(...heights)} m`;
  document.getElementById('mode-label').textContent = `${state.mode[0].toUpperCase()}${state.mode.slice(1)} mode`;
  document.getElementById('selected-label').textContent = state.selected ? `Cell ${state.selected.column + 1}, ${state.selected.row + 1}` : 'No cell selected';
}

function selectCell(cell, updateTools = true) {
  state.selected = cell;
  if (updateTools) {
    setElevationValue(cell.elevation);
  }
}

function setScenery(value) {
  state.scenery = sceneryLabels[value] ? value : 'none';
  document.querySelectorAll('.scenery-choice').forEach((button) => button.classList.toggle('active', button.dataset.scenery === state.scenery));
  document.getElementById('scenery-label').textContent = `${sceneryLabels[state.scenery]} — ${BUILDING_TYPES.includes(state.scenery) ? 'click a route tile to line both sides of the road' : 'click a block to place'}`;
}

function setGround(value) {
  state.ground = groundLabels[value] ? value : 'base';
  document.querySelectorAll('.ground-choice').forEach((button) => button.classList.toggle('active', button.dataset.ground === state.ground));
  document.getElementById('ground-label').textContent = `${groundLabels[state.ground]} — click a block to paint`;
}

function setElevationValue(value) {
  elevation.value = value;
  hillElevation.value = value;
  document.getElementById('elevation-output').value = `${value} m`;
  document.getElementById('hill-elevation-output').value = `${value} m`;
}

function clampElevation(value) {
  return Math.max(-100, Math.min(100, Math.round(value * 10) / 10));
}

function hillStampCells(center) {
  const size = Number(hillSize.value);
  const radius = Math.floor(size / 2);
  const cells = [];
  for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
    for (let columnOffset = -radius; columnOffset <= radius; columnOffset += 1) {
      // Even-sized stamps have no single mathematical center. Keep their requested
      // size by omitting the far positive edge, with the clicked cell as the peak.
      if (size % 2 === 0 && (rowOffset === radius || columnOffset === radius)) continue;
      const gridColumn = center.column + columnOffset;
      const gridRow = center.row + rowOffset;
      if (gridColumn < 0 || gridColumn >= GRID_COLUMNS || gridRow < 0 || gridRow >= GRID_ROWS) continue;
      cells.push(getCell(gridColumn, gridRow));
    }
  }
  return cells;
}

function rectangleCells(start, end) {
  const cells = [];
  const firstColumn = Math.min(start.column, end.column);
  const lastColumn = Math.max(start.column, end.column);
  const firstRow = Math.min(start.row, end.row);
  const lastRow = Math.max(start.row, end.row);
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) cells.push(getCell(column, row));
  }
  return cells;
}

function paintHill(center) {
  const peak = Number(hillElevation.value);
  const radius = Math.floor(Number(hillSize.value) / 2);
  const stamps = hillStampCells(center).map((cell) => ({
    cell,
    ring: Math.max(Math.abs(cell.column - center.column), Math.abs(cell.row - center.row)),
  }));
  stamps.forEach(({ cell, ring }) => {
    const influence = 1 - ring / (radius + 1);
    cell.elevation = clampElevation(cell.elevation + (peak - cell.elevation) * influence);
  });
}

function smoothTerrain(cells) {
  const elevations = new Map([...state.cells.values()].map((cell) => [key(cell.column, cell.row), cell.elevation]));
  const elevationAt = (column, row) => elevations.get(key(column, row)) ?? getCell(column, row).elevation;
  const smoothed = cells.map((cell) => {
    const neighbours = [];
    for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
      for (let column = cell.column - 1; column <= cell.column + 1; column += 1) {
        if (column >= 0 && column < GRID_COLUMNS && row >= 0 && row < GRID_ROWS) neighbours.push(elevationAt(column, row));
      }
    }
    return { cell, elevation: clampElevation(neighbours.reduce((total, value) => total + value, 0) / neighbours.length) };
  });
  smoothed.forEach(({ cell, elevation: nextElevation }) => { cell.elevation = nextElevation; });
}

canvas.addEventListener('pointermove', (event) => {
  const cell = getCellAtEvent(event);
  if (state.smoothDrag) {
    state.smoothDrag.end = cell;
    state.hovered = cell;
    render();
    return;
  }
  if (state.hovered === cell) return;
  state.hovered = cell;
  render();
});

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'smooth') return;
  const cell = getCellAtEvent(event);
  state.smoothDrag = { start: cell, end: cell };
  state.hovered = cell;
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener('pointerup', (event) => {
  if (!state.smoothDrag) return;
  const end = getCellAtEvent(event);
  const cells = rectangleCells(state.smoothDrag.start, end);
  smoothTerrain(cells);
  state.selected = end;
  state.hovered = end;
  state.smoothDrag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  render();
});

canvas.addEventListener('pointerleave', () => {
  if (state.smoothDrag) return;
  if (!state.hovered) return;
  state.hovered = null;
  render();
});

canvas.addEventListener('click', (event) => {
  if (state.mode === 'smooth') return;
  const cell = getCellAtEvent(event);
  const isPainting = ['elevation', 'ground', 'scenery', 'hill'].includes(state.mode);
  selectCell(cell, !isPainting);
  if (state.mode === 'route') state.route.push(cell);
  if (state.mode === 'elevation') cell.elevation = Number(elevation.value);
  if (state.mode === 'ground') cell.ground = state.ground;
  if (state.mode === 'scenery') {
    const building = BUILDING_TYPES.includes(state.scenery);
    if (!building || isRouteTile(cell, state.route)) cell.scenery = state.scenery;
    else document.getElementById('scenery-label').textContent = 'Houses and villas need a route tile — draw the road first.';
  }
  if (state.mode === 'hill') paintHill(cell);
  render();
});

document.querySelectorAll('.mode').forEach((button) => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll('.mode').forEach((item) => item.classList.toggle('active', item === button));
  document.querySelectorAll('.tool-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.modePanel === state.mode));
  render();
}));

elevation.addEventListener('input', () => {
  setElevationValue(elevation.value);
  render();
});

hillElevation.addEventListener('input', () => {
  setElevationValue(hillElevation.value);
  render();
});

hillSize.addEventListener('change', render);

// Each plant gets one clearly labeled row with three density choices.
const sceneryPalette = document.querySelector('[aria-label="Scenery to place"]');
const buildingPalette = document.getElementById('building-palette');
sceneryPalette.querySelectorAll('[data-scenery]').forEach((button) => {
  if (plantOption(button.dataset.scenery)) button.remove();
  else if (BUILDING_TYPES.includes(button.dataset.scenery)) buildingPalette.append(button);
});
for (const type of ['cottage', 'barn']) {
  const button = document.createElement('button'); button.type = 'button';
  button.className = 'scenery-choice'; button.dataset.scenery = type;
  button.title = sceneryLabels[type]; button.setAttribute('aria-label', sceneryLabels[type]);
  const icon = document.createElement('span'); icon.className = 'scenery-icon'; icon.textContent = scenerySymbols[type];
  const name = document.createElement('span'); name.className = 'scenery-name'; name.textContent = sceneryLabels[type];
  button.append(icon, name); buildingPalette.append(button);
}
const otherPalette = document.getElementById('other-scenery-palette');
sceneryPalette.querySelectorAll('[data-scenery]').forEach(button => otherPalette.append(button));
const plantButtons = document.createDocumentFragment();
for (const type of PLANT_TYPES) {
  const heading = document.createElement('div');
  heading.className = 'plant-heading';
  heading.textContent = type[0].toUpperCase() + type.slice(1);
  plantButtons.append(heading);
  for (const [suffix, label] of [['', 'One (1)'], ['-few', 'Few (5)'], ['-forest', 'Dense (14)']]) {
    const value = type + suffix;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scenery-choice';
    button.dataset.scenery = value;
    button.title = sceneryLabels[value];
    button.setAttribute('aria-label', sceneryLabels[value]);
    const icon = document.createElement('span'); icon.className = 'scenery-icon';
    icon.textContent = scenerySymbols[type].repeat(suffix === '' ? 1 : suffix === '-few' ? 2 : 3);
    const name = document.createElement('span'); name.className = 'scenery-name'; name.textContent = label;
    button.append(icon, name); plantButtons.append(button);
  }
}
sceneryPalette.prepend(plantButtons);
const vineyardButton = document.createElement('button');
vineyardButton.type = 'button'; vineyardButton.className = 'scenery-choice';
vineyardButton.dataset.scenery = 'vineyard'; vineyardButton.title = 'Vineyard — five rows of ten grapevines per block';
vineyardButton.textContent = '≋ Vineyard rows';
vineyardButton.style.gridColumn = '1 / -1';
sceneryPalette.append(vineyardButton);
const sunflowerButton = document.createElement('button');
sunflowerButton.type = 'button'; sunflowerButton.className = 'scenery-choice';
sunflowerButton.dataset.scenery = 'sunflower-field';
sunflowerButton.title = 'Sunflower field — twelve rows of twelve flowers per block';
sunflowerButton.textContent = '✺ Sunflower field'; sunflowerButton.style.gridColumn = '1 / -1';
sceneryPalette.append(sunflowerButton);
setScenery(state.scenery);

document.querySelectorAll('.scenery-choice[data-scenery]').forEach((button) => button.addEventListener('click', () => {
  setScenery(button.dataset.scenery);
  render();
}));

document.querySelectorAll('.ground-choice').forEach((button) => button.addEventListener('click', () => {
  setGround(button.dataset.ground);
  render();
}));

document.getElementById('undo-route').onclick = () => { state.route.pop(); render(); };
document.getElementById('clear-route').onclick = () => { state.route = []; render(); };
document.getElementById('clear-world').onclick = () => {
  if (!confirm('Clear the route, elevation, and scenery?')) return;
  state.route = [];
  state.cells.clear();
  state.selected = null;
  setElevationValue(0);
  document.getElementById('world-name').value = 'My Custom World';
  document.getElementById('route-name').value = 'New Loop';
  document.getElementById('world-theme').value = 'Alpine';
  localStorage.removeItem('veloworld-builder-draft');
  render();
};

function buildWorldDefinition() {
  return {
    version: 1,
    name: document.getElementById('world-name').value,
    routeName: document.getElementById('route-name').value,
    theme: document.getElementById('world-theme').value,
    grid: { columns: GRID_COLUMNS, rows: GRID_ROWS },
    route: state.route.map(({ column, row }) => ({ column, row })),
    cells: [...state.cells.values()].filter((cell) => cell.elevation || cell.scenery !== 'none' || cell.ground !== 'base'),
  };
}

document.getElementById('save-button').onclick = () => {
  localStorage.setItem('veloworld-builder-draft', JSON.stringify(buildWorldDefinition()));
  document.getElementById('save-button').textContent = 'Saved!';
  setTimeout(() => { document.getElementById('save-button').textContent = 'Save locally'; }, 1500);
};

document.getElementById('export-button').onclick = () => {
  const blob = new Blob([JSON.stringify(buildWorldDefinition(), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${document.getElementById('world-name').value.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'veloworld'}-world.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const saved = localStorage.getItem('veloworld-builder-draft');
if (saved) {
  const draft = JSON.parse(saved);
  document.getElementById('world-name').value = draft.name || 'My Custom World';
  document.getElementById('route-name').value = draft.routeName || 'New Loop';
  document.getElementById('world-theme').value = draft.theme || 'Alpine';
  draft.cells?.forEach((cell) => Object.assign(getCell(cell.column, cell.row), cell));
  state.route = draft.route?.map((point) => getCell(point.column, point.row)) || [];
}

render();
