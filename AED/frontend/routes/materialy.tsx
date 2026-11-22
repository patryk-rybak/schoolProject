import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, Image as ImageIcon } from "lucide-react";

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

export const Route = createFileRoute("/materialy")({
	component: MaterialyPage,
	head: () => ({ meta: [{ title: "Materiały — Mapa AED" }] }),
});

const downloads = [
	{
		href: "/materialy/wzorcowy-zakres-danych-aed.xlsx",
		name: "Wzorcowy zakres danych AED",
		format: "XLSX",
		description: "Szablon pól wymaganych dla rekordów AED.",
	},
	{
		href: "/materialy/brandbook.pdf",
		name: "Brandbook",
		format: "PDF",
		description: "Zasady identyfikacji wizualnej konkursu.",
	},
	{
		href: "/materialy/logo.png",
		name: "Logo (PNG)",
		format: "PNG",
		description: "Logo w wersji rasterycznej przezroczystej.",
	},
	{
		href: "/materialy/logo.jpg",
		name: "Logo (JPG)",
		format: "JPG",
		description: "Logo w wersji rasterycznej.",
	},
	{
		href: "/materialy/logo.svg",
		name: "Logo (SVG)",
		format: "SVG",
		description: "Logo w wersji wektorowej.",
	},
	{
		href: "/materialy/prezentacja.pdf",
		name: "Prezentacja projektu",
		format: "PDF",
		description: "Slajdy podsumowujące rozwiązanie.",
	},
	{
		href: "/materialy/instrukcja-dla-jury.md",
		name: "Instrukcja dla jury",
		format: "MD",
		description: "Wskazówki do oceny zgłoszenia.",
	},
] as const;

const screenshots = [
	{
		src: "/materialy/screenshot-mapa.png",
		alt: "Zrzut ekranu mapy AED z zaznaczonymi punktami",
		caption: "Mapa AED",
	},
	{
		src: "/materialy/screenshot-dodaj-aed.png",
		alt: "Zrzut ekranu formularza dodawania rekordu AED",
		caption: "Dodaj AED",
	},
	{
		src: "/materialy/screenshot-zrodla-nowe.png",
		alt: "Zrzut ekranu formularza dodawania nowego źródła danych",
		caption: "Nowe źródło danych",
	},
] as const;

function MaterialyPage() {
	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl">Materiały</h1>
					<p className="mt-2 max-w-3xl text-muted-foreground">
						Materiały konkursowe „DANE AED RAZEM” przygotowane jako
						potwierdzenie realizacji zadania. Poniżej znajdują się pliki do
						pobrania oraz zrzuty ekranu gotowej aplikacji.
					</p>
				</div>
				<Button asChild={true} variant="outline">
					<Link to="/dokumentacja/wzorcowy-zakres-danych">
						Wzorcowy zakres danych
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Pliki do pobrania</CardTitle>
					<CardDescription>
						Dokumenty, logo i instrukcje stanowiące część zgłoszenia.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<caption className="sr-only">
							Lista plików do pobrania dla konkursu DANE AED RAZEM
						</caption>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Materiał</TableHead>
								<TableHead scope="col">Opis</TableHead>
								<TableHead scope="col">Format</TableHead>
								<TableHead scope="col">
									<span className="sr-only">Pobierz</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{downloads.map((item) => (
								<TableRow key={item.href}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell className="whitespace-normal text-muted-foreground">
										{item.description}
									</TableCell>
									<TableCell>{item.format}</TableCell>
									<TableCell>
										<Button asChild={true} size="sm" variant="outline">
											<a href={item.href} download={true}>
												<Download aria-hidden="true" />
												Pobierz
											</a>
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Podgląd aplikacji</CardTitle>
					<CardDescription>
						Zrzuty ekranu prezentujące najważniejsze widoki.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{screenshots.map((shot) => (
							<li key={shot.src}>
								<figure className="overflow-hidden rounded-lg border">
									<img
										alt={shot.alt}
										className="aspect-video w-full object-cover object-top"
										height={900}
										loading="lazy"
										src={shot.src}
										width={1280}
									/>
									<figcaption className="flex items-center gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
										<ImageIcon aria-hidden="true" className="size-4" />
										{shot.caption}
									</figcaption>
								</figure>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			<p className="flex items-center gap-2 text-sm text-muted-foreground">
				<FileText aria-hidden="true" className="size-4" />
				Materiały są przeznaczone wyłącznie dla jury konkursu DANE AED RAZEM.
			</p>
		</main>
	);
}
