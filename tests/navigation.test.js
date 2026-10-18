import { nextIndex } from '../src/navigation.js';

const base = { index: 5, count: 100, pageSize: 10 };

describe('nextIndex', () => {
  test('ArrowDown and ArrowUp move one row', () => {
    expect(nextIndex({ ...base, key: 'ArrowDown' })).toBe(6);
    expect(nextIndex({ ...base, key: 'ArrowUp' })).toBe(4);
  });

  test('stays on the first and last row instead of going past them', () => {
    expect(nextIndex({ ...base, index: 0, key: 'ArrowUp' })).toBe(0);
    expect(nextIndex({ ...base, index: 99, key: 'ArrowDown' })).toBe(99);
  });

  test('PageDown and PageUp jump a page and stop at the ends', () => {
    expect(nextIndex({ ...base, key: 'PageDown' })).toBe(15);
    expect(nextIndex({ ...base, index: 95, key: 'PageDown' })).toBe(99);
    expect(nextIndex({ ...base, key: 'PageUp' })).toBe(0);
  });

  test('Home and End go to the first and last row', () => {
    expect(nextIndex({ ...base, key: 'Home' })).toBe(0);
    expect(nextIndex({ ...base, key: 'End' })).toBe(99);
  });

  test('returns null for keys it does not handle and for an empty list', () => {
    expect(nextIndex({ ...base, key: 'a' })).toBeNull();
    expect(nextIndex({ ...base, count: 0, key: 'ArrowDown' })).toBeNull();
  });
});
