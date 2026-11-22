import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { type FormIssue, previewSourceFn, saveSourceFn } from "#/server/forms";

import { ConnectorStep } from "./-connector-step";
import { MappingStep } from "./-mapping-step";
import { PreviewStep } from "./-preview-step";
import {
	activeParser,
	buildConfig,
	type ConnectorState,
	familyLabel,
	guessMapping,
	initialConnectorState,
	initialMappingState,
	type MappingState,
	type SourcePreviewData,
} from "./-source-config";

export const Route = createFileRoute("/zrodla/nowe")({
	component: NewSourcePage,
	head: () => ({ meta: [{ title: "Nowe źródło — Mapa AED" }] }),
});

/**
 * Connector wizard: configure the connection (1), preview the raw columns
 * (2), map them onto the AED schema and save the source (3). Saving only
 * registers the connector; there is deliberately no "import to map" step.
 * After a successful save the user lands back on /zrodla with a success
 * banner driven by the `zapisano` search param.
 */
function NewSourcePage() {
	const navigate = useNavigate();
	const formId = useId();
	const idFor = (key: string) => `${formId}-${key}`;

	const [connector, setConnector] = useState<ConnectorState>(
		initialConnectorState,
	);
	const [mapping, setMapping] = useState<MappingState>(initialMappingState);
	const [preview, setPreview] = useState<SourcePreviewData | null>(null);
	const [previewing, setPreviewing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [issues, setIssues] = useState<FormIssue[]>([]);

	function patchConnector(patch: Partial<ConnectorState>) {
		setConnector((previous) => ({ ...previous, ...patch }));
		// The preview belongs to the previous connection settings.
		setPreview(null);
	}

	function patchMapping(patch: Partial<MappingState>) {
		setMapping((previous) => ({ ...previous, ...patch }));
	}

	async function runPreview() {
		setPreviewing(true);
		setError(null);
		setIssues([]);
		try {
			const result = await previewSourceFn({
				data: buildConfig(connector, mapping, false),
			});
			if (!result.ok) {
				setError(result.message);
				setIssues(result.issues);
				return;
			}
			setPreview(result.preview);
			setMapping(guessMapping(result.preview.columns, activeParser(connector)));
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setPreviewing(false);
		}
	}

	async function runSave() {
		setSaving(true);
		setError(null);
		setIssues([]);
		try {
			const result = await saveSourceFn({
				data: buildConfig(connector, mapping, true),
			});
			if (!result.ok) {
				setError(result.message);
				setIssues(result.issues);
				return;
			}
			await navigate({
				to: "/zrodla",
				search: { zapisano: result.source.id },
			});
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSaving(false);
		}
	}

	const errorAlert = error ? (
		<Alert variant="destructive">
			<CircleAlert />
			<AlertTitle>Operacja nie powiodła się</AlertTitle>
			<AlertDescription>
				{error}
				{issues.length > 0 ? (
					<ul className="mt-2 list-disc pl-4">
						{issues.map((issue) => (
							<li key={`${issue.field}:${issue.message}`}>
								{issue.field === "" ? "" : `${issue.field}: `}
								{issue.message}
							</li>
						))}
					</ul>
				) : null}
			</AlertDescription>
		</Alert>
	) : null;

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl">Nowe źródło danych</h1>
					<p className="mt-1 text-muted-foreground">
						Podłącz plik kolumnowy (CSV, XLSX, JSON, GeoJSON, KML) albo bazę
						danych lub magazyn S3, podejrzyj kolumny i zmapuj je na schemat AED.
						Zapisane źródło zasila mapę przez cykliczny import.
					</p>
				</div>
				<Button asChild={true} variant="outline">
					<Link to="/zrodla">
						<ArrowLeft />
						Wróć do rejestru
					</Link>
				</Button>
			</div>

			<ConnectorStep
				state={connector}
				onChange={patchConnector}
				idFor={idFor}
				onPreview={runPreview}
				previewing={previewing}
			>
				{errorAlert}
			</ConnectorStep>

			{preview ? (
				<>
					<PreviewStep preview={preview} />
					<MappingStep
						columns={preview.columns}
						state={mapping}
						onChange={patchMapping}
						idFor={idFor}
						onSave={runSave}
						saving={saving}
						family={familyLabel(connector)}
						parser={activeParser(connector)}
					>
						{errorAlert}
					</MappingStep>
				</>
			) : null}
		</main>
	);
}
