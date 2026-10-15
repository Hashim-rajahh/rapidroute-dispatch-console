import vehicles from './data/vehicles.json';
import { createVirtualList } from './virtualList.js';
import { startFpsMeter } from './fpsMeter.js';
import { statusKey } from './statuses.js';
import { connectLiveFeed } from './liveFeed.js';
import { createLiveStore } from './liveStore.js';

const ROW_HEIGHT = 44;
const HEADER_ROWS = 1;

document.documentElement.style.setProperty('--row-h', `${ROW_HEIGHT}px`);

const scroller = document.getElementById('vehicle-list');
const spacer = scroller.querySelector('.spacer');
const rowsContainer = scroller.querySelector('.rows');

scroller.setAttribute('aria-rowcount', String(vehicles.length + HEADER_ROWS));
document.getElementById('total').textContent = String(vehicles.length);
document.getElementById('total-rows').textContent = String(vehicles.length);
const renderedCount = document.getElementById('rendered');

const refs = new WeakMap();

function cell(row, name) {
  const element = document.createElement('div');
  element.className = `cell cell-${name}`;
  element.setAttribute('role', 'cell');
  row.appendChild(element);
  return element;
}

function createRow() {
  const row = document.createElement('div');
  row.className = 'row';
  row.setAttribute('role', 'row');

  const id = cell(row, 'id');
  const plate = cell(row, 'plate');
  const driver = cell(row, 'driver');
  const statusCell = cell(row, 'status');
  const location = cell(row, 'location');
  const chip = document.createElement('span');
  chip.className = 'chip';
  statusCell.appendChild(chip);

  const place = document.createElement('span');
  const coords = document.createElement('span');
  coords.className = 'coords';
  location.append(place, coords);

  refs.set(row, { id, plate, driver, chip, place, coords });
  return row;
}

function formatCoords(vehicle) {
  return `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`;
}

// Only the coordinates change when a position update arrives.
function updateRow(row, vehicle) {
  refs.get(row).coords.textContent = formatCoords(vehicle);
}

function bindRow(row, vehicle, index) {
  const { id, plate, driver, chip, place, coords } = refs.get(row);
  id.textContent = vehicle.id;
  plate.textContent = vehicle.plate;
  driver.textContent = vehicle.driver;
  chip.textContent = vehicle.status;
  chip.dataset.status = statusKey(vehicle.status);
  place.textContent = vehicle.location;
  coords.textContent = formatCoords(vehicle);
  // Stripes follow the vehicle's position in the full list, not its place in the DOM.
  row.dataset.stripe = String(index % 2);
  row.setAttribute('aria-rowindex', String(index + 1 + HEADER_ROWS));
}

const list = createVirtualList({
  scroller,
  spacer,
  rowsContainer,
  items: vehicles,
  rowHeight: ROW_HEIGHT,
  overscan: 4,
  createRow,
  bindRow,
  updateRow,
  onRange({ start, end, rendered, total }) {
    renderedCount.textContent = String(rendered);
    console.log(`[virtual-list] vehicles ${start + 1} to ${end} rendered (${rendered} of ${total} rows in the DOM)`);
  }
});

if (new URLSearchParams(window.location.search).has('fps')) {
  startFpsMeter();
}

// ---- Live position updates (Task 2) ----
const params = new URLSearchParams(window.location.search);
const intervalMs = Math.max(50, Number(params.get('interval')) || 5000);
const feedMode = document.getElementById('feed-mode');
const feedLast = document.getElementById('feed-last');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = createLiveStore(vehicles);
let updates = 0;
let totalMs = 0;

function handleUpdate(message) {
  const started = performance.now();
  const index = store.apply(message);
  if (index === -1) return;

  const row = list.refreshRow(index);
  if (row && !reduceMotion) {
    row.animate([{ backgroundColor: 'var(--flash)' }, { backgroundColor: 'transparent' }], { duration: 1200 });
  }

  const ms = performance.now() - started;
  updates += 1;
  totalMs += ms;
  feedLast.textContent = `${message.vehicleId} at ${new Date(message.ts).toLocaleTimeString()}`;
  console.log(
    `[live] ${message.vehicleId} -> ${message.lat.toFixed(4)}, ${message.lng.toFixed(4)} | ` +
      `${row ? '1 row updated' : 'not on screen, data only'} in ${ms.toFixed(2)} ms ` +
      `(avg ${(totalMs / updates).toFixed(2)} ms) | full list re-renders since load: ${list.getRenderCount()}`
  );
}

connectLiveFeed({
  vehicles,
  url: params.get('ws') || 'ws://localhost:8787',
  useServer: params.has('server') || params.has('ws') || import.meta.env.DEV,
  intervalMs,
  onUpdate: handleUpdate,
  onStatus: (mode) => {
    feedMode.textContent = mode;
  }
});
