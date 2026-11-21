# Frontend · Formularz logowania i rejestracji

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Pozwolić osobom zarządzającym danymi (opiekunowie AED, redakcja) zalogować się
i założyć konto, zanim dopuszczone zostanie dodawanie lub edycja rekordów.

## Zakres

- formularz logowania (e-mail + hasło),
- formularz rejestracji z potwierdzeniem hasła,
- walidacja pól i komunikaty błędów po polsku,
- stany: ładowanie, błąd serwera, sukces,
- obsługa klawiatury i czytników ekranu, widoczny fokus, kontrast 4.5:1.

## Zależności

- backend: [`../backend/auth/`](../backend/auth/README.md) — sesje i role,
- `src/lib/auth-client.ts` — klient better-auth,
- `src/components/ui/` — pola i przyciski shadcn.

## Stan obecny

Skonfigurowany jest better-auth po stronie serwera
(`src/lib/auth.ts`, `src/routes/api/auth/$.ts`). Brak jakiegokolwiek
interfejsu logowania.
