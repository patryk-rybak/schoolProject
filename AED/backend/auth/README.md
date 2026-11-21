# Backend · Uwierzytelnianie i uprawnienia

**Status:** częściowo istnieje · **Kod:** `src/lib/auth.ts`, `src/routes/api/auth/$.ts`

## Cel

Wiedzieć, kto modyfikuje dane, i dopuszczać do tego tylko osoby uprawnione.

## Zakres

- logowanie e-mail + hasło (better-auth),
- sesja w cookie HttpOnly, wygaśnięcie i wylogowanie,
- role: administrator, redakcja, opiekun urządzenia,
- ochrona server functions i tras API (401 vs 403),
- limitowanie prób logowania,
- ślad audytowy zmian uprawnień i danych.

## Zależności

- `src/db/` — tabele better-auth w istniejącej bazie,
- `frontend/auth-form/` — interfejs logowania.

## Stan obecny

Skonfigurowany better-auth z logowaniem e-mail/hasło oraz montaż `/api/auth/*`.
Brak ról, brak guardów na poziomie aplikacji, brak limitowania prób.
