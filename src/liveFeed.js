// Connects to the live position feed and calls onUpdate(message) for each ping.
//
// 1. If a real mock server is wanted (npm run mock-server), it opens a native
//    WebSocket to it.
// 2. If that is not wanted or cannot connect (for example on the Netlify site,
//    where no server is running), it falls back to an in-page mock that sends
//    exactly the same messages on a timer. The rest of the app can't tell the
//    difference.
import { createPositionSource } from './mockPositions.js';

export function connectLiveFeed({ vehicles, url, useServer, intervalMs, onUpdate, onStatus }) {
  let timer = 0;
  let socket = null;

  function startInPageMock() {
    const source = createPositionSource(vehicles);
    onStatus('in-page mock');
    timer = setInterval(() => onUpdate(source.next()), intervalMs);
  }

  if (!useServer) {
    startInPageMock();
    return stop;
  }

  onStatus('connecting');
  socket = new WebSocket(url);
  let opened = false;

  socket.addEventListener('open', () => {
    opened = true;
    onStatus('mock server');
  });
  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'position') onUpdate(message);
    } catch {
      // Ignore anything that is not valid JSON.
    }
  });
  // If the server cannot be reached, or goes away, fall back so the demo keeps working.
  socket.addEventListener('close', () => {
    if (timer === 0) startInPageMock();
    if (opened) console.warn('[live] mock server connection closed, using the in-page mock');
  });

  function stop() {
    clearInterval(timer);
    if (socket) socket.close();
  }
  return stop;
}
