// biome-ignore-all lint/security/noSecrets: this module assembles a public XML
// document from literals and data; no credentials are involved.

import type { FeedArtifact, FeedRecord } from "./types";
import { escapeXml } from "./xml";

/**
 * dane.gov.pl harvester feed, schema `urn:otwarte-dane:harvester:1.13`.
 *
 * Reference: https://dane.gov.pl/source-code/ (backend 2.63.0,
 * `data/harvester/xml_import_otwarte_dane_1_13.xsd`).
 *
 * The portal pulls this file once per `frequency_in_days`, validates its MD5,
 * then validates the XML against the XSD. Everything here is deterministic for
 * a given dataset snapshot so the checksum endpoint can serve the same bytes.
 */

export const NAMESPACE = "urn:otwarte-dane:harvester:1.13";

/** Stable identifiers. Never change them: the portal upserts by `extIdent`. */
export const DATASET_EXT_IDENT = "aed-pl-open";
export const CSV_EXT_IDENT = "aed-pl-open-csv";
export const GEOJSON_EXT_IDENT = "aed-pl-open-geojson";

export const DATASET_TITLE_PL = "Ogólnopolski rejestr defibrylatorów AED";
export const DATASET_TITLE_EN = "National AED registry";

/**
 * The licence is CC0 1.0 for the current dummy dataset.
 *
 * TODO(licence): before publishing real, aggregated data, verify the licence of
 * every upstream source. If any source requires attribution (e.g. CC BY 4.0),
 * change this value and add the attribution to the description.
 */
export const LICENCE = "CC0 1.0";

const DESCRIPTION_PL =
	"Zintegrowany, otwarty rejestr automatycznych defibrylatorów zewnętrznych " +
	"(AED) w Polsce. Zbiór łączy dane z rozproszonych źródeł i zawiera " +
	"lokalizację, dostępność oraz status urządzenia. Dane udostępniane są " +
	"w formatach CSV i GeoJSON, w formacie odczytywalnym maszynowo.";

const DESCRIPTION_EN =
	"An integrated, open registry of automated external defibrillators (AED) " +
	"in Poland. It combines dispersed sources and contains the location, " +
	"availability and status of each device. Published as machine-readable " +
	"CSV and GeoJSON.";

const TRAILING_SLASHES = /\/+$/u;

export interface FeedMeta {
	/** Origin used in resource URLs; must be https (XSD pattern). */
	readonly baseUrl: string;
	/** Timestamp of the newest record in the snapshot. */
	readonly updatedAt: Date;
	readonly recordCount: number;
}

interface DatasetXmlInput {
	readonly baseUrl: string;
	readonly updatedAt: string;
	readonly dataDate: string;
	readonly recordCount: number;
}

export function buildFeed(
	_records: readonly FeedRecord[],
	meta: FeedMeta,
): FeedArtifact {
	const baseUrl = meta.baseUrl.replace(TRAILING_SLASHES, "");
	const updatedAt = meta.updatedAt.toISOString();
	const input: DatasetXmlInput = {
		baseUrl,
		updatedAt,
		dataDate: updatedAt.slice(0, 10),
		recordCount: meta.recordCount,
	};

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<ns2:datasets xmlns:ns2="${NAMESPACE}">`,
		datasetXml(input),
		"</ns2:datasets>",
		"",
	].join("\n");

	return { xml, md5: md5Hex(xml), generatedAt: updatedAt };
}

function datasetXml(input: DatasetXmlInput): string {
	const descriptionPl = `${DESCRIPTION_PL} Liczba rekordów w chwili publikacji: ${input.recordCount}.`;
	const descriptionEn = `${DESCRIPTION_EN} Records at publication time: ${input.recordCount}.`;

	return [
		'\t<dataset status="published">',
		`\t\t<extIdent>${DATASET_EXT_IDENT}</extIdent>`,
		"\t\t<title>",
		`\t\t\t<polish>${escapeXml(DATASET_TITLE_PL)}</polish>`,
		`\t\t\t<english>${escapeXml(DATASET_TITLE_EN)}</english>`,
		"\t\t</title>",
		"\t\t<description>",
		`\t\t\t<polish>${escapeXml(descriptionPl)}</polish>`,
		`\t\t\t<english>${escapeXml(descriptionEn)}</english>`,
		"\t\t</description>",
		"\t\t<updateFrequency>daily</updateFrequency>",
		"\t\t<categories>",
		"\t\t\t<category>HEAL</category>",
		"\t\t\t<category>REGI</category>",
		"\t\t</categories>",
		"\t\t<conditions>",
		`\t\t\t<dbOrCopyrighted>Dane udostępniane na licencji ${LICENCE}.</dbOrCopyrighted>`,
		`\t\t\t<dbOrCopyrightedLicenseChosen>${LICENCE}</dbOrCopyrightedLicenseChosen>`,
		"\t\t</conditions>",
		resourcesXml(input),
		"\t\t<tags>",
		'\t\t\t<tag lang="pl">AED</tag>',
		'\t\t\t<tag lang="pl">defibrylator</tag>',
		'\t\t\t<tag lang="pl">pierwsza pomoc</tag>',
		"\t\t</tags>",
		`\t\t<lastUpdateDate>${input.updatedAt}</lastUpdateDate>`,
		"\t\t<hasDynamicData>true</hasDynamicData>",
		"\t\t<hasHighValueData>true</hasHighValueData>",
		"\t\t<hasResearchData>false</hasResearchData>",
		"\t</dataset>",
	].join("\n");
}

function resourcesXml(input: DatasetXmlInput): string {
	return [
		"\t\t<resources>",
		resourceXml({
			extIdent: CSV_EXT_IDENT,
			url: `${input.baseUrl}/data/aed.csv`,
			titlePl: "Rejestr AED – CSV",
			descriptionPl:
				"Pełny rejestr defibrylatorów w formacie CSV (UTF-8), po jednym urządzeniu w wierszu.",
			dataDate: input.dataDate,
			updatedAt: input.updatedAt,
		}),
		resourceXml({
			extIdent: GEOJSON_EXT_IDENT,
			url: `${input.baseUrl}/data/aed.geojson`,
			titlePl: "Rejestr AED – GeoJSON",
			descriptionPl:
				"Rejestr defibrylatorów jako kolekcja obiektów GeoJSON (punkt = lokalizacja AED).",
			dataDate: input.dataDate,
			updatedAt: input.updatedAt,
		}),
		"\t\t</resources>",
	].join("\n");
}

interface ResourceXmlInput {
	readonly extIdent: string;
	readonly url: string;
	readonly titlePl: string;
	readonly descriptionPl: string;
	readonly dataDate: string;
	readonly updatedAt: string;
}

function resourceXml(resource: ResourceXmlInput): string {
	return [
		'\t\t\t<resource status="published">',
		`\t\t\t\t<extIdent>${resource.extIdent}</extIdent>`,
		`\t\t\t\t<url>${escapeXml(resource.url)}</url>`,
		"\t\t\t\t<title>",
		`\t\t\t\t\t<polish>${escapeXml(resource.titlePl)}</polish>`,
		"\t\t\t\t</title>",
		"\t\t\t\t<description>",
		`\t\t\t\t\t<polish>${escapeXml(resource.descriptionPl)}</polish>`,
		"\t\t\t\t</description>",
		"\t\t\t\t<availability>local</availability>",
		`\t\t\t\t<dataDate>${resource.dataDate}</dataDate>`,
		`\t\t\t\t<lastUpdateDate>${resource.updatedAt}</lastUpdateDate>`,
		"\t\t\t\t<hasDynamicData>true</hasDynamicData>",
		"\t\t\t\t<containsProtectedData>false</containsProtectedData>",
		"\t\t\t</resource>",
	].join("\n");
}

function md5Hex(value: string): string {
	return new Bun.CryptoHasher("md5").update(value).digest("hex");
}
