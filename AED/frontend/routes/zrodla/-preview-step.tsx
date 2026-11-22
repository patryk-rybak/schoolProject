import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

import { formatCell, type SourcePreviewData } from "./-source-config";

/** Step 2: raw columns and sample rows returned by previewSourceFn. */
export function PreviewStep({ preview }: { preview: SourcePreviewData }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>2. Podgląd danych</CardTitle>
				<CardDescription>
					Wczytano {preview.recordCount} rekordów; kolumny:{" "}
					{preview.columns.length}. Przykładowe wiersze:
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left">
							<tr>
								{preview.columns.map((column) => (
									<th
										key={column}
										className="whitespace-nowrap px-3 py-2 font-medium"
									>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{preview.sample.map((row, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: podgląd jest statyczny.
								<tr key={index} className="border-t">
									{preview.columns.map((column) => (
										<td key={column} className="max-w-64 truncate px-3 py-2">
											{formatCell(row[column])}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
