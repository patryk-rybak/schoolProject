import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useId } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

export const Route = createFileRoute("/dokumentacja/wzorcowy-zakres-danych")({
	component: WzorcowyZakresPage,
	head: () => ({
		meta: [{ title: "Wzorcowy zakres danych AED — Mapa AED" }],
	}),
});

const stableIdents = [
	{
		level: "Zbiór",
		extIdent: "aed-pl-open",
		description: "Wpis dataset w feedzie dane.gov.pl.",
	},
	{
		level: "Zasób CSV",
		extIdent: "aed-pl-open-csv",
		description: "Pełny rejestr w formacie CSV (UTF-8).",
	},
	{
		level: "Zasób GeoJSON",
		extIdent: "aed-pl-open-geojson",
		description: "Rejestr jako kolekcja obiektów GeoJSON.",
	},
] as const;

const publicationRules = [
	{
		name: "Idempotencja",
		description:
			"Używaj stałego extIdent dla zbioru i zasobów w feedzie dane.gov.pl.",
	},
	{
		name: "WGS84",
		description:
			"Współrzędne w CSV jako lat, lon; w GeoJSON jako [lon, lat] zgodnie z RFC 7946.",
	},
	{
		name: "Weryfikacja",
		description:
			"verified wymaga verified_by lub verified_at; w przeciwnym razie unverified.",
	},
	{
		name: "Lokalizacja",
		description:
			"point/geocoded wymaga lat i lon; address_only nie może mieć punktu.",
	},
	{
		name: "Licencja",
		description:
			"Deklaruj licencję w metadanych zbioru; źródła bez deklaracji wyłącz z agregacji.",
	},
	{
		name: "Aktualność",
		description:
			"PUBLIC_BASE_URL i hash danych determinują feed.xml oraz feed.md5.",
	},
] as const;

const sheets = [
	{
		name: "Informacje",
		description:
			"Metadane dokumentu: akcja DANE AED RAZEM, wersja 1.0, cel oraz zasada odpowiedzialności dostawcy i agregatora.",
		details: [
			"Język: polski, kodowanie UTF-8.",
			"Formaty wymiany: CSV, GeoJSON i XLSX.",
			"Dostawca odpowiada za jakość danych, agregator za provenance i licencję.",
		],
	},
	{
		name: "Wzorcowy zakres",
		description:
			"Słownik pól rekordu z typem, wymagalnością, dopuszczalnymi wartościami, opisem, przykładem i informacją o publikacji w feedzie.",
		details: [
			"Wymagane: name, location_status, geom_source oraz licencja (rekomendacja).",
			"Warunkowo: lat i lon dla point/geocoded, address_text dla address_only.",
			"Weryfikacja: verified_by i verified_at przy verification_status=verified.",
		],
	},
	{
		name: "Źródła i zakresy",
		description:
			"Zestawienie dostawców z zakresem referencyjnym, formatem, licencją, geometrią, liczbą rekordów i statusem włączenia.",
		details: [
			"Źródła z licencją CC0 1.0, CC BY 4.0 i ODbL 1.0 są włączone.",
			"Źródła bez deklaracji licencji pozostają wyłączone do decyzji licencyjnej.",
			"source_id jednoznacznie identyfikuje dostawcę.",
		],
	},
	{
		name: "Przykład rekordu",
		description:
			"Pełny, reprezentatywny rekord pokazujący powiązanie pól identyfikacyjnych, lokalizacji, dostępności i weryfikacji.",
		details: [
			"Identyfikator: warszawa:0001 (source_id + source_record_id).",
			"Współrzędne: lat 52.2285, lon 21.0031 (WGS84).",
			"Weryfikacja: verified, public_body, data 2026-06-01.",
		],
	},
	{
		name: "Zasady publikacji",
		description:
			"Reguły idempotencji, geometrii, weryfikacji, licencji i aktualności obowiązujące przy publikacji zbioru.",
		details: [
			"Stałe extIdent dla zbioru i zasobów w feedzie dane.gov.pl.",
			"CSV: lat, lon. GeoJSON: [lon, lat] zgodnie z RFC 7946.",
			"verified wymaga verified_by lub verified_at; inaczej unverified.",
			"Licencja w metadanych zbioru; feed.xml i feed.md5 determinuje hash danych.",
		],
	},
] as const;

function WzorcowyZakresPage() {
	const sheetsHeadingId = useId();

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<Badge variant="secondary">Dokumentacja</Badge>
					<h1 className="mt-3 font-bold text-3xl">
						Wzorcowy zakres danych AED
					</h1>
					<p className="mt-2 max-w-3xl text-muted-foreground">
						Jednolity zakres informacji o defibrylatorach AED dla dysponentów
						publikujących zbiory w dane.gov.pl. Dokument opisuje pola rekordu,
						źródła, przykład oraz zasady publikacji w ramach akcji „DANE AED
						RAZEM”.
					</p>
				</div>
				<Button asChild={true} className="shrink-0">
					<a download={true} href="/materialy/wzorcowy-zakres-danych-aed.xlsx">
						<Download aria-hidden="true" />
						Pobierz XLSX
					</a>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Stałe identyfikatory feedu</CardTitle>
					<CardDescription>
						Portal dane.gov.pl aktualizuje wpisy po extIdent, dlatego wartości
						te nigdy się nie zmieniają.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<caption className="sr-only">
							Stałe identyfikatory zbioru i zasobów w feedzie dane.gov.pl
						</caption>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Poziom</TableHead>
								<TableHead scope="col">extIdent</TableHead>
								<TableHead scope="col">Opis</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{stableIdents.map((item) => (
								<TableRow key={item.extIdent}>
									<TableCell className="font-medium">{item.level}</TableCell>
									<TableCell>
										<code>{item.extIdent}</code>
									</TableCell>
									<TableCell className="whitespace-normal text-muted-foreground">
										{item.description}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<section aria-labelledby={sheetsHeadingId}>
				<h2 className="font-semibold text-2xl" id={sheetsHeadingId}>
					Arkusze skoroszytu
				</h2>
				<p className="mt-1 text-muted-foreground">
					Każdy arkusz XLSX odpowiada innemu etapowi opisu danych.
				</p>
				<div className="mt-4 grid gap-4 md:grid-cols-2">
					{sheets.map((sheet) => (
						<Card key={sheet.name}>
							<CardHeader>
								<CardTitle>{sheet.name}</CardTitle>
								<CardDescription>{sheet.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
									{sheet.details.map((detail) => (
										<li key={detail}>{detail}</li>
									))}
								</ul>
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			<Card>
				<CardHeader>
					<CardTitle>Najważniejsze reguły</CardTitle>
					<CardDescription>
						Zasady obowiązujące przy przygotowaniu i publikacji rekordów.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<caption className="sr-only">
							Reguły publikacji wzorcowego zakresu danych AED
						</caption>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Reguła</TableHead>
								<TableHead scope="col">Opis</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{publicationRules.map((rule) => (
								<TableRow key={rule.name}>
									<TableCell className="font-medium">{rule.name}</TableCell>
									<TableCell className="whitespace-normal text-muted-foreground">
										{rule.description}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</main>
	);
}
