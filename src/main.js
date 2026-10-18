import vehicles from './data/vehicles.json';
import { createVirtualList } from './virtualList.js';
import { startFpsMeter } from './fpsMeter.js';
import { statusKey } from './statuses.js';
import { connectLiveFeed } from './liveFeed.js';
import { createLiveStore } from './liveStore.js';
import { createDetailPanel } from './detailPanel.js';
import { nextIndex } from './navigation.js';
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
  // Keyboard support: only the active row is a tab stop (roving tabindex).
  row.dataset.index = String(index);
  row.tabIndex = index === activeIndex ? 0 : -1;
  row.classList.toggle('is-open', vehicle.id === panel.vehicleId);
}

// ---- Filter and sort state (Task 3) ----
// The URL is the source of truth: the controls and the list are always built from it.
let filters = parseFilters(window.location.search);
let view = applyFilters(vehicles, filters);
let viewIndexById = indexById(view);

function indexById(list) {
  return new Map(list.map((vehicle, index) => [vehicle.id, index]));
}

// ---- Keyboard focus and the detail panel (Task 4) ----
// activeIndex is the one row that can be reached with Tab; arrow keys move it.
let activeIndex = 0;
let list = null;

const panel = createDetailPanel({
  panel: document.getElementById('detail-panel'),
  backdrop: document.getElementById('detail-backdrop'),
  onClose() {
    for (const row of rowsContainer.querySelectorAll('.is-open')) row.classList.remove('is-open');
    focusIndex(activeIndex); // give focus back to the row that opened the panel
  }
});

list = createVirtualList({
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
    syncScrollerTabStop();
    console.log(`[virtual-list] vehicles ${start + 1} to ${end} rendered (${rendered} of ${total} rows in the DOM)`);
  }
});

// If the active row is not in the page (for example after scrolling with the mouse),
// the list itself becomes the tab stop so keyboard users can still reach it.
function syncScrollerTabStop() {
  scroller.tabIndex = list && list.getRow(activeIndex) ? -1 : 0;
}

function visibleRowCount() {
  return Math.max(1, Math.floor((scroller.clientHeight - ROW_HEIGHT) / ROW_HEIGHT));
}

// Moves keyboard focus to a row, scrolling only as much as needed to show it.
function focusIndex(index) {
  if (view.length === 0) return;
  const target = Math.min(Math.max(index, 0), view.length - 1);
  list.revealIndex(target);
  const row = list.getRow(target);
  if (row) row.focus({ preventScroll: true }); // preventScroll: the list must not jump
}

function setActive(index) {
  if (index === activeIndex) return;
  const previous = list.getRow(activeIndex);
  if (previous) previous.tabIndex = -1;
  activeIndex = index;
  const next = list.getRow(index);
  if (next) next.tabIndex = 0;
  syncScrollerTabStop();
}

function openDetails(index) {
  const vehicle = view[index];
  if (!vehicle) return;
  setActive(index);
  const row = list.getRow(index);
  if (row) row.classList.add('is-open');
  panel.open(vehicle);
}

rowsContainer.addEventListener('focusin', (event) => {
  const row = event.target.closest('.row');
  if (row) setActive(Number(row.dataset.index));
});

rowsContainer.addEventListener('click', (event) => {
  const row = event.target.closest('.row');
  if (row) openDetails(Number(row.dataset.index));
});

rowsContainer.addEventListener('keydown', (event) => {
  if (event.target !== event.target.closest('.row')) return;
  const index = Number(event.target.dataset.index);
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openDetails(index);
    return;
  }
  const next = nextIndex({ key: event.key, index, count: view.length, pageSize: visibleRowCount() });
  if (next === null) return;
  event.preventDefault(); // stop the browser scrolling the list by itself
  focusIndex(next);
});

// When the list itself has focus, the arrow keys and Enter move focus onto a row.
scroller.addEventListener('keydown', (event) => {
  if (event.target !== scroller) return;
  if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
    event.preventDefault();
    focusIndex(activeIndex);
  }
});

if (new URLSearchParams(window.location.search).has('fps')) {
  startFpsMeter();
}

// ---- Live position updates (Task 2) ----
const params = new URLSearchParams(window.location.search);
const intervalMs = Math.max(10, Number(params.get('interval')) || 5000);
const feedMode = document.getElementById('feed-mode');
const feedLast = document.getElementById('feed-last');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = createLiveStore(vehicles);
// The detail panel subscribes to the store, so it follows live updates for the vehicle it shows.
store.subscribe((vehicle) => panel.update(vehicle));
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
  activeIndex = 0;
  list.setItems(view);
  syncScrollerTabStop();
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
