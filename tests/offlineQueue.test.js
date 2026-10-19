import { createOfflineQueue } from '../src/offlineQueue.js';

describe('createOfflineQueue', () => {
  let queue;

  beforeEach(() => {
    queue = createOfflineQueue();
  });

  test('starts empty', () => {
    expect(queue.length).toBe(0);
    expect(queue.items).toEqual([]);
  });

  test('push adds an action with a timestamp', () => {
    const before = Date.now();
    queue.push({ type: 'filter', filters: { status: 'delayed', driver: '', sort: 'id' } });
    const after = Date.now();

    expect(queue.length).toBe(1);
    const [action] = queue.items;
    expect(action.type).toBe('filter');
    expect(action.filters).toEqual({ status: 'delayed', driver: '', sort: 'id' });
    expect(action.timestamp).toBeGreaterThanOrEqual(before);
    expect(action.timestamp).toBeLessThanOrEqual(after);
  });

  test('push keeps actions in order', () => {
    queue.push({ type: 'filter', filters: { status: 'idle', driver: '', sort: 'id' } });
    queue.push({ type: 'filter', filters: { status: 'in-transit', driver: '', sort: 'id' } });
    queue.push({ type: 'filter', filters: { status: 'all', driver: 'smith', sort: 'driver' } });

    expect(queue.length).toBe(3);
    expect(queue.items[0].filters.status).toBe('idle');
    expect(queue.items[1].filters.status).toBe('in-transit');
    expect(queue.items[2].filters.driver).toBe('smith');
  });

  test('flush returns all actions and clears the queue', () => {
    queue.push({ type: 'filter', filters: { status: 'idle', driver: '', sort: 'id' } });
    queue.push({ type: 'filter', filters: { status: 'delayed', driver: '', sort: 'id' } });

    const flushed = queue.flush();
    expect(flushed).toHaveLength(2);
    expect(flushed[0].filters.status).toBe('idle');
    expect(flushed[1].filters.status).toBe('delayed');
    expect(queue.length).toBe(0);
    expect(queue.items).toEqual([]);
  });

  test('flush on an empty queue returns an empty array', () => {
    expect(queue.flush()).toEqual([]);
  });

  test('items returns a copy, not the internal array', () => {
    queue.push({ type: 'filter', filters: { status: 'idle', driver: '', sort: 'id' } });
    const copy = queue.items;
    copy.push({ fake: true });
    expect(queue.length).toBe(1); // the internal queue was not modified
  });

  test('can push after flushing', () => {
    queue.push({ type: 'filter', filters: { status: 'idle', driver: '', sort: 'id' } });
    queue.flush();
    queue.push({ type: 'filter', filters: { status: 'delayed', driver: '', sort: 'id' } });

    expect(queue.length).toBe(1);
    expect(queue.items[0].filters.status).toBe('delayed');
  });
});
