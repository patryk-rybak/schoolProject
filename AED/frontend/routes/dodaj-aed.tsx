import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	CircleAlert,
	CircleCheck,
	Facebook,
	MapPin,
	Search,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { z } from "zod";

import {
	ACCESS_OPTIONS,
	BOOLEAN_FIELDS,
	type Candidate,
	DATE_FIELDS,
	DERIVED_ADDRESS_KEYS,
	FACILITY_LABELS,
	FACILITY_OPTIONS,
	type GeocodeState,
	initialValues,
	issueFor,
	STATUS_OPTIONS,
	type Values,
} from "#/components/aed-form/model";
import {
	DerivedAddressField,
	TextField,
} from "#/components/aed-form/text-field";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#/components/ui/accordion";
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
import { LazyPolandMap } from "#/map/lazy-poland-map";
import {
	type FormIssue,
	geocodeAddressFn,
	reverseGeocodeFn,
	saveManualAedFn,
} from "#/server/forms";

const searchSchema = z.object({
	lat: z.number().min(-90).max(90).optional(),
	lon: z.number().min(-180).max(180).optional(),
});

/**
 * Administrative AED entry route. It is not linked from public navigation.
 * Keep it only for adding a verified device from an approved, config-defined
 * source; it must not be presented as public evidence or an open submission.
 */
export const Route = createFileRoute("/dodaj-aed")({
	validateSearch: searchSchema,
	component: AddAedPage,
	head: () => ({ meta: [{ title: "Wpis AED — Mapa AED" }] }),
});

function AddAedPage() {
	const search = Route.useSearch();
	const formId = useId();
	const [values, setValues] = useState<Values>(() =>
		initialValues(search.lat, search.lon),
	);
	const [flags, setFlags] = useState<Record<string, boolean>>({});
	const [geocode, setGeocode] = useState<GeocodeState | null>(null);
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [geocoding, setGeocoding] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [reverseGeocoding, setReverseGeocoding] = useState(false);
	const [reverseGeocodeError, setReverseGeocodeError] = useState<string | null>(
		null,
	);
	const [derivedAddressSource, setDerivedAddressSource] = useState<
		string | null
	>(null);
	const deriveRequest = useRef(0);
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
	const showOpeningHours = values.access_type === "business_hours";

	const set = (key: string, value: string) => {
		setValues((previous) => ({ ...previous, [key]: value }));
		if (key === "lat" || key === "lon") {
			// Ręczna zmiana współrzędnych unieważnia wynik geokodowania.
			setGeocode(null);
		}
	};

	async function deriveAddress(nextLat: number, nextLon: number) {
		const requestId = ++deriveRequest.current;
		setReverseGeocoding(true);
		setReverseGeocodeError(null);
		try {
			const result = await reverseGeocodeFn({
				data: { lat: nextLat, lon: nextLon },
			});
			if (requestId !== deriveRequest.current) {
				return;
			}
			if (!result.ok) {
				setReverseGeocodeError(result.message);
				return;
			}
			const { parts } = result;
			setValues((previous) => ({
				...previous,
				...Object.fromEntries(
					DERIVED_ADDRESS_KEYS.map((key) => [
						key,
						parts[key === "house_number" ? "houseNumber" : key] ?? "",
					]),
				),
			}));
			setDerivedAddressSource(result.provider);
		} catch (error) {
			if (requestId === deriveRequest.current) {
				setReverseGeocodeError(
					error instanceof Error ? error.message : String(error),
				);
			}
		} finally {
			if (requestId === deriveRequest.current) {
				setReverseGeocoding(false);
			}
		}
	}

	const setPoint = (
		nextLat: number,
		nextLon: number,
		geocodeInfo: GeocodeState | null,
	) => {
		setValues((previous) => ({
			...previous,
			lat: nextLat.toFixed(6),
			lon: nextLon.toFixed(6),
		}));
		setGeocode(geocodeInfo);
		deriveAddress(nextLat, nextLon);
	};

	const pickPoint = (nextLat: number, nextLon: number) => {
		setPoint(nextLat, nextLon, null);
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
			setGeocodeError("Podaj adres, w tym ulicę, numer budynku i miejscowość.");
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
				setGeocodeError(
					"Nie znaleziono adresu. Sprawdź wpisane dane lub podaj adres w bardziej ogólnej formie.",
				);
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
		setPoint(candidate.lat, candidate.lon, {
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
		deriveRequest.current++;
		setSaved(null);
		setValues(initialValues());
		setFlags({});
		setGeocode(null);
		setCandidates([]);
		setGeocodeError(null);
		setReverseGeocodeError(null);
		setDerivedAddressSource(null);
		setReverseGeocoding(false);
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
					<AlertTitle>Zapisano zgłoszenie AED „{saved.name}”</AlertTitle>
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
						<Link to="/">Wyświetl na mapie</Link>
					</Button>
					<Button variant="outline" onClick={resetForm}>
						Złóż kolejne zgłoszenie
					</Button>
				</div>
			</main>
		);
	}

	const idFor = (key: string) => `${formId}-${key}`;

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div>
				<h1 className="font-bold text-3xl">Zgłoś lokalizację AED</h1>
				<p className="mt-1 text-muted-foreground">
					Podaj dane urządzenia i wskaż jego lokalizację na mapie lub wyznacz ją
					na podstawie adresu. Pozostałe pola są opcjonalne.
				</p>
			</div>
			<form onSubmit={submit} noValidate={true}>
				<div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Dane podstawowe</CardTitle>
								<CardDescription>
									Nazwa i opis urządzenia oraz jego lokalizacji.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<Field data-invalid={Boolean(issueFor(issues, "name"))}>
										<FieldLabel htmlFor={idFor("name")}>
											Nazwa urządzenia *
										</FieldLabel>
										<Input
											id={idFor("name")}
											value={values.name ?? ""}
											onChange={(event) => set("name", event.target.value)}
											placeholder="np. AED – Dworzec Główny, hala główna"
											required={true}
											aria-invalid={Boolean(issueFor(issues, "name"))}
										/>
										<FieldError
											errors={[{ message: issueFor(issues, "name") }]}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("description")}>
											Opis lokalizacji (opcjonalny)
										</FieldLabel>
										<Textarea
											id={idFor("description")}
											value={values.description ?? ""}
											onChange={(event) =>
												set("description", event.target.value)
											}
											placeholder="Podaj dokładną lokalizację: piętro, korytarz, część budynku lub sąsiedztwo charakterystycznego punktu."
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={idFor("note")}>
											Uwagi (opcjonalne)
										</FieldLabel>
										<Textarea
											id={idFor("note")}
											value={values.note ?? ""}
											onChange={(event) => set("note", event.target.value)}
										/>
									</Field>
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
														{FACILITY_LABELS[option] ?? option}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								</FieldGroup>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Lokalizacja i adres</CardTitle>
								<CardDescription>
									Wskaż lokalizację na mapie lub wyznacz współrzędne na
									podstawie adresu. Kod pocztowy i dane administracyjne są
									uzupełniane automatycznie.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<LazyPolandMap
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
										<AlertTitle>Lokalizacja wyznaczona z adresu</AlertTitle>
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
										<FieldLegend variant="label">
											Pozostałe dopasowania adresu
										</FieldLegend>
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
										<AlertTitle>Nie udało się wyznaczyć lokalizacji</AlertTitle>
										<AlertDescription>{geocodeError}</AlertDescription>
									</Alert>
								) : null}
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
									<Field>
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
									</Field>
									<div className="grid gap-4 sm:grid-cols-3">
										<DerivedAddressField
											id={idFor("postcode")}
											label="Kod pocztowy"
											value={values.postcode ?? ""}
										/>
										<DerivedAddressField
											id={idFor("voivodeship")}
											label="Województwo"
											value={values.voivodeship ?? ""}
										/>
										<DerivedAddressField
											id={idFor("county")}
											label="Powiat"
											value={values.county ?? ""}
										/>
									</div>
									<div className="grid gap-4 sm:grid-cols-3">
										<DerivedAddressField
											id={idFor("commune")}
											label="Gmina"
											value={values.commune ?? ""}
										/>
										<DerivedAddressField
											id={idFor("city")}
											label="Miejscowość"
											value={values.city ?? ""}
										/>
										<DerivedAddressField
											id={idFor("house_number")}
											label="Numer domu"
											value={values.house_number ?? ""}
										/>
									</div>
									<Field>
										<FieldDescription>
											{reverseGeocoding
												? "Pobieranie danych adresowych dla wskazanej lokalizacji…"
												: derivedAddressSource
													? `Dane adresowe: ${derivedAddressSource} (tylko do odczytu).`
													: "Kod pocztowy i dane administracyjne zostaną uzupełnione po wskazaniu lokalizacji."}
										</FieldDescription>
									</Field>
								</FieldGroup>
								{reverseGeocodeError ? (
									<Alert variant="destructive">
										<CircleAlert />
										<AlertTitle>
											Nie udało się pobrać danych adresowych
										</AlertTitle>
										<AlertDescription>{reverseGeocodeError}</AlertDescription>
									</Alert>
								) : null}
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Warunki dostępu</CardTitle>
							</CardHeader>
							<CardContent>
								<FieldGroup>
									<Field
										data-invalid={Boolean(issueFor(issues, "access_type"))}
									>
										<FieldLabel htmlFor={idFor("access_type")}>
											Typ dostępu *
										</FieldLabel>
										<Select
											value={values.access_type ?? ""}
											onValueChange={(value) => set("access_type", value)}
										>
											<SelectTrigger
												id={idFor("access_type")}
												className="w-full"
												aria-invalid={Boolean(issueFor(issues, "access_type"))}
											>
												<SelectValue placeholder="Wybierz typ dostępu" />
											</SelectTrigger>
											<SelectContent>
												{ACCESS_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FieldError
											errors={[{ message: issueFor(issues, "access_type") }]}
										/>
									</Field>
									{showOpeningHours ? (
										<TextField
											id={idFor("opening_hours")}
											label="Godziny otwarcia obiektu"
											value={values.opening_hours ?? ""}
											onChange={(value) => set("opening_hours", value)}
											placeholder="np. poniedziałek–piątek 08:00–16:00"
										/>
									) : null}
									<div className="grid gap-4 sm:grid-cols-3">
										<TextField
											id={idFor("level")}
											label="Piętro lub poziom"
											value={values.level ?? ""}
											onChange={(value) => set("level", value)}
										/>
										<TextField
											id={idFor("room")}
											label="Pomieszczenie"
											value={values.room ?? ""}
											onChange={(value) => set("room", value)}
										/>
										<TextField
											id={idFor("entrance_description")}
											label="Opis wejścia"
											value={values.entrance_description ?? ""}
											onChange={(value) => set("entrance_description", value)}
										/>
									</div>
								</FieldGroup>
							</CardContent>
						</Card>

						<Accordion type="multiple" className="rounded-xl border">
							<AccordionItem value="features" className="border-b px-4">
								<AccordionTrigger>Cechy i dostępność</AccordionTrigger>
								<AccordionContent>
									<FieldSet>
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
								</AccordionContent>
							</AccordionItem>

							<AccordionItem
								value="device"
								className="border-b px-4 last:border-b-0"
							>
								<AccordionTrigger>Dane urządzenia i przeglądy</AccordionTrigger>
								<AccordionContent>
									<FieldGroup>
										<div className="grid gap-4 sm:grid-cols-2">
											<Field>
												<FieldLabel htmlFor={idFor("status")}>
													Status urządzenia
												</FieldLabel>
												<Select
													value={values.status ?? "unknown"}
													onValueChange={(value) => set("status", value)}
												>
													<SelectTrigger
														id={idFor("status")}
														className="w-full"
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{STATUS_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
											<TextField
												id={idFor("status_reason")}
												label="Uzasadnienie statusu"
												value={values.status_reason ?? ""}
												onChange={(value) => set("status_reason", value)}
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											<TextField
												id={idFor("manufacturer")}
												label="Producent"
												value={values.manufacturer ?? ""}
												onChange={(value) => set("manufacturer", value)}
											/>
											<TextField
												id={idFor("model")}
												label="Model"
												value={values.model ?? ""}
												onChange={(value) => set("model", value)}
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											<TextField
												id={idFor("serial_number")}
												label="Numer seryjny"
												value={values.serial_number ?? ""}
												onChange={(value) => set("serial_number", value)}
											/>
											<TextField
												id={idFor("pads_type")}
												label="Typ elektrod"
												value={values.pads_type ?? ""}
												onChange={(value) => set("pads_type", value)}
												placeholder="dla dorosłych / pediatryczne"
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											{DATE_FIELDS.map(([key, label]) => (
												<TextField
													key={key}
													id={idFor(key)}
													label={label}
													type="date"
													value={values[key] ?? ""}
													onChange={(value) => set(key, value)}
												/>
											))}
										</div>
									</FieldGroup>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="caretaker" className="px-4">
								<AccordionTrigger>Opiekun urządzenia</AccordionTrigger>
								<AccordionContent>
									<FieldGroup>
										<div className="grid gap-4 sm:grid-cols-2">
											<TextField
												id={idFor("operator_name")}
												label="Nazwa opiekuna lub operatora"
												value={values.operator_name ?? ""}
												onChange={(value) => set("operator_name", value)}
											/>
											<TextField
												id={idFor("operator_type")}
												label="Rodzaj operatora"
												value={values.operator_type ?? ""}
												onChange={(value) => set("operator_type", value)}
												placeholder="np. urząd miasta, przedsiębiorstwo"
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-3">
											<TextField
												id={idFor("phone")}
												label="Telefon"
												type="tel"
												value={values.phone ?? ""}
												onChange={(value) => set("phone", value)}
											/>
											<TextField
												id={idFor("email")}
												label="E-mail"
												type="email"
												value={values.email ?? ""}
												onChange={(value) => set("email", value)}
											/>
											<TextField
												id={idFor("website")}
												label="Strona internetowa"
												type="url"
												value={values.website ?? ""}
												onChange={(value) => set("website", value)}
											/>
										</div>
										<Field>
											<FieldLabel htmlFor={idFor("photo_url")}>
												Adres zdjęcia (opcjonalny)
											</FieldLabel>
											<Input
												id={idFor("photo_url")}
												type="url"
												value={values.photo_url ?? ""}
												onChange={(event) =>
													set("photo_url", event.target.value)
												}
											/>
											<FieldDescription>
												Adres URL zdjęcia urządzenia lub jego lokalizacji.
											</FieldDescription>
										</Field>
									</FieldGroup>
								</AccordionContent>
							</AccordionItem>
						</Accordion>

						{serverError ? (
							<Alert variant="destructive">
								<CircleAlert />
								<AlertTitle>Nie zapisano zgłoszenia</AlertTitle>
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
								{saving ? "Zapisywanie zgłoszenia…" : "Zapisz zgłoszenie"}
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
