/**
 * Placeholder for the future deduplication/merge pass over
 * `aed_devices_combined`.
 *
 * It is called after every rebuild of the combined table and after every
 * insertion of a user record into that table. Today it intentionally changes
 * nothing and returns 0; the call sites are already in place so the real
 * deduplication logic can be added here later without touching the write paths.
 */
export function removeDuplicateAedDevices(): number {
	// No duplicates are removed yet.
	return 0;
}
