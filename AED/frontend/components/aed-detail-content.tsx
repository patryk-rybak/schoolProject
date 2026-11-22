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
	const add = (label: string, key: string): void => {
		const value = display(record[key]);
		if (value !== "") {
			rows.push([label, value]);
		}
	};
	add("Identyfikator ewidencji", "record_id");
	add("Identyfikator źródła", "source_record_id");
	add("Opis", "description");
	add("Uwagi", "note");
	add("Rodzaj obiektu", "facility_type");
	add("Typ urządzenia", "device_type");
	add("Dostęp", "access_type");
	add("Stan", "status");
	add("Weryfikacja", "verification_status");
	add("Weryfikujący", "verified_by");
	add("Rodzaj weryfikującego", "verified_by_kind");
	add("Data weryfikacji", "verified_at");
	add("Dokładność współrzędnych (m)", "coord_precision_m");
	add("Status lokalizacji", "location_status");
	add("Źródło współrzędnych", "geom_source");
	add("Adres", "address_text");
	add("Rodzaj adresu", "address_kind");
	add("Źródło adresu", "address_source");
	add("Dostawca geokodowania", "geocode_provider");
	add("Wersja geokodowania", "geocode_version");
	add("Data geokodowania", "geocoded_at");
	add("Uwagi geokodowania", "geocode_note");
	add("Status zgłoszenia", "claim_status");
	add("Zgłaszający", "claimed_by");
	add("Data zgłoszenia", "claimed_at");
	add("Uwagi zgłoszenia", "claim_note");

	const sourceUrl = display(record["source_url"]);
	const attributes = asRecord(record["attributes"]);
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
