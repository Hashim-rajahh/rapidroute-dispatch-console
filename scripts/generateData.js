// Generates 400 realistic vehicle records and writes them to src/data/vehicles.json.
// Run with: npm run generate
// A fixed seed keeps the output identical on every run, so the file is reproducible.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUSES } from '../src/statuses.js';

const COUNT = 400;
const SEED = 20261013;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/vehicles.json');

// Small seeded random number generator (mulberry32).
function createRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(SEED);
// A second generator, so adding last-update times does not change any other field.
const timeRandom = createRandom(SEED + 1);
const REFERENCE_TIME = Date.parse('2026-10-13T09:00:00.000Z');
const pick = (list) => list[Math.floor(random() * list.length)];

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'David', 'Jennifer', 'Daniel', 'Susan',
  'Marcus', 'Angela', 'Kevin', 'Teresa', 'Brian', 'Nicole', 'Carlos', 'Hannah', 'Derek', 'Priya',
  'Tyrone', 'Olivia', 'Samuel', 'Grace', 'Anthony', 'Rachel', 'Victor', 'Megan', 'Omar', 'Laura'
];
const LAST_NAMES = [
  'Johnson', 'Martinez', 'Nowak', 'Williams', 'Olson', 'Brown', 'Patel', 'Kowalski', 'Davis', 'Schmidt',
  'Nguyen', 'Miller', 'Hughes', 'Anderson', 'Reyes', 'Thompson', 'Larsen', 'Carter', 'Mitchell', 'Foster',
  'Rivera', 'Walker', 'Brooks', 'Hansen', 'Coleman', 'Bennett', 'Murphy', 'Fischer', 'Torres', 'Sullivan'
];

// Midwest cities with approximate coordinates.
const CITIES = [
  ['Chicago', 'IL', 41.88, -87.63], ['Indianapolis', 'IN', 39.77, -86.16],
  ['Columbus', 'OH', 39.96, -83.0], ['Detroit', 'MI', 42.33, -83.05],
  ['Milwaukee', 'WI', 43.04, -87.91], ['Minneapolis', 'MN', 44.98, -93.27],
  ['St. Louis', 'MO', 38.63, -90.2], ['Kansas City', 'MO', 39.1, -94.58],
  ['Cincinnati', 'OH', 39.1, -84.51], ['Cleveland', 'OH', 41.5, -81.69],
  ['Des Moines', 'IA', 41.59, -93.62], ['Omaha', 'NE', 41.26, -95.93],
  ['Louisville', 'KY', 38.25, -85.76], ['Madison', 'WI', 43.07, -89.4],
  ['Toledo', 'OH', 41.65, -83.54], ['Fort Wayne', 'IN', 41.08, -85.14]
];

// Weighted so that most of the fleet is on the road.
const STATUS_WEIGHTS = [
  ['In transit', 45], ['Loading', 12], ['Idle', 18], ['Delayed', 15], ['Maintenance', 10]
];

function pickStatus() {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return status;
  }
  return STATUS_WEIGHTS[0][0];
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const usedPlates = new Set();

function makePlate() {
  let plate;
  do {
    const letters = Array.from({ length: 3 }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
    const digits = String(Math.floor(random() * 10000)).padStart(4, '0');
    plate = `${letters}-${digits}`;
  } while (usedPlates.has(plate));
  usedPlates.add(plate);
  return plate;
}

const vehicles = Array.from({ length: COUNT }, (_, index) => {
  const [city, state, lat, lng] = pick(CITIES);
  return {
    id: `VH-${String(index + 1).padStart(4, '0')}`,
    plate: makePlate(),
    driver: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    status: pickStatus(),
    location: `${city}, ${state}`,
    lat: Number((lat + (random() - 0.5) * 0.6).toFixed(4)),
    lng: Number((lng + (random() - 0.5) * 0.6).toFixed(4)),
    // Between 0 and 3 hours before the reference time, to the second.
    lastUpdate: new Date(REFERENCE_TIME - Math.floor(timeRandom() * 3 * 60 * 60) * 1000).toISOString()
  };
});

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(vehicles, null, 2)}\n`);

const counts = Object.fromEntries(STATUSES.map((s) => [s, vehicles.filter((v) => v.status === s).length]));
console.log(`Wrote ${vehicles.length} vehicles to ${OUTPUT}`);
console.log('Status counts:', counts);
