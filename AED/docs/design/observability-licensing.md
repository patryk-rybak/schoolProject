# Obserwowalność, alerty i zabezpieczenia licencyjne

| | |
| --- | --- |
| Wersja | 1.0 |
| Baza | [`../aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md), sekcje 11, 12, 15 |
| Dotyczy | ingest, normalizacja, eksport, API, panel administracyjny |
| Status | projekt operacyjny do implementacji |

## 1. Cele

1. **Wiedzieć wcześniej niż użytkownik**, że źródło przestało działać albo dane się zestarzały.
2. **Odróżnić awarię transportu od degradacji danych.** HTTP 200 z pustym plikiem jest groźniejsze niż HTTP 503.
3. **Mieć dowód, że publikujemy legalnie.** Licencja, atrybucja i zgoda są równie ważne jak poprawność współrzędnych.
4. **Reagować w skali minut, nie tygodni.** Alert musi mieć właściciela i runbook.
5. **Nie zbierać danych osobowych w logach** przy okazji monitoringu.

## 2. Sygnały i poziomy

| Poziom | Znaczenie | Kanał | Czas reakcji |
| --- | --- | --- | --- |
| `info` | normalne zdarzenie, np. zakończony przebieg | log, brak powiadomienia | brak |
| `warning` | degradacja bez wpływu na prawdziwość mapy, np. jeden odrzucony rekord | panel, dzienny raport | 1 dzień roboczy |
| `error` | źródło P0 nie działa lub dane są nieświeże | e-mail/Slack do ops | 4 godziny |
| `critical` | publiczne API leży, eksport nie działa, naruszenie licencji | telefon/Slack, eskalacja | 30 minut |

Nie każdy błąd HTTP jest `error`. `404` pojedynczego zasobu w źródle zwykle oznacza zmianę struktury i wymaga `warning` plus review. `403` i `451` to `error`, bo mogą oznaczać cofnięcie zgody.

## 3. Logowanie strukturalne

Każdy log to jedna linia JSON (JSONL). Minimalny schemat:

```json
{
  "ts": "2026-11-21T19:30:00.123Z",
  "level": "info",
  "event": "sync.finished",
  "request_id": "req_01J8Z3K4Q9",
  "run_id": "run_01J8Z3K4Q9",
  "source_id": "openaedmap",
  "route": "/api/admin/sources/openaedmap/run",
  "actor_hash": "sha256:9f2c...",
  "duration_ms": 1840,
  "status": "ok",
  "records_fetched": 18298,
  "records_accepted": 18190,
  "records_rejected": 108,
  "error_code": null,
  "schema_version": 1
}
```

Zasady:

- `event` jest stabilnym identyfikatorem ze słownika (`sync.started`, `sync.fetch_failed`, `normalize.rejected`, `export.generated`, `license.changed`, `api.request`, `auth.denied`).
- `request_id` jest generowany na wejściu i propagowany do wszystkich warstw.
- `actor_hash` to skrót identyfikatora użytkownika, nie e-mail. Logi panelu mogą mieć `actor_role`, ale nie `actor_email`.
- Nie logujemy `payload_json`, pełnych adresów, numerów telefonów, e-maili ani współrzędnych pojedynczych rekordów. W razie potrzeby logujemy `public_code` i `payload_sha256`.
- Logi są w formacie JSONL z rotacją dzienną i retencją 30 dni. Błędy `error` i `critical` są kopiowane do `audit_log` na 24 miesiące.
- Każdy log ma `schema_version`. Zmiana pól wymaga podniesienia wersji i aktualizacji parsera.

## 4. Metryki

Metryki są zapisywane jako liczniki i histogramy w tabeli `metric_snapshot` oraz eksportowane w formacie Prometheus, jeśli środowisko ma zbieracz. Nazwy mają prefiks `aed_`.

### 4.1 Metryki przebiegów

| Metryka | Typ | Etykiety | Znaczenie |
| --- | --- | --- | --- |
| `aed_sync_runs_total` | counter | `source`, `status` | liczba przebiegów |
| `aed_sync_duration_seconds` | histogram | `source`, `status` | czas przebiegu |
| `aed_sync_last_success_timestamp` | gauge | `source` | czas ostatniego `ok` lub `partial` |
| `aed_sync_records_fetched` | gauge | `source` | rekordy w ostatnim przebiegu |
| `aed_sync_records_accepted` | gauge | `source` | przyjęte |
| `aed_sync_records_rejected` | gauge | `source`, `reason` | odrzucone z powodem |
| `aed_sync_volume_ratio` | gauge | `source` | przyjęte / średnia z 7 dni |
| `aed_sync_http_status` | gauge | `source`, `code` | ostatni status HTTP |
| `aed_sync_consecutive_failures` | gauge | `source` | seria niepowodzeń |

### 4.2 Metryki danych

| Metryka | Typ | Etykiety | Znaczenie |
| --- | --- | --- | --- |
| `aed_records_total` | gauge | `status`, `verification_status` | liczba rekordów publicznych |
| `aed_records_stale_ratio` | gauge | brak | udział `stale` w publicznych |
| `aed_records_missing_coords` | gauge | `source` | rekordy bez współrzędnych |
| `aed_records_out_of_poland` | gauge | `source` | odrzucone po walidacji |
| `aed_duplicate_candidates` | gauge | brak | otwarte `review_item` typu duplikat |
| `aed_review_backlog` | gauge | `type` | kolejka review |
| `aed_license_alert_open` | gauge | `kind` | otwarte alerty licencyjne |
| `aed_field_coverage_ratio` | gauge | `source`, `field` | pokrycie pola w źródle |

### 4.3 Metryki API i eksportu

| Metryka | Typ | Etykiety | Znaczenie |
| --- | --- | --- | --- |
| `aed_api_requests_total` | counter | `route`, `status` | ruch |
| `aed_api_request_duration_seconds` | histogram | `route` | czas odpowiedzi |
| `aed_api_response_bytes` | histogram | `route`, `format` | rozmiar odpowiedzi |
| `aed_api_rate_limited_total` | counter | `route` | odrzucone limity |
| `aed_export_last_success_timestamp` | gauge | `format` | czas eksportu |
| `aed_export_duration_seconds` | histogram | `format` | czas generowania |
| `aed_export_records` | gauge | `format` | liczba rekordów |
| `aed_harvester_fetch_total` | counter | `result` | wejścia harwestera po `User-Agent` |
| `aed_db_size_bytes` | gauge | brak | rozmiar SQLite |
| `aed_wal_size_bytes` | gauge | brak | rozmiar WAL |

## 5. Health endpoints

### 5.1 `GET /api/v1/health` (publiczny)

```json
{
  "status": "ok",
  "time": "2026-11-21T19:45:00Z",
  "version": "1.0.0"
}
```

Zwraca `200` tylko gdy baza odpowiada i co najmniej jedno źródło P0 ma dane. Nie ujawnia ścieżek, wersji bibliotek ani liczby rekordów.

### 5.2 `GET /api/health/ready` (ops)

```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "ok", "latency_ms": 3 },
    "migrations": { "status": "ok", "version": "2026_11_21_001" },
    "last_export": { "status": "ok", "age_minutes": 42 },
    "sources": {
      "status": "degraded",
      "failing": ["warszawa"],
      "stale": ["krosno"]
    },
    "disk": { "status": "ok", "free_mb": 2048 }
  }
}
```

Kody: `200` dla `ok`, `200` dla `degraded` (z treścią), `503` dla `unhealthy`. Endpoint jest dostępny tylko z sieci wewnętrznej lub po nagłówku `X-Internal-Token`, żeby nie ujawniać stanu źródła publicznie.

## 6. Dashboardy

### 6.1 Zdrowie źródeł

- tabela źródeł: ostatni sukces, status, wiek danych, kolejne uruchomienie, seria błędów,
- wykres słupkowy czasu przebiegu w 14 dniach,
- licznik odrzuceń według kodu,
- wskaźnik `volume_ratio` z linią progową 0,5.

### 6.2 Jakość danych

- rozkład `verification_status`, `status`, `access_type`,
- mapa cieplna pokrycia gmin (TERYT),
- trend `stale_ratio`,
- liczba rekordów bez współrzędnych, bez adresu, bez operatora,
- duplikaty i konflikty w kolejce.

### 6.3 Publiczne API

- RPS i p95/p99 czasu odpowiedzi według trasy,
- błędy 4xx/5xx,
- trafienia cache i `304`,
- limity i `429`,
- rozmiar eksportu i czas generowania.

### 6.4 Zgodność licencyjna

- źródła bez licencji,
- źródła z otwartym `license_alert`,
- rekordy bez atrybucji,
- ostatnia weryfikacja regulaminu,
- eksporty zablokowane przez bramkę.

## 7. SLO i budżet błędu

| Usługa | SLI | Cel | Okno | Konsekwencja |
| --- | --- | --- | --- | --- |
| Świeżość P0 | udział dni, w których OSM/OpenAEDMap i Przemyśl mają przebieg `ok` lub `partial` | 99% | 30 dni | alert po 2 kolejnych porażkach |
| Publiczne API | udział odpowiedzi `2xx` i `304` | 99,5% | 30 dni | alert przy 5% błędów w 5 min |
| Czas API | p95 `GET /aed` w `bbox` | < 300 ms | 7 dni | warning przy 500 ms |
| Eksport | codzienny eksport CSV i GeoJSON | 100% | 30 dni | `critical` po 26 h bez sukcesu |
| Kolejka review | czas do decyzji dla `bad_coordinates` | < 7 dni | 30 dni | warning przy 10 otwartych starszych niż 7 dni |
| Licencje | 0 otwartych `license_alert` dłużej niż 24 h | 100% | 30 dni | `critical` |

Budżet błędu: 1% dla świeżości P0 i 0,5% dla API. Wykorzystanie powyżej 75% budżetu wstrzymuje nowe źródła do czasu poprawy.

## 8. Katalog alertów

| ID | Warunek | Okno | Poziom | Właściciel | Działanie |
| --- | --- | --- | --- | --- | --- |
| AL1 | `aed_sync_consecutive_failures >= 2` dla źródła P0 | natychmiast | error | ops | sprawdź HTTP, klucz, regulamin; patrz runbook R1 |
| AL2 | `now - aed_sync_last_success_timestamp > 26h` dla P0 | 1 h | error | ops | R1 |
| AL3 | `aed_sync_volume_ratio < 0.5` | 1 przebieg | error | ops + redakcja | możliwa cicha zmiana API; R2 |
| AL4 | `records_rejected / fetched > 0.10` | 1 przebieg | warning | redakcja | przegląd próbki, R3 |
| AL5 | `records_rejected / fetched > 0.50` | 1 przebieg | error | redakcja | wstrzymaj publikację, R3 |
| AL6 | `aed_records_stale_ratio > 0.25` | 24 h | warning | redakcja | kampania weryfikacyjna, R4 |
| AL7 | `aed_license_alert_open > 0` | 15 min | critical | admin + prawo | wstrzymaj eksport, R5 |
| AL8 | `aed_api_requests_total{status=~"5.."}` > 1% w 5 min | 5 min | error | ops | R6 |
| AL9 | p95 `GET /aed` > 500 ms | 10 min | warning | ops | sprawdź indeksy i rozmiar `bbox`, R7 |
| AL10 | `now - aed_export_last_success_timestamp > 26h` | 1 h | critical | ops | R8 |
| AL11 | `aed_db_size_bytes` > 80% wolnego miejsca | 1 h | error | ops | R9 |
| AL12 | `aed_review_backlog{bad_coordinates}` > 10 i najstarszy > 7 dni | 24 h | warning | redakcja | R4 |
| AL13 | źródło bez `license_id` lub `terms_hash` | przy zapisie | critical | admin | blokada zapisu, R5 |
| AL14 | nowe źródło bez `allowed_for_ingest=1` próbuje się uruchomić | natychmiast | error | admin | odrzuć przebieg, R5 |
| AL15 | `aed_harvester_fetch_total{result="fail"}` > 0 | natychmiast | warning | ops | sprawdź feed i MD5, R8 |
| AL16 | rekord publiczny z polem zabronionym | natychmiast | critical | ops + admin | wyłącz eksport, R10 |
| AL17 | brak wpisu `sync_run` dla źródła z `schedule_cron` przez 2 okresy | 2 okresy | error | ops | R1 |

Alerty są deduplikowane po `(alert_id, source_id)` na 30 minut. Każdy alert ma link do przebiegu i runbooka. Alert bez właściciela jest traktowany jak brak alertu.

## 9. Detekcja anomalii danych

Poza progami prostymi stosujemy trzy tanie testy:

1. **Dryf wolumenu.** `volume_ratio` porównuje liczbę przyjętych rekordów do mediany z 7 poprzednich udanych przebiegów. Spadek poniżej 0,5 lub wzrost powyżej 2,0 oznacza odpowiednio utratę lub duplikację.
2. **Dryf współrzędnych.** Mediana przesunięcia rekordów o tym samym `source_record_id` nie powinna przekraczać 500 m. Większa wartość oznacza zmianę układu współrzędnych lub odwrócenie osi.
3. **Dryf schematu.** Porównujemy zbiór kluczy w payloadzie z poprzednim przebiegiem. Nowy brakujący klucz obowiązkowy daje `warning`, zmiana typu daje `error`.

Wyniki zapisujemy w `metric_snapshot` z etykietą `kind=anomaly`, żeby można było pokazać trend.

## 10. Runbooki

| ID | Sytuacja | Kroki | Eskalacja |
| --- | --- | --- | --- |
| R1 | źródło nie pobiera się | sprawdź status HTTP i nagłówki, `curl` z tym samym `User-Agent`, sprawdź czy nie zmienił się URL lub auth, uruchom ręcznie, porównaj z poprzednim payloadem | redakcja + wydawca |
| R2 | spadek wolumenu | pobierz payload ręcznie, sprawdź filtr lub paginację, porównaj liczbę z API/metadanymi, nie publikuj do wyjaśnienia | redakcja |
| R3 | wysoki odrzuceń | otwórz próbkę, pogrupuj po kodzie, sprawdź czy to zmiana formatu czy złe dane, popraw normalizator lub oznacz review | redakcja |
| R4 | stare dane | uruchom kampanię weryfikacyjną, oznacz `stale`, powiadom operatorów, nie usuwaj rekordów | redakcja |
| R5 | problem licencyjny | natychmiast `allowed_for_export=0` i `allowed_for_ingest=0`, zachowaj dowody, powiadom admina i prawo, opublikuj komunikat jeśli dane już wyszły | admin + prawo |
| R6 | błędy API | sprawdź health, logi 5xx, bazę i indeksy, w razie potrzeby włącz tryb tylko-do-odczytu z cache | ops |
| R7 | wolne API | sprawdź plan zapytania, rozmiar `bbox`, liczbę rekordów, dodaj indeks lub ogranicz `limit` | ops |
| R8 | eksport nie działa | sprawdź generator, uprawnienia zapisu, MD5 feedu, walidację XSD, wygeneruj ręcznie | ops + gov-api |
| R9 | brak miejsca | usuń stare snapshoty według retencji, zwiększ wolumen, nie usuwaj bieżącej bazy | ops |
| R10 | wyciek pola | natychmiast wyłącz eksport i publiczne API, unieważnij cache, usuń pole z projekcji, powiadom prawo, oceń obowiązek zgłoszenia | admin + prawo |

## 11. Retencja i koszt

| Dane | Retencja | Uzasadnienie |
| --- | --- | --- |
| `sync_run` i liczniki | 24 miesiące | trend i audyt |
| pełny `payload_json` źródła | 12 miesięcy | odtworzenie normalizacji |
| logi JSONL | 30 dni | debugowanie |
| `audit_log` | 24 miesiące | rozliczalność |
| `metric_snapshot` | 12 miesięcy | trend |
| zgłoszenia i zdjęcia | 24 miesiące od decyzji | reklamacje |
| cache publiczny | 5 minut do 1 godziny | świeżość |

Snapshoty są kompresowane po 90 dniach. Nie usuwamy obserwacji powiązanych z rekordem publicznym, tylko skracamy payload do pól potrzebnych do proweniencji.

## 12. Zabezpieczenia licencyjne

### 12.1 Bramka wejścia źródła

Źródło może mieć `allowed_for_ingest=1` tylko gdy spełnia wszystkie warunki:

1. Ma wpis w rejestrze `license` z `license_id`, `license_url` i `attribution`.
2. Ma zapisany `terms_hash` i `terms_checked_at` nie starsze niż 90 dni.
3. Dla licencji zamkniętej lub niejasnej ma `permission_document_url` i `approved_by`.
4. Nie znajduje się na liście zablokowanych wzorców (scraping aplikacji, obejście API, płatny dostęp).
5. Ma zdefiniowany `User-Agent` z kontaktem i respektuje `robots.txt` oraz limity wydawcy.

Niespełnienie któregokolwiek warunku daje `409 LICENSE_GATE_FAILED` przy próbie uruchomienia i wpis `license_alert(kind=missing_license)`.

### 12.2 Lista źródeł domyślnie zablokowanych

| Źródło | Powód | Dozwolona droga |
| --- | --- | --- |
| SOS DAE | ToS zakazuje masowego ekstrahowania bazy | umowa partnerska lub dane OSM |
| Ratuj z Sercem | brak otwartej licencji, `DBProxy.aspx` nieudokumentowany | pisemna zgoda |
| InfoRatunek | brak regulaminu i licencji, 16 rekordów | kontakt i zgoda |
| Pierwszy Ratownik | brak API i licencji | partnerstwo |
| Staying Alive | własna baza, tylko za zgodą | partnerstwo |
| aedmapa.pl, Ratujemy.com.pl | pochodne OSM bez własnego API | używać OSM/OpenAEDMap |

HTTP 200 i publiczny endpoint nie są zgodą licencyjną. Decyzja o odblokowaniu wymaga dokumentu, nie testu curl.

### 12.3 Atrybucja

Atrybucja jest generowana z rejestru, nie wpisywana ręcznie w UI. Wymagane miejsca:

| Miejsce | Format | Przykład |
| --- | --- | --- |
| stopka mapy | link do licencji i autorów | „Dane: © OpenStreetMap contributors (ODbL 1.0), Miasto Przemyśl (CC BY 4.0)” |
| panel szczegółów | `attribution` rekordu | „Źródło: OpenAEDMap, © OpenStreetMap contributors” |
| nagłówki API | `X-Data-Attribution` i `Link rel=license` | j.w. |
| `meta` JSON | `attributions[]` i `license` | j.w. |
| GeoJSON | `attribution` i `license` w kolekcji oraz `properties` | j.w. |
| CSV | wiersz komentarza `#` na początku | j.w. |
| feed dane.gov.pl | `license` i warunki zbioru | j.w. |
| zdjęcia | `photo_license` i `photo_attribution` | „fot. Miasto Przemyśl, CC BY 4.0” |

Brak atrybucji dla rekordu jest błędem eksportu, nie ostrzeżeniem.

### 12.4 ODbL i share-alike

Decyzja: **baza kanoniczna zawierająca dane OSM jest traktowana jako baza pochodna ODbL.** Publikujemy ją na ODbL 1.0 i udostępniamy pełny zrzut. Dane miejskie są przypisane do źródeł i mogą być dodatkowo eksportowane w osobnym zasobie, ale nie twierdzimy, że cały zbiór jest tylko CC BY.

Praktyka:

1. `aed-osm.csv` i `aed-osm.geojson` zawierają wyłącznie rekordy, których pierwotnym źródłem jest OSM. Licencja: ODbL 1.0.
2. `aed-local.csv` zawiera rekordy, których wszystkie obserwacje pochodzą ze źródeł lokalnych o kompatybilnej licencji (CC BY 4.0, CC0). Licencja: CC BY 4.0 lub CC0, zgodnie z najostrzejszą licencją w zbiorze.
3. `aed-all.csv` jest zrzutem bazy kanonicznej i ma licencję ODbL 1.0, z atrybucją wszystkich źródeł.
4. Mapa publiczna wyświetla oba zbiory i pokazuje atrybucję zbiorczą. Korzystanie z mapy nie zwalnia z ODbL przy tworzeniu własnej bazy.
5. Rekord, który ma jednocześnie obserwację OSM i lokalną, trafia do `aed-osm` i `aed-all`, ale nie do `aed-local`.
6. Nie mieszamy danych o niejasnej licencji z żadnym eksportem. Taki rekord zostaje w review.

Jeśli zespół wybierze prostszą strategię „wszystko ODbL”, dokumentacja i feed muszą to jawnie mówić. Nie wolno publikować jednego pliku z `license: CC-BY-4.0`, jeśli zawiera dane OSM.

### 12.5 Wykrywanie zmian regulaminu

1. Dla każdego źródła przechowujemy URL regulaminu i `terms_hash` (SHA-256 znormalizowanego tekstu).
2. Raz na 7 dni job pobiera dokument i porównuje hash.
3. Zmiana daje `license_alert(kind=terms_changed)` i `critical` w panelu.
4. Do decyzji człowieka źródło pozostaje w trybie `read_only`: nie pobieramy nowych danych, ale nie usuwamy starych.
5. Historia hashów jest w `audit_log`, żeby pokazać, kiedy zmiana nastąpiła.

### 12.6 Pola ograniczone i RODO

| Pole | Klasyfikacja | Publikacja |
| --- | --- | --- |
| `serial_number` | ograniczone | nie |
| kod dostępu, kod skrzynki | ograniczone | nie |
| telefon dyspozytora | ograniczone | nie |
| e-mail osoby fizycznej | dane osobowe | nie, tylko kontakt organizacyjny |
| imię i nazwisko opiekuna | dane osobowe | nie |
| współrzędne urządzenia | publiczne | tak, zgodnie z celem mapy |
| adres instytucji | publiczne | tak |
| zdjęcie twarzy | dane osobowe | nie bez zgody i zgłoszenia |

Zasady:

- pipeline normalizacji ma krok `redactPII`, który zamienia e-mail osoby fizycznej na `null` i zapisuje powód w `field_provenance`;
- zgłoszenia publiczne wymagają pola zgody z wersją regulaminu (`consent_version`) i informacją o celu;
- adres IP zgłoszenia jest przechowywany jako `ip_hash` przez 90 dni wyłącznie do walki ze spamem;
- żądanie usunięcia danych osobowych ma własny typ zgłoszenia `removal` i priorytet 24 h.

### 12.7 Bramka eksportu

Eksport (CSV, GeoJSON, feed) jest generowany tylko gdy:

1. wszystkie rekordy w zbiorze mają `license_id`, `attribution` i `source_url`;
2. żaden rekord nie zawiera pola z listy zabronionej;
3. żadne źródło w zbiorze nie ma otwartego `license_alert` blokującego eksport;
4. walidacja schematu CSV/GeoJSON przechodzi;
5. MD5 feedu jest liczony z dokładnie tych bajtów, które są serwowane;
6. XSD feedu przechodzi walidację;
7. `generated_at` i `dataDate` są nowsze niż 26 h.

Niespełnienie warunku daje `export.blocked` w logach, `503` na trasie eksportu i wpis w panelu. Nie publikujemy częściowego pliku bez oznaczenia `partial=true` w metadanych.

### 12.8 Zgodność z dane.gov.pl

| Wymóg portalu | Jak spełniamy | Test |
| --- | --- | --- |
| dane maszynowe, nie PDF/DOC | CSV, GeoJSON, JSON | walidacja typu i parsera |
| stabilny `extIdent` | `aed-pl` | test niezmienności |
| poprawny feed 1.13 | generator XML + XSD | walidacja XSD w CI |
| MD5 zgodny z bajtami | liczenie z bufora odpowiedzi | test zgodności |
| publiczny HTTPS | zasoby pod publicznym adresem | test w lokalnej instancji |
| deklaracja licencji | `license_id` i `attribution` | test obecności |
| aktualizacja | codzienny przebieg | test świeżości |
| brak danych osobowych | projekcja publiczna | test zabronionych pól |

### 12.9 Postępowanie przy naruszeniu

1. **Wstrzymaj eksport** (`allowed_for_export=0`) i unieważnij cache.
2. **Zachowaj dowody**: wersję projekcji, payload, hash, czas.
3. **Powiadom** admina, osobę prawną i właściciela źródła w ciągu 24 h.
4. **Usuń lub popraw** dane w ciągu 72 h, jeśli naruszenie dotyczy danych osobowych lub licencji.
5. **Opublikuj erratę** w metadanych zbioru, jeśli dane już trafiły do portalu.
6. **Zapisz w `audit_log`** decyzję, zakres i środki zaradcze.
7. **Dodaj test regresyjny**, który uniemożliwi powtórzenie.

## 13. Testy operacyjne

1. Symulowany `403` źródła tworzy alert AL1 po drugim przebiegu.
2. Pusty payload tworzy AL3 i nie usuwa rekordów.
3. Payload z 60% odrzuceń tworzy AL5 i blokuje eksport.
4. Zmiana `license_id` bez `admin` daje 403 i brak wpisu w bazie.
5. Zmiana hash regulaminu tworzy `license_alert` i `read_only`.
6. Eksport z rekordem bez atrybucji kończy się `export.blocked`.
7. Logi nie zawierają e-maili, telefonów ani `payload_json` (test skanujący).
8. `/api/health/ready` bez tokena wewnętrznego daje 404.
9. Feed z błędnym MD5 jest odrzucany przez lokalny harwester.
10. Alert `AL16` wyłącza publiczne API w ciągu jednego cyklu.

## 14. Zadania implementacyjne

| ID | Zadanie | Zależność |
| --- | --- | --- |
| O1 | Logger JSONL z `request_id` i `run_id` | ingest |
| O2 | Zapis `metric_snapshot` i eksport Prometheus | O1 |
| O3 | `/api/v1/health` i `/api/health/ready` | baza |
| O4 | Job detekcji anomalii (wolumen, współrzędne, schemat) | O2 |
| O5 | Katalog alertów i integracja kanałów | O2 |
| O6 | Rejestr licencji i bramka wejścia źródła | model kanoniczny |
| O7 | Job sprawdzania `terms_hash` | O6 |
| O8 | `redactPII` i testy pól ograniczonych | normalizacja |
| O9 | Bramka eksportu i walidacja feedu | gov-api |
| O10 | Runbooki i ćwiczenie incidentu | O5, O9 |
