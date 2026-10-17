import vehicles from './data/vehicles.json';
import { createVirtualList } from './virtualList.js';
import { startFpsMeter } from './fpsMeter.js';
import { statusKey } from './statuses.js';
import { connectLiveFeed } from './liveFeed.js';
import { createLiveStore } from './liveStore.js';
import { SORT_OPTIONS, STATUS_FILTERS, applyFilters, parseFilters, serializeFilters } from './filters.js';

const ROW_HEIGHT = 44;
const HEADER_ROWS = 1;

document.documentElement.style.setProperty('--row-h', `${ROW_HEIGHT}px`);

const scroller = document.getElementById('vehicle-list');
const spacer = scroller.querySelector('.spacer');
const rowsContainer = scroller.querySelector('.rows');

document.getElementById('total').textContent = String(vehicles.length);
const renderedCount = document.getElementById('rendered');
const totalRowsCount = document.getElementById('total-rows');

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
  const updated = cell(row, 'updated');
  const chip = document.createElement('span');
  chip.className = 'chip';
  statusCell.appendChild(chip);

  const place = document.createElement('span');
  const coords = document.createElement('span');
  coords.className = 'coords';
  location.append(place, coords);

  refs.set(row, { id, plate, driver, chip, place, coords, updated });
  return row;
}

function formatCoords(vehicle) {
  return `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Only the coordinates and the update time change when a position update arrives.
function updateRow(row, vehicle) {
  const { coords, updated } = refs.get(row);
  coords.textContent = formatCoords(vehicle);
  updated.textContent = formatTime(vehicle.lastUpdate);
}

function bindRow(row, vehicle, index) {
  const { id, plate, driver, chip, place, coords, updated } = refs.get(row);
  id.textContent = vehicle.id;
  plate.textContent = vehicle.plate;
  driver.textContent = vehicle.driver;
  chip.textContent = vehicle.status;
  chip.dataset.status = statusKey(vehicle.status);
  place.textContent = vehicle.location;
  coords.textContent = formatCoords(vehicle);
  updated.textContent = formatTime(vehicle.lastUpdate);
  // Stripes follow the vehicle's position in the full list, not its place in the DOM.
  row.dataset.stripe = String(index % 2);
  row.setAttribute('aria-rowindex', String(index + 1 + HEADER_ROWS));
}

// ---- Filter and sort state (Task 3) ----
// The URL is the source of truth: the controls and the list are always built from it.
let filters = parseFilters(window.location.search);
let view = applyFilters(vehicles, filters);
let viewIndexById = indexById(view);

function indexById(list) {
  return new Map(list.map((vehicle, index) => [vehicle.id, index]));
}

const list = createVirtualList({
  scroller,
  spacer,
  rowsContainer,
  items: view,
  rowHeight: ROW_HEIGHT,
  overscan: 4,
  createRow,
  bindRow,
  updateRow,
  onRange({ start, end, rendered, total }) {
    renderedCount.textContent = String(rendered);
    totalRowsCount.textContent = String(total);
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
  const vehicleIndex = store.apply(message);
  if (vehicleIndex === -1) return;

  // The list may be filtered or sorted, so find where this vehicle sits in what is shown.
  const viewIndex = viewIndexById.get(message.vehicleId);
  const row = viewIndex === undefined ? null : list.refreshRow(viewIndex);
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

// ---- Filter controls and URL sync (Task 3) ----
const form = document.getElementById('filters');
const statusSelect = document.getElementById('filter-status');
const driverInput = document.getElementById('filter-driver');
const sortSelect = document.getElementById('filter-sort');
const clearButton = document.getElementById('filter-clear');
const resultCount = document.getElementById('result-count');
const emptyMessage = document.getElementById('empty-message');

statusSelect.append(new Option('All statuses', 'all'), ...STATUS_FILTERS.map((o) => new Option(o.label, o.value)));
sortSelect.append(...SORT_OPTIONS.map((o) => new Option(o.label, o.value)));

// Puts the current filter object into the controls (used on load and on back/forward).
function showFiltersInControls() {
  statusSelect.value = filters.status;
  driverInput.value = filters.driver;
  sortSelect.value = filters.sort;
}

// Recalculates the list from `filters` and redraws it.
function renderView() {
  view = applyFilters(vehicles, filters);
  viewIndexById = indexById(view);
  scroller.setAttribute('aria-rowcount', String(view.length + HEADER_ROWS));
  list.setItems(view);
  resultCount.textContent = `Showing ${view.length} of ${vehicles.length} vehicles`;
  emptyMessage.hidden = view.length > 0;
  clearButton.hidden = serializeFilters(filters) === '';
}

// `push` adds a history entry (so Back undoes the change); typing replaces it instead.
function writeUrl(push) {
  const url = `${window.location.pathname}${serializeFilters(filters)}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  window.history[push ? 'pushState' : 'replaceState'](null, '', url);
}

function readControls() {
  return { status: statusSelect.value, driver: driverInput.value.trim(), sort: sortSelect.value };
}

function onControlChange(push) {
  filters = readControls();
  writeUrl(push);
  renderView();
}

statusSelect.addEventListener('change', () => onControlChange(true));
sortSelect.addEventListener('change', () => onControlChange(true));
driverInput.addEventListener('input', () => onControlChange(false));
form.addEventListener('submit', (event) => event.preventDefault());
clearButton.addEventListener('click', () => {
  filters = parseFilters('');
  showFiltersInControls();
  writeUrl(true);
  renderView();
  statusSelect.focus();
});

// Back / Forward: read the URL again and apply it.
window.addEventListener('popstate', () => {
  filters = parseFilters(window.location.search);
  showFiltersInControls();
  renderView();
});

showFiltersInControls();
resultCount.textContent = `Showing ${view.length} of ${vehicles.length} vehicles`;
emptyMessage.hidden = view.length > 0;
clearButton.hidden = serializeFilters(filters) === '';
scroller.setAttribute('aria-rowcount', String(view.length + HEADER_ROWS));
