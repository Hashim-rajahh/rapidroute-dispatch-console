// A small, dependency-free list virtualizer for fixed-height rows.
//
// Only the rows inside (or just outside) the scroll viewport exist in the DOM.
// A tall spacer element gives the scrollbar the full height of the list, and a
// rows container is moved with translateY so it always sits under the viewport.
// DOM nodes are reused (pooled) while scrolling instead of being recreated.

export function createVirtualList({
  scroller,
  spacer,
  rowsContainer,
  items,
  rowHeight,
  overscan = 4,
  createRow,
  bindRow,
  onRange
}) {
  let first = -1;
  let last = -1;
  let frame = 0;
  const pool = [];

  spacer.style.height = `${items.length * rowHeight}px`;

  function render() {
    frame = 0;

    const scrollTop = scroller.scrollTop;
    const viewportHeight = scroller.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

    if (start === first && end === last) return;
    first = start;
    last = end;

    const count = end - start;
    while (pool.length < count) {
      const row = createRow();
      pool.push(row);
      rowsContainer.appendChild(row);
    }
    while (pool.length > count) {
      rowsContainer.removeChild(pool.pop());
    }

    for (let i = 0; i < count; i += 1) {
      bindRow(pool[i], items[start + i], start + i);
    }

    rowsContainer.style.transform = `translateY(${start * rowHeight}px)`;

    if (onRange) onRange({ start, end, rendered: count, total: items.length });
  }

  function schedule() {
    if (frame === 0) frame = requestAnimationFrame(render);
  }

  scroller.addEventListener('scroll', schedule, { passive: true });
  let lastHeight = scroller.clientHeight;
  new ResizeObserver(() => {
    if (scroller.clientHeight === lastHeight) return;
    lastHeight = scroller.clientHeight;
    first = -1; // the viewport height changed, so recalculate the window
    schedule();
  }).observe(scroller);

  render();

  return {
    scrollToIndex(index) {
      scroller.scrollTop = Math.max(0, Math.min(index, items.length - 1)) * rowHeight;
    }
  };
}
