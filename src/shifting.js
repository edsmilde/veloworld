export const MIN_GEAR = 1;
export const MAX_GEAR = 12;
export const NEUTRAL_GEAR = 6;
const GRADE_PER_GEAR = .5;

export function clampGear(gear) {
  return Math.max(MIN_GEAR, Math.min(MAX_GEAR, Math.round(gear)));
}

export function gearGradeOffset(gear) {
  return (clampGear(gear) - NEUTRAL_GEAR) * GRADE_PER_GEAR;
}

// Difficulty scales the route only; gears remain useful at 0% difficulty.
// This is a resistance approximation, not a drivetrain/gear-ratio simulation.
export function trainerGrade(routeGrade, difficulty, gear = NEUTRAL_GEAR) {
  return Math.max(-10, Math.min(16, routeGrade * difficulty + gearGradeOffset(gear)));
}

export function bindVirtualShifting(state, root = document, keyboard = window) {
  const easier = root.getElementById('gear-easier');
  const harder = root.getElementById('gear-harder');
  const output = root.getElementById('gear-output');
  let previous;
  function render() {
    const signature = `${state.gear}:${Boolean(state.trainer)}`;
    if (signature === previous) return;
    previous = signature;
    const offset = gearGradeOffset(state.gear);
    output.textContent = `Gear ${state.gear} / ${MAX_GEAR}`;
    root.getElementById('gear-resistance').textContent = `${offset >= 0 ? '+' : ''}${offset.toFixed(1)}% resistance grade offset · ${state.trainer ? 'trainer active' : 'connect trainer to feel shifts'}`;
    easier.disabled = state.gear === MIN_GEAR;
    harder.disabled = state.gear === MAX_GEAR;
  }
  function shift(delta) { state.gear = clampGear(state.gear + delta); render(); }
  easier.addEventListener('click', () => shift(-1));
  harder.addEventListener('click', () => shift(1));
  keyboard.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input, select, textarea, button, [contenteditable]')) return;
    if (event.key === '[' || event.key === ']') {
      event.preventDefault(); shift(event.key === '[' ? -1 : 1);
    }
  });
  render();
  return render;
}
