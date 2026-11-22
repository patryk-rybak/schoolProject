import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { getAedDetail } from "../../backend/aed-detail.ts";
import { auth } from "#backend/auth/auth.ts";
import {
	deleteUserAedDevice,
	listUserAedDevices,
} from "#backend/store/aed-store.ts";
import type { AedDevice } from "#backend/store/schema.ts";
import {
	geocodeAddress,
	geocodeRequestSchema,
	reverseGeocode,
	reverseGeocodeRequestSchema,
} from "../../backend/forms/geocode.ts";
import {
	type ManualFormValues,
	ManualRecordError,
	saveManualRecord,
} from "../../backend/forms/manual-record.ts";
import {
	deleteSource,
	listSources,
	previewSource,
	SourceAdminError,
	saveSourceConfig,
} from "../../backend/forms/source-admin.ts";

/**
 * Server functions for the AED forms. All storage, registry and geocoding
 * access stays on the server; the client only sends form payloads.
 *
 * Errors are returned as `{ ok: false, message, issues }` instead of thrown
 * so the forms can render Polish validation messages per field.
 *
 * The /zrodla registry exposes list, save, preview and delete. Importing
 * sources into the map is a separate scheduled ingest step, not a server
 * function.
 */
export interface FormIssue {
	field: string;
	message: string;
}
export interface FormFailure {
	ok: false;
	message: string;
	issues: FormIssue[];
	/** Set when the caller has to be signed in (HTTP-equivalent 401). */
	code?: "unauthorized";
}

function failure(error: unknown): FormFailure {
	if (error instanceof ManualRecordError) {
		return {
			ok: false,
			message: "Popraw wskazane pola formularza.",
			issues: [...error.issues],
		};
	}
	if (error instanceof SourceAdminError) {
		return {
			ok: false,
			message: error.message,
			issues: error.issues.map((issue) => ({
				field: issue.path,
				message: issue.message,
			})),
		};
	}
	return {
		ok: false,
		message: error instanceof Error ? error.message : String(error),
		issues: [],
	};
}

const aedDetailSchema = z.object({
	id: z.string().regex(/^\d+$/u),
});

/** Reads one AED from the server store for the detail route loader. */
export const getAedDetailFn = createServerFn({ method: "GET" })
	.validator(aedDetailSchema)
	.handler(({ data }) => getAedDetail(Number(data.id)));

function unauthorized(message: string): FormFailure {
	return { ok: false, code: "unauthorized", message, issues: [] };
}

function readSession() {
	return auth.api.getSession({ headers: getRequestHeaders() });
}

const manualValuesSchema = z.record(
	z.string(),
	z.union([z.string(), z.boolean(), z.null()]),
);

const geocodeInfoSchema = z.object({
	provider: z.string().min(1),
	displayName: z.string(),
	input: z.string(),
	confidence: z.number().min(0).max(1).nullable(),
});

const saveManualSchema = z.object({
	values: manualValuesSchema,
	geocode: geocodeInfoSchema.nullish(),
});

export interface MyAedItem {
	readonly id: number;
	readonly recordId: string;
	readonly name: string;
	readonly address: string | null;
	readonly city: string | null;
	readonly lat: number;
	readonly lon: number;
	readonly createdAt: string;
}

function rowAttributes(row: AedDevice): Record<string, unknown> {
	if (row.attributes === null) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(row.attributes);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function rowAttributeText(
	attributes: Record<string, unknown>,
	key: string,
): string | null {
	const value = attributes[key];
	return typeof value === "string" && value !== "" ? value : null;
}

function toMyAedItem(row: AedDevice): MyAedItem {
	const attributes = rowAttributes(row);
	const street = rowAttributeText(attributes, "street");
	const houseNumber = rowAttributeText(attributes, "house_number");
	const attributeAddress = [street, houseNumber].filter(Boolean).join(" ");
	return {
		id: row.id,
		recordId: row.recordId,
		name: row.name ?? "AED bez nazwy",
		address:
			row.addressText ??
			(attributeAddress.length > 0 ? attributeAddress : null),
		city: rowAttributeText(attributes, "city"),
		lat: row.lat,
		lon: row.lon,
		createdAt: row.createdAt.toISOString(),
	};
}

/** Minimal session probe used by route guards; never returns secrets. */
export const getSessionUserFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await readSession();
		if (!session) {
			return null;
		}
		return {
			id: session.user.id,
			username: session.user.username ?? session.user.name,
		};
	},
);

export const listMyAedFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await readSession();
		if (!session) {
			return {
				ok: false as const,
				code: "unauthorized" as const,
				message: "Zaloguj się, aby zobaczyć swoje AED.",
				items: [] as MyAedItem[],
			};
		}
		return {
			ok: true as const,
			items: listUserAedDevices(session.user.id).map(toMyAedItem),
		};
	},
);

export const deleteMyAedFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.number().int().positive() }))
	.handler(async ({ data }) => {
		const session = await readSession();
		if (!session) {
			return {
				ok: false as const,
				code: "unauthorized" as const,
				message: "Zaloguj się, aby usunąć AED.",
				issues: [],
			};
		}
		const deleted = deleteUserAedDevice(data.id, session.user.id);
		if (!deleted) {
			return {
				ok: false as const,
				message: "Nie znaleziono AED lub nie należy do Twojego konta.",
				issues: [],
			};
		}
		return { ok: true as const };
	});

export const saveManualAedFn = createServerFn({ method: "POST" })
	.validator(saveManualSchema)
	.handler(async ({ data }) => {
		const session = await readSession();
		if (!session) {
			return {
				ok: false as const,
				code: "unauthorized" as const,
				message: "Zaloguj się, aby dodać AED.",
				issues: [],
			};
		}
		try {
			const row = saveManualRecord({
				values: data.values as ManualFormValues,
				geocode: data.geocode ?? null,
				createdById: session.user.id,
			});
			return { ok: true as const, name: row.name ?? "AED" };
		} catch (error) {
			return failure(error);
		}
	});

export const geocodeAddressFn = createServerFn({ method: "POST" })
	.validator(geocodeRequestSchema)
	.handler(async ({ data }) => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby wyszukać adres.");
		}
		try {
			const result = await geocodeAddress(data.query);
			return { ok: true as const, ...result };
		} catch (error) {
			return failure(error);
		}
	});

export const reverseGeocodeFn = createServerFn({ method: "POST" })
	.validator(reverseGeocodeRequestSchema)
	.handler(async ({ data }) => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby ustalić adres punktu.");
		}
		try {
			const result = await reverseGeocode(data.lat, data.lon);
			return { ok: true as const, ...result };
		} catch (error) {
			return failure(error);
		}
	});

export const listSourcesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby zobaczyć źródła danych.");
		}
		try {
			return { ok: true as const, sources: listSources() };
		} catch (error) {
			return failure(error);
		}
	},
);

/** Connector configs are validated server-side by the ingest Zod schema. */
const configSchema = z.record(z.string(), z.unknown());

export const saveSourceFn = createServerFn({ method: "POST" })
	.validator(configSchema)
	.handler(async ({ data }) => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby dodać źródło danych.");
		}
		try {
			return { ok: true as const, source: saveSourceConfig(data) };
		} catch (error) {
			return failure(error);
		}
	});

export const previewSourceFn = createServerFn({ method: "POST" })
	.validator(configSchema)
	.handler(async ({ data }) => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby pobrać podgląd źródła.");
		}
		try {
			return { ok: true as const, preview: await previewSource(data) };
		} catch (error) {
			return failure(error);
		}
	});

export const deleteSourceFn = createServerFn({ method: "POST" })
	.validator(z.object({ sourceId: z.string().min(1) }))
	.handler(async ({ data }) => {
		if (!(await readSession())) {
			return unauthorized("Zaloguj się, aby usunąć źródło.");
		}
		try {
			return { ok: true as const, ...deleteSource(data.sourceId) };
		} catch (error) {
			return failure(error);
		}
	});
