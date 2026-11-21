# Frontend · Formularz AED

**Status:** planowane · **Kod:** brak (placeholder)

## Cel

Umożliwić dodanie nowego defibrylatora oraz poprawienie istniejącego rekordu
bezpośrednio w aplikacji — przez opiekuna urządzenia lub redakcję.

## Zakres

- formularz dodawania/edycji: nazwa, adres, współrzędne (wybór na mapie lub
  wpisanie), typ lokalizacji (wewnątrz/zewnątrz), dostępność (24/7, godziny
  pracy, na klucz), status urządzenia, model, numer seryjny, data instalacji,
  data ostatniego przeglądu, opiekun i kontakt,
- walidacja po stronie klienta i serwera, czytelne komunikaty,
- tryb publicznego zgłoszenia („dodaj AED”) z moderacją,
- historia zmian rekordu,
- obsługa błędów i stanów częściowych, bez utraty wpisanych danych.

## Zależności

- backend: [`../../backend/store/`](../../backend/store/README.md) — zapis rekordów,
- backend: [`../../backend/auth/`](../../backend/auth/README.md) — kto może edytować,
- `frontend/map/` — wspólny komponent wyboru punktu na mapie.

## Stan obecny

Brak formularza i brak modelu danych w bazie. Aplikacja renderuje wyłącznie
mapę bazową.
