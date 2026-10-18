// The vehicle detail side panel: a modal dialog that slides in from the right.
//
// Keyboard and screen reader behaviour:
//  - role="dialog" + aria-modal + aria-labelledby (set in index.html)
//  - focus moves into the panel when it opens
//  - Tab / Shift+Tab stay inside the panel (focus trap), and the rest of the page is
//    made `inert` so it cannot be reached by keyboard, mouse or screen reader
//  - Escape, the Close button, or a click outside closes it
//  - onClose() lets the caller put focus back on the row that opened the panel
import { statusKey } from './statuses.js';

const dateTime = new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'medium' });

export function createDetailPanel({ panel, backdrop, onClose }) {
  const title = panel.querySelector('#detail-title');
  const closeButton = panel.querySelector('#detail-close');
  const field = (name) => panel.querySelector(`[data-field="${name}"]`);
  const fields = {
    id: field('id'),
    plate: field('plate'),
    driver: field('driver'),
    status: field('status'),
    location: field('location'),
    lat: field('lat'),
    lng: field('lng'),
    updated: field('updated')
  };

  let vehicleId = null;
  let inertElements = [];

  // The position and update time are the fields that change while the panel is open.
  function showLive(vehicle) {
    fields.lat.textContent = vehicle.lat.toFixed(4);
    fields.lng.textContent = vehicle.lng.toFixed(4);
    fields.updated.textContent = dateTime.format(new Date(vehicle.lastUpdate));
  }

  function show(vehicle) {
    title.textContent = `Vehicle ${vehicle.id}`;
    fields.id.textContent = vehicle.id;
    fields.plate.textContent = vehicle.plate;
    fields.driver.textContent = vehicle.driver;
    fields.status.textContent = vehicle.status;
    fields.status.dataset.status = statusKey(vehicle.status);
    fields.location.textContent = vehicle.location;
    showLive(vehicle);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    // Focus trap: the only tabbable control is the Close button, so Tab and Shift+Tab
    // both stay on it instead of leaving the panel.
    event.preventDefault();
    closeButton.focus();
  }

  function open(vehicle) {
    show(vehicle);
    vehicleId = vehicle.id;

    // Make everything outside the panel unreachable while it is open.
    inertElements = [...document.body.children].filter(
      (element) => element !== panel && element !== backdrop && element.tagName !== 'SCRIPT'
    );
    for (const element of inertElements) element.inert = true;

    panel.classList.add('open');
    backdrop.classList.add('open');
    document.addEventListener('keydown', onKeydown);
    title.focus();
  }

  function close() {
    if (vehicleId === null) return;
    vehicleId = null;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    document.removeEventListener('keydown', onKeydown);
    for (const element of inertElements) element.inert = false;
    inertElements = [];
    onClose();
  }

  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  return {
    open,
    close,
    // Called for every live update: only touches the panel if it shows this vehicle.
    update(vehicle) {
      if (vehicle.id === vehicleId) showLive(vehicle);
    },
    get vehicleId() {
      return vehicleId;
    }
  };
}
