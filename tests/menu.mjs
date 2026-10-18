import assert from 'node:assert/strict';
import { bindMenu } from '../src/menu.js';
function setup(storage) {
  const elements = new Map();
  const root = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { hidden: false, attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; }, focus() { this.focused = true; },
      addEventListener(event, fn) { this[event] = fn; } });
    return elements.get(id);
  } };
  bindMenu(root, storage);
  return Object.fromEntries(elements);
}
const values = new Map();
const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
const ui = setup(storage);
assert.equal(ui['ride-menu'].hidden, false);
assert.equal(ui['menu-show'].hidden, true);
ui['menu-hide'].click();
assert.equal(ui['ride-menu'].hidden, true);
assert.equal(ui['menu-show'].hidden, false);
assert.equal(ui['menu-show'].focused, true);
assert.equal(setup(storage)['ride-menu'].hidden, true);
ui['menu-show'].click();
assert.equal(ui['ride-menu'].hidden, false);
assert.equal(ui['menu-hide'].focused, true);
assert.equal(ui['menu-hide'].attributes['aria-expanded'], 'true');
assert.doesNotThrow(() => setup({ getItem() { throw Error(); }, setItem() { throw Error(); } }));
console.log('Passed menu collapse, restore, focus, persistence and blocked storage.');
