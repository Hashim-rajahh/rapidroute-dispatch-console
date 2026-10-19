// Offline action queue: stores filter/sort/search actions performed while offline.
// When the connection is restored, the queued actions can be replayed.
//
// Each action is a snapshot of the full filter state at the time it was performed,
// so replaying them in order reproduces the user's intent.

export function createOfflineQueue() {
  const queue = [];

  return {
    // Adds an action to the queue with a timestamp.
    push(action) {
      queue.push({ ...action, timestamp: Date.now() });
    },

    // Returns all queued actions and empties the queue.
    flush() {
      const actions = queue.splice(0);
      return actions;
    },

    // The number of actions currently in the queue.
    get length() {
      return queue.length;
    },

    // A copy of all queued actions (for inspection / testing).
    get items() {
      return [...queue];
    }
  };
}
