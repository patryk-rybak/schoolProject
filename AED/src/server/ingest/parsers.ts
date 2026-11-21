/**
 * Dependency-free parsing and mapping helpers for ingest.
 *
 * These helpers implement the parser contract used by the ingest pipeline:
 * fetch shaping, field extraction and mapping of live source payloads.
 *
 * They are deliberately pure: no network, no filesystem, no environment.
 */

export type RecordValue = Record<string, unknown>;

export type CsvOptions = {
	delimiter?: string | undefined;
	quote?: string | undefined;
	skipRows?: number | undefined;
	header?: boolean | undefined;
	unwrapOuterQuotes?: boolean | undefined;
	repairDoubleQuotes?: boolean | undefined;
	emptyAsNull?: boolean | undefined;
	trimHeaders?: boolean | undefined;
	trimValues?: boolean | undefined;
};

export type CsvResult = {
	headers: string[];
	rows: string[][];
	records: RecordValue[];
};

export type HtmlAttribute = Record<string, string>;

export type HtmlBlock = {
	inner: string;
	outer: string;
	attributes: HtmlAttribute;
	tagName: string;
	className: string;
	id: string;
};

export type HtmlTableOptions = {
	select?: string | undefined;
	tableIndex?: number | undefined;
	requireHeaders?: readonly string[] | undefined;
	requireKeys?: readonly string[] | undefined;
	orientation?: "rows" | "key_value" | undefined;
	columns?: readonly string[] | undefined;
	headerRow?: number | undefined;
	dataStartRow?: number | undefined;
	keyColumn?: number | undefined;
	valueColumn?: number | undefined;
	valueJoin?: "space" | "newline" | undefined;
	normalizeHeaders?: boolean | undefined;
	trim?: boolean | undefined;
	collapseWhitespace?: boolean | undefined;
	emptyAsNull?: boolean | undefined;
	skipEmptyRows?: boolean | undefined;
};

export type HtmlTableResult = {
	records: RecordValue[];
	tableCount: number;
	matchedTables: number;
	headers: string[];
	rowsSeen: number;
	rowsAfterFilters: number;
	diagnostics: string[];
};

export type HtmlElement = {
	type: "element";
	tagName: string;
	attributes: HtmlAttribute;
	children: HtmlNode[];
};

export type HtmlTextNode = {
	type: "text";
	text: string;
};

export type HtmlNode = HtmlElement | HtmlTextNode;

export type KmlPlacemark = {
	name: string | null;
	geometryTypes: string[];
	coordinates: Array<[number, number]>;
};

export type KmlResult = {
	documentName: string | null;
	placemarks: KmlPlacemark[];
	pointCount: number;
	lineCount: number;
	polygonCount: number;
	pointlessCount: number;
};

export type CoordSpec = {
	format?: string;
	from?: unknown;
	lat?: unknown;
	lon?: unknown;
	order?: string;
	delimiter?: string;
	pick?: string;
	unwrapSingle?: boolean;
	onInvalid?: string;
};

export type MapSpec = {
	value?: unknown;
	required?: boolean;
	onMissing?: string;
	default?: unknown;
};

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: "\u00a0",
	quot: '"',
	oacute: "ó",
	Oacute: "Ó",
	aacute: "á",
	Aacute: "Á",
	eacute: "é",
	Eacute: "É",
	iacute: "í",
	Iacute: "Í",
	uacute: "ú",
	Uacute: "Ú",
	zacute: "ź",
	Zacute: "Ź",
	zdot: "ż",
	Zdot: "Ż",
	scedil: "ş",
	Scedil: "Ş",
	ccedil: "ç",
	Ccedil: "Ç",
	hellip: "…",
	ndash: "–",
	mdash: "—",
	minus: "−",
	times: "×",
	deg: "°",
};

const stripAccents = (value: string): string => {
	const decomposed = value.normalize("NFKD");
	return decomposed.replace(/\p{M}/gu, "");
};

const safeTextDecoder = (label: string): TextDecoder => {
	try {
		return new TextDecoder(label);
	} catch {
		return new TextDecoder("utf-8");
	}
};

export function decodeText(bytes: Uint8Array, encoding = "utf-8"): string {
	if (
		encoding === "utf-8-sig" &&
		bytes.length >= 3 &&
		bytes[0] === 0xef &&
		bytes[1] === 0xbb &&
		bytes[2] === 0xbf
	) {
		return safeTextDecoder("utf-8").decode(bytes.subarray(3));
	}
	const label = encoding === "utf-8-sig" ? "utf-8" : encoding;
	const decoder = safeTextDecoder(label);
	return decoder.decode(bytes);
}

export function decodeHtmlEntities(value: string): string {
	return value.replace(
		/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g,
		(match, entity: string) => {
			if (entity.startsWith("#x") || entity.startsWith("#X")) {
				const code = Number.parseInt(entity.slice(2), 16);
				return Number.isFinite(code) ? String.fromCodePoint(code) : match;
			}
			if (entity.startsWith("#")) {
				const code = Number.parseInt(entity.slice(1), 10);
				return Number.isFinite(code) ? String.fromCodePoint(code) : match;
			}
			return NAMED_ENTITIES[entity] ?? match;
		},
	);
}

export function collapseWhitespace(value: string): string {
	return value.replace(/[\s\u00a0]+/g, " ").trim();
}

export function normalizeHeader(value: string): string {
	return collapseWhitespace(decodeHtmlEntities(value));
}

function stripTags(value: string): string {
	return decodeHtmlEntities(
		value
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
			.replace(/<br\s*\/?>/gi, " ")
			.replace(/<\/(p|div|li|tr|h[1-6])>/gi, " ")
			.replace(/<[^>]+>/g, ""),
	);
}

export function htmlText(inner: string, collapse = true): string {
	const raw = stripTags(inner).replace(/\u00a0/g, " ");
	return collapse ? collapseWhitespace(raw) : raw.trim();
}

function parseAttributes(source: string): HtmlAttribute {
	const attributes: HtmlAttribute = {};
	const pattern =
		/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
	for (const match of source.matchAll(pattern)) {
		const name = match[1];
		if (!name) continue;
		attributes[name.toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? "";
	}
	return attributes;
}

type SelectorPart = {
	tag: string;
	classes: string[];
	id: string | null;
};

function parseSelectorPart(part: string): SelectorPart | null {
	const match = /^([a-zA-Z][a-zA-Z0-9-]*|\*)?((?:[.#][a-zA-Z0-9_-]+)*)$/.exec(
		part.trim(),
	);
	if (!match) return null;
	const classes: string[] = [];
	let id: string | null = null;
	for (const token of (match[2] ?? "").matchAll(/([.#])([a-zA-Z0-9_-]+)/g)) {
		if (token[1] === ".") classes.push(token[2] ?? "");
		else id = token[2] ?? null;
	}
	return {
		classes,
		id,
		tag: match[1] ?? "*",
	};
}

function splitSelector(selector: string): SelectorPart[] {
	const parts = selector
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map(parseSelectorPart);
	if (parts.length === 0 || parts.some((part) => part === null)) {
		throw new Error(`Nieobsługiwany selektor HTML: ${selector}`);
	}
	return parts as SelectorPart[];
}

function attributesMatch(
	attributes: HtmlAttribute,
	part: SelectorPart,
): boolean {
	if (part.id && attributes["id"] !== part.id) return false;
	const className = attributes["class"] ?? "";
	const classes = className.split(/\s+/).filter(Boolean);
	return part.classes.every((name) => classes.includes(name));
}

/**
 * Approximate ancestor test for descendant selectors: find the nearest
 * preceding matching opening tag whose element is still open at `index`.
 * Good enough for static, well-formed HTML5 list pages; no external parser.
 */
function findEnclosingAncestor(
	html: string,
	index: number,
	part: SelectorPart,
): number | null {
	const tag = part.tag === "*" ? "[a-zA-Z][a-zA-Z0-9-]*" : part.tag;
	const pattern = new RegExp(`<(${tag})\\b([^>]*)>`, "gi");
	let best: number | null = null;
	for (const match of html.slice(0, index).matchAll(pattern)) {
		const attributes = parseAttributes(match[2] ?? "");
		if (!attributesMatch(attributes, part)) continue;
		const tagName = match[1] ?? "";
		const start = match.index ?? 0;
		const openEnd = start + (match[0]?.length ?? 0);
		const closePattern = new RegExp(`<(/?)\\s*${tagName}\\b[^>]*>`, "gi");
		closePattern.lastIndex = openEnd;
		let depth = 1;
		let closedAt: number | null = null;
		let closeMatch = closePattern.exec(html);
		while (closeMatch !== null) {
			if (closeMatch[1] === "/") depth -= 1;
			else depth += 1;
			if (depth === 0) {
				closedAt = closeMatch.index;
				break;
			}
			closeMatch = closePattern.exec(html);
		}
		if (closedAt === null || closedAt > index) best = start;
	}
	return best;
}

/** Finds elements by tag and the small selector subset used by the configs. */
export function findHtmlBlocks(
	html: string,
	tagName: string,
	selector = tagName,
): HtmlBlock[] {
	if (selector.includes(",")) {
		const seen = new Set<string>();
		const merged: HtmlBlock[] = [];
		for (const group of selector
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean)) {
			for (const block of findHtmlBlocks(html, tagName, group)) {
				const key = `${block.tagName}\u0000${block.outer}`;
				if (seen.has(key)) continue;
				seen.add(key);
				merged.push(block);
			}
		}
		return merged;
	}
	const selectorParts = splitSelector(selector);
	const last = selectorParts[selectorParts.length - 1];
	if (!last) return [];
	const tag = last.tag === "*" ? tagName : last.tag;
	const tokenPattern = new RegExp(`<(\\/?)(?:${tag})\\b([^>]*)>`, "gi");
	type OpenElement = {
		attributes: HtmlAttribute;
		className: string;
		id: string;
		start: number;
		innerStart: number;
	};
	const stack: OpenElement[] = [];
	const blocks: Array<{ block: HtmlBlock; start: number }> = [];
	for (const match of html.matchAll(tokenPattern)) {
		const closing = match[1] === "/";
		const start = match.index ?? 0;
		if (closing) {
			const open = stack.pop();
			if (!open) continue;
			const attributes = open.attributes;
			const block: HtmlBlock = {
				attributes,
				className: open.className,
				id: open.id,
				inner: html.slice(open.innerStart, start),
				outer: html.slice(open.start, start + (match[0]?.length ?? 0)),
				tagName: tag.toLowerCase(),
			};
			blocks.push({ block, start: open.start });
			continue;
		}
		const rawAttributes = match[2] ?? "";
		const attributes = parseAttributes(rawAttributes);
		const selfClosing = /\/\s*$/.test(rawAttributes);
		if (selfClosing) {
			blocks.push({
				block: {
					attributes,
					className: attributes["class"] ?? "",
					id: attributes["id"] ?? "",
					inner: "",
					outer: match[0],
					tagName: tag.toLowerCase(),
				},
				start,
			});
			continue;
		}
		stack.push({
			attributes,
			className: attributes["class"] ?? "",
			id: attributes["id"] ?? "",
			start,
			innerStart: start + (match[0]?.length ?? 0),
		});
	}
	blocks.sort((left, right) => left.start - right.start);
	const result: HtmlBlock[] = [];
	for (const { block, start } of blocks) {
		if (!attributesMatch(block.attributes, last)) continue;
		if (selectorParts.length > 1) {
			let cursor = start;
			let ok = true;
			for (let index = selectorParts.length - 2; index >= 0; index -= 1) {
				const parent = selectorParts[index];
				if (!parent) continue;
				const ancestor = findEnclosingAncestor(html, cursor, parent);
				if (ancestor === null) {
					ok = false;
					break;
				}
				cursor = ancestor;
			}
			if (!ok) continue;
		}
		result.push(block);
	}
	return result;
}

const VOID_TAGS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

const P_CLOSING_TAGS = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"div",
	"dl",
	"fieldset",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hr",
	"li",
	"main",
	"nav",
	"ol",
	"p",
	"pre",
	"section",
	"table",
	"ul",
]);

function shouldAutoClose(openTag: string, newTag: string): boolean {
	if (openTag === "li" && newTag === "li") return true;
	if (openTag === "p" && P_CLOSING_TAGS.has(newTag)) return true;
	if (
		(openTag === "dt" || openTag === "dd") &&
		(newTag === "dt" || newTag === "dd")
	) {
		return true;
	}
	if (openTag === "option" && (newTag === "option" || newTag === "optgroup")) {
		return true;
	}
	if (openTag === "tr" && newTag === "tr") return true;
	if (
		(openTag === "td" || openTag === "th") &&
		(newTag === "td" || newTag === "th")
	) {
		return true;
	}
	return false;
}

/**
 * Builds a tiny forgiving HTML tree. It is not a browser parser, but it handles
 * unclosed <p>, <li>, <tr> and <td> elements, comments, void tags and common
 * malformed municipal pages well enough for selector-based extraction.
 */
export function parseHtmlDocument(html: string): HtmlElement {
	const cleaned = html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");
	const root: HtmlElement = {
		attributes: {},
		children: [],
		tagName: "#document",
		type: "element",
	};
	const stack: HtmlElement[] = [root];
	const tokenPattern = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g;
	for (const match of cleaned.matchAll(tokenPattern)) {
		const token = match[0];
		if (token.startsWith("<!--")) continue;
		const current = stack[stack.length - 1] ?? root;
		if (token.startsWith("</")) {
			const tag = /^<\/\s*([a-zA-Z][a-zA-Z0-9:-]*)/
				.exec(token)?.[1]
				?.toLowerCase();
			if (!tag) continue;
			for (let index = stack.length - 1; index >= 1; index -= 1) {
				if (stack[index]?.tagName === tag) {
					stack.length = index;
					break;
				}
			}
			continue;
		}
		if (token.startsWith("<")) {
			const open = /^<\s*([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/.exec(token);
			if (!open) continue;
			const tag = (open[1] ?? "").toLowerCase();
			const attrsSource = open[2] ?? "";
			while (
				stack.length > 1 &&
				shouldAutoClose(stack[stack.length - 1]?.tagName ?? "", tag)
			) {
				stack.pop();
			}
			const element: HtmlElement = {
				attributes: parseAttributes(attrsSource),
				children: [],
				tagName: tag,
				type: "element",
			};
			current.children.push(element);
			if (!VOID_TAGS.has(tag) && !attrsSource.trim().endsWith("/")) {
				stack.push(element);
			}
			continue;
		}
		current.children.push({ text: token, type: "text" });
	}
	return root;
}

type CompoundSelector = {
	tag: string | null;
	id: string | null;
	classes: string[];
	attributes: Array<{ name: string; value: string | null }>;
};

function parseCompoundSelector(source: string): CompoundSelector {
	const selector: CompoundSelector = {
		attributes: [],
		classes: [],
		id: null,
		tag: null,
	};
	const tagMatch = /^([a-zA-Z][a-zA-Z0-9:-]*|\*)/.exec(source);
	if (tagMatch?.[1] && tagMatch[1] !== "*")
		selector.tag = tagMatch[1].toLowerCase();
	let rest = source.slice(tagMatch?.[0]?.length ?? 0);
	for (const match of rest.matchAll(/\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)/g)) {
		if (match[1]) selector.classes.push(match[1]);
		else if (match[2]) selector.id = match[2];
	}
	rest = rest.replace(/\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)/g, "");
	for (const match of rest.matchAll(
		/\[\s*([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\]]*))?\s*\]/g,
	)) {
		const name = match[1];
		if (!name) continue;
		const raw = match[2];
		selector.attributes.push({
			name: name.toLowerCase(),
			value: raw === undefined ? null : raw.replace(/^["']|["']$/g, "").trim(),
		});
	}
	return selector;
}

function matchesCompound(
	element: HtmlElement,
	selector: CompoundSelector,
): boolean {
	if (selector.tag && element.tagName !== selector.tag) return false;
	if (selector.id && element.attributes["id"] !== selector.id) return false;
	const classes = (element.attributes["class"] ?? "")
		.split(/\s+/)
		.filter(Boolean);
	if (!selector.classes.every((entry) => classes.includes(entry))) return false;
	for (const attribute of selector.attributes) {
		const value = element.attributes[attribute.name];
		if (value === undefined) return false;
		if (attribute.value !== null && value !== attribute.value) return false;
	}
	return true;
}

function matchesComplexSelector(
	element: HtmlElement,
	ancestors: HtmlElement[],
	selector: string,
): boolean {
	const parts = selector.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return false;
	const last = parts[parts.length - 1];
	if (!last || !matchesCompound(element, parseCompoundSelector(last)))
		return false;
	let ancestorIndex = ancestors.length - 1;
	for (let partIndex = parts.length - 2; partIndex >= 0; partIndex -= 1) {
		const part = parts[partIndex];
		if (!part) return false;
		const compound = parseCompoundSelector(part);
		let matched = false;
		while (ancestorIndex >= 0) {
			const ancestor = ancestors[ancestorIndex];
			ancestorIndex -= 1;
			if (ancestor && matchesCompound(ancestor, compound)) {
				matched = true;
				break;
			}
		}
		if (!matched) return false;
	}
	return true;
}

export function queryHtmlSelector(
	root: HtmlElement,
	selector: string,
): HtmlElement[] {
	const selectors = selector
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
	const matches: HtmlElement[] = [];
	const walk = (element: HtmlElement, ancestors: HtmlElement[]): void => {
		for (const child of element.children) {
			if (child.type !== "element") continue;
			if (
				selectors.some((entry) =>
					matchesComplexSelector(child, ancestors, entry),
				)
			) {
				matches.push(child);
			}
			walk(child, [...ancestors, child]);
		}
	};
	walk(root, []);
	return matches;
}

export function htmlElementText(
	element: HtmlElement,
	separator = " ",
	collapse = true,
): string {
	const parts: string[] = [];
	const collect = (node: HtmlNode): void => {
		if (node.type === "text") {
			parts.push(node.text);
			return;
		}
		if (node.tagName === "br") {
			parts.push(separator);
			return;
		}
		for (const child of node.children) {
			if (child.type === "element" && parts.length > 0) parts.push(separator);
			collect(child);
		}
	};
	for (const child of element.children) collect(child);
	const text = decodeHtmlEntities(parts.join("")).replace(/\u00a0/g, " ");
	return collapse ? collapseWhitespace(text) : text.trim();
}

function parseHtmlRows(tableInner: string): string[][] {
	const rows: string[][] = [];
	const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi;
	for (const rowMatch of tableInner.matchAll(rowPattern)) {
		const rowInner = rowMatch[1] ?? "";
		const cells: string[] = [];
		const cellPattern = /<(t[dh])\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
		for (const cellMatch of rowInner.matchAll(cellPattern)) {
			cells.push(htmlText(cellMatch[2] ?? ""));
		}
		if (cells.length > 0) rows.push(cells);
	}
	return rows;
}

function normalizeHeaders(
	headers: string[],
	options: HtmlTableOptions,
): string[] {
	if (options.normalizeHeaders === false && options.trim === false) {
		return headers;
	}
	return headers.map((header) => normalizeHeader(header));
}

function toRecord(
	headers: string[],
	cells: string[],
	options: HtmlTableOptions,
): RecordValue {
	const record: RecordValue = {};
	for (let index = 0; index < headers.length; index += 1) {
		const header = headers[index];
		if (!header) continue;
		const cell = cells[index];
		const value = options.trim === false ? (cell ?? "") : (cell ?? "").trim();
		record[header] =
			options.emptyAsNull !== false && value === "" ? null : value;
	}
	return record;
}

export function parseHtmlTables(
	html: string,
	options: HtmlTableOptions = {},
): HtmlTableResult {
	const diagnostics: string[] = [];
	const tables = findHtmlBlocks(html, "table", options.select ?? "table");
	const selectedTables =
		options.tableIndex === undefined
			? tables
			: tables
					.slice(options.tableIndex, options.tableIndex + 1)
					.filter(
						() =>
							options.tableIndex !== undefined &&
							options.tableIndex < tables.length,
					);

	const records: RecordValue[] = [];
	const headers: string[] = [];
	let matchedTables = 0;
	let rowsSeen = 0;
	let rowsAfterFilters = 0;

	for (const table of selectedTables) {
		const rows = parseHtmlRows(table.inner);
		rowsSeen += rows.length;
		if (rows.length === 0) {
			diagnostics.push("tabela bez wierszy");
			continue;
		}

		if (options.orientation === "key_value") {
			const requiredKeys = options.requireKeys ?? [];
			const allKeys = new Set<string>();
			for (const row of rows) {
				const key = row[options.keyColumn ?? 0];
				if (key !== undefined) allKeys.add(normalizeHeader(key));
			}
			if (!requiredKeys.every((key) => allKeys.has(normalizeHeader(key)))) {
				diagnostics.push("tabela key-value bez wymaganych kluczy");
				continue;
			}
			const record: RecordValue = {};
			for (const row of rows) {
				const keyCell = row[options.keyColumn ?? 0];
				if (keyCell === undefined) continue;
				const key = normalizeHeader(keyCell);
				if (key === "") continue;
				const value = row
					.slice(options.valueColumn ?? 1)
					.join(options.valueJoin === "newline" ? "\n" : " ");
				record[key] =
					options.emptyAsNull !== false && value.trim() === ""
						? null
						: value.trim();
			}
			records.push(record);
			matchedTables += 1;
			rowsAfterFilters += rows.length;
			continue;
		}

		const headerRowIndex = options.headerRow ?? 0;
		const headerRow = rows[headerRowIndex] ?? [];
		const normalized = normalizeHeaders(
			options.columns ? [...options.columns] : headerRow,
			options,
		);
		if (normalized.length === 0) {
			diagnostics.push("tabela bez nagłówka");
			continue;
		}
		const requiredHeaders = options.requireHeaders ?? [];
		if (
			requiredHeaders.length > 0 &&
			!requiredHeaders.every((required) =>
				normalized.some(
					(header) => normalizeHeader(header) === normalizeHeader(required),
				),
			)
		) {
			diagnostics.push("tabela bez wymaganych nagłówków");
			continue;
		}
		matchedTables += 1;
		if (headers.length === 0) headers.push(...normalized);
		const dataStart = options.dataStartRow ?? headerRowIndex + 1;
		for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
			const row = rows[rowIndex];
			if (!row) continue;
			if (
				options.skipEmptyRows !== false &&
				row.every((cell) => cell.trim() === "")
			) {
				continue;
			}
			records.push(toRecord(normalized, row, options));
			rowsAfterFilters += 1;
		}
	}

	if (tables.length === 0) diagnostics.push("brak tabeli w HTML");
	else if (matchedTables === 0)
		diagnostics.push("żadna tabela nie pasuje do filtra");

	return {
		diagnostics,
		headers,
		matchedTables,
		records,
		rowsAfterFilters,
		rowsSeen,
		tableCount: tables.length,
	};
}

export type HtmlListField = {
	source?: string | undefined;
	attr?: string | undefined;
	regex?: string | undefined;
	group?: number | undefined;
	flags?: string | undefined;
	nullValues?: readonly string[] | undefined;
	default?: unknown;
};

export type HtmlListResult = {
	records: RecordValue[];
	candidates: number;
	matched: number;
	diagnostics: string[];
};

export function parseHtmlList(
	html: string,
	options: {
		select?: string | undefined;
		recordRegex?: string | undefined;
		recordFlags?: string | undefined;
		fields?: Record<string, HtmlListField> | undefined;
		itemTextSeparator?: string | undefined;
		trim?: boolean | undefined;
		collapseWhitespace?: boolean | undefined;
		emptyAsNull?: boolean | undefined;
	} = {},
): HtmlListResult {
	const select = options.select ?? "li";
	const document = parseHtmlDocument(html);
	const blocks = queryHtmlSelector(document, select);
	const diagnostics: string[] = [];
	const records: RecordValue[] = [];
	let matched = 0;
	let filter: RegExp | undefined;
	if (options.recordRegex) {
		try {
			filter = new RegExp(options.recordRegex, options.recordFlags ?? "u");
		} catch {
			diagnostics.push("niepoprawne wyrażenie record_filter");
		}
	}
	for (const block of blocks) {
		const text = htmlElementText(
			block,
			options.itemTextSeparator ?? " ",
			options.collapseWhitespace !== false,
		);
		if (filter && !filter.test(text)) continue;
		matched += 1;
		const record: RecordValue = { text };
		for (const [name, field] of Object.entries(options.fields ?? {})) {
			let source = text;
			if (field.source === "html") {
				source = htmlElementText(
					block,
					options.itemTextSeparator ?? " ",
					options.collapseWhitespace !== false,
				);
			}
			if (field.source === "attr" && field.attr) {
				source = block.attributes[field.attr.toLowerCase()] ?? "";
			}
			let value: unknown = source;
			if (field.regex) {
				try {
					const regex = new RegExp(field.regex, field.flags ?? "u");
					const match = regex.exec(source);
					value = match ? (match[field.group ?? 1] ?? null) : null;
				} catch {
					value = null;
				}
			}
			const textValue = value === null ? null : String(value);
			if (
				textValue !== null &&
				field.nullValues?.some(
					(entry) => entry.toLowerCase() === textValue.toLowerCase(),
				)
			) {
				value = null;
			}
			if (typeof value === "string" && options.trim !== false)
				value = value.trim();
			if (
				options.emptyAsNull !== false &&
				value !== null &&
				typeof value === "string" &&
				value === ""
			) {
				value = null;
			}
			record[name] =
				value === null && field.default !== undefined ? field.default : value;
		}
		records.push(record);
	}
	if (blocks.length === 0) diagnostics.push("brak elementów listy");
	return { candidates: blocks.length, diagnostics, matched, records };
}

export function parseCsv(text: string, options: CsvOptions = {}): CsvResult {
	const delimiter = options.delimiter ?? ",";
	const quote = options.quote ?? '"';
	let source = text.replace(/^\uFEFF/, "");
	if (options.unwrapOuterQuotes) {
		source = source
			.split(/\r?\n/)
			.map((line) => {
				const trimmed = line.trim();
				if (
					trimmed.startsWith(quote) &&
					trimmed.endsWith(quote) &&
					trimmed.length >= 2
				) {
					return trimmed.slice(1, -1);
				}
				return line;
			})
			.join("\n");
	}
	if (options.repairDoubleQuotes) {
		source = source.replaceAll(`${quote}${quote}`, quote);
	}

	const allRows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		if (quoted) {
			if (char === quote) {
				if (source[index + 1] === quote) {
					field += quote;
					index += 1;
				} else {
					quoted = false;
				}
			} else {
				field += char ?? "";
			}
			continue;
		}
		if (char === quote) {
			quoted = true;
		} else if (char === delimiter) {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			allRows.push(row);
			row = [];
			field = "";
		} else if (char !== "\r") {
			field += char ?? "";
		}
	}
	if (field !== "" || row.length > 0) {
		row.push(field);
		allRows.push(row);
	}

	const skipRows = options.skipRows ?? 0;
	const rows = allRows
		.slice(skipRows)
		.filter((entry) => entry.some((value) => value.trim() !== ""));
	if (rows.length === 0) return { headers: [], records: [], rows: [] };

	const hasHeader = options.header !== false;
	const rawHeaders = hasHeader ? (rows[0] ?? []) : [];
	const headers = rawHeaders.map((header) =>
		options.trimHeaders === false ? header : normalizeHeader(header),
	);
	const dataRows = hasHeader ? rows.slice(1) : rows;
	const records = dataRows.map((cells) => {
		const record: RecordValue = {};
		for (let index = 0; index < headers.length; index += 1) {
			const header = headers[index];
			if (!header) continue;
			const raw = cells[index] ?? "";
			const value = (options.trimValues ?? true) ? raw.trim() : raw;
			record[header] =
				options.emptyAsNull !== false && value === "" ? null : value;
		}
		return record;
	});
	return { headers, records, rows: dataRows };
}

type PathToken = { key: string } | { index: number };

function tokenizePath(path: string): PathToken[] {
	const normalized = path.startsWith("$.") ? path.slice(2) : path;
	if (normalized.startsWith("/")) {
		return normalized
			.slice(1)
			.split("/")
			.filter((segment) => segment !== "")
			.map((segment) => ({
				key: segment.replaceAll("~1", "/").replaceAll("~0", "~"),
			}));
	}
	const tokens: PathToken[] = [];
	const pattern = /([^.[\]]+)|\[(\d+)\]/g;
	for (const match of normalized.matchAll(pattern)) {
		if (match[1] !== undefined) tokens.push({ key: match[1] });
		else if (match[2] !== undefined) {
			tokens.push({ index: Number.parseInt(match[2], 10) });
		}
	}
	return tokens;
}

export function readField(record: unknown, path: string): unknown {
	if (path === "" || path === "$") return record;
	let current: unknown = record;
	for (const token of tokenizePath(path)) {
		if (current === null || typeof current !== "object") return undefined;
		if ("index" in token) {
			current = Array.isArray(current) ? current[token.index] : undefined;
		} else if (Array.isArray(current)) {
			const index = Number.parseInt(token.key, 10);
			current = Number.isFinite(index) ? current[index] : undefined;
		} else {
			current = (current as Record<string, unknown>)[token.key];
		}
	}
	return current;
}

export function resolveJsonPath(root: unknown, path: string): unknown {
	if (path === "$" || path === "") return root;
	if (path.startsWith("/")) return readField(root, path);
	return readField(root, path.replace(/^\$\./, ""));
}

export function parseJsonRecords(root: unknown, path: string): RecordValue[] {
	const selected = resolveJsonPath(root, path);
	if (Array.isArray(selected)) {
		return selected.filter(
			(entry): entry is RecordValue =>
				entry !== null && typeof entry === "object" && !Array.isArray(entry),
		);
	}
	if (selected !== null && typeof selected === "object") {
		return [selected as RecordValue];
	}
	return [];
}

export function parseKml(xml: string): KmlResult {
	const source = xml.replace(/^\uFEFF/, "");
	const documentNameMatch =
		/<Document\b[^>]*>[\s\S]*?<name>([\s\S]*?)<\/name>/i.exec(source);
	const documentName = documentNameMatch
		? htmlText(documentNameMatch[1] ?? "")
		: null;
	const placemarks: KmlPlacemark[] = [];
	const placemarkPattern = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark\s*>/gi;
	for (const match of source.matchAll(placemarkPattern)) {
		const block = match[1] ?? "";
		const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(block);
		const name = nameMatch ? htmlText(nameMatch[1] ?? "") : null;
		const geometryTypes: string[] = [];
		for (const type of ["Point", "LineString", "Polygon", "MultiGeometry"]) {
			if (new RegExp(`<${type}\\b`, "i").test(block)) geometryTypes.push(type);
		}
		const coordinates: Array<[number, number]> = [];
		const coordPattern = /<coordinates>([\s\S]*?)<\/coordinates>/gi;
		for (const coordMatch of block.matchAll(coordPattern)) {
			const chunks = (coordMatch[1] ?? "").trim().split(/\s+/);
			for (const chunk of chunks) {
				const parts = chunk.split(",").map((part) => Number.parseFloat(part));
				const lon = parts[0];
				const lat = parts[1];
				if (
					lon !== undefined &&
					lat !== undefined &&
					Number.isFinite(lon) &&
					Number.isFinite(lat)
				) {
					coordinates.push([lon, lat]);
				}
			}
		}
		if (!geometryTypes.includes("Point")) {
			const gxPattern = /<gx:coord>([\s\S]*?)<\/gx:coord>/gi;
			for (const gxMatch of block.matchAll(gxPattern)) {
				const parts = (gxMatch[1] ?? "")
					.trim()
					.split(/\s+/)
					.map(Number.parseFloat);
				const lon = parts[0];
				const lat = parts[1];
				if (
					lon !== undefined &&
					lat !== undefined &&
					Number.isFinite(lon) &&
					Number.isFinite(lat)
				) {
					coordinates.push([lon, lat]);
					geometryTypes.push("gx:coord");
				}
			}
		}
		placemarks.push({ coordinates, geometryTypes, name });
	}
	const pointCount = placemarks.filter((entry) =>
		entry.geometryTypes.includes("Point"),
	).length;
	const lineCount = placemarks.filter((entry) =>
		entry.geometryTypes.includes("LineString"),
	).length;
	const polygonCount = placemarks.filter((entry) =>
		entry.geometryTypes.includes("Polygon"),
	).length;
	const pointlessCount = placemarks.filter(
		(entry) =>
			entry.geometryTypes.length === 0 && entry.coordinates.length === 0,
	).length;
	return {
		documentName,
		lineCount,
		placemarks,
		pointCount,
		pointlessCount,
		polygonCount,
	};
}

function conditionPasses(
	condition: unknown,
	record: RecordValue,
	variables: Record<string, unknown>,
): boolean {
	if (condition === null || typeof condition !== "object") return false;
	const spec = condition as Record<string, unknown>;
	const op = typeof spec["op"] === "string" ? spec["op"] : "";
	const left = evaluateExpression(spec["left"], record, variables);
	const right = Array.isArray(spec["right"])
		? spec["right"].map((entry) => evaluateExpression(entry, record, variables))
		: evaluateExpression(spec["right"], record, variables);
	switch (op) {
		case "eq":
			return left === right || String(left) === String(right);
		case "ne":
			return left !== right && String(left) !== String(right);
		case "in":
			return Array.isArray(right)
				? right.some((entry) => String(entry) === String(left))
				: false;
		case "not_in":
			return Array.isArray(right)
				? !right.some((entry) => String(entry) === String(left))
				: false;
		case "exists":
			return left !== null && left !== undefined && left !== "";
		case "empty":
			return left === null || left === undefined || left === "";
		case "regex":
			return typeof left === "string" && typeof right === "string"
				? new RegExp(right, "u").test(left)
				: false;
		case "gt":
			return Number(left) > Number(right);
		case "gte":
			return Number(left) >= Number(right);
		case "lt":
			return Number(left) < Number(right);
		case "lte":
			return Number(left) <= Number(right);
		default:
			return false;
	}
}

function firstPresent(values: unknown[]): unknown {
	for (const value of values) {
		if (value === null || value === undefined) continue;
		if (typeof value === "string" && value.trim() === "") continue;
		return value;
	}
	return null;
}

function applyFunction(name: string, args: unknown[]): unknown {
	const first = args[0];
	switch (name) {
		case "to_float": {
			if (typeof first === "number")
				return Number.isFinite(first) ? first : null;
			if (typeof first !== "string") return null;
			const normalized = first.replace(/\s+/g, "").replace(",", ".");
			const parsed = Number.parseFloat(normalized);
			return Number.isFinite(parsed) ? parsed : null;
		}
		case "to_int": {
			const parsed = Number.parseInt(String(first ?? ""), 10);
			return Number.isFinite(parsed) ? parsed : null;
		}
		case "lower":
			return first === null || first === undefined
				? null
				: String(first).toLowerCase();
		case "upper":
			return first === null || first === undefined
				? null
				: String(first).toUpperCase();
		case "trim":
			return first === null || first === undefined
				? null
				: String(first).trim();
		case "normalize_email": {
			if (typeof first !== "string") return null;
			const email = first.trim().toLowerCase();
			return /^[^@\s]+@[^@\s]+$/.test(email) ? email : null;
		}
		case "normalize_phone": {
			if (typeof first !== "string") return null;
			const digits = first.replace(/[^\d+]/g, "");
			return digits.length >= 7 ? digits : null;
		}
		case "normalize_url": {
			if (typeof first !== "string") return null;
			const value = first.trim();
			if (value === "") return null;
			return /^https?:\/\//i.test(value) ? value : `https://${value}`;
		}
		case "derive_location_name":
		case "derive_device_identifier":
			return firstPresent(args);
		case "strip_accents":
			return first === null || first === undefined
				? null
				: stripAccents(String(first));
		case "length":
			return Array.isArray(first) || typeof first === "string"
				? first.length
				: null;
		default:
			return first ?? null;
	}
}

export function evaluateExpression(
	expression: unknown,
	record: RecordValue,
	variables: Record<string, unknown> = {},
): unknown {
	if (expression === null || expression === undefined) return null;
	if (typeof expression !== "object") return expression;
	if (Array.isArray(expression)) return expression;
	const spec = expression as Record<string, unknown>;
	if ("const" in spec) return spec["const"];
	if (typeof spec["field"] === "string") {
		return readField(record, spec["field"]);
	}
	if (typeof spec["pointer"] === "string") {
		return readField(record, spec["pointer"]);
	}
	if (typeof spec["builtin"] === "string") {
		return variables[spec["builtin"]] ?? null;
	}
	if (Array.isArray(spec["coalesce"])) {
		return firstPresent(
			spec["coalesce"].map((entry) =>
				evaluateExpression(entry, record, variables),
			),
		);
	}
	if (typeof spec["template"] === "string") {
		const vars = spec["vars"];
		const values: Record<string, unknown> = {};
		if (vars !== null && typeof vars === "object" && !Array.isArray(vars)) {
			for (const [key, value] of Object.entries(vars)) {
				values[key] = evaluateExpression(value, record, variables);
			}
		}
		return spec["template"].replace(/\{([^{}]+)\}/g, (_match, key: string) => {
			const value = values[key] ?? variables[key] ?? readField(record, key);
			return value === null || value === undefined ? "" : String(value);
		});
	}
	if (typeof spec["func"] === "string") {
		const args = Array.isArray(spec["args"])
			? spec["args"].map((entry) =>
					evaluateExpression(entry, record, variables),
				)
			: [];
		return applyFunction(spec["func"], args);
	}
	if (spec["regex"] !== null && typeof spec["regex"] === "object") {
		const regexSpec = spec["regex"] as Record<string, unknown>;
		const input = evaluateExpression(regexSpec["in"], record, variables);
		if (input === null || input === undefined) return null;
		try {
			const regex = new RegExp(
				String(regexSpec["pattern"] ?? ""),
				typeof regexSpec["flags"] === "string" ? regexSpec["flags"] : "u",
			);
			const match = regex.exec(String(input));
			const group =
				typeof regexSpec["group"] === "number" ? regexSpec["group"] : 0;
			return match ? (match[group] ?? null) : null;
		} catch {
			return null;
		}
	}
	if (spec["map"] !== null && typeof spec["map"] === "object") {
		const mapSpec = spec["map"] as Record<string, unknown>;
		const value = evaluateExpression(mapSpec["value"], record, variables);
		const cases =
			mapSpec["cases"] !== null && typeof mapSpec["cases"] === "object"
				? (mapSpec["cases"] as Record<string, unknown>)
				: {};
		const key =
			value === null || value === undefined ? "" : String(value).toLowerCase();
		for (const [caseKey, caseValue] of Object.entries(cases)) {
			if (caseKey.toLowerCase() === key) return caseValue;
		}
		return mapSpec["default"] ?? null;
	}
	if ("when" in spec) {
		const passed = conditionPasses(spec["when"], record, variables);
		if (passed) return evaluateExpression(spec["then"], record, variables);
		return "else" in spec
			? evaluateExpression(spec["else"], record, variables)
			: null;
	}
	if (spec["coord"] !== null && typeof spec["coord"] === "object") {
		return null;
	}
	if ("json" in spec)
		return evaluateExpression(spec["json"], record, variables);
	if ("first" in spec) {
		const value = evaluateExpression(spec["first"], record, variables);
		return Array.isArray(value) ? (value[0] ?? null) : value;
	}
	if ("lookup" in spec) return null;
	if ("value" in spec)
		return evaluateExpression(spec["value"], record, variables);
	return null;
}

export function evaluateFieldSpec(
	spec: unknown,
	record: RecordValue,
	variables: Record<string, unknown> = {},
): unknown {
	if (spec === null || spec === undefined) return null;
	if (typeof spec === "object" && !Array.isArray(spec)) {
		const wrapper = spec as MapSpec;
		const hasWrapperKey =
			"value" in wrapper &&
			("required" in wrapper ||
				"on_missing" in wrapper ||
				"default" in wrapper);
		if (hasWrapperKey) {
			const value = evaluateExpression(wrapper.value, record, variables);
			if (
				(value === null || value === undefined || value === "") &&
				wrapper.default !== undefined
			) {
				return wrapper.default;
			}
			return value;
		}
	}
	return evaluateExpression(spec, record, variables);
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value.replace(",", "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export function evaluateCoordinate(
	spec: unknown,
	record: RecordValue,
	pick: "lat" | "lon",
	variables: Record<string, unknown> = {},
): { value: number | null; invalid: boolean } {
	if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
		const value = toFiniteNumber(evaluateExpression(spec, record, variables));
		return { invalid: value === null, value };
	}
	const wrapper = spec as Record<string, unknown>;
	const coord =
		wrapper["coord"] !== null && typeof wrapper["coord"] === "object"
			? (wrapper["coord"] as CoordSpec)
			: null;
	if (!coord) {
		if ("value" in wrapper) {
			return evaluateCoordinate(wrapper["value"], record, pick, variables);
		}
		const value = toFiniteNumber(evaluateExpression(spec, record, variables));
		return { invalid: value === null, value };
	}

	let source = coord.from;
	const unwrapSingle =
		coord.unwrapSingle === true ||
		(coord as Record<string, unknown>)["unwrap_single"] === true;
	if (source === undefined) source = pick === "lat" ? coord.lat : coord.lon;
	if (Array.isArray(source) && coord.from !== undefined) {
		const latExpr = source[0];
		const lonExpr = source[1];
		if (coord.order === "lat_lon") {
			return evaluateCoordinate(
				pick === "lat" ? latExpr : lonExpr,
				record,
				pick,
				variables,
			);
		}
		return evaluateCoordinate(
			pick === "lat" ? lonExpr : latExpr,
			record,
			pick,
			variables,
		);
	}
	let value = evaluateExpression(source, record, variables);
	if (typeof source === "string") {
		const fieldValue = readField(record, source);
		if (fieldValue !== undefined) value = fieldValue;
	}
	if (
		unwrapSingle &&
		Array.isArray(value) &&
		value.length === 1 &&
		Array.isArray(value[0])
	) {
		value = value[0];
	}
	if (Array.isArray(value) && typeof value[0] === "number") {
		const lon = toFiniteNumber(value[0]);
		const lat = toFiniteNumber(value[1]);
		return { invalid: false, value: pick === "lat" ? lat : lon };
	}
	if (value !== null && typeof value === "object") {
		const recordValue = value as Record<string, unknown>;
		if (
			recordValue["type"] === "Point" ||
			Array.isArray(recordValue["coordinates"])
		) {
			let coordinates = recordValue["coordinates"];
			if (
				unwrapSingle &&
				Array.isArray(coordinates) &&
				coordinates.length === 1 &&
				Array.isArray(coordinates[0])
			) {
				coordinates = coordinates[0];
			}
			if (Array.isArray(coordinates)) {
				const longitude = toFiniteNumber(coordinates[0]);
				const latitude = toFiniteNumber(coordinates[1]);
				return {
					invalid: false,
					value: pick === "lat" ? latitude : longitude,
				};
			}
		}
		const lat = toFiniteNumber(recordValue["lat"] ?? recordValue["latitude"]);
		const lon = toFiniteNumber(
			recordValue["lon"] ?? recordValue["lng"] ?? recordValue["longitude"],
		);
		return { invalid: false, value: pick === "lat" ? lat : lon };
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (coord.format === "wkt") {
			const wkt = /POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i.exec(trimmed);
			if (wkt) {
				const first = toFiniteNumber(wkt[1]);
				const second = toFiniteNumber(wkt[2]);
				return {
					invalid: false,
					value: endianValue(coord.order, first, second, pick),
				};
			}
		}
		const delimiter = coord.delimiter ?? ",";
		const parts = trimmed.split(delimiter).map((part) => toFiniteNumber(part));
		const first = parts[0] ?? null;
		const second = parts[1] ?? null;
		if (first !== null && second !== null) {
			const lat = coord.order === "lon_lat" ? second : first;
			const lon = coord.order === "lon_lat" ? first : second;
			return { invalid: false, value: pick === "lat" ? lat : lon };
		}
	}
	const parsed = toFiniteNumber(value);
	return { invalid: parsed === null, value: parsed };
}

function endianValue(
	order: string | undefined,
	first: number | null,
	second: number | null,
	pick: "lat" | "lon",
): number | null {
	const lat = order === "lon_lat" ? second : first;
	const lon = order === "lon_lat" ? first : second;
	return pick === "lat" ? lat : lon;
}

export function readBbox(
	value: unknown,
): [number, number, number, number] | null {
	if (
		!Array.isArray(value) ||
		value.length !== 4 ||
		!value.every((entry) => typeof entry === "number")
	) {
		return null;
	}
	const [minLon, minLat, maxLon, maxLat] = value as [
		number,
		number,
		number,
		number,
	];
	return [minLon, minLat, maxLon, maxLat];
}

export function isInsideBbox(
	lat: number,
	lon: number,
	bbox: [number, number, number, number],
): boolean {
	const [minLon, minLat, maxLon, maxLat] = bbox;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

export function flattenGeoJsonFeature(feature: RecordValue): RecordValue {
	const properties =
		feature["properties"] !== null && typeof feature["properties"] === "object"
			? (feature["properties"] as RecordValue)
			: {};
	return {
		...properties,
		geometry: feature["geometry"] ?? null,
		type: feature["type"] ?? null,
	};
}
