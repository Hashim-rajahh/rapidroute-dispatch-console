// Single source of truth for vehicle statuses (used by the app and the scripts).
export const STATUSES = ['In transit', 'Loading', 'Idle', 'Delayed', 'Maintenance'];

export function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '-');
}
