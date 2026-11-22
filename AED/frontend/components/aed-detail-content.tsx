import type { AedDetail } from "#backend/aed-detail.ts";
import {
	ACCESS_LABELS,
	displayValue as display,
	labelFor,
	STATUS_LABELS,
} from "#/lib/aed-labels";

function valueOrUnknown(value: string): string {
	return value === "" ? "Niepodano" : value;
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-semibold text-lg">{title}</h2>
			{children}
		</section>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
			<dt className="w-56 shrink-0 text-muted-foreground text-sm">{label}</dt>
			<dd className="break-words text-sm">{valueOrUnknown(value)}</dd>
		</div>
	);
}

function DetailList({ rows }: { rows: readonly (readonly [string, string])[] }) {
	return (
		<dl className="flex flex-col gap-2">
			{rows.map(([label, value]) => (
				<DetailRow key={label} label={label} value={value} />
			))}
		</dl>
	);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

/**
 * Polish labels for every field of the unified canonical AED record
 * (src/server/ingest/canonical.ts). Keeping them here guarantees the detail
 * view exposes the complete schema, including verification and claim
 * provenance, rather than a hand-picked subset.
 */
const CANONICAL_LABELS: Record<string, string> = {
	version: "Wersja schematu",
	record_id: "Identyfikator rekordu",
	source_id: "Identyfikator źródła",
	source_record_id: "Identyfikator rekordu źródłowego",
	source_url: "Adres URL źródła",
	name: "Nazwa",
	description: "Opis",
	note: "Uwagi",
	facility_type: "Rodzaj obiektu",
	device_type: "Typ urządzenia",
	access_type: "Dostęp",
	status: "Stan",
	verification_status: "Status weryfikacji",
	verified_by: "Weryfikujący",
	verified_by_kind: "Rodzaj weryfikującego",
	verified_at: "Data weryfikacji",
	confidence: "Pewność",
	lat: "Szerokość geograficzna",
	lon: "Długość geograficzna",
	coord_precision_m: "Dokładność współrzędnych (m)",
	location_status: "Status lokalizacji",
	geom_source: "Źródło współrzędnych",
	address_text: "Adres",
	address_kind: "Rodzaj adresu",
	address_source: "Źródło adresu",
	address_confidence: "Pewność adresu",
	geocode_provider: "Dostawca geokodowania",
	geocode_version: "Wersja geokodowania",
	geocode_confidence: "Pewność geokodowania",
	geocoded_at: "Data geokodowania",
	geocode_input_sha256: "Hash wejścia geokodowania",
	geocode_note: "Uwagi geokodowania",
	claim_status: "Status zgłoszenia",
	claimed_by: "Zgłaszający",
	claimed_at: "Data zgłoszenia",
	claim_note: "Uwagi zgłoszenia",
	field_provenance: "Pochodzenie pól",
	attributes: "Dodatkowe atrybuty",
};

/** Renders every field present in a canonical record without trusting its shape. */
function CanonicalDetails({ canonical }: { canonical: unknown }) {
	const record = asRecord(canonical);
	if (!record) {
		return (
			<p className="text-muted-foreground text-sm">
				Szczegółowe dane źródłowe nie są dostępne.
			</p>
		);
	}

	const rows: [string, string][] = [];
	// Render primitive fields in canonical schema order.
	for (const key of Object.keys(CANONICAL_LABELS)) {
		if (key === "field_provenance" || key === "attributes") {
			continue;
		}
		const value = display(record[key]);
		if (value !== "") {
			rows.push([CANONICAL_LABELS[key] ?? key, value]);
		}
	}

	const sourceUrl = display(record["source_url"]);
	let attributes = asRecord(record["attributes"]);
	if (attributes === null && typeof record["attributes"] === "string") {
		try {
			attributes = asRecord(JSON.parse(record["attributes"] as string));
		} catch {
			attributes = null;
		}
	}
	const attributeRows: [string, string][] = [];
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			const text = display(value);
			if (text !== "") {
				attributeRows.push([key, text]);
			}
		}
		attributeRows.sort(([a], [b]) => a.localeCompare(b, "pl"));
	}

	let provenance = asRecord(record["field_provenance"]);
	if (provenance === null && typeof record["field_provenance"] === "string") {
		try {
			provenance = asRecord(JSON.parse(record["field_provenance"] as string));
		} catch {
			provenance = null;
		}
	}
	const provenanceRows: [string, string][] = [];
	if (provenance) {
		for (const [key, value] of Object.entries(provenance)) {
			const text = display(value);
			if (text !== "") {
				provenanceRows.push([key, text]);
			}
		}
		provenanceRows.sort(([a], [b]) => a.localeCompare(b, "pl"));
	}

	return (
		<div className="flex flex-col gap-6">
			<DetailList rows={rows} />
			{sourceUrl !== "" && /^https:\/\//u.test(sourceUrl) ? (
				<p className="text-sm">
					<a
						className="text-primary underline"
						href={sourceUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Otwórz źródło danych
					</a>
				</p>
			) : null}
			{provenanceRows.length > 0 ? (
				<Section title="Pochodzenie pól">
					<DetailList rows={provenanceRows} />
				</Section>
			) : null}
			{attributeRows.length > 0 ? (
				<Section title="Dodatkowe atrybuty">
					<DetailList rows={attributeRows} />
				</Section>
			) : null}
		</div>
	);
}

export function AedDetailContent({ detail }: { detail: AedDetail }) {
	const rows: [string, string][] = [
		["Nazwa", detail.name],
		["Miejscowość", detail.city ?? ""],
		["Adres", detail.address ?? ""],
		["Dostęp", labelFor(detail.access, ACCESS_LABELS)],
		["Stan", labelFor(detail.status, STATUS_LABELS)],
		["Źródło", detail.source],
		[
			"Weryfikacja",
			detail.verificationStatus === "verified"
				? ["Zweryfikowany", detail.verifiedBy, detail.verifiedAt]
						.filter((part) => part !== null)
						.join(" · ")
				: "Niezweryfikowany",
		],
		["Szerokość geograficzna", String(detail.latitude)],
		["Długość geograficzna", String(detail.longitude)],
		["Identyfikator rekordu", String(detail.id)],
	];

	return (
		<div className="flex flex-col gap-8">
			<Section title="Podstawowe informacje">
				<DetailList rows={rows} />
			</Section>
			<Section title="Dane szczegółowe">
				<CanonicalDetails canonical={detail.canonical} />
			</Section>
		</div>
	);
}
