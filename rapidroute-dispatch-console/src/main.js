import './style.css';
import vehicles from './data/vehicles.json';
import { createVirtualList } from './virtualList.js';
import { startFpsMeter } from './fpsMeter.js';
import { statusKey } from './statuses.js';

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

  refs.set(row, { id, plate, driver, chip, location });
  return row;
}

function bindRow(row, vehicle, index) {
  const { id, plate, driver, chip, location } = refs.get(row);
  id.textContent = vehicle.id;
  plate.textContent = vehicle.plate;
  driver.textContent = vehicle.driver;
  chip.textContent = vehicle.status;
  chip.dataset.status = statusKey(vehicle.status);
  location.textContent = vehicle.location;
  // Stripes follow the vehicle's position in the full list, not its place in the DOM.
  row.dataset.stripe = String(index % 2);
  row.setAttribute('aria-rowindex', String(index + 1 + HEADER_ROWS));
}

createVirtualList({
  scroller,
  spacer,
  rowsContainer,
  items: vehicles,
  rowHeight: ROW_HEIGHT,
  overscan: 4,
  createRow,
  bindRow,
  onRange({ start, end, rendered, total }) {
    renderedCount.textContent = String(rendered);
    console.log(`[virtual-list] vehicles ${start + 1} to ${end} rendered (${rendered} of ${total} rows in the DOM)`);
  }
});

if (new URLSearchParams(window.location.search).has('fps')) {
  startFpsMeter();
}
