# Fixture'y deduplikacji AED

Zestaw przypadków testowych dla lane'u `dedup-merge`. Fixture'y są niezależne od implementacji: opisują wejściowe rekordy źródłowe i oczekiwany wynik identity resolution, klastrowania, scalania i kolejki review.

Dokument projektowy: [`../../architecture/dedup.md`](../../architecture/dedup.md).

## Pliki

| Plik | Zawartość |
| --- | --- |
| [`fixture.schema.json`](./fixture.schema.json) | JSON Schema dla plików `*.cases.json`. |
| [`identity.cases.json`](./identity.cases.json) | Exact identity, pochodne OSM, blocking, hard identity conflicts, re-import. |
| [`merge.cases.json`](./merge.cases.json) | Survivorship pól, konflikty, licencje, wiele urządzeń w jednym facility. |
| [`review.cases.json`](./review.cases.json) | Walidacja, source anomaly, user report, override, cluster guard. |
| [`metrics.json`](./metrics.json) | Progi metryk i warunki oblania testu. |

Aktualnie: **26 przypadków**, w tym 9 `holdout`. Podział jest oznaczony polem `split` w każdym case'ie.

## Zasady fixture'ów

1. **Wejście jest znormalizowane.** Rekord ma `source_id`, `source_record_id`, `observed_at`, `source_tier` i `fields`. Nie testujemy tutaj parserów ani normalizacji.
2. **Czas jest zamrożony.** `as_of` w case'ie jest jedynym „teraz”. Runner nie może używać `Date.now()`.
3. **Brak sieci.** Fixture'y są samowystarczalne.
4. **Kolejność nie ma znaczenia.** Klastry i grupy facility są zbiorami. Zewnętrzna tablica jest sortowana po najmniejszym `record_key`, żeby wynik był deterministyczny.
5. **Score to przedział.** Fixture sprawdza `score.min <= score <= score.max`, nie dokładną wartość. Dzięki temu kalibracja wag nie łamie testu, dopóki decyzja jest poprawna.
6. **Review item ma `kind`.** W bazie mapujemy je 1:1 na `review_item.type`. Fixture nie zależy od nazw tabel.
7. **Brak danych osobowych.** Adresy i numery są syntetyczne. Przypadki inspirowane Markami i Przemyślem nie zawierają realnych danych osobowych.

## Format case'a

```json
{
  "id": "id-osm-derived",
  "tags": ["identity", "osm", "exact"],
  "split": "dev",
  "as_of": "2026-11-21T00:00:00Z",
  "records": [],
  "reimport": [],
  "overrides": [],
  "submissions": [],
  "source_anomalies": [],
  "expected": {
    "clusters": [],
    "facility_groups": [],
    "pair_decisions": [],
    "review_items": [],
    "canonical": [],
    "validation_issues": []
  }
}
```

Pola opcjonalne:

- `reimport`: te same klucze źródłowe zastosowane drugi raz, aby sprawdzić upsert.
- `overrides`: `force_merge`, `do_not_merge`, `field_pin`, `force_status`, `ignore_source`, `ignore_field`.
- `submissions`: zgłoszenia użytkowników, np. `duplicate_report`.
- `source_anomalies`: problemy poziomu źródła, np. sprzeczny nagłówek CSV.
- `allow_extra_info`: pozwala na dodatkowe itemy `info`, ale nie na brak itemu `warning` lub `blocking`.

## Kontrakt runnera

Runner ewaluacyjny:

1. Ładuje wszystkie `*.cases.json` i `metrics.json`.
2. Waliduje strukturę względem `fixture.schema.json`.
3. Dla każdego case'a tworzy izolowany stan, bez współdzielenia bazy między case'ami.
4. Uruchamia kolejno: identity resolution, blocking, scoring, clustering, merge i review.
5. Porównuje klastry jako zbiory `record_key`. Kolejność wewnątrz klastra jest ignorowana. Kolejność klastrów musi być posortowana po minimum `record_key`.
6. Porównuje `facility_groups` jako zbiory. Grupa facility może zawierać rekordy z różnych klastrów.
7. Porównuje `pair_decisions`: decyzję, `hard_conflict`, `forced` i przedział score.
8. Porównuje `review_items` po `kind`, `field_name` i `severity`. Kolejność nie ma znaczenia.
9. Porównuje wskazane pola `canonical` i `provenance`. Pola niepodane w fixture nie są sprawdzane.
10. Porównuje `validation_issues` po `record` i `code`.
11. Powtarza case trzy razy z permutacją kolejności rekordów i wymaga identycznego wyniku. To sprawdza `decision_stability`.
12. Zapisuje raport metryk zgodny z `metrics.json`.

## Macierz przypadków

### Identity

| Case | Split | Co sprawdza |
| --- | --- | --- |
| `id-osm-derived` | dev | OpenAEDMap i OSM wskazują ten sam `node/1001`; `same_entity`, brak niezależnego potwierdzenia. |
| `id-przemysl-osm-label` | holdout | Ten sam label i operator, 18 m, adres i telefon; auto-merge. |
| `id-two-devices-same-building` | holdout | 3 m, różne seriale; dwa `aed`, jedno facility, bez review tożsamości. |
| `id-same-serial-far` | holdout | Ten sam serial 5 km dalej; review `identity_conflict`, bez auto. |
| `id-label-collision` | dev | Ten sam label w dwóch miastach; separate. |
| `id-transposed-coords` | dev | `lat=21.72`, `lon=49.72`; `OUT_OF_POLAND` i review walidacji. |
| `id-address-no-geo` | dev | Brak geometrii, ale dokładny adres; blocking po adresie, review zamiast auto. |
| `id-phone-operator-only` | dev | Ten sam NIP i telefon bez geometrii; za mało dowodów, separate. |
| `id-reimport-idempotent` | dev | Ten sam `record_key` drugi raz; jeden `aed`, zaktualizowany status, bez nowych itemów. |

### Merge

| Case | Split | Co sprawdza |
| --- | --- | --- |
| `merge-address-survivorship` | dev | Urzędowy adres i pełny `address_text` wygrywają z OSM; unia licencji. |
| `merge-status-conflict` | holdout | `active` vs świeży `removed`; `removed` z `disputed`. |
| `merge-access-conflict` | holdout | `public` vs `private`; wygrywa bardziej restrykcyjny dostęp. |
| `merge-null-vs-unknown` | dev | `unknown` nie nadpisuje `removed` ani `public`. |
| `merge-license-union` | dev | ODbL i CC BY są zachowane razem, bez wyboru jednej licencji. |
| `merge-serial-conflict` | holdout | Ten sam external id, różne seriale; unia z `identity_conflict` i `disputed`. |
| `merge-recency-opening-hours` | dev | Dwa źródła tej samej klasy; świeższe `opening_hours` wygrywa. |
| `merge-multiple-devices-facility` | holdout | Dwa urządzenia w jednej szkole; dwa `aed`, jedno facility. |

### Review

| Case | Split | Co sprawdza |
| --- | --- | --- |
| `review-marki-outlier` | dev | Wiersz 7 poza Polską; `OUT_OF_POLAND`, brak publikacji. |
| `review-przemysl-7639` | holdout | Ten sam label 7639 w dwóch miejscach; `source_anomaly`, bez unii. |
| `review-user-report-duplicate` | dev | Zgłoszenie użytkownika podnosi `merge_candidate` i tworzy `user_report`. |
| `review-manual-pin` | dev | `field_pin` utrzymuje producenta, nowa obserwacja daje `info`, nie nadpisuje. |
| `review-do-not-merge` | dev | `do_not_merge` wygrywa z wysokim score i exact serialem. |
| `review-force-merge` | holdout | `force_merge` łączy parę poniżej progu, z audytem. |
| `review-source-anomaly` | dev | Błąd nagłówka Marki tworzy `source_anomaly`. |
| `review-cluster-guard` | holdout | Łańcuch force-merge A-B-C zostaje przerwany przez guard 250 m. |
| `review-out-of-poland` | dev | Współrzędne poza Polską; `OUT_OF_POLAND`, review walidacji. |

## Dodawanie przypadku

1. Dodaj case do właściwej suity.
2. Ustaw `split` na `dev` albo `holdout`.
3. Upewnij się, że `expected.clusters` pokrywa wszystkie rekordy dokładnie raz.
4. Posortuj klastry po minimum `record_key`.
5. Dla każdej oczekiwanej pary dodaj `pair_decisions`, jeśli decyzja jest istotna.
6. Dla każdego oczekiwanego konfliktu dodaj `review_items` z `kind`, `field_name` i `severity`.
7. Dla pól kanonicznych podaj `fields`, `provenance`, `disputed` i `license_ids`, jeśli mają znaczenie.
8. Uruchom walidator strukturalny:

```bash
bun scripts/validate-dedup-fixtures.ts
```

Walidator sprawdza między innymi:

- unikalność `case.id`,
- unikalność `record_key`,
- pokrycie wszystkich rekordów przez klastry,
- sortowanie klastrów,
- istnienie referencji w decyzjach, review, override i zgłoszeniach,
- poprawność zakresów score,
- minimalną liczbę przypadków z `metrics.json`.

Walidator nie zastępuje runnera. Nie sprawdza, czy implementacja podejmuje poprawną decyzję.

## Metryki

Progi i warunki oblania znajdują się w [`metrics.json`](./metrics.json). Najważniejsze twarde bramki:

- `auto_merge_precision = 1.0`,
- `false_merge_rate = 0.0`,
- `candidate_recall >= 0.98`,
- `provenance_completeness = 1.0`,
- `decision_stability = 1.0`.

Każdy raport musi zawierać `scoring_version`, `fixture_version`, `as_of` i `split`. Raport z `dev` służy do kalibracji, raport z `holdout` do odbioru.
