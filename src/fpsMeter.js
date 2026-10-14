// Optional on-screen frame counter. Open the page with ?fps in the URL to show it.
export function startFpsMeter() {
  const meter = document.createElement('div');
  meter.className = 'fps-meter';
  meter.setAttribute('aria-hidden', 'true');
  document.body.appendChild(meter);

  let frames = 0;
  let windowStart = performance.now();

  function tick(now) {
    frames += 1;
    if (now - windowStart >= 500) {
      meter.textContent = `${Math.round((frames * 1000) / (now - windowStart))} fps`;
      frames = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
