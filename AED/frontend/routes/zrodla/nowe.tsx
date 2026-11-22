import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert, CircleCheck, Eye, Save } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import {
	type FormIssue,
	importSourceFn,
	previewSourceFn,
	saveSourceFn,
} from "#/server/forms";

export const Route = createFileRoute("/zrodla/nowe")({
	component: NewSourcePage,
	head: () => ({ meta: [{ title: "Nowe źródło — Mapa AED" }] }),
});

type FileParser = "csv" | "xlsx" | "json" | "geojson" | "kml";
type S3Parser = "csv" | "xlsx" | "json" | "geojson";
type StorageKind = "sqlite" | "postgres" | "s3";
type LatLonMode = "columns" | "pair" | "geojson" | "kml" | "none";

interface Preview {
	columns: string[];
	sample: Record<string, unknown>[];
	recordCount: number;
}

/** Canonical text fields offered in the mapping step, in display order. */
const TEXT_MAPPING_FIELDS = [
	{ key: "name", label: "Nazwa *", required: true },
	{ key: "description", label: "Opis" },
	{ key: "city", label: "Miejscowość" },
	{ key: "street", label: "Ulica" },
	{ key: "house_number", label: "Numer budynku" },
	{ key: "postcode", label: "Kod pocztowy" },
	{ key: "address_text", label: "Adres (pełny tekst)" },
	{ key: "opening_hours", label: "Godziny dostępności" },
	{ key: "operator_name", label: "Opiekun / operator" },
	{ key: "phone", label: "Telefon" },
	{ key: "email", label: "E-mail" },
	{ key: "website", label: "WWW" },
	{ key: "manufacturer", label: "Producent" },
	{ key: "model", label: "Model" },
	{ key: "source_record_id", label: "Identyfikator rekordu w źródle" },
] as const;

const NONE = "__none__";

function formatCell(value: unknown): string {
	if (value === null || value === undefined) {
		return "—";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

function NewSourcePage() {
	const navigate = useNavigate();
	const formId = useId();
	const idFor = (key: string) => `${formId}-${key}`;

	// Step 1: identity + connection.
	const [tab, setTab] = useState<"file" | "storage">("file");
	const [sourceId, setSourceId] = useState("");
	const [sourceName, setSourceName] = useState("");
	const [enabled, setEnabled] = useState(true);
	const [fileParser, setFileParser] = useState<FileParser>("csv");
	const [url, setUrl] = useState("");
	const [delimiter, setDelimiter] = useState(",");
	const [skipRows, setSkipRows] = useState("0");
	const [sheet, setSheet] = useState("");
	const [jsonPath, setJsonPath] = useState("$");
	const [storageKind, setStorageKind] = useState<StorageKind>("sqlite");
	const [sqlitePath, setSqlitePath] = useState("");
	const [query, setQuery] = useState("SELECT * FROM aed");
	const [postgresMode, setPostgresMode] = useState<"env" | "url">("env");
	const [postgresEnv, setPostgresEnv] = useState("AED_POSTGRES_URL");
	const [postgresUrl, setPostgresUrl] = useState("");
	const [s3Parser, setS3Parser] = useState<S3Parser>("csv");
	const [bucket, setBucket] = useState("");
	const [objectKey, setObjectKey] = useState("");
	const [region, setRegion] = useState("");
	const [endpoint, setEndpoint] = useState("");
	const [s3AuthMode, setS3AuthMode] = useState<"public" | "env">("public");
	const [s3KeyEnv, setS3KeyEnv] = useState("AWS_ACCESS_KEY_ID");
	const [s3SecretEnv, setS3SecretEnv] = useState("AWS_SECRET_ACCESS_KEY");

	// Step 2: preview.
	const [preview, setPreview] = useState<Preview | null>(null);
	const [previewing, setPreviewing] = useState(false);

	// Step 3: mapping.
	const [mapping, setMapping] = useState<Record<string, string>>({});
	const [latLonMode, setLatLonMode] = useState<LatLonMode>("columns");
	const [latColumn, setLatColumn] = useState(NONE);
	const [lonColumn, setLonColumn] = useState(NONE);
	const [pairColumn, setPairColumn] = useState(NONE);
	const [pairOrder, setPairOrder] = useState<"lat_lon" | "lon_lat">("lat_lon");
	const [polandOnly, setPolandOnly] = useState(true);

	const [saving, setSaving] = useState(false);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [issues, setIssues] = useState<FormIssue[]>([]);
	const [savedId, setSavedId] = useState<string | null>(null);
	const [importNote, setImportNote] = useState<string | null>(null);

	const parser: FileParser | S3Parser =
		tab === "file" ? fileParser : storageKind === "s3" ? s3Parser : "json";

	function buildConnection(): Record<string, unknown> | null {
		if (storageKind === "sqlite") {
			return { kind: "sqlite", path: sqlitePath.trim(), query: query.trim() };
		}
		if (storageKind === "postgres") {
			const base =
				postgresMode === "env"
					? { env: postgresEnv.trim() }
					: { url: postgresUrl.trim() };
			return { kind: "postgres", ...base, query: query.trim() };
		}
		const connection: Record<string, unknown> = {
			kind: "s3",
			bucket: bucket.trim(),
			key: objectKey.trim(),
			...(region.trim() !== "" ? { region: region.trim() } : {}),
			...(endpoint.trim() !== "" ? { endpoint: endpoint.trim() } : {}),
			...(s3AuthMode === "env"
				? {
						access_key_id_env: s3KeyEnv.trim(),
						secret_access_key_env: s3SecretEnv.trim(),
					}
				: {}),
		};
		return connection;
	}

	function buildParse(): Record<string, unknown> {
		const parse: Record<string, unknown> = { encoding: "utf-8" };
		if (parser === "csv") {
			return {
				...parse,
				csv: {
					delimiter: delimiter === "" ? "," : delimiter,
					header: true,
					empty_as_null: true,
					skip_rows: Number.parseInt(skipRows, 10) || 0,
				},
			};
		}
		if (parser === "xlsx") {
			const trimmedSheet = sheet.trim();
			const asNumber = Number.parseInt(trimmedSheet, 10);
			const xlsx: Record<string, unknown> =
				trimmedSheet === ""
					? {}
					: {
							sheet:
								Number.isFinite(asNumber) && String(asNumber) === trimmedSheet
									? asNumber
									: trimmedSheet,
						};
			return { ...parse, xlsx };
		}
		if (parser === "json" || parser === "geojson") {
			return { ...parse, json: { unwrap_string: false } };
		}
		if (parser === "kml") {
			return { ...parse, kml: { point_only: true } };
		}
		return parse;
	}

	function recordsPath(): string {
		if (parser === "kml") {
			return "//Placemark";
		}
		if (parser === "geojson") {
			return "/features";
		}
		if (parser === "json") {
			return jsonPath.trim() === "" ? "$" : jsonPath.trim();
		}
		return "$";
	}

	function buildMap(): Record<string, unknown> {
		const map: Record<string, unknown> = {};
		for (const { key } of TEXT_MAPPING_FIELDS) {
			const column = mapping[key];
			if (column && column !== NONE) {
				map[key] = { field: column };
			}
		}
		if (latLonMode === "columns") {
			if (latColumn !== NONE) {
				map["lat"] = { field: latColumn };
			}
			if (lonColumn !== NONE) {
				map["lon"] = { field: lonColumn };
			}
		} else if (latLonMode === "pair" && pairColumn !== NONE) {
			map["lat"] = {
				coord: {
					from: { field: pairColumn },
					format: "pair",
					order: pairOrder,
					pick: "lat",
					on_invalid: "null",
				},
			};
			map["lon"] = {
				coord: {
					from: { field: pairColumn },
					format: "pair",
					order: pairOrder,
					pick: "lon",
					on_invalid: "null",
				},
			};
		} else if (latLonMode === "geojson") {
			map["lat"] = {
				coord: {
					from: { field: "geometry" },
					format: "geojson",
					pick: "lat",
					on_invalid: "null",
				},
			};
			map["lon"] = {
				coord: {
					from: { field: "geometry" },
					format: "geojson",
					pick: "lon",
					on_invalid: "null",
				},
			};
		} else if (latLonMode === "kml") {
			map["lat"] = { field: "lat" };
			map["lon"] = { field: "lon" };
		}
		map["country_code"] = { const: "PL" };
		map["device_type"] = { const: "public_aed" };
		return map;
	}

	function buildConfig(withMapping: boolean): Record<string, unknown> {
		const family =
			tab === "file"
				? "file_static"
				: storageKind === "sqlite"
					? "sqlite_db"
					: storageKind === "postgres"
						? "postgres_db"
						: "s3_object";
		const config: Record<string, unknown> = {
			source: { id: sourceId.trim(), name: sourceName.trim(), enabled },
			connector: { family, parser },
			parse: buildParse(),
			records: { path: recordsPath() },
			map: withMapping ? buildMap() : {},
			validate:
				withMapping && polandOnly
					? { required: ["name"], coords: { bbox: [14, 49, 24.5, 55] } }
					: {},
		};
		if (tab === "file") {
			config["fetch"] = { url: url.trim() };
		} else {
			config["connection"] = buildConnection();
		}
		return config;
	}

	async function runPreview() {
		setPreviewing(true);
		setError(null);
		setIssues([]);
		try {
			const result = await previewSourceFn({ data: buildConfig(false) });
			if (!result.ok) {
				setError(result.message);
				setIssues(result.issues);
				return;
			}
			setPreview(result.preview);
			// Sensible defaults per parser after the columns are known.
			const columns = result.preview.columns;
			const guess = (candidates: string[]): string => {
				for (const candidate of candidates) {
					const found = columns.find(
						(column) => column.toLowerCase() === candidate,
					);
					if (found) {
						return found;
					}
				}
				return NONE;
			};
			setMapping({
				name: guess(["name", "nazwa", "nazwa aed", "obiekt"]),
				city: guess(["city", "miejscowosc", "miejscowość", "miasto"]),
				street: guess(["street", "ulica"]),
				house_number: guess(["house_number", "numer", "nr"]),
				postcode: guess(["postcode", "kod", "kod pocztowy"]),
				address_text: guess(["address", "adres", "adres pełny", "lokalizacja"]),
				description: guess(["description", "opis"]),
			});
			setLatColumn(guess(["lat", "latitude", "szerokosc", "szerokość"]));
			setLonColumn(guess(["lon", "lng", "longitude", "dlugosc", "długość"]));
			setPairColumn(
				guess(["coordinates", "wspolrzedne", "współrzędne", "lat,lon"]),
			);
			if (parser === "geojson") {
				setLatLonMode("geojson");
			} else if (parser === "kml") {
				setLatLonMode("kml");
			} else {
				setLatLonMode("columns");
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setPreviewing(false);
		}
	}

	async function runSave(thenImport: boolean) {
		setSaving(true);
		setError(null);
		setIssues([]);
		try {
			const result = await saveSourceFn({ data: buildConfig(true) });
			if (!result.ok) {
				setError(result.message);
				setIssues(result.issues);
				return;
			}
			setSavedId(result.source.id);
			if (thenImport) {
				setImporting(true);
				const imported = await importSourceFn({
					data: { sourceId: result.source.id },
				});
				if (!imported.ok) {
					setImportNote(
						`Źródło zapisane, ale import nie powiódł się: ${imported.message}`,
					);
					return;
				}
				setImportNote(
					`Zaimportowano ${imported.result.stored} rekordów (wczytano ${imported.result.seen}, odrzucono ${imported.result.rejected}).`,
				);
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSaving(false);
			setImporting(false);
		}
	}

	const errorAlert = error ? (
		<Alert variant="destructive">
			<CircleAlert />
			<AlertTitle>Operacja nie powiodła się</AlertTitle>
			<AlertDescription>
				{error}
				{issues.length > 0 ? (
					<ul className="mt-2 list-disc pl-4">
						{issues.map((issue) => (
							<li key={`${issue.field}:${issue.message}`}>
								{issue.field === "" ? "" : `${issue.field}: `}
								{issue.message}
							</li>
						))}
					</ul>
				) : null}
			</AlertDescription>
		</Alert>
	) : null;

	if (savedId !== null) {
		return (
			<main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
				<Alert>
					<CircleCheck />
					<AlertTitle>Zapisano źródło „{savedId}”</AlertTitle>
					<AlertDescription>
						{importNote ??
							"Źródło jest w rejestrze. Możesz je zaimportować na liście źródeł."}
					</AlertDescription>
				</Alert>
				<div className="flex flex-wrap gap-3">
					<Button asChild={true}>
						<Link to="/zrodla">Lista źródeł</Link>
					</Button>
					<Button asChild={true} variant="outline">
						<Link to="/">Mapa</Link>
					</Button>
					<Button
						variant="outline"
						onClick={() =>
							navigate({ to: "/zrodla/nowe", reloadDocument: true })
						}
					>
						Dodaj kolejne źródło
					</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div>
				<h1 className="font-bold text-3xl">Nowe źródło danych</h1>
				<p className="mt-1 text-muted-foreground">
					Podłącz plik kolumnowy (CSV, XLSX, JSON, GeoJSON, KML) albo bazę
					danych lub magazyn S3, podejrzyj kolumny i zmapuj je na schemat AED.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>1. Połączenie</CardTitle>
					<CardDescription>
						Tożsamość źródła i sposób dostępu do danych.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<FieldGroup>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor={idFor("id")}>Identyfikator *</FieldLabel>
								<Input
									id={idFor("id")}
									value={sourceId}
									onChange={(event) => setSourceId(event.target.value)}
									placeholder="np. gdansk-csv"
								/>
								<FieldDescription>
									1-32 znaków: małe litery, cyfry, kropka, myślnik, _.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor={idFor("name")}>Nazwa *</FieldLabel>
								<Input
									id={idFor("name")}
									value={sourceName}
									onChange={(event) => setSourceName(event.target.value)}
									placeholder="np. AED Gdańsk (CSV)"
								/>
							</Field>
						</div>
						<Field orientation="horizontal">
							<Checkbox
								id={idFor("enabled")}
								checked={enabled}
								onCheckedChange={(checked) => setEnabled(checked === true)}
							/>
							<FieldLabel htmlFor={idFor("enabled")}>
								Źródło włączone w cyklicznym imporcie
							</FieldLabel>
						</Field>
					</FieldGroup>

					<Tabs
						value={tab}
						onValueChange={(value) => setTab(value as "file" | "storage")}
					>
						<TabsList>
							<TabsTrigger value="file">Plik / URL</TabsTrigger>
							<TabsTrigger value="storage">Baza danych / S3</TabsTrigger>
						</TabsList>
						<TabsContent value="file" className="flex flex-col gap-4 pt-2">
							<FieldGroup>
								<div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
									<Field>
										<FieldLabel htmlFor={idFor("parser")}>Format</FieldLabel>
										<Select
											value={fileParser}
											onValueChange={(value) =>
												setFileParser(value as FileParser)
											}
										>
											<SelectTrigger id={idFor("parser")} className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="csv">CSV</SelectItem>
												<SelectItem value="xlsx">XLSX (Excel)</SelectItem>
												<SelectItem value="json">JSON</SelectItem>
												<SelectItem value="geojson">GeoJSON</SelectItem>
												<SelectItem value="kml">
													KML (Google My Maps)
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("url")}>
											Adres URL (https) *
										</FieldLabel>
										<Input
											id={idFor("url")}
											type="url"
											value={url}
											onChange={(event) => setUrl(event.target.value)}
											placeholder="https://…/aed.csv"
										/>
									</Field>
								</div>
								{fileParser === "csv" ? (
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("delimiter")}>
												Separator CSV
											</FieldLabel>
											<Input
												id={idFor("delimiter")}
												value={delimiter}
												onChange={(event) => setDelimiter(event.target.value)}
												maxLength={1}
												placeholder=","
											/>
											<FieldDescription>
												Jeden znak, np. , albo ;
											</FieldDescription>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("skip")}>
												Pomiń wierszy na początku
											</FieldLabel>
											<Input
												id={idFor("skip")}
												inputMode="numeric"
												value={skipRows}
												onChange={(event) => setSkipRows(event.target.value)}
											/>
										</Field>
									</div>
								) : null}
								{fileParser === "xlsx" ||
								(tab === "storage" &&
									storageKind === "s3" &&
									s3Parser === "xlsx") ? (
									<Field>
										<FieldLabel htmlFor={idFor("sheet")}>
											Arkusz XLSX
										</FieldLabel>
										<Input
											id={idFor("sheet")}
											value={sheet}
											onChange={(event) => setSheet(event.target.value)}
											placeholder="nazwa arkusza albo numer (puste = pierwszy)"
										/>
									</Field>
								) : null}
								{fileParser === "json" ? (
									<Field>
										<FieldLabel htmlFor={idFor("jsonpath")}>
											Ścieżka do tablicy rekordów
										</FieldLabel>
										<Input
											id={idFor("jsonpath")}
											value={jsonPath}
											onChange={(event) => setJsonPath(event.target.value)}
											placeholder="$ albo /rows albo /result/items"
										/>
										<FieldDescription>
											$ = cały dokument; /klucz = pole obiektu.
										</FieldDescription>
									</Field>
								) : null}
							</FieldGroup>
						</TabsContent>
						<TabsContent value="storage" className="flex flex-col gap-4 pt-2">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor={idFor("kind")}>
										Rodzaj magazynu
									</FieldLabel>
									<Select
										value={storageKind}
										onValueChange={(value) =>
											setStorageKind(value as StorageKind)
										}
									>
										<SelectTrigger
											id={idFor("kind")}
											className="w-full sm:w-72"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="sqlite">SQLite (plik .db)</SelectItem>
											<SelectItem value="postgres">PostgreSQL</SelectItem>
											<SelectItem value="s3">
												Amazon S3 / zgodny magazyn
											</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								{storageKind === "sqlite" ? (
									<Field>
										<FieldLabel htmlFor={idFor("sqlite-path")}>
											Ścieżka pliku SQLite *
										</FieldLabel>
										<Input
											id={idFor("sqlite-path")}
											value={sqlitePath}
											onChange={(event) => setSqlitePath(event.target.value)}
											placeholder="/dane/aed.db"
										/>
										<FieldDescription>
											Plik otwierany tylko do odczytu.
										</FieldDescription>
									</Field>
								) : null}
								{storageKind === "postgres" ? (
									<>
										<Field>
											<FieldLabel htmlFor={idFor("pg-mode")}>
												Połączenie
											</FieldLabel>
											<Select
												value={postgresMode}
												onValueChange={(value) =>
													setPostgresMode(value as "env" | "url")
												}
											>
												<SelectTrigger
													id={idFor("pg-mode")}
													className="w-full sm:w-96"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="env">
														Zmienna środowiskowa (zalecane)
													</SelectItem>
													<SelectItem value="url">
														Adres połączenia wprost
													</SelectItem>
												</SelectContent>
											</Select>
										</Field>
										{postgresMode === "env" ? (
											<Field>
												<FieldLabel htmlFor={idFor("pg-env")}>
													Nazwa zmiennej środowiskowej *
												</FieldLabel>
												<Input
													id={idFor("pg-env")}
													value={postgresEnv}
													onChange={(event) =>
														setPostgresEnv(event.target.value)
													}
													placeholder="AED_POSTGRES_URL"
												/>
												<FieldDescription>
													Zmienna w .env.local z postgres://… (hasło nie trafia
													do rejestru).
												</FieldDescription>
											</Field>
										) : (
											<Field>
												<FieldLabel htmlFor={idFor("pg-url")}>
													Adres połączenia *
												</FieldLabel>
												<Input
													id={idFor("pg-url")}
													value={postgresUrl}
													onChange={(event) =>
														setPostgresUrl(event.target.value)
													}
													placeholder="postgresql://user:haslo@host:5432/baza"
												/>
												<FieldDescription>
													Uwaga: adres z hasłem zostanie zapisany w pliku
													rejestru w repozytorium. Zalecane są zmienne
													środowiskowe.
												</FieldDescription>
											</Field>
										)}
									</>
								) : null}
								{storageKind === "sqlite" || storageKind === "postgres" ? (
									<Field>
										<FieldLabel htmlFor={idFor("query")}>
											Zapytanie SELECT *
										</FieldLabel>
										<Textarea
											id={idFor("query")}
											value={query}
											onChange={(event) => setQuery(event.target.value)}
											placeholder="SELECT name, lat, lon, city FROM aed"
											rows={3}
										/>
										<FieldDescription>
											Tylko odczyt: jedna instrukcja SELECT lub WITH.
										</FieldDescription>
									</Field>
								) : null}
								{storageKind === "s3" ? (
									<>
										<div className="grid gap-4 sm:grid-cols-2">
											<Field>
												<FieldLabel htmlFor={idFor("bucket")}>
													Bucket *
												</FieldLabel>
												<Input
													id={idFor("bucket")}
													value={bucket}
													onChange={(event) => setBucket(event.target.value)}
												/>
											</Field>
											<Field>
												<FieldLabel htmlFor={idFor("key")}>
													Klucz obiektu *
												</FieldLabel>
												<Input
													id={idFor("key")}
													value={objectKey}
													onChange={(event) => setObjectKey(event.target.value)}
													placeholder="dane/aed.csv"
												/>
											</Field>
										</div>
										<div className="grid gap-4 sm:grid-cols-3">
											<Field>
												<FieldLabel htmlFor={idFor("s3-parser")}>
													Format
												</FieldLabel>
												<Select
													value={s3Parser}
													onValueChange={(value) =>
														setS3Parser(value as S3Parser)
													}
												>
													<SelectTrigger
														id={idFor("s3-parser")}
														className="w-full"
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="csv">CSV</SelectItem>
														<SelectItem value="xlsx">XLSX</SelectItem>
														<SelectItem value="json">JSON</SelectItem>
														<SelectItem value="geojson">GeoJSON</SelectItem>
													</SelectContent>
												</Select>
											</Field>
											<Field>
												<FieldLabel htmlFor={idFor("region")}>
													Region
												</FieldLabel>
												<Input
													id={idFor("region")}
													value={region}
													onChange={(event) => setRegion(event.target.value)}
													placeholder="eu-central-1"
												/>
											</Field>
											<Field>
												<FieldLabel htmlFor={idFor("endpoint")}>
													Endpoint (https)
												</FieldLabel>
												<Input
													id={idFor("endpoint")}
													value={endpoint}
													onChange={(event) => setEndpoint(event.target.value)}
													placeholder="puste = AWS"
												/>
											</Field>
										</div>
										<Field>
											<FieldLabel htmlFor={idFor("s3-auth")}>
												Poświadczenia
											</FieldLabel>
											<Select
												value={s3AuthMode}
												onValueChange={(value) =>
													setS3AuthMode(value as "public" | "env")
												}
											>
												<SelectTrigger
													id={idFor("s3-auth")}
													className="w-full sm:w-96"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="public">
														Obiekt publiczny (bez poświadczeń)
													</SelectItem>
													<SelectItem value="env">
														Zmienne środowiskowe
													</SelectItem>
												</SelectContent>
											</Select>
											<FieldDescription>
												Klucze wpisane wprost trafiłyby do pliku rejestru w
												repozytorium, dlatego używamy zmiennych środowiskowych.
											</FieldDescription>
										</Field>
										{s3AuthMode === "env" ? (
											<div className="grid gap-4 sm:grid-cols-2">
												<Field>
													<FieldLabel htmlFor={idFor("s3-key-env")}>
														Zmienna Access Key ID *
													</FieldLabel>
													<Input
														id={idFor("s3-key-env")}
														value={s3KeyEnv}
														onChange={(event) =>
															setS3KeyEnv(event.target.value)
														}
													/>
												</Field>
												<Field>
													<FieldLabel htmlFor={idFor("s3-secret-env")}>
														Zmienna Secret Access Key *
													</FieldLabel>
													<Input
														id={idFor("s3-secret-env")}
														value={s3SecretEnv}
														onChange={(event) =>
															setS3SecretEnv(event.target.value)
														}
													/>
												</Field>
											</div>
										) : null}
										{s3Parser === "json" ? (
											<Field>
												<FieldLabel htmlFor={idFor("s3-jsonpath")}>
													Ścieżka do tablicy rekordów
												</FieldLabel>
												<Input
													id={idFor("s3-jsonpath")}
													value={jsonPath}
													onChange={(event) => setJsonPath(event.target.value)}
													placeholder="$ albo /rows"
												/>
											</Field>
										) : null}
									</>
								) : null}
							</FieldGroup>
						</TabsContent>
					</Tabs>

					{errorAlert}

					<div>
						<Button onClick={runPreview} disabled={previewing}>
							<Eye />
							{previewing ? "Pobieram podgląd…" : "Pobierz podgląd kolumn"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{preview ? (
				<Card>
					<CardHeader>
						<CardTitle>2. Podgląd danych</CardTitle>
						<CardDescription>
							Wczytano {preview.recordCount} rekordów; kolumny:{" "}
							{preview.columns.length}. Przykładowe wiersze:
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto rounded-lg border">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left">
									<tr>
										{preview.columns.map((column) => (
											<th
												key={column}
												className="whitespace-nowrap px-3 py-2 font-medium"
											>
												{column}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{preview.sample.map((row, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: podgląd jest statyczny.
										<tr key={index} className="border-t">
											{preview.columns.map((column) => (
												<td
													key={column}
													className="max-w-64 truncate px-3 py-2"
												>
													{formatCell(row[column])}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			) : null}

			{preview ? (
				<Card>
					<CardHeader>
						<CardTitle>3. Mapowanie kolumn</CardTitle>
						<CardDescription>
							Połącz kolumny źródła z polami schematu AED. Nazwa jest wymagana;
							rekordy bez punktu nie trafią na mapę.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<FieldGroup>
							{TEXT_MAPPING_FIELDS.map(({ key, label }) => (
								<div
									key={key}
									className="grid items-center gap-2 sm:grid-cols-[220px_1fr]"
								>
									<FieldLabel htmlFor={idFor(`map-${key}`)}>{label}</FieldLabel>
									<Select
										value={mapping[key] ?? NONE}
										onValueChange={(value) =>
											setMapping((previous) => ({ ...previous, [key]: value }))
										}
									>
										<SelectTrigger id={idFor(`map-${key}`)} className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE}>(nie mapuj)</SelectItem>
											{preview.columns.map((column) => (
												<SelectItem key={column} value={column}>
													{column}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							))}
						</FieldGroup>

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor={idFor("latlon-mode")}>
									Współrzędne geograficzne
								</FieldLabel>
								<Select
									value={latLonMode}
									onValueChange={(value) => setLatLonMode(value as LatLonMode)}
								>
									<SelectTrigger
										id={idFor("latlon-mode")}
										className="w-full sm:w-96"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="columns">
											Osobne kolumny lat i lon
										</SelectItem>
										<SelectItem value="pair">
											Jedna kolumna z parą współrzędnych
										</SelectItem>
										<SelectItem value="geojson">
											Geometria GeoJSON (kolumna geometry)
										</SelectItem>
										<SelectItem value="kml">KML (automatycznie)</SelectItem>
										<SelectItem value="none">Brak współrzędnych</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							{latLonMode === "columns" ? (
								<div className="grid gap-4 sm:grid-cols-2">
									{(
										[
											[
												"lat",
												"Kolumna lat (szerokość)",
												latColumn,
												setLatColumn,
											],
											["lon", "Kolumna lon (długość)", lonColumn, setLonColumn],
										] as const
									).map(([key, label, value, setValue]) => (
										<Field key={key}>
											<FieldLabel htmlFor={idFor(`coord-${key}`)}>
												{label}
											</FieldLabel>
											<Select value={value} onValueChange={setValue}>
												<SelectTrigger
													id={idFor(`coord-${key}`)}
													className="w-full"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE}>(brak)</SelectItem>
													{preview.columns.map((column) => (
														<SelectItem key={column} value={column}>
															{column}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
									))}
								</div>
							) : null}
							{latLonMode === "pair" ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor={idFor("pair-col")}>
											Kolumna z parą
										</FieldLabel>
										<Select value={pairColumn} onValueChange={setPairColumn}>
											<SelectTrigger id={idFor("pair-col")} className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={NONE}>(brak)</SelectItem>
												{preview.columns.map((column) => (
													<SelectItem key={column} value={column}>
														{column}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("pair-order")}>
											Kolejność
										</FieldLabel>
										<Select
											value={pairOrder}
											onValueChange={(value) =>
												setPairOrder(value as "lat_lon" | "lon_lat")
											}
										>
											<SelectTrigger
												id={idFor("pair-order")}
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="lat_lon">lat, lon</SelectItem>
												<SelectItem value="lon_lat">lon, lat</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								</div>
							) : null}
							<Field orientation="horizontal">
								<Checkbox
									id={idFor("poland")}
									checked={polandOnly}
									onCheckedChange={(checked) => setPolandOnly(checked === true)}
								/>
								<FieldLabel htmlFor={idFor("poland")}>
									Odrzucaj punkty spoza granic Polski (bbox)
								</FieldLabel>
							</Field>
						</FieldGroup>

						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() => runSave(false)}
								disabled={saving || importing}
							>
								<Save />
								{saving && !importing ? "Zapisuję…" : "Zapisz źródło"}
							</Button>
							<Button
								variant="secondary"
								onClick={() => runSave(true)}
								disabled={saving || importing}
							>
								{importing ? "Importuję…" : "Zapisz i importuj do mapy"}
							</Button>
							<Badge variant="outline">
								{tab === "file" ? "file_static" : storageKind} / {parser}
							</Badge>
						</div>
					</CardContent>
				</Card>
			) : null}
		</main>
	);
}
