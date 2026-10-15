// Makes the fake "GPS pings" that both the Node mock server and the in-page
// fallback send. It has no browser or Node specific code, so both can import it.
//
// Each call to next() picks one random vehicle and nudges its position a short
// distance from where it was, so vehicles drift instead of jumping around.

export function createPositionSource(vehicles, random = Math.random) {
  const positions = new Map(vehicles.map((v) => [v.id, { lat: v.lat, lng: v.lng }]));

  return {
    next() {
      const vehicle = vehicles[Math.floor(random() * vehicles.length)];
      const current = positions.get(vehicle.id);
      current.lat = round(current.lat + (random() - 0.5) * 0.04);
      current.lng = round(current.lng + (random() - 0.5) * 0.04);
      return { type: 'position', vehicleId: vehicle.id, lat: current.lat, lng: current.lng, ts: Date.now() };
    }
  };
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
