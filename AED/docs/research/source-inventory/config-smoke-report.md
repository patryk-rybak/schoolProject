# Live smoke 69 konfiguracji źródeł AED

- Data: 2026-11-21T20:55:25.576Z
- Czas: 18.4 s · konfiguracje: 69
- Katalog konfiguracji: `backend/ingest/sources + backend/ingest/sources-excluded`
- Polecenie: `bun scripts/smoke-source-configs.ts --concurrency 4 --timeout-ms 20000`
- Pliki: 69 · załadowane: 69 · odrzucone przez loader: 0
- Rejestr: 12 aktywne · 57 wyłączone (testowane na żywo, poza rejestrem tabularnym)

Harness pobiera każdy URL na żywo, sprawdza HTTP, typ treści i parsuje odpowiedź parserem właściwym dla rodziny. Wynik `OK` oznacza, że źródło odpowiedziało, dało się sparsować, a wymagane pola i lokalizacja przeszły walidację konfiguracji. `ostrzeżenie` oznacza dryf lub częściowe odrzucenia, `błąd` brak rekordów albo niespełnione wymagania, `zablokowane` brak sekretu lub robots.txt, `manualne` źródło wymaga człowieka i nie ma automatycznego parsera.

## Podsumowanie

| Zakres | Razem | OK | Ostrzeżenia | Zablokowane | Błędy | Manualne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Wszystkie | 69 | 23 | 5 | 1 | 13 | 27 |
| OK | 23 | — | — | — | — | — |
| ostrzeżenie | 5 | — | — | — | — | — |
| zablokowane | 1 | — | — | — | — | — |
| błąd | 13 | — | — | — | — | — |
| manualne | 27 | — | — | — | — | — |

### Rodziny connectorów

| Rodzina | Razem | OK | Ostrzeżenia | Zablokowane | Błędy | Manualne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| file_static (CSV / GeoJSON) | 3 | 2 | 1 | 0 | 0 | 0 |
| google_my_maps_kml (KML) | 6 | 3 | 3 | 0 | 0 | 0 |
| html_list | 21 | 12 | 0 | 0 | 9 | 0 |
| html_table (HTML) | 10 | 5 | 1 | 0 | 4 | 0 |
| http_json (REST JSON) | 2 | 1 | 0 | 1 | 0 | 0 |
| manual (człowiek / OCR) | 26 | 0 | 0 | 0 | 0 | 26 |
| pdf_table (PDF z warstwą tekstową) | 1 | 0 | 0 | 0 | 0 | 1 |

## Wnioski

- Rejestr aktywny: 12 źródeł — 6 OK, 4 ostrzeżeń, 1 zablokowanych, 0 błędów, 1 manualnych.
- Poza rejestrem: 13 błędów w html_list (9), html_table (4). Te źródła są testowane na żywo, ale nie są aktywne w rejestrze tabularnym.
- Najczęstsze kody: `rejected_records` (12), `required_fields_missing` (9), `html_no_table` (3), `duplicate_ids` (2).
- Brak sekretu blokuje: `warszawa`. To bramka operacyjna, nie błąd parsera.
- 12 źródeł HTML wymaga poprawy selektora lub mapowania pól; lista jest w sekcjach rodzin poniżej.

## Kody ustaleń

| Kod | Liczba źródeł | Źródła |
| --- | ---: | --- |
| `terms_unconfirmed` | 30 | biskupiec, brzeznica, gora, kobierzyce, kosakowo, lubawa, lubien, lubin-gmina, lwowek, manowo, pila, polkowice i 18 więcej |
| `rejected_records` | 12 | belchatow, lodz, zielona-gora, biskupiec, brzeznica, gora, lubawa, lubien, lubin-gmina, powiat-krakowski, radlow, swidwin |
| `required_fields_missing` | 9 | biskupiec, brzeznica, gora, lubawa, lubien, lubin-gmina, powiat-krakowski, radlow, swidwin |
| `html_no_table` | 3 | bydgoszcz, gdansk, lomza |
| `content_type_mismatch` | 3 | lublin, nieporet, powiat-szamotulski |
| `duplicate_ids` | 2 | lodz, zielona-gora |
| `volume_drift` | 2 | lubawa, suszec |
| `invalid_coordinates` | 1 | marki |
| `network_error` | 1 | powiat-bochenski |
| `html_no_rows` | 1 | suszec |
| `missing_secret` | 1 | warszawa |
| `pdf_not_parsed` | 1 | czarne |

## Wyniki per rodzina

### file_static (CSV / GeoJSON)

Źródeł: 3. OK: 2, ostrzeżenia: 1, zablokowane: 0, błędy: 0, manualne: 0.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `krosno` | aktywne | 200 | 21/21 | name 100%, lat 100%, lon 100% | OK | — |
| `marki` | aktywne | 200 | 8/8 | name 100%, lat 100%, lon 100% | ostrzeżenie | invalid_coordinates |
| `openaedmap` | aktywne | 200 | 18303/18298 | name 100%, lat 100%, lon 100% | OK | — |

Ustalenia:

- `marki` (ostrzeżenie): `invalid_coordinates`: 1 rekordów ma brakujące lub niepoprawne współrzędne.

### google_my_maps_kml (KML)

Źródeł: 6. OK: 3, ostrzeżenia: 3, zablokowane: 0, błędy: 0, manualne: 0.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `belchatow` | aktywne | 200 | 32/32 | name 100%, lat 100%, lon 100% | ostrzeżenie | rejected_records |
| `lodz` | aktywne | 200 | 136/136 | name 100%, lat 100%, lon 100% | ostrzeżenie | duplicate_ids, rejected_records |
| `olsztyn` | aktywne | 200 | 43/43 | name 100%, lat 100%, lon 100% | OK | — |
| `pawlowice` | aktywne | 200 | 12/12 | name 100%, lat 100%, lon 100% | OK | — |
| `tczew` | aktywne | 200 | 13/13 | name 100%, lat 100%, lon 100% | OK | — |
| `zielona-gora` | aktywne | 200 | 165/165 | name 100%, lat 100%, lon 100% | ostrzeżenie | duplicate_ids, rejected_records |

Ustalenia:

- `belchatow` (ostrzeżenie): `rejected_records`: Odrzucono 1 z 32 rekordów. Próbka: #31: name=null
- `lodz` (ostrzeżenie): `duplicate_ids`: Wykryto 6 zduplikowanych source_record_id.; `rejected_records`: Odrzucono 7 z 136 rekordów. Próbka: #14: name=null
- `zielona-gora` (ostrzeżenie): `duplicate_ids`: Wykryto 5 zduplikowanych source_record_id.; `rejected_records`: Odrzucono 1 z 165 rekordów. Próbka: #100: name=null

### html_list

Źródeł: 21. OK: 12, ostrzeżenia: 0, zablokowane: 0, błędy: 9, manualne: 0.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `biskupiec` | wył. | 200 | 2/2 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `brzeznica` | wył. | 200 | 9/9 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `gora` | wył. | 200 | 17/17 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `kobierzyce` | wył. | 200 | 13/13 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `kosakowo` | wył. | 200 | 10/10 | name 100% | OK | terms_unconfirmed |
| `lubawa` | wył. | 200 | 1/6 | name 0% | błąd | required_fields_missing, volume_drift, rejected_records, terms_unconfirmed |
| `lubien` | wył. | 200 | 4/4 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `lubin-gmina` | wył. | 200 | 4/4 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `lwowek` | wył. | 200 | 10/10 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `manowo` | wył. | 200 | 8/8 | name 100%, lat 100%, lon 100% | OK | terms_unconfirmed |
| `pila` | wył. | 200 | 15/15 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `polkowice` | wył. | 200 | 21/21 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `powiat-krakowski` | wył. | 200 | 2/2 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `powiat-starogardzki` | wył. | 200 | 28/28 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `pruszcz-gdanski` | wył. | 200 | 15/15 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `przemet` | wył. | 200 | 21/21 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `radlow` | wył. | 200 | 8/8 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `strzegom` | wył. | 200 | 15/15 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `swidwin` | wył. | 200 | 6/6 | name 0% | błąd | required_fields_missing, rejected_records, terms_unconfirmed |
| `tarnow-opolski` | wył. | 200 | 10/10 | name 100%, lat 100%, lon 100% | OK | terms_unconfirmed |
| `torun` | wył. | 200 | 46/46 | name 100%, address_text 100% | OK | terms_unconfirmed |

Ustalenia:

- `biskupiec` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 2 z 2 rekordów. Próbka: #0: name=null
- `brzeznica` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 9 z 9 rekordów. Próbka: #0: name=null
- `gora` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 17 z 17 rekordów. Próbka: #0: name=null
- `lubawa` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `volume_drift`: Odczytano 1 rekordów, baseline 6 (delta 83.3%).; `rejected_records`: Odrzucono 1 z 1 rekordów. Próbka: #0: name=null
- `lubien` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 4 z 4 rekordów. Próbka: #0: name=null
- `lubin-gmina` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 4 z 4 rekordów. Próbka: #0: name=null
- `powiat-krakowski` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 2 z 2 rekordów. Próbka: #0: name=null
- `radlow` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 8 z 8 rekordów. Próbka: #0: name=null
- `swidwin` (błąd): `required_fields_missing`: Żaden rekord nie przeszedł walidacji wymaganych pól lub lokalizacji.; `rejected_records`: Odrzucono 6 z 6 rekordów. Próbka: #0: name=null

### html_table (HTML)

Źródeł: 10. OK: 5, ostrzeżenia: 1, zablokowane: 0, błędy: 4, manualne: 0.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `bydgoszcz` | wył. | 200 | 0/0 | name 0%, address_text 0% | błąd | html_no_table, terms_unconfirmed |
| `gdansk` | wył. | 200 | 0/0 | name 0%, address_text 0% | błąd | html_no_table, terms_unconfirmed |
| `kolbaskowo` | wył. | 200 | 15/15 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `krakow` | wył. | 200 | 20/20 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `lomza` | wył. | 200 | 0/0 | name 0%, address_text 0% | błąd | html_no_table, terms_unconfirmed |
| `powiat-bochenski` | wył. | — | 0/0 | name 0%, address_text 0% | błąd | network_error |
| `slawa` | wył. | 200 | 13/13 | name 100%, lat 100%, lon 100% | OK | terms_unconfirmed |
| `slupsk` | wył. | 200 | 25/25 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `smigiel` | wył. | 200 | 17/17 | name 100%, address_text 100% | OK | terms_unconfirmed |
| `suszec` | wył. | 200 | 26/5 | name 100%, lat 100%, lon 100% | ostrzeżenie | html_no_rows, volume_drift, terms_unconfirmed |

Ustalenia:

- `bydgoszcz` (błąd): `html_no_table`: brak tabeli w HTML
- `gdansk` (błąd): `html_no_table`: brak tabeli w HTML
- `lomza` (błąd): `html_no_table`: brak tabeli w HTML
- `powiat-bochenski` (błąd): `network_error`: unable to verify the first certificate
- `suszec` (ostrzeżenie): `html_no_rows`: tabela key-value bez wymaganych kluczy; `volume_drift`: Odczytano 26 rekordów, baseline 5 (delta 420.0%).

### http_json (REST JSON)

Źródeł: 2. OK: 1, ostrzeżenia: 0, zablokowane: 1, błędy: 0, manualne: 0.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `przemysl` | aktywne | 200 | 21/21 | name 100%, lat 100%, lon 100% | OK | — |
| `warszawa` | aktywne | — | 0/? | name 0%, lat 0%, lon 0% | zablokowane | missing_secret |

Ustalenia:

- `warszawa` (zablokowane): `missing_secret`: Brak zmiennej środowiskowej WARSZAWA_API_TOKEN.

### manual (człowiek / OCR)

Źródeł: 26. OK: 0, ostrzeżenia: 0, zablokowane: 0, błędy: 0, manualne: 26.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `barlinek` | wył. | 200 | — | — | manualne | — |
| `budzow` | wył. | 200 | — | — | manualne | — |
| `czaplinek` | wył. | 200 | — | — | manualne | — |
| `dopiewo` | wył. | 200 | — | — | manualne | — |
| `dziadowa-kloda` | wył. | 200 | — | — | manualne | — |
| `gorzyce` | wył. | 200 | — | — | manualne | — |
| `imielin` | wył. | 200 | — | — | manualne | — |
| `jordanow` | wył. | 200 | — | — | manualne | — |
| `kcynia` | wył. | 200 | — | — | manualne | — |
| `koszecin` | wył. | 200 | — | — | manualne | — |
| `kozmin-wielkopolski` | wył. | 200 | — | — | manualne | — |
| `lublin` | wył. | 200 | — | — | manualne | content_type_mismatch |
| `nieporet` | wył. | 200 | — | — | manualne | content_type_mismatch |
| `nowa-sol` | wył. | 200 | — | — | manualne | — |
| `nowa-wies-leborska` | wył. | 200 | — | — | manualne | — |
| `ostroda` | wył. | 200 | — | — | manualne | — |
| `polczyn-zdroj` | wył. | 200 | — | — | manualne | — |
| `powiat-szamotulski` | wył. | 200 | — | — | manualne | content_type_mismatch |
| `rzekun` | wył. | 200 | — | — | manualne | — |
| `suchy-las` | wył. | 200 | — | — | manualne | — |
| `swidnica-gmina` | wył. | 200 | — | — | manualne | — |
| `szemud` | wył. | 200 | — | — | manualne | — |
| `umwl-instytucje-kultury` | wył. | 200 | — | — | manualne | — |
| `wierzchoslawice` | wył. | 200 | — | — | manualne | — |
| `zukowo` | wył. | 200 | — | — | manualne | — |
| `zuromin` | wył. | 200 | — | — | manualne | — |

Ustalenia:

- `barlinek` (manualne): brak szczegółów
- `budzow` (manualne): brak szczegółów
- `czaplinek` (manualne): brak szczegółów
- `dopiewo` (manualne): brak szczegółów
- `dziadowa-kloda` (manualne): brak szczegółów
- `gorzyce` (manualne): brak szczegółów
- `imielin` (manualne): brak szczegółów
- `jordanow` (manualne): brak szczegółów
- `kcynia` (manualne): brak szczegółów
- `koszecin` (manualne): brak szczegółów
- `kozmin-wielkopolski` (manualne): brak szczegółów
- `lublin` (manualne): brak szczegółów
- `nieporet` (manualne): brak szczegółów
- `nowa-sol` (manualne): brak szczegółów
- `nowa-wies-leborska` (manualne): brak szczegółów
- `ostroda` (manualne): brak szczegółów
- `polczyn-zdroj` (manualne): brak szczegółów
- `powiat-szamotulski` (manualne): brak szczegółów
- `rzekun` (manualne): brak szczegółów
- `suchy-las` (manualne): brak szczegółów
- `swidnica-gmina` (manualne): brak szczegółów
- `szemud` (manualne): brak szczegółów
- `umwl-instytucje-kultury` (manualne): brak szczegółów
- `wierzchoslawice` (manualne): brak szczegółów
- `zukowo` (manualne): brak szczegółów
- `zuromin` (manualne): brak szczegółów

### pdf_table (PDF z warstwą tekstową)

Źródeł: 1. OK: 0, ostrzeżenia: 0, zablokowane: 0, błędy: 0, manualne: 1.

| Źródło | Rejestr | HTTP | Rekordy | Pokrycie wymaganych | Status | Kody |
| --- | :---: | ---: | ---: | --- | --- | --- |
| `czarne` | aktywne | 200 | — | — | manualne | pdf_not_parsed |

Ustalenia:

- `czarne` (manualne): brak szczegółów

## Metoda i ograniczenia

1. Pobranie: metoda i nagłówki z konfiguracji, timeout i retry z `fetch`, maksymalnie 3 próby.
2. `manual`: sprawdzana jest tylko osiągalność dokumentu i sygnatura PDF/ZIP; brak transkrypcji nie jest błędem konfiguracji.
3. `google_my_maps_kml`: harness szuka `mid=` na stronie i pobiera KML z `https://www.google.com/maps/d/kml`, tak jak docelowy connector.
4. HTML: obsługiwane są selektory `tag`, `.klasa`, `#id`, `[atrybut]`, potomkowie i listy po przecinku; dla `html_table` dodatkowo `header_row`, `columns`, `require_headers`, `orientation=key_value`. To smoke test, nie pełny parser DOM.
5. Walidacja mapowania obejmuje wymagane pola, bbox, `require_location` i duplikaty `source_record_id`; nie jest to pełny dry-run ani shadow.
6. Domyślnie respektowany jest `robots.txt` dla HTML i KML. Wyłączenie: `--ignore-robots`.
7. Raport nie zawiera treści odpowiedzi ani sekretów; tylko statusy, liczniki i kody błędów.
