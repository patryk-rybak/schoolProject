import { Eye } from "lucide-react";
import type { ReactNode } from "react";
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

import type {
	ConnectorState,
	FileParser,
	S3Parser,
	SourceTab,
	StorageKind,
} from "./-source-config";

/**
 * Step 1 of the connector form: source identity and access configuration
 * (file/URL or database/S3). Controlled by the parent route via
 * `state` + `onChange`; all validation happens server-side on preview/save.
 */

interface ConnectorStepProps {
	state: ConnectorState;
	onChange: (patch: Partial<ConnectorState>) => void;
	idFor: (key: string) => string;
	onPreview: () => void;
	previewing: boolean;
	children?: ReactNode;
}

export function ConnectorStep({
	state,
	onChange,
	idFor,
	onPreview,
	previewing,
	children,
}: ConnectorStepProps) {
	return (
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
								value={state.sourceId}
								onChange={(event) => onChange({ sourceId: event.target.value })}
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
								value={state.sourceName}
								onChange={(event) =>
									onChange({ sourceName: event.target.value })
								}
								placeholder="np. AED Gdańsk (CSV)"
							/>
						</Field>
					</div>
					<Field orientation="horizontal">
						<Checkbox
							id={idFor("enabled")}
							checked={state.enabled}
							onCheckedChange={(checked) =>
								onChange({ enabled: checked === true })
							}
						/>
						<FieldLabel htmlFor={idFor("enabled")}>
							Źródło włączone w cyklicznym imporcie
						</FieldLabel>
					</Field>
				</FieldGroup>

				<Tabs
					value={state.tab}
					onValueChange={(value) => onChange({ tab: value as SourceTab })}
				>
					<TabsList>
						<TabsTrigger value="file">Plik / URL</TabsTrigger>
						<TabsTrigger value="storage">Baza danych / S3</TabsTrigger>
					</TabsList>
					<TabsContent value="file" className="flex flex-col gap-4 pt-2">
						<FileFields state={state} onChange={onChange} idFor={idFor} />
					</TabsContent>
					<TabsContent value="storage" className="flex flex-col gap-4 pt-2">
						<StorageFields state={state} onChange={onChange} idFor={idFor} />
					</TabsContent>
				</Tabs>

				{children}

				<div>
					<Button onClick={onPreview} disabled={previewing}>
						<Eye />
						{previewing ? "Pobieram podgląd…" : "Pobierz podgląd kolumn"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

interface StepFieldsProps {
	state: ConnectorState;
	onChange: (patch: Partial<ConnectorState>) => void;
	idFor: (key: string) => string;
}

function FileFields({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<FieldGroup>
			<div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
				<Field>
					<FieldLabel htmlFor={idFor("parser")}>Format</FieldLabel>
					<Select
						value={state.fileParser}
						onValueChange={(value) =>
							onChange({ fileParser: value as FileParser })
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
							<SelectItem value="kml">KML (Google My Maps)</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel htmlFor={idFor("url")}>Adres URL (https) *</FieldLabel>
					<Input
						id={idFor("url")}
						type="url"
						value={state.url}
						onChange={(event) => onChange({ url: event.target.value })}
						placeholder="https://…/aed.csv"
					/>
				</Field>
			</div>
			{state.fileParser === "csv" ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor={idFor("delimiter")}>Separator CSV</FieldLabel>
						<Input
							id={idFor("delimiter")}
							value={state.delimiter}
							onChange={(event) => onChange({ delimiter: event.target.value })}
							maxLength={1}
							placeholder=","
						/>
						<FieldDescription>Jeden znak, np. , albo ;</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={idFor("skip")}>
							Pomiń wierszy na początku
						</FieldLabel>
						<Input
							id={idFor("skip")}
							inputMode="numeric"
							value={state.skipRows}
							onChange={(event) => onChange({ skipRows: event.target.value })}
						/>
					</Field>
				</div>
			) : null}
			{state.fileParser === "xlsx" ? (
				<SheetField state={state} onChange={onChange} idFor={idFor} />
			) : null}
			{state.fileParser === "json" ? (
				<JsonPathField state={state} onChange={onChange} idFor={idFor} />
			) : null}
		</FieldGroup>
	);
}

function SheetField({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<Field>
			<FieldLabel htmlFor={idFor("sheet")}>Arkusz XLSX</FieldLabel>
			<Input
				id={idFor("sheet")}
				value={state.sheet}
				onChange={(event) => onChange({ sheet: event.target.value })}
				placeholder="nazwa arkusza albo numer (puste = pierwszy)"
			/>
		</Field>
	);
}

function JsonPathField({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<Field>
			<FieldLabel htmlFor={idFor("jsonpath")}>
				Ścieżka do tablicy rekordów
			</FieldLabel>
			<Input
				id={idFor("jsonpath")}
				value={state.jsonPath}
				onChange={(event) => onChange({ jsonPath: event.target.value })}
				placeholder="$ albo /rows albo /result/items"
			/>
			<FieldDescription>
				$ = cały dokument; /klucz = pole obiektu.
			</FieldDescription>
		</Field>
	);
}

function StorageFields({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor={idFor("kind")}>Rodzaj magazynu</FieldLabel>
				<Select
					value={state.storageKind}
					onValueChange={(value) =>
						onChange({ storageKind: value as StorageKind })
					}
				>
					<SelectTrigger id={idFor("kind")} className="w-full sm:w-72">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="sqlite">SQLite (plik .db)</SelectItem>
						<SelectItem value="postgres">PostgreSQL</SelectItem>
						<SelectItem value="s3">Amazon S3 / zgodny magazyn</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			{state.storageKind === "sqlite" ? (
				<Field>
					<FieldLabel htmlFor={idFor("sqlite-path")}>
						Ścieżka pliku SQLite *
					</FieldLabel>
					<Input
						id={idFor("sqlite-path")}
						value={state.sqlitePath}
						onChange={(event) => onChange({ sqlitePath: event.target.value })}
						placeholder="/dane/aed.db"
					/>
					<FieldDescription>Plik otwierany tylko do odczytu.</FieldDescription>
				</Field>
			) : null}
			{state.storageKind === "postgres" ? (
				<PostgresFields state={state} onChange={onChange} idFor={idFor} />
			) : null}
			{state.storageKind === "sqlite" || state.storageKind === "postgres" ? (
				<Field>
					<FieldLabel htmlFor={idFor("query")}>Zapytanie SELECT *</FieldLabel>
					<Textarea
						id={idFor("query")}
						value={state.query}
						onChange={(event) => onChange({ query: event.target.value })}
						placeholder="SELECT name, lat, lon, city FROM aed"
						rows={3}
					/>
					<FieldDescription>
						Tylko odczyt: jedna instrukcja SELECT lub WITH.
					</FieldDescription>
				</Field>
			) : null}
			{state.storageKind === "s3" ? (
				<S3Fields state={state} onChange={onChange} idFor={idFor} />
			) : null}
		</FieldGroup>
	);
}

function PostgresFields({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<>
			<Field>
				<FieldLabel htmlFor={idFor("pg-mode")}>Połączenie</FieldLabel>
				<Select
					value={state.postgresMode}
					onValueChange={(value) =>
						onChange({ postgresMode: value as "env" | "url" })
					}
				>
					<SelectTrigger id={idFor("pg-mode")} className="w-full sm:w-96">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="env">Zmienna środowiskowa (zalecane)</SelectItem>
						<SelectItem value="url">Adres połączenia wprost</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			{state.postgresMode === "env" ? (
				<Field>
					<FieldLabel htmlFor={idFor("pg-env")}>
						Nazwa zmiennej środowiskowej *
					</FieldLabel>
					<Input
						id={idFor("pg-env")}
						value={state.postgresEnv}
						onChange={(event) => onChange({ postgresEnv: event.target.value })}
						placeholder="AED_POSTGRES_URL"
					/>
					<FieldDescription>
						Zmienna w .env.local z postgres://… (hasło nie trafia do rejestru).
					</FieldDescription>
				</Field>
			) : (
				<Field>
					<FieldLabel htmlFor={idFor("pg-url")}>Adres połączenia *</FieldLabel>
					<Input
						id={idFor("pg-url")}
						value={state.postgresUrl}
						onChange={(event) => onChange({ postgresUrl: event.target.value })}
						placeholder="postgresql://user:haslo@host:5432/baza"
					/>
					<FieldDescription>
						Uwaga: adres z hasłem zostanie zapisany w pliku rejestru w
						repozytorium. Zalecane są zmienne środowiskowe.
					</FieldDescription>
				</Field>
			)}
		</>
	);
}

function S3Fields({ state, onChange, idFor }: StepFieldsProps) {
	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor={idFor("bucket")}>Bucket *</FieldLabel>
					<Input
						id={idFor("bucket")}
						value={state.bucket}
						onChange={(event) => onChange({ bucket: event.target.value })}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={idFor("key")}>Klucz obiektu *</FieldLabel>
					<Input
						id={idFor("key")}
						value={state.objectKey}
						onChange={(event) => onChange({ objectKey: event.target.value })}
						placeholder="dane/aed.csv"
					/>
				</Field>
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				<Field>
					<FieldLabel htmlFor={idFor("s3-parser")}>Format</FieldLabel>
					<Select
						value={state.s3Parser}
						onValueChange={(value) => onChange({ s3Parser: value as S3Parser })}
					>
						<SelectTrigger id={idFor("s3-parser")} className="w-full">
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
					<FieldLabel htmlFor={idFor("region")}>Region</FieldLabel>
					<Input
						id={idFor("region")}
						value={state.region}
						onChange={(event) => onChange({ region: event.target.value })}
						placeholder="eu-central-1"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={idFor("endpoint")}>Endpoint (https)</FieldLabel>
					<Input
						id={idFor("endpoint")}
						value={state.endpoint}
						onChange={(event) => onChange({ endpoint: event.target.value })}
						placeholder="puste = AWS"
					/>
				</Field>
			</div>
			<Field>
				<FieldLabel htmlFor={idFor("s3-auth")}>Poświadczenia</FieldLabel>
				<Select
					value={state.s3AuthMode}
					onValueChange={(value) =>
						onChange({ s3AuthMode: value as "public" | "env" })
					}
				>
					<SelectTrigger id={idFor("s3-auth")} className="w-full sm:w-96">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="public">
							Obiekt publiczny (bez poświadczeń)
						</SelectItem>
						<SelectItem value="env">Zmienne środowiskowe</SelectItem>
					</SelectContent>
				</Select>
				<FieldDescription>
					Klucze wpisane wprost trafiłyby do pliku rejestru w repozytorium,
					dlatego używamy zmiennych środowiskowych.
				</FieldDescription>
			</Field>
			{state.s3AuthMode === "env" ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor={idFor("s3-key-env")}>
							Zmienna Access Key ID *
						</FieldLabel>
						<Input
							id={idFor("s3-key-env")}
							value={state.s3KeyEnv}
							onChange={(event) => onChange({ s3KeyEnv: event.target.value })}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor={idFor("s3-secret-env")}>
							Zmienna Secret Access Key *
						</FieldLabel>
						<Input
							id={idFor("s3-secret-env")}
							value={state.s3SecretEnv}
							onChange={(event) =>
								onChange({ s3SecretEnv: event.target.value })
							}
						/>
					</Field>
				</div>
			) : null}
			{state.s3Parser === "xlsx" ? (
				<SheetField state={state} onChange={onChange} idFor={idFor} />
			) : null}
			{state.s3Parser === "json" ? (
				<JsonPathField state={state} onChange={onChange} idFor={idFor} />
			) : null}
		</>
	);
}

/** Small badge summarizing the family/parser combination being configured. */
export function ConnectorBadge({
	family,
	parser,
}: {
	family: string;
	parser: string;
}) {
	return (
		<Badge variant="outline">
			{family} / {parser}
		</Badge>
	);
}
