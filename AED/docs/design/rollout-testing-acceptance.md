# Wdrożenie, testy i kryteria akceptacji

| | |
| --- | --- |
| Wersja | 1.0 |
| Baza | [`../aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md), sekcja 16 |
| Dotyczy | CI, środowiska, testy, demonstracja, odbiór |
| Status | plan do realizacji |

## 1. Zasady wdrożenia

1. **Najpierw dowód, potem skala.** Jedno źródło P0 i jeden connector miejski muszą przejść pełny cykl, zanim dodamy kolejne.
2. **Każda faza ma mierzalne wyjście.** Faza bez kryterium wyjścia nie jest fazą, tylko życzeniem.
3. **Publiczne API jest zamrożone przed podłączeniem mapy.** Mapa nie może wymuszać zmian kontraktu, którego nie ma.
4. **Eksport jest ostatnim krokiem, nie pierwszym.** Nie publikujemy na dane.gov.pl danych, których nie umiemy zweryfikować i zaatrybuować.
5. **Rollback jest częścią wdrożenia.** Każda migracja i każda zmiana projekcji ma plan cofnięcia.
6. **Demo jest testem, nie prezentacją.** To samo polecenie, które uruchamia demonstrację, uruchamia testy akceptacyjne.

## 2. Fazy

### Faza 0: fundament (1 do 2 dni)

Zakres:

- schemat Drizzle z sekcji 13 dokumentu bazowego plus tabele panelu (A1),
- migracja i seed źródeł: `osm`, `openaedmap`, `przemysl` z licencjami,
- logger JSONL, `/api/v1/health`, `/api/health/ready`,
- `publicProjection` z listą pól zabronionych,
- CI: `typecheck`, `check`, `test`.

Kryterium wyjścia:

- `bun run db:migrate` tworzy bazę od zera,
- `bun run verify` przechodzi,
- health zwraca `ok` na pustej bazie,
- test projekcji nie przepuszcza `serial_number`.

### Faza 1: P0 dane i API (3 do 5 dni)

Zakres:

- connector OpenAEDMap `PL.geojson` i fallback OSM,
- connector Przemyśl z GeoJSON i checksum,
- normalizacja, walidacja, deduplikacja w obrębie źródła,
- `GET /api/v1/aed`, `/:code`, `.geojson`, `.csv`,
- `GET /api/v1/sources`, `/stats`,
- ETag, cache, limity, problem+json,
- testy z fixture'ami z `docs/research/raw/`.

Kryterium wyjścia:

- co najmniej 18 000 rekordów z OpenAEDMap i 21 z Przemyśla,
- zero rekordów poza Polską,
- API zwraca poprawne odpowiedzi dla wszystkich filtrów,
- testy kontraktu z sekcji 11 dokumentu API przechodzą,
- p95 `GET /aed?bbox=...` poniżej 300 ms na 20 000 rekordach.

### Faza 2: mapa publiczna (3 do 4 dni)

Zakres:

- warstwa AED, klastrowanie, legenda, kolory,
- panel filtrów i synchronizacja URL,
- panel szczegółów, „blisko mnie”, widok listy,
- dostępność klawiaturowa i responsywność 360 px,
- atrybucja i linki do licencji.

Kryterium wyjścia:

- wszystkie scenariusze z sekcji 6 przechodzą ręcznie i w E2E,
- axe bez błędów krytycznych na `/` i `/admin`,
- mapa działa przy wyłączonym geolokalizacji i przy błędzie kafelków,
- liczba wyników w URL odtwarza ten sam widok po odświeżeniu.

### Faza 3: panel administracyjny (4 do 6 dni)

Zakres:

- role i guardy (A2),
- źródła, przebiegi, review, zgłoszenia, audyt (A3 do A8),
- idempotencja uruchomień i blokady edycji,
- alerty AL1 do AL17 w minimalnym zakresie: zapis w panelu i log.

Kryterium wyjścia:

- macierz uprawnień z sekcji 2.1 `admin-console.md` przechodzi w testach,
- ręczny przebieg P0 kończy się `ok` i widocznym diffem,
- symulowany błąd źródła tworzy wpis w panelu i alert,
- decyzja review tworzy `audit_log`.

### Faza 4: P1 źródła miejskie (3 do 5 dni)

Zakres:

- Krosno, Marki, Warszawa (jeśli token),
- parser dwustopniowy dla Marki i wykrywanie odwróconych osi,
- mirror dane.gov.pl jako źródło porównawcze,
- deduplikacja między źródłami i kolejka review.

Kryterium wyjścia:

- Marki: 8 rekordów, z czego wiersz `Numer Id=7` trafia do review, nie na mapę,
- Krosno: 21 rekordów, nagłówki z wiodącymi spacjami są trimowane,
- Warszawa bez tokena: `sync_run.status=failed`, `http_status=403`, bez zatrzymania innych źródeł,
- duplikaty OSM/OpenAEDMap: jeden `aed`, dwa aliasy.

### Faza 5: publikacja i partnerstwa (2 do 4 dni)

Zakres:

- generator feedu harwestera 1.13 i zasoby `/data/aed-*.csv|geojson`,
- bramka eksportu (O6, O9),
- walidacja na lokalnej instancji dane.gov.pl,
- strona „O projekcie”, licencje, kontakt, polityka prywatności,
- materiał dla oceniających: zrzuty ekranu, lista ograniczeń.

Kryterium wyjścia:

- lokalny harwester pobiera feed, MD5 się zgadza, XSD przechodzi,
- zasób `aed-all.csv` ma ODbL i atrybucję, `aed-local.csv` ma CC BY lub CC0,
- eksport jest zablokowany po symulowanym `license_alert`,
- wszystkie wymagania formalne z sekcji 6 są spełnione.

### Faza 6: rejestry i zgłoszenia (opcjonalna, jeśli czas)

Zakres:

- KSRG/OSP jako `candidate`,
- formularz zgłoszeń i moderacja,
- kampania weryfikacyjna,
- statystyki pokrycia gmin.

Kryterium wyjścia:

- żaden rekord z rejestru nie ma `verification_status=confirmed`,
- zgłoszenie publiczne wymaga zgody i moderacji,
- statystyki pokrycia są zgodne z liczbą rekordów w bazie.

## 3. Środowiska

| Środowisko | Cel | Baza | Domena | Uwagi |
| --- | --- | --- | --- | --- |
| lokalne | rozwój i testy | `dev.db` | `http://localhost:3000` | `.env.local`, dane z fixture'ów |
| testowe (CI) | automatyczne testy | SQLite w pamięci lub plik tymczasowy | brak | bez sieci, HTTP mockowany |
| demo | prezentacja i odbiór | `demo.db` z seedem | publiczny HTTPS lub tunel | dane P0 + P1, eksport włączony |
| dane.gov.pl lokalnie | walidacja harwestera | Postgres w Dockerze | `https://mcod.local` | zgodnie z `dane.gov.pl/RUNNING.md` |

Zasady:

- `dev.db` i `demo.db` są ignorowane przez git.
- Seed demo jest deterministyczny: ten sam zestaw rekordów i te same czasy.
- Demo nie może wymagać zewnętrznego API do działania mapy. Connector pobiera dane wcześniej, a demo czyta z bazy.
- Publiczny adres demo musi być HTTPS, bo harwester i geolokalizacja tego wymagają.

## 4. Strategia testów

### 4.1 Piramida

| Poziom | Udział | Narzędzie | Zakres |
| --- | --- | --- | --- |
| jednostkowe | 60% | `bun test` | normalizacja, walidacja, projekcja, filtry, scoring |
| kontraktowe | 20% | `bun test` + JSON Schema | API, CSV, GeoJSON, feed |
| integracyjne | 15% | `bun test` + tymczasowa SQLite | ingest do eksportu, migracje, idempotencja |
| E2E | 5% | Playwright lub ręcznie | mapa, panel, ścieżka użytkownika |

Testy jednostkowe nie wykonują żądań sieciowych. Każdy connector ma adapter HTTP wstrzykiwany w testach.

### 4.2 Fixture'y

Fixture'y pochodzą z `docs/research/raw/` i są kopiowane do `src/**/__fixtures__/` lub `test/fixtures/`:

| Fixture | Źródło | Test |
| --- | --- | --- |
| `openaedmap-pl-sample.geojson` | próbka `PL.geojson` | normalizacja OSM, tagi, `check_date` |
| `przemysl-geojson.json` | `resource-15.geojson` | mapowanie pól, współrzędne |
| `przemysl-csv-body.txt` | `resource-15.csv` | dwustopniowy parser JSON w `text/csv` |
| `krosno.csv` | dane.gov.pl 3624 | trim nagłówków, 21 rekordów |
| `marki.csv` | dane.gov.pl 4955 | podwójne cytowanie, odwrócone osie |
| `warszawa-403.json` | odpowiedź API | obsługa braku tokena |
| `ksrg-sample.pdf.txt` | KSRG | tylko `candidate`, brak współrzędnych |

Fixture'y są małe (maks. 50 rekordów) i pozbawione danych osobowych. Pełne payloady zostają w `docs/research/raw/` jako dowód, nie w testach.

### 4.3 Testy jednostkowe

**Normalizacja:**

1. OSM `node/13323246101` daje `source_record_id=node/13323246101`, `verification_status=probable` przy świeżym `check_date`.
2. OSM bez `check_date` daje `stale`, nie `unverified`.
3. Przemyśl: `geometry.coordinates[1]` to `lat`, `[0]` to `lon`.
4. Przemyśl CSV: body jest literałem JSON, po `JSON.parse` daje CSV; bez `limit` wynik ma 10 wierszy i test to wykrywa.
5. Marki: wiersz z `52.326697, 21.107557` w kolumnach lon/lat jest wykryty jako odwrócony i trafia do review.
6. Marki: wiersz `Numer Id=7` z `21.7203, 49.7188` jest poprawny i nie trafia do review.
7. Krosno: nagłówki ` Nazwa` i ` Adres` są trimowane.
8. Rekord poza Polską daje `OUT_OF_POLAND`.
9. Rekord z adresem i bez współrzędnych daje `location_status=address_only`, nie `MISSING_COORDS`, i nie trafia do GeoJSON.
10. Rekord bez adresu i bez współrzędnych daje `geo.location.missing` / `unresolved`.
11. Geokoder z confidence 0.86 daje `location_status=geocoded`, `coord_precision_m=50` i nie zmienia `verification_status`.
12. `address_only` znika z `bbox`, `near` i `sort=distance`; wraca tylko z `include_address_only=true`.
13. Dwa rekordy 3 m od siebie z różnymi `serial_number` dają dwa `aed` i jedno `facility`.
14. Ten sam OSM `node_id` w OSM i OpenAEDMap daje jeden `aed` i dwa aliasy.
15. E-mail osoby fizycznej jest zamieniany na `null` przez `redactPII`.

**Filtry i projekcja:**

16. `include_removed=false` nie zwraca `removed`.
17. `sort=distance` bez `near` daje `MISSING_NEAR`.
18. Nieznany parametr daje `UNKNOWN_PARAM`.
19. `bbox` większy niż 4 stopnie daje `BBOX_TOO_LARGE`.
20. Projekcja publiczna nie zawiera kluczy z listy zabronionych na żadnym poziomie zagnieżdżenia.
21. `confidence` jest przycinane do 0 do 1.

### 4.4 Testy kontraktowe

- JSON Schema dla odpowiedzi `/aed`, `/aed/:code`, `/sources`, `/stats`.
- GeoJSON walidowany względem RFC 7946 i własnego JSON Schema.
- CSV walidowany względem nagłówka i typów.
- Feed XML walidowany względem XSD harwestera 1.13.
- Nagłówki: `ETag`, `Cache-Control`, `X-Data-License`, `Link rel=license`, `Access-Control-Allow-Origin`.
- Problem+json dla każdego kodu błędu.

### 4.5 Testy integracyjne

1. Pełny cykl: fixture OpenAEDMap → `sync_run=ok` → rekordy w bazie → `/api/v1/aed.geojson` → ten sam zbiór.
2. Powtórny import tego samego fixture daje zero nowych rekordów i zero zmian.
3. Zmiana `check_date` w fixture aktualizuje `last_verified_at` i tworzy nową obserwację.
4. Migracja z pustej bazy i migracja z poprzedniej wersji schematu.
5. Dwa równoległe przebiegi tego samego źródła: drugi dostaje 409.
6. Eksport blokuje rekord bez atrybucji.
7. `license_alert` blokuje eksport i publiczne API tylko dla danego źródła.
8. Harwester lokalny: `HEAD feed.xml`, `GET feed.md5`, `GET feed.xml`, import.
9. Rollback migracji przywraca poprzedni stan bez utraty danych.

### 4.6 Testy E2E

Scenariusze Playwright lub ręczne z tymi samymi krokami:

1. **Mapa startowa.** Otwórz `/`, mapa i lista pokazują co najmniej 100 rekordów, legenda i atrybucja są widoczne.
2. **Filtr dostępu.** Wybierz `public` i `is_24_7=true`, liczba wyników spada, URL zawiera filtry, odświeżenie zachowuje stan.
3. **Szczegóły.** Kliknij znacznik, panel pokazuje status, źródło, licencję i „Ostatnia weryfikacja”.
4. **Brak wyników.** Ustaw miasto bez danych, pojawia się komunikat i przycisk czyszczenia.
5. **Geolokalizacja odmowa.** Zablokuj geolokalizację, pojawia się pole adresu i komunikat, mapa działa.
6. **Błąd kafelków.** Wyłącz `/api/pmtiles`, lista nadal działa, alert jest czytelny.
7. **Klawiatura.** Przejdź przez filtry i listę wyłącznie `Tab`/`Enter`, fokus jest widoczny.
8. **Mobile 360 px.** Wszystkie filtry i szczegóły są dostępne, nic nie wychodzi poza ekran.
9. **Panel admina: źródła.** Zaloguj się jako `editor`, dodaj źródło, spróbuj zmienić licencję, dostaj 403.
10. **Panel admina: przebieg.** Uruchom przebieg, zobacz liczniki i diff, powtórz z tym samym `Idempotency-Key`.
11. **Panel admina: review.** Rozstrzygnij duplikat z uzasadnieniem, wpis pojawia się w audycie.
12. **Zgłoszenie.** Wyślij zgłoszenie publiczne, pojawia się w panelu, po moderacji zmienia rekord.

### 4.7 Testy dostępności

- axe-core na `/`, `/admin`, `/admin/sources`, `/admin/runs/:id`, formularzu zgłoszenia: zero błędów `critical` i `serious`.
- Kontrast tekstu 4.5:1, dużego tekstu 3:1, fokusu 3:1.
- Wszystkie obrazy mają `alt`, ikony dekoracyjne `aria-hidden`.
- Formularze mają `label`, opis błędu i `aria-live` dla komunikatów.
- Mapa ma alternatywę w postaci listy; nawigacja klawiaturą nie wpada w pułapkę.
- Test z `prefers-reduced-motion` i powiększeniem 200%.
- Czytnik ekranu: NVDA lub VoiceOver na ścieżce „znajdź najbliższy AED”.

### 4.8 Testy wydajności

| Scenariusz | Cel | Metoda |
| --- | --- | --- |
| 20 000 rekordów, `bbox` 0,1 stopnia | p95 < 300 ms | `bun test` z pomiarem lub `k6` |
| 20 000 rekordów, `near` 5 km | p95 < 300 ms | j.w. |
| eksport CSV 20 000 rekordów | < 5 s | pomiar w teście integracyjnym |
| mapa, 5 000 znaczników w viewport | pierwsze znaczniki < 2 s | Lighthouse na demo |
| panel, 500 przebiegów | lista < 1 s | test z seedem |
| rozmiar bazy | < 150 MB dla 20 000 rekordów i 12 miesięcy snapshotów | pomiar |

### 4.9 Testy bezpieczeństwa i autoryzacji

- Macierz uprawnień z `admin-console.md`: każda rola i każda akcja.
- Brak sesji na `/admin/**` daje 401, brak roli 403.
- CSRF: mutacja bez tokena daje 403.
- Rate limit logowania i API.
- Pola zabronione nie wychodzą w API, eksporcie ani logach.
- SQL injection: parametry filtrów są wiązane, nie sklejane.
- XSS: nazwa i opis z źródła są escapowane w mapie i panelu.
- Nagłówki bezpieczeństwa: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Sekrety nie są w bundle'u klienta (test skanujący `VITE_` i `process.env`).

## 5. CI

Obecny workflow `.github/workflows/tests.yml` zawiera kroki `TODO` i nie testuje niczego. Docelowy:

```yaml
name: Automated Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  run-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: AED
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.5
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run check
      - run: bun test
      - run: bun run build
      - name: Validate harvester feed
        run: bun run test:feed
```

Zasady:

- `bun test` nie może wymagać sieci. Testy sieciowe są oznaczone `skip` lub używają mocka.
- Walidacja feedu używa XSD dołączonego do repozytorium lub pobranego wcześniej; brak sieci nie może psuć CI.
- Build jest testem, bo łapie błędy routingu i importów serwerowych.
- Czas CI poniżej 8 minut. Dłuższe testy wydajności działają nocą lub lokalnie.
- Próg pokrycia: 70% dla `src/lib/aed/**` i `src/routes/api/v1/**`. Nie blokujemy merge dla UI.
- Wynik testów jest wymagany do merge, zgodnie z `AGENTS.md`.

## 6. Kryteria akceptacji

### 6.1 Wymagania formalne zadania

| Wymaganie | Dowód | Test |
| --- | --- | --- |
| szczegółowy opis i tytuł projektu | `README.md`, dokumenty w `docs/design/` | przegląd |
| prezentacja min. 5 slajdów ze zrzutami | plik prezentacji poza repo lub w `docs/` | przegląd |
| opis funkcjonalności i kroków użytkownika | sekcja 6.3 i `public-api-and-filters.md` §7 | przegląd |
| lista ograniczeń | sekcja 7 | przegląd |
| prototyp | aplikacja `bun run dev` | E2E |
| wzorcowy zakres danych XLSX | plik `AED/docs/aed-data-schema.xlsx` lub wskazany | otwarcie i porównanie z modelem |
| kod źródłowy | repozytorium | build i testy |
| logotyp JPG/PNG/PDF + otwarty | pliki w `docs/brand/` | otwarcie |
| księga znaku PDF | plik w `docs/brand/` | otwarcie |
| dane maszynowe, nie PDF/DOC | CSV, GeoJSON, JSON, XLSX | test typu i parsera |
| zgodność z dane.gov.pl | feed, licencje, metadane | test harwestera |
| WCAG i responsywność | axe, testy 360 px i klawiatury | E2E |
| UX | scenariusze użytkownika | E2E i przegląd |

### 6.2 Kryteria techniczne

| ID | Kryterium | Próg | Metoda |
| --- | --- | --- | --- |
| T1 | Dane z co najmniej dwóch niezależnych źródeł | OSM/OpenAEDMap + Przemyśl | test integracyjny |
| T2 | Rekordy z OSM | ≥ 18 000 | licznik w bazie |
| T3 | Rekordy z Przemyśla | 21 lub więcej, bez duplikatów | test fixture |
| T4 | Zero rekordów poza Polską | 0 | walidacja |
| T5 | Publiczne API bez sesji | 200 bez cookie | test kontraktu |
| T6 | Format maszynowy | CSV, GeoJSON, JSON | test kontraktu |
| T7 | Atrybucja i licencja w każdym rekordzie | 100% | test projekcji |
| T8 | Pola zabronione nie wychodzą | 0 trafień | test rekurencyjny |
| T9 | Filtr `bbox` i `near` | p95 < 300 ms na 20k | test wydajności |
| T10 | Mapa działa bez geolokalizacji | lista i komunikat | E2E |
| T11 | Panel admina chroniony rolami | 401/403 zgodnie z macierzą | test autoryzacji |
| T12 | Przebieg idempotentny | powtórka bez nowych rekordów | test integracyjny |
| T13 | Alert przy błędzie źródła | wpis w panelu i log | test operacyjny |
| T14 | Eksport zablokowany przy naruszeniu licencji | 503 + `export.blocked` | test operacyjny |
| T15 | Feed harwestera waliduje się | MD5 + XSD | test lokalny |
| T16 | Build produkcyjny | `bun run build` przechodzi | CI |
| T17 | Testy | `bun test` przechodzi | CI |
| T18 | Brak sekretów w repo i bundle'u | 0 trafień | test skanujący |

### 6.3 Scenariusze użytkownika

**Scenariusz A: mieszkaniec szuka najbliższego AED.**

1. Otwiera stronę główną na telefonie.
2. Wybiera „Blisko mnie”, zgadza się na lokalizację.
3. Widzi 3 najbliższe AED z odległością i statusem.
4. Otwiera szczegóły, widzi „Czynne, dostęp publiczne, wejście główne, ostatnia weryfikacja 2025-11-22”.
5. Klika „Pokaż trasę”.

Kryterium: cała ścieżka poniżej 30 s, bez błędów, z czytelnym komunikatem przy braku zgody.

**Scenariusz B: urzędnik publikuje dane.**

1. Loguje się jako `editor`.
2. Dodaje źródło z licencją i harmonogramem dziennym.
3. Uruchamia przebieg i widzi 21 przyjętych, 0 odrzuconych.
4. Sprawdza diff i zatwierdza publikację.
5. Eksport trafia do feedu, lokalny harwester go pobiera.

Kryterium: cała ścieżka w panelu, bez `sqlite3`, z audytem.

**Scenariusz C: redakcja rozwiązuje konflikt.**

1. Otwiera kolejkę review.
2. Widzi dwa rekordy 8 m od siebie z różnymi etykietami.
3. Wybiera „zostaw osobno” i wpisuje uzasadnienie.
4. Oba rekordy pozostają widoczne, powstaje wpis w audycie.

Kryterium: brak automatycznego scalenia, decyzja odwracalna nową akcją.

**Scenariusz D: źródło przestaje działać.**

1. Connector dostaje 403.
2. Przebieg kończy się `failed`.
3. Dashboard pokazuje źródło w błędzie, log ma `sync.fetch_failed`.
4. Po drugim niepowodzeniu powstaje alert AL1.
5. Poprzednie dane pozostają na mapie, oznaczone jako nieświeże.

Kryterium: użytkownik nie widzi pustej mapy, ops widzi alert.

**Scenariusz E: zmienia się regulamin.**

1. Job wykrywa inny `terms_hash`.
2. Źródło przechodzi w `read_only`, powstaje `license_alert`.
3. Eksport zostaje zablokowany.
4. Admin zatwierdza nową interpretację lub wyłącza źródło.

Kryterium: żadne nowe dane nie wychodzą do decyzji człowieka.

### 6.4 Mapowanie na kryteria oceny konkursu

| Kryterium oceny | Waga | Gdzie w rozwiązaniu | Dowód |
| --- | --- | --- | --- |
| zgodność z zasadami dane.gov.pl | 30% | feed 1.13, licencje, metadane, brak PDF | test harwestera, sekcja 6.2 T5, T15 |
| kreatywność i innowacyjność | 15% | model rekord + obserwacja + proweniencja, kolejka review, mapa dostępna | dokument bazowy i `admin-console.md` |
| zgodność z tematem wyzwania | 15% | ogólnopolski zbiór, wiele źródeł, wzorcowy zakres | T1 do T4, XLSX |
| wzorcowy zakres danych | 10% | model kanoniczny i słowniki | dokument bazowy §7 do §8, XLSX |
| prezentacja kompletnego rozwiązania | 5% | demo i zrzuty | scenariusze A do E |
| logotyp i hasło | 25% | osobny dokument kampanii | pliki w `docs/brand/` |

Uwaga: ten dokument nie realizuje logotypu ani księgi znaku. To osobny lane. W tabeli zaznaczono to, żeby oceniający widzieli kompletność całości, a nie tylko tej warstwy.

## 7. Ograniczenia

| Ograniczenie | Wpływ | Mitygacja |
| --- | --- | --- |
| brak centralnego rejestru AED | dane zawsze niepełne | wiele źródeł, oznaczenie `unknown` |
| OSM bez statusu działania | nie wiadomo, czy AED działa | `verification_status`, kampania weryfikacyjna |
| stare pliki miejskie | dane mogą być nieaktualne | `last_verified_at`, `stale` |
| Warszawa wymaga tokena | brak danych bez umowy | komunikat w panelu, kontakt |
| Marki mają błędne osie | ryzyko złej lokalizacji | walidacja i review |
| Przemyśl CSV jest technicznie wadliwy | ryzyko 10 z 21 rekordów | GeoJSON jako źródło podstawowe |
| brak licencji aplikacji | nie można scrapować | lista zablokowanych źródeł |
| ODbL share-alike | obowiązki przy ponownym użyciu | rozdzielone eksporty i atrybucja |
| SQLite i jeden proces | ograniczone skalowanie zapisu | WAL, kolejka, odczyt z cache |
| brak testów w repo na starcie | ryzyko regresji | plan testów i CI |
| prototyp bez SLA produkcyjnego | dostępność zależy od hostingu | health, alerty, cache |

## 8. Rollback

| Zmiana | Plan cofnięcia | Czas | Uwagi |
| --- | --- | --- | --- |
| migracja schematu | `bun run db:migrate` wstecz lub przywrócenie kopii | < 15 min | kopia przed migracją |
| nowa wersja API | przełączenie na poprzedni build | < 5 min | `.output` jako artefakt |
| nowe źródło | `enabled=0` i `allowed_for_export=0` | natychmiast | dane zostają, ale nie wychodzą |
| zmiana projekcji | powrót do poprzedniej wersji modułu | < 15 min | ETag się zmienia |
| zły eksport | zatrzymanie feedu i publikacja poprzedniego pliku | < 30 min | zachowaj hash |
| naruszenie licencji | wyłączenie eksportu i API | natychmiast | runbook R5 |

Zasada: rollback nie usuwa danych źródłowych ani obserwacji. Cofamy publikację i zachowanie, nie dowody.

## 9. Demonstracja

Polecenie Demo:

```bash
cd AED
bun install
bun run db:push
bun run seed:demo
bun run dev
```

`seed:demo`:

1. tworzy źródła `osm`, `openaedmap`, `przemysl`, `krosno`, `marki`,
2. importuje fixture'y bez sieci, z deterministycznymi czasami,
3. tworzy dwa przebiegi: `ok` i `partial`,
4. tworzy jeden `review_item` dla Marek,
5. tworzy jedno zgłoszenie publiczne,
6. generuje eksport `demo` z poprawną atrybucją.

Demo pokazuje w 10 minut:

1. mapę z filtrami i „blisko mnie”,
2. szczegóły rekordu z licencją i weryfikacją,
3. panel źródeł i przebiegów,
4. kolejkę review i decyzję,
5. dashboard alertów,
6. feed harwestera i pobranie przez lokalny portal.

## 10. Definicja ukończenia

- [ ] `bun run typecheck` przechodzi.
- [ ] `bun run check` przechodzi.
- [ ] `bun test` przechodzi.
- [ ] `bun run build` przechodzi.
- [ ] Migracje tworzą bazę od zera i cofają się.
- [ ] Publiczne API przechodzi testy kontraktu i limitów.
- [ ] Mapa przechodzi scenariusze A, D i test dostępności.
- [ ] Panel przechodzi macierz uprawnień i scenariusze B, C.
- [ ] Eksport przechodzi walidację MD5 i XSD na lokalnym dane.gov.pl.
- [ ] Każdy rekord publiczny ma licencję i atrybucję.
- [ ] Pola zabronione nie występują w API, eksporcie ani logach.
- [ ] Dokumenty `docs/design/` są zlinkowane z `README.md`.
- [ ] Prezentacja i zrzuty ekranu są gotowe.
- [ ] Logotyp, księga znaku i wzorcowy XLSX są dołączone.
- [ ] Lista ograniczeń jest aktualna.
- [ ] Commity są w Conventional Commits, bez sekretów i artefaktów.

## 11. Ryzyka harmonogramu

| Ryzyko | Prawdopodobieństwo | Wpływ | Reakcja |
| --- | --- | --- | --- |
| brak tokena Warszawa | wysokie | średni | źródło opcjonalne, pokaż jako ograniczenie |
| niestabilny Overpass | średnie | średni | użyj eksportu OpenAEDMap |
| brak czasu na panel admina | średnie | wysoki | panel minimalny: źródła, przebiegi, review, reszta poza demo |
| brak czasu na logotyp | niskie | wysoki dla oceny | równoległy lane, nie blokuje kodu |
| problem z lokalnym dane.gov.pl | średnie | średni | walidacja XSD offline i zrzut z próby |
| zbyt duży zakres źródeł | wysokie | średni | zamroź zakres na P0 + P1 przed fazą 4 |

## 12. Kolejność zadań w repozytorium

| Kolejność | Zadanie | Dokument źródłowy |
| --- | --- | --- |
| 1 | schemat + migracja + seed | dokument bazowy §13, `admin-console.md` §5 |
| 2 | projekcja publiczna + normalizacja | `public-api-and-filters.md` §5, dokument bazowy §15 |
| 3 | API publiczne | `public-api-and-filters.md` §2 do §6 |
| 4 | mapa i filtry | `public-api-and-filters.md` §7 |
| 5 | panel admina | `admin-console.md` §3 do §9 |
| 6 | obserwowalność i bramki | `observability-licensing.md` §3 do §12 |
| 7 | feed i eksport | `observability-licensing.md` §12.7, `public-api-and-filters.md` §10 |
| 8 | testy E2E i demo | ten dokument §4 i §9 |
| 9 | prezentacja, zrzuty, XLSX, ograniczenia | ten dokument §6 |

Każde zadanie kończy się commitem zgodnym z Conventional Commits i aktualizacją tego dokumentu, jeśli zmienia się kontrakt.
