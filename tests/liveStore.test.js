import { createLiveStore } from '../src/liveStore.js';

function makeFleet() {
  return [
    { id: 'VH-0001', lat: 41.0, lng: -87.0, lastUpdate: '2026-10-13T08:00:00.000Z' },
    { id: 'VH-0002', lat: 42.0, lng: -88.0, lastUpdate: '2026-10-13T08:00:00.000Z' }
  ];
}
const message = { type: 'position', vehicleId: 'VH-0002', lat: 42.5, lng: -88.5, ts: Date.parse('2026-10-13T09:30:00.000Z') };

describe('createLiveStore', () => {
  test('apply writes the new position and update time into that vehicle only', () => {
    const fleet = makeFleet();
    const store = createLiveStore(fleet);
    expect(store.apply(message)).toBe(1);
    expect(fleet[1]).toMatchObject({ lat: 42.5, lng: -88.5, lastUpdate: '2026-10-13T09:30:00.000Z' });
    expect(fleet[0]).toMatchObject({ lat: 41.0, lng: -87.0 });
  });

  test('apply ignores a vehicle it does not know', () => {
    const fleet = makeFleet();
    const store = createLiveStore(fleet);
    expect(store.apply({ ...message, vehicleId: 'VH-9999' })).toBe(-1);
    expect(fleet[1].lat).toBe(42.0);
  });

  test('subscribers hear about each update and can unsubscribe', () => {
    const store = createLiveStore(makeFleet());
    const heard = [];
    const unsubscribe = store.subscribe((vehicle) => heard.push(vehicle.id));
    store.apply(message);
    unsubscribe();
    store.apply(message);
    expect(heard).toEqual(['VH-0002']);
  });
});
