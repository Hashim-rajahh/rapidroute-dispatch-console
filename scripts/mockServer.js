// A tiny mock WebSocket server for local development.
// Every 5 seconds it sends ONE message: a random vehicle id and its new position.
// Run with: npm run mock-server   (then run npm run dev in a second terminal)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createPositionSource } from '../src/mockPositions.js';

const PORT = Number(process.env.PORT) || 8787;
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 5000;

const dataFile = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/vehicles.json');
const vehicles = JSON.parse(readFileSync(dataFile, 'utf8'));
const source = createPositionSource(vehicles);

const server = new WebSocketServer({ port: PORT });

server.on('connection', (socket) => {
  console.log(`[mock-server] client connected (${server.clients.size} connected)`);
  socket.on('close', () => console.log('[mock-server] client disconnected'));
});

setInterval(() => {
  if (server.clients.size === 0) return;
  const message = source.next();
  const text = JSON.stringify(message);
  for (const client of server.clients) {
    if (client.readyState === 1) client.send(text);
  }
  console.log(`[mock-server] sent ${message.vehicleId} -> ${message.lat}, ${message.lng}`);
}, INTERVAL_MS);

console.log(`[mock-server] listening on ws://localhost:${PORT}, one update every ${INTERVAL_MS / 1000}s`);
