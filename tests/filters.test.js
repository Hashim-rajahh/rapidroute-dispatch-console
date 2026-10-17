import { DEFAULT_FILTERS, applyFilters, parseFilters, serializeFilters } from '../src/filters.js';

const fleet = [
  { id: 'VH-0001', driver: 'Maria Nowak', status: 'In transit', lastUpdate: '2026-10-13T08:00:00.000Z' },
  { id: 'VH-0002', driver: 'Kevin Brown', status: 'Delayed', lastUpdate: '2026-10-13T08:30:00.000Z' },
  { id: 'VH-0003', driver: 'Olivia Brown', status: 'Delayed', lastUpdate: '2026-10-13T07:00:00.000Z' },
  { id: 'VH-0004', driver: 'Angela Foster', status: 'Idle', lastUpdate: '2026-10-13T08:15:00.000Z' }
];
const ids = (list) => list.map((vehicle) => vehicle.id);
const filters = (changes) => ({ ...DEFAULT_FILTERS, ...changes });

describe('applyFilters', () => {
  test('default filters keep every vehicle in id order', () => {
    expect(ids(applyFilters([...fleet].reverse(), DEFAULT_FILTERS))).toEqual(['VH-0001', 'VH-0002', 'VH-0003', 'VH-0004']);
  });

  test('filters by status', () => {
    expect(ids(applyFilters(fleet, filters({ status: 'delayed' })))).toEqual(['VH-0002', 'VH-0003']);
  });

  test('driver search ignores case and surrounding spaces and matches part of a name', () => {
    expect(ids(applyFilters(fleet, filters({ driver: '  BROWN ' })))).toEqual(['VH-0002', 'VH-0003']);
  });

  test('status and driver filters combine', () => {
    expect(ids(applyFilters(fleet, filters({ status: 'delayed', driver: 'olivia' })))).toEqual(['VH-0003']);
  });

  test('returns an empty list when nothing matches', () => {
    expect(applyFilters(fleet, filters({ status: 'maintenance' }))).toEqual([]);
  });

  test('sorts by driver A to Z and Z to A', () => {
    expect(ids(applyFilters(fleet, filters({ sort: 'driver' })))).toEqual(['VH-0004', 'VH-0002', 'VH-0001', 'VH-0003']);
    expect(ids(applyFilters(fleet, filters({ sort: 'driver-desc' })))).toEqual(['VH-0003', 'VH-0001', 'VH-0002', 'VH-0004']);
  });

  test('sorts by last update, newest first', () => {
    expect(ids(applyFilters(fleet, filters({ sort: 'updated' })))).toEqual(['VH-0002', 'VH-0004', 'VH-0001', 'VH-0003']);
  });

  test('does not change the array it was given', () => {
    const copy = [...fleet];
    applyFilters(fleet, filters({ sort: 'driver' }));
    expect(fleet).toEqual(copy);
  });
});

describe('parseFilters', () => {
  test('reads status, driver and sort from the query string', () => {
    expect(parseFilters('?status=delayed&driver=smith&sort=driver')).toEqual({
      status: 'delayed',
      driver: 'smith',
      sort: 'driver'
    });
  });

  test('uses the defaults when the query string is empty', () => {
    expect(parseFilters('')).toEqual(DEFAULT_FILTERS);
  });

  test('ignores values it does not recognise', () => {
    expect(parseFilters('?status=flying&sort=banana')).toEqual(DEFAULT_FILTERS);
  });
});

describe('serializeFilters', () => {
  test('leaves out default values so the clean view has no query string', () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
    expect(serializeFilters(filters({ status: 'idle' }))).toBe('?status=idle');
  });

  test('writing then reading gives back the same filters', () => {
    const original = filters({ status: 'in-transit', driver: 'O\'Brien & Sons', sort: 'updated' });
    expect(parseFilters(serializeFilters(original))).toEqual(original);
  });
});
