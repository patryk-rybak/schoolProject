import { Save } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";

import {
	hasNameMapping,
	type LatLonMode,
	type MappingState,
	NONE,
	type PairOrder,
	TEXT_MAPPING_FIELDS,
} from "./-source-config";

/**
 * Step 3: map the previewed source columns onto the canonical AED schema
 * and save the connector config. There is no import step: ingesting the
 * registered sources into the map is a separate scheduled pipeline run.
 */

interface MappingStepProps {
	columns: string[];
	state: MappingState;
	onChange: (patch: Partial<MappingState>) => void;
	idFor: (key: string) => string;
	onSave: () => void;
	saving: boolean;
	family: string;
	parser: string;
	children?: ReactNode;
}

export function MappingStep({
	columns,
	state,
	onChange,
	idFor,
	onSave,
	saving,
	family,
	parser,
	children,
}: MappingStepProps) {
	const nameMapped = hasNameMapping(state);
	return (
		<Card>
			<CardHeader>
				<CardTitle>3. Mapowanie kolumn</CardTitle>
				<CardDescription>
					Połącz kolumny źródła z polami schematu AED. Nazwa jest wymagana;
					rekordy bez punktu nie trafią na mapę.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<FieldGroup>
					{TEXT_MAPPING_FIELDS.map(({ key, label }) => (
						<div
							key={key}
							className="grid items-center gap-2 sm:grid-cols-[220px_1fr]"
						>
							<FieldLabel htmlFor={idFor(`map-${key}`)}>{label}</FieldLabel>
							<Select
								value={state.mapping[key] ?? NONE}
								onValueChange={(value) =>
									onChange({ mapping: { ...state.mapping, [key]: value } })
								}
							>
								<SelectTrigger id={idFor(`map-${key}`)} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE}>(nie mapuj)</SelectItem>
									{columns.map((column) => (
										<SelectItem key={column} value={column}>
											{column}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					))}
				</FieldGroup>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={idFor("latlon-mode")}>
							Współrzędne geograficzne
						</FieldLabel>
						<Select
							value={state.latLonMode}
							onValueChange={(value) =>
								onChange({ latLonMode: value as LatLonMode })
							}
						>
							<SelectTrigger
								id={idFor("latlon-mode")}
								className="w-full sm:w-96"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="columns">
									Osobne kolumny lat i lon
								</SelectItem>
								<SelectItem value="pair">
									Jedna kolumna z parą współrzędnych
								</SelectItem>
								<SelectItem value="geojson">
									Geometria GeoJSON (kolumna geometry)
								</SelectItem>
								<SelectItem value="kml">KML (automatycznie)</SelectItem>
								<SelectItem value="none">Brak współrzędnych</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					{state.latLonMode === "columns" ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<ColumnSelect
								id={idFor("coord-lat")}
								label="Kolumna lat (szerokość)"
								columns={columns}
								value={state.latColumn}
								onValueChange={(value) => onChange({ latColumn: value })}
							/>
							<ColumnSelect
								id={idFor("coord-lon")}
								label="Kolumna lon (długość)"
								columns={columns}
								value={state.lonColumn}
								onValueChange={(value) => onChange({ lonColumn: value })}
							/>
						</div>
					) : null}
					{state.latLonMode === "pair" ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<ColumnSelect
								id={idFor("pair-col")}
								label="Kolumna z parą"
								columns={columns}
								value={state.pairColumn}
								onValueChange={(value) => onChange({ pairColumn: value })}
							/>
							<Field>
								<FieldLabel htmlFor={idFor("pair-order")}>Kolejność</FieldLabel>
								<Select
									value={state.pairOrder}
									onValueChange={(value) =>
										onChange({ pairOrder: value as PairOrder })
									}
								>
									<SelectTrigger id={idFor("pair-order")} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="lat_lon">lat, lon</SelectItem>
										<SelectItem value="lon_lat">lon, lat</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>
					) : null}
					<Field orientation="horizontal">
						<Checkbox
							id={idFor("poland")}
							checked={state.polandOnly}
							onCheckedChange={(checked) =>
								onChange({ polandOnly: checked === true })
							}
						/>
						<FieldLabel htmlFor={idFor("poland")}>
							Odrzucaj punkty spoza granic Polski (bbox)
						</FieldLabel>
					</Field>
				</FieldGroup>

				{children}

				<div className="flex flex-wrap items-center gap-3">
					<Button onClick={onSave} disabled={saving || !nameMapped}>
						<Save />
						{saving ? "Zapisuję…" : "Zapisz źródło"}
					</Button>
					<Badge variant="outline">
						{family} / {parser}
					</Badge>
					{nameMapped ? null : (
						<p className="text-muted-foreground text-sm">
							Zmapuj kolumnę „Nazwa”, aby zapisać źródło.
						</p>
					)}
				</div>
				<FieldDescription>
					Po zapisaniu źródło trafia do rejestru. Dane pobiera osobny, cykliczny
					import (pipeline), nie ten formularz.
				</FieldDescription>
			</CardContent>
		</Card>
	);
}

interface ColumnSelectProps {
	id: string;
	label: string;
	columns: string[];
	value: string;
	onValueChange: (value: string) => void;
}

function ColumnSelect({
	id,
	label,
	columns,
	value,
	onValueChange,
}: ColumnSelectProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NONE}>(brak)</SelectItem>
					{columns.map((column) => (
						<SelectItem key={column} value={column}>
							{column}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}
