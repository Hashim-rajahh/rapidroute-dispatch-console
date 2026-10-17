// Pure filter / sort / URL logic. It has no DOM code, so it is easy to unit test.
import { STATUSES, statusKey } from './statuses.js';

export const STATUS_FILTERS = STATUSES.map((label) => ({ value: statusKey(label), label }));

export const SORT_OPTIONS = [
  { value: 'id', label: 'Vehicle ID' },
  { value: 'driver', label: 'Driver (A to Z)' },
  { value: 'driver-desc', label: 'Driver (Z to A)' },
  { value: 'updated', label: 'Last update (newest first)' }
];

// "all" and "id" are the defaults, so they never need to appear in the URL.
export const DEFAULT_FILTERS = Object.freeze({ status: 'all', driver: '', sort: 'id' });

const VALID_STATUS = new Set(['all', ...STATUS_FILTERS.map((option) => option.value)]);
const VALID_SORT = new Set(SORT_OPTIONS.map((option) => option.value));

// Reads "?status=delayed&driver=smith&sort=driver" into a filter object.
// Anything missing or not recognised falls back to the default.
export function parseFilters(search) {
  const params = new URLSearchParams(search);
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    status: VALID_STATUS.has(status) ? status : DEFAULT_FILTERS.status,
    driver: (params.get('driver') ?? '').trim(),
    sort: VALID_SORT.has(sort) ? sort : DEFAULT_FILTERS.sort
  };
}

// Turns a filter object into a query string. Default values are left out,
// so the "no filters" view has a clean URL with no query string at all.
export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_FILTERS.status) params.set('status', filters.status);
  const driver = filters.driver.trim();
  if (driver !== '') params.set('driver', driver);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

function compareIds(a, b) {
  return a.id.localeCompare(b.id);
}

function compareDrivers(a, b) {
  return a.driver.localeCompare(b.driver) || compareIds(a, b);
}

const COMPARERS = {
  id: compareIds,
  driver: compareDrivers,
  'driver-desc': (a, b) => compareDrivers(b, a) || compareIds(a, b),
  updated: (a, b) => Date.parse(b.lastUpdate) - Date.parse(a.lastUpdate) || compareIds(a, b)
};

// Returns a NEW array with the vehicles that match, in the chosen order.
// The original array is never changed.
export function applyFilters(vehicles, filters) {
  const driverQuery = filters.driver.trim().toLowerCase();
  const matches = vehicles.filter((vehicle) => {
    if (filters.status !== 'all' && statusKey(vehicle.status) !== filters.status) return false;
    if (driverQuery !== '' && !vehicle.driver.toLowerCase().includes(driverQuery)) return false;
    return true;
  });
  return matches.sort(COMPARERS[filters.sort] ?? COMPARERS.id);
}
