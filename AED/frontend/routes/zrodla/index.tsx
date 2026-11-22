import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	CircleAlert,
	CircleCheck,
	Database,
	MapPinPlus,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
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
import { deleteSourceFn, listSourcesFn } from "#/server/forms";

const searchSchema = z.object({
	zapisano: z.string().min(1).optional(),
});

export const Route = createFileRoute("/zrodla/")({
	validateSearch: searchSchema,
	loader: async () => {
		const data = await listSourcesFn();
		if (!data.ok && data.code === "unauthorized") {
			throw redirect({ to: "/logowanie" });
		}
		return data;
	},
	component: SourcesPage,
	head: () => ({ meta: [{ title: "Rejestr źródeł danych — Mapa AED" }] }),
});

function familyLabel(family: string): string {
	switch (family) {
		case "file_static":
			return "Plik (CSV/XLSX/JSON/KML)";
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
	const { zapisano } = Route.useSearch();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
	const [dismissedSaved, setDismissedSaved] = useState<string | null>(null);
	const savedBanner =
		zapisano !== undefined && zapisano !== dismissedSaved ? zapisano : null;

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
			await router.invalidate({ sync: true });
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
					<h1 className="font-bold text-3xl">Rejestr źródeł danych</h1>
					<p className="mt-1 text-muted-foreground">
						Konektory zasilające wspólny zbiór AED. Podłącz nowe źródło
						kolumnowe formularzem albo dodaj pojedynczy wpis AED ręcznie.
						Zapisane źródła pobiera cykliczny import.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button asChild={true}>
						<Link to="/zrodla/nowe">
							<Plus />
							Nowe źródło
						</Link>
					</Button>
					<Button asChild={true} variant="outline">
						<Link to="/dodaj-aed">
							<MapPinPlus />
							Dodaj pojedynczy wpis AED
						</Link>
					</Button>
				</div>
			</div>

			{savedBanner ? (
				<Alert>
					<CircleCheck />
					<AlertTitle>Zapisano źródło „{savedBanner}”</AlertTitle>
					<AlertDescription>
						Źródło jest w rejestrze. Jego dane trafią na mapę przy najbliższym
						cyklicznym imporcie.
						<Button
							className="mt-2"
							size="sm"
							variant="outline"
							onClick={() => setDismissedSaved(zapisano ?? null)}
						>
							Zamknij
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			{error ? (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Nie udało się wykonać operacji</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
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
										<Badge variant="destructive">Wyłączone</Badge>
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
									{confirmDelete === source.id ? (
										<>
											<Button
												size="sm"
												variant="destructive"
												disabled={busy !== null}
												onClick={() => runDelete(source.id)}
											>
												{busy === source.id ? "Usuwam…" : "Potwierdź usunięcie"}
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={busy !== null}
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
					<AlertTitle>Nie udało się pobrać rejestru źródeł</AlertTitle>
					<AlertDescription>{data.message}</AlertDescription>
				</Alert>
			)}
		</main>
	);
}
