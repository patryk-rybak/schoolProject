import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { PolandMap } from "#/map/poland-map";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<h1 className="font-bold text-4xl">Mapa AED w Polsce</h1>
					</CardTitle>
					<CardDescription className="flex flex-wrap items-center gap-2 text-lg">
						Defibrylatory AED · Protomaps + MapLibre GL JS
						<Badge variant="secondary">dane © OpenStreetMap</Badge>
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-muted-foreground text-sm">
							Kliknij mapę w dowolnym miejscu, aby dodać AED („Dodaj AED
							tutaj”).
						</p>
						<Button asChild={true} size="sm">
							<Link to="/dodaj-aed">
								<Plus />
								Dodaj AED
							</Link>
						</Button>
					</div>
					<PolandMap />
				</CardContent>
			</Card>
		</main>
	);
}
