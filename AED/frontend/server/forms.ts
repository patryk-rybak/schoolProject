import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	geocodeAddress,
	geocodeRequestSchema,
} from "../../backend/forms/geocode.ts";
import {
	type ManualFormValues,
	ManualRecordError,
	saveManualRecord,
} from "../../backend/forms/manual-record.ts";
import {
	deleteSource,
	importSource,
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
 */

export interface FormIssue {
	field: string;
	message: string;
}
export interface FormFailure {
	ok: false;
	message: string;
	issues: FormIssue[];
}

function failure(error: unknown): FormFailure {
	if (error instanceof ManualRecordError) {
		return {
			ok: false,
			message: "Popraw zaznaczone pola.",
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

export const saveManualAedFn = createServerFn({ method: "POST" })
	.validator(saveManualSchema)
	.handler(({ data }) => {
		try {
			const row = saveManualRecord({
				values: data.values as ManualFormValues,
				geocode: data.geocode ?? null,
			});
			return { ok: true as const, id: row.id, name: row.name };
		} catch (error) {
			return failure(error);
		}
	});

export const geocodeAddressFn = createServerFn({ method: "POST" })
	.validator(geocodeRequestSchema)
	.handler(async ({ data }) => {
		try {
			const result = await geocodeAddress(data.query);
			return { ok: true as const, ...result };
		} catch (error) {
			return failure(error);
		}
	});

export const listSourcesFn = createServerFn({ method: "GET" }).handler(() => {
	try {
		return { ok: true as const, sources: listSources() };
	} catch (error) {
		return failure(error);
	}
});

/** Connector configs are validated server-side by the ingest Zod schema. */
const configSchema = z.record(z.string(), z.unknown());

export const saveSourceFn = createServerFn({ method: "POST" })
	.validator(configSchema)
	.handler(({ data }) => {
		try {
			return { ok: true as const, source: saveSourceConfig(data) };
		} catch (error) {
			return failure(error);
		}
	});

export const previewSourceFn = createServerFn({ method: "POST" })
	.validator(configSchema)
	.handler(async ({ data }) => {
		try {
			return { ok: true as const, preview: await previewSource(data) };
		} catch (error) {
			return failure(error);
		}
	});

export const importSourceFn = createServerFn({ method: "POST" })
	.validator(z.object({ sourceId: z.string().min(1) }))
	.handler(async ({ data }) => {
		try {
			return { ok: true as const, result: await importSource(data.sourceId) };
		} catch (error) {
			return failure(error);
		}
	});

export const deleteSourceFn = createServerFn({ method: "POST" })
	.validator(z.object({ sourceId: z.string().min(1) }))
	.handler(({ data }) => {
		try {
			return { ok: true as const, ...deleteSource(data.sourceId) };
		} catch (error) {
			return failure(error);
		}
	});
