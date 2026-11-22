import type { ManualFormValues } from "#backend/forms/manual-record.ts";
import type { FormIssue } from "#/server/forms";

/** Form state: every canonical field as a string (inputs are text-based). */
export type Values = {
	[K in keyof ManualFormValues]?: string;
};

export interface GeocodeState {
	provider: string;
	displayName: string;
	input: string;
	confidence: number | null;
}

export interface Candidate {
	lat: number;
	lon: number;
	displayName: string;
	confidence: number;
}

/** Address fields filled automatically from the point, never typed directly. */
export const DERIVED_ADDRESS_KEYS = [
	"postcode",
	"voivodeship",
	"county",
	"commune",
	"city",
	"street",
	"house_number",
] as const;

export const ACCESS_OPTIONS = [
	{ value: "always", label: "Dostęp całodobowy (24/7)" },
	{ value: "business_hours", label: "W godzinach otwarcia obiektu" },
	{ value: "restricted", label: "Po uzyskaniu klucza lub po zgłoszeniu" },
	{ value: "unknown", label: "Nieustalony" },
];

export const STATUS_OPTIONS = [
	{ value: "operational", label: "Sprawny" },
	{ value: "out_of_service", label: "Niesprawny lub wycofany z użytkowania" },
	{ value: "unknown", label: "Nieustalony" },
];

export const FACILITY_OPTIONS = [
	"unknown",
	"urząd",
	"szpital",
	"przychodnia",
	"galeria handlowa",
	"biurowiec",
	"obiekt sportowy",
	"kultura",
	"gastronomia",
	"przestrzeń publiczna",
	"inne",
];

export const FACILITY_LABELS: Record<string, string> = {
	unknown: "Nieustalony",
	urząd: "Urząd",
	szpital: "Szpital",
	przychodnia: "Przychodnia",
	"galeria handlowa": "Galeria handlowa",
	biurowiec: "Biurowiec",
	"obiekt sportowy": "Obiekt sportowy",
	kultura: "Obiekt kultury",
	gastronomia: "Obiekt gastronomiczny",
	"przestrzeń publiczna": "Przestrzeń publiczna",
	inne: "Inne",
};

export const BOOLEAN_FIELDS = [
	{ key: "indoor", label: "Urządzenie wewnątrz budynku" },
	{ key: "is_24_7", label: "Dostęp całodobowy (24/7)" },
	{ key: "requires_dispatcher", label: "Dostęp po zgłoszeniu dyspozytorowi" },
	{ key: "fee", label: "Dostęp odpłatny" },
	{
		key: "wheelchair_access",
		label: "Dostęp dla osób na wózkach inwalidzkich",
	},
	{ key: "is_public", label: "Dostęp publiczny" },
] as const;

/** Date inputs of the device/inspection section, in render order. */
export const DATE_FIELDS = [
	["installed_at", "Data instalacji"],
	["battery_expiry", "Data ważności baterii"],
	["pads_expiry", "Data ważności elektrod"],
	["last_inspection_at", "Data ostatniego przeglądu"],
	["next_inspection_at", "Data następnego przeglądu"],
] as const;

export function issueFor(
	issues: FormIssue[],
	field: string,
): string | undefined {
	return issues.find((issue) => issue.field === field)?.message;
}

export function initialValues(lat?: number, lon?: number): Values {
	return {
		access_type: "unknown",
		status: "unknown",
		verification_status: "unverified",
		facility_type: "unknown",
		...(lat !== undefined ? { lat: String(lat) } : {}),
		...(lon !== undefined ? { lon: String(lon) } : {}),
	};
}