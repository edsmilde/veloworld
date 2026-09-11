const GRID_COLUMNS = 18;
const GRID_ROWS = 12;
const canvas = document.getElementById('grid');
const context = canvas.getContext('2d');
const cellWidth = canvas.width / GRID_COLUMNS;
const cellHeight = canvas.height / GRID_ROWS;

const state = {
  mode: 'route',
  selected: null,
  route: [],
  cells: new Map(),
};

const scenerySymbols = { pine: '▲', palm: '♣', cactus: '†', farm: '●', villa: '⌂', house: '⌂' };
const elevation = document.getElementById('elevation');
const scenery = document.getElementById('scenery');
const hillSize = document.getElementById('hill-size');

function key(column, row) {
  return `${column},${row}`;
}

function getCell(column, row) {
  const cellKey = key(column, row);
  if (!state.cells.has(cellKey)) state.cells.set(cellKey, { column, row, elevation: 0, scenery: 'none' });
  return state.cells.get(cellKey);
}

function getCellAtEvent(event) {
  const bounds = canvas.getBoundingClientRect();
  const column = Math.min(GRID_COLUMNS - 1, Math.max(0, Math.floor((event.clientX - bounds.left) * canvas.width / bounds.width / cellWidth)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((event.clientY - bounds.top) * canvas.height / bounds.height / cellHeight)));
  return getCell(column, row);
}

function drawCell(cell) {
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
    const point = cellCenter(cell);
    context.fillStyle = cell.scenery === 'cactus' ? '#2e6538' : cell.scenery === 'farm' ? '#e2ba48' : '#1d5136';
    context.font = '25px system-ui'; context.textAlign = 'center'; context.fillText(scenerySymbols[cell.scenery], point.x, point.y + 8);
  });
}

function drawSelection() {
  if (!state.selected) return;
  context.strokeStyle = '#ffffff'; context.lineWidth = 3;
  context.strokeRect(state.selected.column * cellWidth + 2, state.selected.row * cellHeight + 2, cellWidth - 4, cellHeight - 4);
}

function render() {
  drawGrid(); drawRoute(); drawScenery(); drawSelection(); updateSummary();
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
    elevation.value = cell.elevation;
    document.getElementById('elevation-output').value = `${cell.elevation} m`;
    scenery.value = cell.scenery;
  }
}

function clampElevation(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function paintHill(center) {
  const size = Number(hillSize.value);
  const peak = Number(elevation.value);
  const offset = (size - 1) / 2;
  const stamps = [];
  let largestFalloff = 0;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const gridColumn = Math.round(center.column - offset + column);
      const gridRow = Math.round(center.row - offset + row);
      if (gridColumn < 0 || gridColumn >= GRID_COLUMNS || gridRow < 0 || gridRow >= GRID_ROWS) continue;
      const distance = Math.hypot(column - offset, row - offset);
      const falloff = Math.max(0, 1 - distance / (size / 2));
      largestFalloff = Math.max(largestFalloff, falloff);
      stamps.push({ gridColumn, gridRow, falloff });
    }
  }
  stamps.forEach(({ gridColumn, gridRow, falloff }) => {
    getCell(gridColumn, gridRow).elevation = clampElevation(peak * falloff / largestFalloff);
  });
}

function smoothTerrain(center) {
  const neighbours = [];
  for (let row = center.row - 1; row <= center.row + 1; row += 1) {
    for (let column = center.column - 1; column <= center.column + 1; column += 1) {
      if (column >= 0 && column < GRID_COLUMNS && row >= 0 && row < GRID_ROWS) neighbours.push(getCell(column, row).elevation);
    }
  }
  center.elevation = clampElevation(neighbours.reduce((total, value) => total + value, 0) / neighbours.length);
}

canvas.addEventListener('click', (event) => {
  const cell = getCellAtEvent(event);
  const isPainting = ['elevation', 'scenery', 'hill'].includes(state.mode);
  selectCell(cell, !isPainting);
  if (state.mode === 'route') state.route.push(cell);
  if (state.mode === 'elevation') cell.elevation = Number(elevation.value);
  if (state.mode === 'scenery') cell.scenery = scenery.value;
  if (state.mode === 'hill') paintHill(cell);
  if (state.mode === 'smooth') smoothTerrain(cell);
  render();
});

document.querySelectorAll('.mode').forEach((button) => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll('.mode').forEach((item) => item.classList.toggle('active', item === button));
  render();
}));

elevation.addEventListener('input', () => {
  document.getElementById('elevation-output').value = `${elevation.value} m`;
  render();
});

scenery.addEventListener('change', () => {
  render();
});

document.getElementById('undo-route').onclick = () => { state.route.pop(); render(); };
document.getElementById('clear-route').onclick = () => { state.route = []; render(); };
document.getElementById('clear-world').onclick = () => {
  if (!confirm('Clear the route, elevation, and scenery?')) return;
  state.route = [];
  state.cells.clear();
  state.selected = null;
  elevation.value = 0;
  document.getElementById('elevation-output').value = '0 m';
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
    cells: [...state.cells.values()].filter((cell) => cell.elevation || cell.scenery !== 'none'),
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
