import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { CircleAlert, MapPin, Plus, Trash2 } from "lucide-react";
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
import { deleteMyAedFn, listMyAedFn } from "#/server/forms";

export const Route = createFileRoute("/moje-aed")({
	loader: () => listMyAedFn(),
	component: MyAedPage,
	head: () => ({ meta: [{ title: "Moje AED — Mapa AED" }] }),
});

function formatDate(iso: string): string {
	const [year, month, day] = iso.slice(0, 10).split("-");
	return `${day}.${month}.${year}`;
}

function addressLine(item: {
	readonly address: string | null;
	readonly city: string | null;
}): string {
	return (
		[item.address, item.city].filter((part) => Boolean(part)).join(", ") ||
		"Brak adresu"
	);
}

function MyAedPage() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const navigate = useNavigate();
	const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
	const [deleting, setDeleting] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function runDelete(id: number) {
		setDeleting(id);
		setError(null);
		try {
			const result = await deleteMyAedFn({ data: { id } });
			if (!result.ok) {
				if ("code" in result && result.code === "unauthorized") {
					await navigate({ to: "/logowanie", replace: true });
					return;
				}
				setError(result.message);
				return;
			}
			setConfirmDelete(null);
			await router.invalidate();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setDeleting(null);
		}
	}

	if (!data.ok) {
		return (
			<main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Sesja wygasła</AlertTitle>
					<AlertDescription>
						<Button asChild={true} variant="outline" size="sm">
							<Link to="/logowanie">Przejdź do logowania</Link>
						</Button>
					</AlertDescription>
				</Alert>
			</main>
		);
	}

	return (
		<main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl">Moje AED</h1>
					<p className="text-muted-foreground">
						Defibrylatory dodane przez Twoje konto.
					</p>
				</div>
				<Button asChild={true}>
					<Link to="/dodaj-aed">
						<Plus />
						Dodaj AED
					</Link>
				</Button>
			</div>

			{error ? (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Nie udało się usunąć AED</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{data.items.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Brak dodanych AED</CardTitle>
						<CardDescription>
							Nie dodałeś jeszcze żadnego defibrylatora. Użyj przycisku „Dodaj
							AED”, aby dodać pierwszy punkt.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<Card>
					<CardContent className="p-0">
						<ul className="divide-y">
							{data.items.map((item) => (
								<li
									key={item.id}
									className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="min-w-0 space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="truncate font-medium">{item.name}</p>
											<Badge variant="secondary">Zweryfikowany</Badge>
										</div>
										<p className="text-muted-foreground text-sm">
											{addressLine(item)}
										</p>
										<p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
											<span className="inline-flex items-center gap-1">
												<MapPin className="size-3" aria-hidden="true" />
												{item.lat.toFixed(6)}, {item.lon.toFixed(6)}
											</span>
											<span>Dodano {formatDate(item.createdAt)}</span>
										</p>
									</div>

									<div className="flex shrink-0 items-center gap-2">
										{confirmDelete === item.id ? (
											<>
												<Button
													size="sm"
													variant="destructive"
													disabled={deleting !== null}
													onClick={() => runDelete(item.id)}
												>
													{deleting === item.id
														? "Usuwanie…"
														: "Potwierdź usunięcie"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={deleting !== null}
													onClick={() => setConfirmDelete(null)}
												>
													Anuluj
												</Button>
											</>
										) : (
											<Button
												type="button"
												size="icon"
												variant="ghost"
												title="Usuń AED"
												aria-label={`Usuń ${item.name}`}
												disabled={deleting !== null}
												onClick={() => {
													setError(null);
													setConfirmDelete(item.id);
												}}
											>
												<Trash2 />
											</Button>
										)}
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
