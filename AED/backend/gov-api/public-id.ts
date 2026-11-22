const UUID_HEX_LENGTH = 32;
const UUID_VERSION_CHAR = "4";
const UUID_VERSION_INDEX = 12;
const UUID_VARIANT_INDEX = 16;
const UUID_VARIANT_CHARS = ["8", "9", "a", "b"] as const;
const UUID_GROUPS = [0, 8, 12, 16, 20, 32] as const;

/**
 * Deterministic UUID v4-shaped identifier derived from a source and canonical
 * record id.
 *
 * The public export uses this as `id`; it stays stable across source refreshes
 * and repeated exports of the same record.
 */
export function stablePublicUuid(sourceId: string, recordId: string): string {
	const hash = new Bun.CryptoHasher("sha256")
		.update(`${sourceId}:${recordId}`)
		.digest("hex")
		.slice(0, UUID_HEX_LENGTH)
		.split("");
	hash[UUID_VERSION_INDEX] = UUID_VERSION_CHAR;
	const variant = Number.parseInt(hash[UUID_VARIANT_INDEX] ?? "0", 16);
	hash[UUID_VARIANT_INDEX] =
		UUID_VARIANT_CHARS[variant % UUID_VARIANT_CHARS.length] ?? "8";
	const hex = hash.join("");
	return [
		hex.slice(UUID_GROUPS[0], UUID_GROUPS[1]),
		hex.slice(UUID_GROUPS[1], UUID_GROUPS[2]),
		hex.slice(UUID_GROUPS[2], UUID_GROUPS[3]),
		hex.slice(UUID_GROUPS[3], UUID_GROUPS[4]),
		hex.slice(UUID_GROUPS[4], UUID_GROUPS[5]),
	].join("-");
}
