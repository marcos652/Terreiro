/**
 * Centralized app-level constants.
 * Move hardcoded values here instead of scattering UIDs/config across files.
 */

/** Firebase UIDs that always have MASTER privileges, even without a Firestore doc. */
export const BOOTSTRAP_MASTER_UIDS = [
  'rpdLNx3X4CZhFvB6O9bvXbFA72y1',
  'ljfZse4jR6a7N9ryivGtlGne9Rh2',
] as const;

/** Check if a UID is a bootstrap master. */
export function isBootstrapMasterUid(uid: string): boolean {
  return (BOOTSTRAP_MASTER_UIDS as readonly string[]).includes(uid);
}

/** Stock quantity threshold below which an item is flagged as critical. */
export const STOCK_CRITICAL_THRESHOLD = 0;

/** Max items in a Firestore writeBatch before chunking. */
export const FIRESTORE_BATCH_LIMIT = 450;
