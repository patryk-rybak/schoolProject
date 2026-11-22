/** RFC 9110 style Accept-Encoding check for the gzip export variant. */
export function acceptEncodingAllowsGzip(value: string | null): boolean {
	if (value === null) {
		return false;
	}
	return value.split(",").some((token) => {
		const [name, ...parameters] = token.split(";").map((part) => part.trim());
		if (name?.toLowerCase() !== "gzip") {
			return false;
		}
		const quality = parameters.find((parameter) =>
			parameter.toLowerCase().startsWith("q="),
		);
		if (quality === undefined) {
			return true;
		}
		const parsed = Number.parseFloat(quality.slice(2));
		return Number.isFinite(parsed) && parsed > 0;
	});
}
