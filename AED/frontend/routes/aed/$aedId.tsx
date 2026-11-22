import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AedDetailContent } from "#/components/aed-detail-content";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { getAedDetailFn } from "#/server/forms";

export const Route = createFileRoute("/aed/$aedId")({
	loader: ({ params }) => getAedDetailFn({ data: { id: params.aedId } }),
	component: AedDetailPage,
	head: () => ({ meta: [{ title: "Szczegóły AED — Mapa AED" }] }),
});

function AedDetailPage() {
	const detail = Route.useLoaderData();
	if (!detail) {
		throw notFound();
	}

	return (
		<main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
			<Button asChild={true} variant="outline" className="self-start">
				<Link to="/">
					<ArrowLeft />
					Wróć do mapy
				</Link>
			</Button>
			<Card>
				<CardHeader>
					<CardTitle>
						<h1 className="font-bold text-3xl">Szczegóły AED</h1>
					</CardTitle>
					<CardDescription>
						Pełne dane zgłoszonego defibrylatora AED.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<AedDetailContent detail={detail} />
				</CardContent>
			</Card>
		</main>
	);
}
