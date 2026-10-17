// Validates src/data/vehicles.json. Run with: npm run check:data
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUSES } from '../src/statuses.js';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/vehicles.json');
const FIELDS = ['id', 'plate', 'driver', 'status', 'location', 'lastUpdate'];
const errors = [];

const vehicles = JSON.parse(readFileSync(FILE, 'utf8'));

if (!Array.isArray(vehicles) || vehicles.length !== 400) {
  errors.push(`Expected 400 vehicles, found ${Array.isArray(vehicles) ? vehicles.length : 'not an array'}`);
}

const ids = new Set();
const plates = new Set();
for (const [index, vehicle] of (Array.isArray(vehicles) ? vehicles : []).entries()) {
  for (const field of FIELDS) {
    if (typeof vehicle[field] !== 'string' || vehicle[field].trim() === '') {
      errors.push(`Row ${index}: missing or empty "${field}"`);
    }
  }
  if (Number.isNaN(Date.parse(vehicle.lastUpdate))) errors.push(`Row ${index}: invalid lastUpdate "${vehicle.lastUpdate}"`);
  if (!STATUSES.includes(vehicle.status)) errors.push(`Row ${index}: unknown status "${vehicle.status}"`);
  if (ids.has(vehicle.id)) errors.push(`Row ${index}: duplicate id ${vehicle.id}`);
  if (plates.has(vehicle.plate)) errors.push(`Row ${index}: duplicate plate ${vehicle.plate}`);
  ids.add(vehicle.id);
  plates.add(vehicle.plate);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`vehicles.json is valid: ${vehicles.length} unique vehicles.`);
