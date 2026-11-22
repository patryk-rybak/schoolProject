import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	CircleAlert,
	Database,
	FileSpreadsheet,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";

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
import { deleteSourceFn, importSourceFn, listSourcesFn } from "#/server/forms";

export const Route = createFileRoute("/zrodla/")({
	loader: () => listSourcesFn(),
	component: SourcesPage,
	head: () => ({ meta: [{ title: "Źródła danych — Mapa AED" }] }),
});

interface ImportSummary {
	sourceId: string;
	seen: number;
	accepted: number;
	rejected: number;
	stored: number;
	notes: string[];
}

function familyLabel(family: string): string {
	switch (family) {
		case "file_static":
			return "plik (CSV/XLSX/JSON/KML)";
		case "http_json":
			return "HTTP JSON";
		case "http_json_api":
			return "HTTP API";
		case "google_my_maps_kml":
			return "Google My Maps (KML)";
		case "arcgis_query":
			return "ArcGIS";
		case "ckan_datastore":
			return "CKAN";
		case "sqlite_db":
			return "SQLite";
		case "postgres_db":
			return "PostgreSQL";
		case "s3_object":
			return "Amazon S3";
		default:
			return family;
	}
}

function SourcesPage() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [summary, setSummary] = useState<ImportSummary | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	async function runImport(sourceId: string) {
		setBusy(sourceId);
		setError(null);
		setSummary(null);
		try {
			const result = await importSourceFn({ data: { sourceId } });
			if (!result.ok) {
				setError(result.message);
				return;
			}
			setSummary(result.result);
			await router.invalidate();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(null);
		}
	}

	async function runDelete(sourceId: string) {
		setBusy(sourceId);
		setError(null);
		try {
			const result = await deleteSourceFn({ data: { sourceId } });
			if (!result.ok) {
				setError(result.message);
				return;
			}
			setConfirmDelete(null);
			await router.invalidate();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(null);
		}
	}

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl">Źródła danych</h1>
					<p className="mt-1 text-muted-foreground">
						Rejestr konektorów zasilających wspólny zbiór AED.
					</p>
				</div>
				<div className="flex gap-3">
					<Button asChild={true} variant="outline">
						<Link to="/dodaj-aed">Dodaj rekord ręcznie</Link>
					</Button>
					<Button asChild={true}>
						<Link to="/zrodla/nowe">
							<Plus />
							Nowe źródło
						</Link>
					</Button>
				</div>
			</div>

			{error ? (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Operacja nie powiodła się</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{summary ? (
				<Alert>
					<FileSpreadsheet />
					<AlertTitle>
						Zaimportowano {summary.stored} rekordów ze źródła „
						{summary.sourceId}”
					</AlertTitle>
					<AlertDescription>
						Wczytano {summary.seen} wierszy, przyjęto {summary.accepted},
						odrzucono {summary.rejected}.
						{summary.notes.length > 0 ? (
							<ul className="mt-2 list-disc pl-4">
								{summary.notes.map((note) => (
									<li key={note}>{note}</li>
								))}
							</ul>
						) : null}
					</AlertDescription>
				</Alert>
			) : null}

			{data.ok ? (
				<div className="grid gap-4 md:grid-cols-2">
					{data.sources.map((source) => (
						<Card key={source.id}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-lg">
									<Database className="size-4 shrink-0" />
									{source.name}
								</CardTitle>
								<CardDescription className="flex flex-wrap items-center gap-2">
									<Badge variant="secondary">{source.id}</Badge>
									<Badge variant="outline">{familyLabel(source.family)}</Badge>
									<Badge variant="outline">{source.parser}</Badge>
									{source.enabled ? null : (
										<Badge variant="destructive">wyłączone</Badge>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								{source.url ? (
									<p className="break-all text-muted-foreground text-xs">
										{source.url}
									</p>
								) : null}
								<div className="flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="secondary"
										disabled={busy !== null}
										onClick={() => runImport(source.id)}
									>
										{busy === source.id ? "Importuję…" : "Importuj do mapy"}
									</Button>
									{confirmDelete === source.id ? (
										<>
											<Button
												size="sm"
												variant="destructive"
												disabled={busy !== null}
												onClick={() => runDelete(source.id)}
											>
												Potwierdź usunięcie
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => setConfirmDelete(null)}
											>
												Anuluj
											</Button>
										</>
									) : (
										<Button
											size="sm"
											variant="ghost"
											disabled={busy !== null}
											onClick={() => setConfirmDelete(source.id)}
										>
											<Trash2 />
											Usuń
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Nie udało się wczytać rejestru źródeł</AlertTitle>
					<AlertDescription>{data.message}</AlertDescription>
				</Alert>
			)}
		</main>
	);
}
