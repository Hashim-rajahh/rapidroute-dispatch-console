// Works out which row should get focus after a navigation key.
// Pure function (no DOM), so it is easy to unit test.
//   index    the row that has focus now (position in the list that is shown)
//   count    how many rows the list has
//   pageSize how many rows PageUp / PageDown jump
// Returns the new row index, or null if the key is not a navigation key.
export function nextIndex({ key, index, count, pageSize }) {
  if (count <= 0) return null;
  const last = count - 1;
  switch (key) {
    case 'ArrowDown':
      return Math.min(index + 1, last);
    case 'ArrowUp':
      return Math.max(index - 1, 0);
    case 'PageDown':
      return Math.min(index + pageSize, last);
    case 'PageUp':
      return Math.max(index - pageSize, 0);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
