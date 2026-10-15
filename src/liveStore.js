// Holds the latest position of every vehicle and tells other parts of the app
// (such as the detail panel in a later task) when one changes.
export function createLiveStore(vehicles) {
  const indexById = new Map(vehicles.map((vehicle, index) => [vehicle.id, index]));
  const listeners = new Set();

  return {
    // Writes the new position into the vehicle record. Returns its index, or -1 if unknown.
    apply(message) {
      const index = indexById.get(message.vehicleId);
      if (index === undefined) return -1;
      const vehicle = vehicles[index];
      vehicle.lat = message.lat;
      vehicle.lng = message.lng;
      for (const listener of listeners) listener(vehicle, index);
      return index;
    },
    // fn(vehicle, index) runs after every update. Returns an unsubscribe function.
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
