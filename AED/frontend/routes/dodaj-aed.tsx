import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	CircleAlert,
	CircleCheck,
	Facebook,
	MapPin,
	Search,
} from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";

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
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { buildFacebookPostText, FACEBOOK_SHARE_URL } from "#/lib/social-share";
import { PolandMap } from "#/map/poland-map";
import {
	type FormIssue,
	geocodeAddressFn,
	saveManualAedFn,
} from "#/server/forms";

const searchSchema = z.object({
	lat: z.number().min(-90).max(90).optional(),
	lon: z.number().min(-180).max(180).optional(),
});

export const Route = createFileRoute("/dodaj-aed")({
	validateSearch: searchSchema,
	component: AddAedPage,
	head: () => ({ meta: [{ title: "Dodaj AED — Mapa AED" }] }),
});

type Values = {
	[K in keyof import("../../backend/forms/manual-record").ManualFormValues]?: string;
};

interface GeocodeState {
	provider: string;
	displayName: string;
	input: string;
	confidence: number | null;
}

interface Candidate {
	lat: number;
	lon: number;
	displayName: string;
	confidence: number;
}

const ACCESS_OPTIONS = [
	{ value: "always", label: "Dostępny całą dobę (24/7)" },
	{ value: "business_hours", label: "W godzinach pracy" },
	{ value: "restricted", label: "Na klucz / po zgłoszeniu" },
	{ value: "unknown", label: "Nieznana" },
];

const STATUS_OPTIONS = [
	{ value: "operational", label: "Sprawny" },
	{ value: "out_of_service", label: "Niesprawny / wycofany" },
	{ value: "unknown", label: "Nieznany" },
];

const FACILITY_OPTIONS = [
	"unknown",
	"dworzec",
	"urząd",
	"szkoła",
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

const BOOLEAN_FIELDS = [
	{ key: "indoor", label: "Urządzenie wewnątrz budynku" },
	{ key: "is_24_7", label: "Dostępne 24/7" },
	{ key: "requires_dispatcher", label: "Wymaga zgłoszenia dyspozytorowi" },
	{ key: "fee", label: "Dostęp płatny" },
	{ key: "wheelchair_access", label: "Dostępne dla osób na wózkach" },
	{ key: "is_public", label: "Publicznie dostępne" },
] as const;

function issueFor(issues: FormIssue[], field: string): string | undefined {
	return issues.find((issue) => issue.field === field)?.message;
}

function AddAedPage() {
	const search = Route.useSearch();
	const formId = useId();
	const [values, setValues] = useState<Values>(() => ({
		access_type: "unknown",
		status: "unknown",
		facility_type: "unknown",
		...(search.lat !== undefined ? { lat: String(search.lat) } : {}),
		...(search.lon !== undefined ? { lon: String(search.lon) } : {}),
	}));
	const [flags, setFlags] = useState<Record<string, boolean>>({});
	const [geocode, setGeocode] = useState<GeocodeState | null>(null);
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [geocoding, setGeocoding] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [issues, setIssues] = useState<FormIssue[]>([]);
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState<{ name: string } | null>(null);
	const [copyFailed, setCopyFailed] = useState(false);
	const navigate = useNavigate();

	const lat = Number.parseFloat(values.lat ?? "");
	const lon = Number.parseFloat(values.lon ?? "");
	const picked =
		Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;

	const set = (key: string, value: string) => {
		setValues((previous) => ({ ...previous, [key]: value }));
		if (key === "lat" || key === "lon") {
			// Ręczna zmiana współrzędnych unieważnia wynik geokodowania.
			setGeocode(null);
		}
	};

	const pickPoint = (nextLat: number, nextLon: number) => {
		setValues((previous) => ({
			...previous,
			lat: nextLat.toFixed(6),
			lon: nextLon.toFixed(6),
		}));
		setGeocode(null);
	};

	async function resolveAddress() {
		const query = [
			values.address_text,
			[values.street, values.house_number].filter(Boolean).join(" "),
			values.postcode,
			values.city,
		]
			.filter((part) => part && part.trim().length > 0)
			.join(", ");
		if (query.trim().length < 3) {
			setGeocodeError("Podaj adres (ulica, numer, miejscowość).");
			return;
		}
		setGeocoding(true);
		setGeocodeError(null);
		setCandidates([]);
		try {
			const result = await geocodeAddressFn({ data: { query } });
			if (!result.ok) {
				setGeocodeError(result.message);
				return;
			}
			if (result.candidates.length === 0) {
				setGeocodeError("Nie znaleziono adresu. Spróbuj go uprościć.");
				return;
			}
			const [first, ...rest] = result.candidates;
			if (first) {
				applyCandidate(first, query, result.provider);
			}
			setCandidates(rest);
		} catch (error) {
			setGeocodeError(error instanceof Error ? error.message : String(error));
		} finally {
			setGeocoding(false);
		}
	}

	function applyCandidate(
		candidate: Candidate,
		query: string,
		provider: string,
	) {
		setValues((previous) => ({
			...previous,
			lat: candidate.lat.toFixed(6),
			lon: candidate.lon.toFixed(6),
		}));
		setGeocode({
			provider,
			displayName: candidate.displayName,
			input: query,
			confidence: candidate.confidence,
		});
		setCandidates([]);
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setIssues([]);
		setServerError(null);
		try {
			const payload: Record<string, string | boolean> = { ...values };
			for (const { key } of BOOLEAN_FIELDS) {
				if (flags[key]) {
					payload[key] = true;
				}
			}
			const result = await saveManualAedFn({
				data: { values: payload, geocode },
			});
			if (!result.ok) {
				if (result.code === "unauthorized") {
					await navigate({ to: "/logowanie", replace: true });
					return;
				}
				setIssues(result.issues);
				setServerError(result.message);
				return;
			}
			setSaved({ name: result.name });
		} catch (error) {
			setServerError(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	}

	async function copyPostText(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopyFailed(false);
		} catch {
			setCopyFailed(true);
		}
	}

	function resetForm() {
		setSaved(null);
		setValues({
			access_type: "unknown",
			status: "unknown",
			facility_type: "unknown",
		});
		setFlags({});
		setGeocode(null);
		setCandidates([]);
		setIssues([]);
		setServerError(null);
		setCopyFailed(false);
	}

	if (saved) {
		const postText = buildFacebookPostText(saved.name);

		return (
			<main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
				<Alert>
					<CircleCheck />
					<AlertTitle>Zapisano AED „{saved.name}”</AlertTitle>
					<AlertDescription>
						Rekord jest już widoczny na mapie i w eksportach danych.
					</AlertDescription>
				</Alert>
				<div className="animate-share-rainbow rounded-2xl bg-[linear-gradient(90deg,#ff5f6d,#ffc371,#f9f871,#7ee8a2,#4facfe,#a18cd1,#ff5f6d)] bg-[length:300%_300%] p-[3px] shadow-fuchsia-500/10 shadow-lg">
					<Card className="border-0 shadow-none">
						<CardHeader className="items-center justify-items-center gap-2 text-center">
							<CardTitle className="text-2xl">⚡ Poraź dobrem</CardTitle>
							<CardDescription className="max-w-md">
								Daj znać o nowym defibrylatorze! Udostępnij post jednym
								kliknięciem i zachęć innych do akcji.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-3">
							<Button
								asChild={true}
								className="w-full bg-[#1877F2] text-white hover:bg-[#166FE5] sm:w-fit"
							>
								<a
									href={FACEBOOK_SHARE_URL}
									onClick={() => {
										copyPostText(postText);
									}}
									rel="noopener noreferrer"
									target="_blank"
								>
									<Facebook aria-hidden="true" className="fill-current" />
									Udostępnij na Facebooku
								</a>
							</Button>
							{copyFailed ? (
								<>
									<p
										className="text-center text-destructive text-sm"
										role="alert"
									>
										Nie udało się skopiować tekstu. Skopiuj go ręcznie z pola
										poniżej.
									</p>
									<Textarea
										aria-label="Tekst posta do skopiowania"
										className="min-h-28 w-full max-w-xl"
										onFocus={(event) => event.currentTarget.select()}
										readOnly={true}
										value={postText}
									/>
								</>
							) : null}
						</CardContent>
					</Card>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button asChild={true}>
						<Link to="/">Zobacz na mapie</Link>
					</Button>
					<Button variant="outline" onClick={resetForm}>
						Dodaj kolejny rekord
					</Button>
				</div>
			</main>
		);
	}

	const idFor = (key: string) => `${formId}-${key}`;

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div>
				<h1 className="font-bold text-3xl">Dodaj AED</h1>
				<p className="mt-1 text-muted-foreground">
					Wypełnij pełny schemat rekordu. Punkt wybierz klikając mapę albo
					wyznacz go z adresu.
				</p>
			</div>
			<form onSubmit={submit} noValidate={true}>
				<div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Podstawowe informacje</CardTitle>
								<CardDescription>
									Nazwa i opis urządzenia oraz miejsca.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<Field data-invalid={Boolean(issueFor(issues, "name"))}>
										<FieldLabel htmlFor={idFor("name")}>Nazwa *</FieldLabel>
										<Input
											id={idFor("name")}
											value={values.name ?? ""}
											onChange={(event) => set("name", event.target.value)}
											placeholder="np. AED — Dworzec Główny, hala główna"
											required={true}
											aria-invalid={Boolean(issueFor(issues, "name"))}
										/>
										<FieldError
											errors={[{ message: issueFor(issues, "name") }]}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("description")}>Opis</FieldLabel>
										<Textarea
											id={idFor("description")}
											value={values.description ?? ""}
											onChange={(event) =>
												set("description", event.target.value)
											}
											placeholder="np. przy wejściu głównym, obok recepcji"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("note")}>Uwagi</FieldLabel>
										<Textarea
											id={idFor("note")}
											value={values.note ?? ""}
											onChange={(event) => set("note", event.target.value)}
										/>
									</Field>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("facility_type")}>
												Typ obiektu
											</FieldLabel>
											<Select
												value={values.facility_type ?? "unknown"}
												onValueChange={(value) => set("facility_type", value)}
											>
												<SelectTrigger
													id={idFor("facility_type")}
													className="w-full"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{FACILITY_OPTIONS.map((option) => (
														<SelectItem key={option} value={option}>
															{option}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("device_type")}>
												Typ urządzenia
											</FieldLabel>
											<Input
												id={idFor("device_type")}
												value={values.device_type ?? ""}
												onChange={(event) =>
													set("device_type", event.target.value)
												}
												placeholder="public_aed"
											/>
										</Field>
									</div>
								</FieldGroup>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Lokalizacja</CardTitle>
								<CardDescription>
									Kliknij mapę, aby ustawić punkt, albo wyznacz współrzędne z
									adresu.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<PolandMap
									onPick={pickPoint}
									picked={picked}
									initialCenter={picked}
									className="relative h-80 overflow-hidden rounded-xl border bg-muted"
								/>
								<div className="grid gap-4 sm:grid-cols-2">
									<Field data-invalid={Boolean(issueFor(issues, "lat"))}>
										<FieldLabel htmlFor={idFor("lat")}>
											Szerokość (lat) *
										</FieldLabel>
										<Input
											id={idFor("lat")}
											inputMode="decimal"
											value={values.lat ?? ""}
											onChange={(event) => set("lat", event.target.value)}
											placeholder="52.2297"
											aria-invalid={Boolean(issueFor(issues, "lat"))}
										/>
									</Field>
									<Field data-invalid={Boolean(issueFor(issues, "lon"))}>
										<FieldLabel htmlFor={idFor("lon")}>
											Długość (lon) *
										</FieldLabel>
										<Input
											id={idFor("lon")}
											inputMode="decimal"
											value={values.lon ?? ""}
											onChange={(event) => set("lon", event.target.value)}
											placeholder="21.0122"
											aria-invalid={Boolean(issueFor(issues, "lon"))}
										/>
									</Field>
								</div>
								<FieldError
									errors={[
										{ message: issueFor(issues, "lat") },
										{ message: issueFor(issues, "lon") },
									]}
								/>
								{geocode ? (
									<Alert>
										<MapPin />
										<AlertTitle>Punkt wyznaczony z adresu</AlertTitle>
										<AlertDescription>
											{geocode.displayName}
											<Badge variant="secondary" className="ml-2">
												{geocode.provider}
											</Badge>
										</AlertDescription>
									</Alert>
								) : null}
								{candidates.length > 0 ? (
									<FieldSet>
										<FieldLegend variant="label">Inne dopasowania</FieldLegend>
										<div className="flex flex-col gap-2">
											{candidates.map((candidate) => (
												<Button
													key={`${candidate.lat},${candidate.lon}`}
													type="button"
													variant="outline"
													size="sm"
													className="justify-start"
													onClick={() =>
														applyCandidate(
															candidate,
															geocode?.input ?? values.address_text ?? "",
															"nominatim",
														)
													}
												>
													{candidate.displayName}
												</Button>
											))}
										</div>
									</FieldSet>
								) : null}
								{geocodeError ? (
									<Alert variant="destructive">
										<CircleAlert />
										<AlertTitle>Geokodowanie nie powiodło się</AlertTitle>
										<AlertDescription>{geocodeError}</AlertDescription>
									</Alert>
								) : null}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Adres</CardTitle>
								<CardDescription>
									Adres pełny albo rozbity na pola; posłuży też do geokodowania.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor={idFor("address_text")}>
											Adres (pełny tekst)
										</FieldLabel>
										<Input
											id={idFor("address_text")}
											value={values.address_text ?? ""}
											onChange={(event) =>
												set("address_text", event.target.value)
											}
											placeholder="Al. Jerozolimskie 54, 00-024 Warszawa"
										/>
									</Field>
									<div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
										<Field>
											<FieldLabel htmlFor={idFor("street")}>Ulica</FieldLabel>
											<Input
												id={idFor("street")}
												value={values.street ?? ""}
												onChange={(event) => set("street", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("house_number")}>
												Numer
											</FieldLabel>
											<Input
												id={idFor("house_number")}
												value={values.house_number ?? ""}
												onChange={(event) =>
													set("house_number", event.target.value)
												}
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
										<Field>
											<FieldLabel htmlFor={idFor("postcode")}>
												Kod pocztowy
											</FieldLabel>
											<Input
												id={idFor("postcode")}
												value={values.postcode ?? ""}
												onChange={(event) =>
													set("postcode", event.target.value)
												}
												placeholder="00-024"
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("city")}>
												Miejscowość
											</FieldLabel>
											<Input
												id={idFor("city")}
												value={values.city ?? ""}
												onChange={(event) => set("city", event.target.value)}
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-3">
										<Field>
											<FieldLabel htmlFor={idFor("voivodeship")}>
												Województwo
											</FieldLabel>
											<Input
												id={idFor("voivodeship")}
												value={values.voivodeship ?? ""}
												onChange={(event) =>
													set("voivodeship", event.target.value)
												}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("county")}>Powiat</FieldLabel>
											<Input
												id={idFor("county")}
												value={values.county ?? ""}
												onChange={(event) => set("county", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("commune")}>Gmina</FieldLabel>
											<Input
												id={idFor("commune")}
												value={values.commune ?? ""}
												onChange={(event) => set("commune", event.target.value)}
											/>
										</Field>
									</div>
									<Button
										type="button"
										variant="secondary"
										onClick={resolveAddress}
										disabled={geocoding}
									>
										<Search />
										{geocoding
											? "Szukam adresu…"
											: "Wyznacz współrzędne z adresu"}
									</Button>
								</FieldGroup>
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Dostępność</CardTitle>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor={idFor("access_type")}>
											Dostęp
										</FieldLabel>
										<Select
											value={values.access_type ?? "unknown"}
											onValueChange={(value) => set("access_type", value)}
										>
											<SelectTrigger
												id={idFor("access_type")}
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{ACCESS_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("opening_hours")}>
											Godziny dostępności
										</FieldLabel>
										<Input
											id={idFor("opening_hours")}
											value={values.opening_hours ?? ""}
											onChange={(event) =>
												set("opening_hours", event.target.value)
											}
											placeholder="np. Mo-Fr 08:00-16:00"
										/>
									</Field>
									<div className="grid gap-4 sm:grid-cols-3">
										<Field>
											<FieldLabel htmlFor={idFor("level")}>Piętro</FieldLabel>
											<Input
												id={idFor("level")}
												value={values.level ?? ""}
												onChange={(event) => set("level", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("room")}>
												Pomieszczenie
											</FieldLabel>
											<Input
												id={idFor("room")}
												value={values.room ?? ""}
												onChange={(event) => set("room", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("entrance_description")}>
												Wejście
											</FieldLabel>
											<Input
												id={idFor("entrance_description")}
												value={values.entrance_description ?? ""}
												onChange={(event) =>
													set("entrance_description", event.target.value)
												}
											/>
										</Field>
									</div>
									<FieldSet>
										<FieldLegend variant="label">Cechy dostępności</FieldLegend>
										<FieldGroup className="gap-3">
											{BOOLEAN_FIELDS.map(({ key, label }) => (
												<Field key={key} orientation="horizontal">
													<Checkbox
														id={idFor(key)}
														checked={flags[key] ?? false}
														onCheckedChange={(checked) =>
															setFlags((previous) => ({
																...previous,
																[key]: checked === true,
															}))
														}
													/>
													<FieldLabel htmlFor={idFor(key)}>{label}</FieldLabel>
												</Field>
											))}
										</FieldGroup>
									</FieldSet>
								</FieldGroup>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Urządzenie i przeglądy</CardTitle>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("status")}>Status</FieldLabel>
											<Select
												value={values.status ?? "unknown"}
												onValueChange={(value) => set("status", value)}
											>
												<SelectTrigger id={idFor("status")} className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{STATUS_OPTIONS.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("status_reason")}>
												Powód statusu
											</FieldLabel>
											<Input
												id={idFor("status_reason")}
												value={values.status_reason ?? ""}
												onChange={(event) =>
													set("status_reason", event.target.value)
												}
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("manufacturer")}>
												Producent
											</FieldLabel>
											<Input
												id={idFor("manufacturer")}
												value={values.manufacturer ?? ""}
												onChange={(event) =>
													set("manufacturer", event.target.value)
												}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("model")}>Model</FieldLabel>
											<Input
												id={idFor("model")}
												value={values.model ?? ""}
												onChange={(event) => set("model", event.target.value)}
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("serial_number")}>
												Numer seryjny
											</FieldLabel>
											<Input
												id={idFor("serial_number")}
												value={values.serial_number ?? ""}
												onChange={(event) =>
													set("serial_number", event.target.value)
												}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("pads_type")}>
												Typ elektrod
											</FieldLabel>
											<Input
												id={idFor("pads_type")}
												value={values.pads_type ?? ""}
												onChange={(event) =>
													set("pads_type", event.target.value)
												}
												placeholder="dla dorosłych / pediatryczne"
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										{(
											[
												["installed_at", "Data instalacji"],
												["battery_expiry", "Ważność baterii"],
												["pads_expiry", "Ważność elektrod"],
												["last_inspection_at", "Ostatni przegląd"],
												["next_inspection_at", "Następny przegląd"],
											] as const
										).map(([key, label]) => (
											<Field key={key}>
												<FieldLabel htmlFor={idFor(key)}>{label}</FieldLabel>
												<Input
													id={idFor(key)}
													type="date"
													value={values[key] ?? ""}
													onChange={(event) => set(key, event.target.value)}
												/>
											</Field>
										))}
									</div>
								</FieldGroup>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Opiekun i weryfikacja</CardTitle>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<div className="grid gap-4 sm:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={idFor("operator_name")}>
												Opiekun / operator
											</FieldLabel>
											<Input
												id={idFor("operator_name")}
												value={values.operator_name ?? ""}
												onChange={(event) =>
													set("operator_name", event.target.value)
												}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("operator_type")}>
												Typ operatora
											</FieldLabel>
											<Input
												id={idFor("operator_type")}
												value={values.operator_type ?? ""}
												onChange={(event) =>
													set("operator_type", event.target.value)
												}
												placeholder="np. urząd miasta, firma"
											/>
										</Field>
									</div>
									<div className="grid gap-4 sm:grid-cols-3">
										<Field>
											<FieldLabel htmlFor={idFor("phone")}>Telefon</FieldLabel>
											<Input
												id={idFor("phone")}
												type="tel"
												value={values.phone ?? ""}
												onChange={(event) => set("phone", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("email")}>E-mail</FieldLabel>
											<Input
												id={idFor("email")}
												type="email"
												value={values["email"] ?? ""}
												onChange={(event) => set("email", event.target.value)}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor={idFor("website")}>WWW</FieldLabel>
											<Input
												id={idFor("website")}
												type="url"
												value={values["website"] ?? ""}
												onChange={(event) => set("website", event.target.value)}
											/>
										</Field>
									</div>
									<Field>
										<FieldLabel htmlFor={idFor("photo_url")}>
											Zdjęcie (URL)
										</FieldLabel>
										<Input
											id={idFor("photo_url")}
											type="url"
											value={values["photo_url"] ?? ""}
											onChange={(event) => set("photo_url", event.target.value)}
										/>
										<FieldDescription>
											Link do zdjęcia urządzenia lub miejsca.
										</FieldDescription>
									</Field>
								</FieldGroup>
							</CardContent>
						</Card>

						{serverError ? (
							<Alert variant="destructive">
								<CircleAlert />
								<AlertTitle>Nie zapisano rekordu</AlertTitle>
								<AlertDescription>
									{serverError}
									{issues.length > 0 ? (
										<ul className="mt-2 list-disc pl-4">
											{issues.map((issue) => (
												<li key={`${issue.field}:${issue.message}`}>
													{issue.field}: {issue.message}
												</li>
											))}
										</ul>
									) : null}
								</AlertDescription>
							</Alert>
						) : null}

						<div className="flex flex-wrap gap-3">
							<Button type="submit" disabled={saving}>
								{saving ? "Zapisywanie…" : "Zapisz AED"}
							</Button>
							<Button asChild={true} variant="outline">
								<Link to="/">Anuluj</Link>
							</Button>
						</div>
					</div>
				</div>
			</form>
		</main>
	);
}
