import type { AedRecord } from "./domain";

export interface AedMapProps {
	readonly records: readonly AedRecord[];
	/** Currently highlighted record, e.g. from the URL. */
	readonly selectedId?: string | null;
	readonly onSelect?: (recordId: string) => void;
	/** Height of the map container; defaults to the parent height. */
	readonly className?: string;
}

/** Compact view model for list/teaser rendering next to the map. */
export interface AedSummary {
	readonly id: string;
	readonly name: string;
	readonly city: string | null;
	readonly access: AedRecord["access"];
	readonly status: AedRecord["status"];
}
