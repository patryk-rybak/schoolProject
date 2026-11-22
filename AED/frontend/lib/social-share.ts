// Keep in sync with the canonical URL and og:url in docs/share.html.
export const SHARE_PAGE_URL =
	"https://patryk-rybak.github.io/schoolProject/share.html";

export const FACEBOOK_SHARE_URL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_PAGE_URL)}`;

export function buildFacebookPostText(name: string): string {
	const trimmedName = name.trim();
	const point =
		trimmedName.length > 0
			? `Nowy punkt na mapie AED: „${trimmedName}”.`
			: "Nowy punkt na mapie AED.";

	return [
		"⚡ Poraź dobrem!",
		point,
		"Sprawdź, gdzie najbliżej Ciebie jest defibrylator, i dołącz do akcji.",
		"#raziMYdobrem",
	].join("\n");
}
