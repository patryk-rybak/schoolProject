# Specyfikacja walidacji, normalizacji i jakości danych AED

**Operacjonalizacja wspólnego modelu danych**

| | |
| --- | --- |
| Data | 2026-11-21 |
| Autor | lane `lifecycle-cleansing` |
| Wersja | 1.0 (draft do review) |
| Status | dokument wykonawczy; implementacja jeszcze nie istnieje |
| Dokument nadrzędny | [`aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md), wersja 1.0 |
| Powiązane moduły | [`../../backend/normalize/`](../../backend/normalize/README.md), [`../../backend/ingest/`](../../backend/ingest/README.md), [`../../backend/store/`](../../backend/store/README.md), [`../../backend/gov-api/`](../../backend/gov-api/README.md) |
| Zakres | reguły pól, cykl życia, pewność, kwarantanna, review, raporty jakości |

> **Zasada nadrzędna:** ten dokument nie zmienia modelu kanonicznego ani słowników
> z dokumentu nadrzędnego. Ustala, **jak** wypełnić ten model, **kiedy** rekord
> może być publiczny i **jak** raportować jakość. W razie sprzeczności wygrywa
> dokument nadrzędny; sprzeczność należy zgłosić do review.

---

## 0. TL;DR

1. **Walidacja jest wieloetapowa i deterministyczna.** Kolejność: dekodowanie,
   parsowanie strukturalne, normalizacja, walidacja leksykalna, semantyczna,
   przestrzenna, cross-field, deduplikacja, pewność, brama publikacji.
2. **Każde odstępstwo ma kod, wagę i decyzję.** Cztery decyzje: `accept`,
   `accept_with_warning`, `quarantine`, `reject`. Kwarantanna nie usuwa danych.
3. **Cztery niezależne wymiary stanu:** obecność w źródle, stan urządzenia,
   status weryfikacji, świeżość. Mieszanie ich w jednym polu jest błędem.
4. **Brak danych to `null`/`unknown`, nigdy `false`.** Nie zgadujemy statusu,
   dostępności, operatora ani piętra.
5. **Pewność jest liczona, nie importowana.** Wzór z §11.2 dokumentu nadrzędnego
   zostaje rozbity na komponenty z jawnymi funkcjami i rodzinami dowodów.
6. **OSM, OpenAEDMap, aedmapa, Ratujemy i warstwa OSM w Geoportalu to jedna
   rodzina dowodowa.** Nie wolno ich liczyć jako niezależne potwierdzenia.
   Mirror Przemyśla na dane.gov.pl to ta sama rodzina co Przemyśl.
7. **Usunięcie to tombstone, nie `DELETE`.** `removed` wymaga dowodu albo
   braku we wszystkich pełnych snapshotach przez 3 przebiegi i 90 dni.
8. **Kwarantanna ma kolejkę review, SLA i raport.** Bez tego jakość nie jest
   mierzalna, a błędy wracają przy każdym imporcie.

---

## 1. Zakres, odbiorcy i relacja do modelu kanonicznego

### 1.1 Co ten dokument definiuje

- reguły walidacji i normalizacji **każdego pola kanonicznego** z §7 dokumentu
  nadrzędnego,
- reguły parserów i adapterów dla znanych źródeł (OSM, OpenAEDMap, Przemyśl,
  Krosno, Marki, Warszawa, KML/HTML, rejestry),
- cykl życia rekordu: obecność, świeżość, `out_of_service`, `removed`,
  wskrzeszenie, tombstone,
- wzór i komponenty pewności oraz uzgadnianie wielu źródeł,
- model kwarantanny, kolejki review, akcji recenzenta i raportów jakości,
- kontrakt tabel i artefaktów potrzebnych do wdrożenia.

### 1.2 Czego ten dokument nie definiuje

- schematu encji `source`, `source_record`, `aed`, `facility`, `observation`
  (to dokument nadrzędny, §6 i §13),
- konkretnych connectorów HTTP i harmonogramów (to `backend/ingest/`),
- kontraktu feedu harvestera 1.13 (to `backend/gov-api/`),
- UI mapy i formularzy (to `frontend/`).

### 1.3 Odbiorcy

| Odbiorca | Użycie |
| --- | --- |
| autor connectora | jakie pola i formaty musi dostarczyć, jakie błędy może zwrócić |
| autor normalizatora | dokładne reguły, kolejność i kody błędów |
| autor store | jakie tabele i indeksy dodać, jakie niezmienniki utrzymać |
| moderator / recenzent | co trafia do kolejki, jak podejmować decyzje, jakie są SLA |
| właściciel produktu | jakie progi jakości blokują publikację i jak mierzyć postęp |
| audytor / prawnik | skąd wiemy, że rekord jest publiczny, jaki jest dowód usunięcia |

### 1.4 Zasady projektowe

1. **Raw jest nienaruszalny.** `source_record.payload_json` przechowuje dokładne
   bajty źródła. Normalizacja nigdy nie nadpisuje raw.
2. **Normalizacja jest funkcją czystą.** Ten sam input i ta sama wersja reguł
   dają ten sam output. Losowość, czas bieżący i kolejność wierszy nie mogą
   wpływać na wynik poza jawnie zadeklarowanymi polami.
3. **Walidacja nie naprawia po cichu.** Każda zmiana wartości przez normalizator
   zostawia wpis w `field_provenance` i, jeśli zmienia znaczenie, issue.
4. **Decyzja jest per rekord, issue są per reguła.** Jeden rekord może mieć
   wiele issue; decyzja wynika z najwyższej wagi.
5. **Kwarantanna jest odwracalna.** Rekord w kwarantannie zostaje w bazie,
   ma zachowany raw, nie jest publikowany i nie jest usuwany.
6. **Nie ma cichego scalania.** Automatyczne scalenie tylko przy wyniku
   ≥ 0,80 i braku konfliktu tożsamości urządzenia. Wątpliwości idą do review.
7. **Bezpieczeństwo publiczne przed kompletnością.** Lepiej pokazać mniej
   punktów z uczciwym „unknown” niż zgadywać „active” lub „24/7”.
8. **Wszystko jest wersjonowane.** `normalization_version`, `rule_version`,
   `confidence_version`, `schema_version`. Zmiana wersji pozwala przeliczyć
   bazę bez zmiany identyfikatorów.

---

## 2. Model oceny rekordu

### 2.1 Pipeline

```text
bytes źródła
  │
  ├─ 1. decode        UTF-8, BOM, CRLF, escapowanie, base64, kompresja
  ├─ 2. parse         CSV/JSON/GeoJSON/GML/KML/XML/HTML -> rekord surowy
  ├─ 3. map           adapter źródła -> kandydat pól kanonicznych + proweniencja
  ├─ 4. normalize     tekst, liczby, daty, adresy, telefony, URL, geometria
  ├─ 5. validate      reguły leksykalne, zakresy, słowniki, cross-field
  ├─ 6. geo/address   bbox Polski, axis order, obszar źródła, TERYT, geokodowanie
  ├─ 7. dedup         exact id -> spatial candidates -> scoring -> merge/review
  ├─ 8. confidence    komponenty, konflikty, wersja
  ├─ 9. lifecycle     obecność, świeżość, status, tombstone
  └─ 10. gate         publikacja / kwarantanna / odrzucenie / archiwum
```

Kroki 1-4 działają na jednym rekordzie źródłowym i nie wymagają sieci.
Kroki 5-6 mogą wymagać tabel referencyjnych (TERYT, PRG, ULIC) ładowanych
lokalnie. Kroki 7-9 wymagają kontekstu całego przebiegu i bazy. Krok 10 jest
ostatni i zapisuje decyzję.

**Ważne:** deduplikacja działa **po** walidacji podstawowej, ale **przed**
bramą publikacji. Dwa poprawne rekordy mogą zostać scalone; dwa błędne nie mogą
zamaskować błędu przez scalenie.

### 2.2 Decyzje

| Decyzja | Znaczenie | Publikacja | Dalsze kroki |
| --- | --- | --- | --- |
| `accept` | brak issue albo tylko `info` | tak | zapis, indeks, eksport |
| `accept_with_warning` | issue `warning`, rekord użyteczny | tak, z flagą jakości | zapis, raport, opcjonalny review |
| `quarantine` | issue `quarantine`, rekord niepewny | nie | kolejka review, zachowany raw |
| `reject` | issue `fatal`, rekord nie do uratowania bez zmiany źródła | nie | archived, raport, brak review domyślnie |

Reguła agregacji:

```text
if any(fatal)            -> reject
else if any(quarantine)  -> quarantine
else if any(warning)     -> accept_with_warning
else                     -> accept
```

`info` nigdy nie zmienia decyzji. `fatal` wygrywa z `quarantine`, bo dalsza
praca nad rekordem bez poprawy źródła jest bezcelowa.

### 2.3 Wagi issue

| Waga | Znaczenie | Przykłady |
| --- | --- | --- |
| `fatal` | rekordu nie da się opublikować i nie ma czego recenzować | `NaN`, poza Polską, brak licencji i brak zgody, duplikat klucza z różną treścią |
| `quarantine` | rekord może być poprawny, ale wymaga człowieka lub dodatkowego dowodu | niejednoznaczna kolejność osi, punkt daleko od obszaru źródła, konflikt statusu, duplikat kandydat, przyszła data |
| `warning` | rekord publikowalny, ale jakość pola jest ograniczona | niepoprawny kod pocztowy, nieznany typ obiektu, brak daty weryfikacji, nieparsowalne godziny |
| `info` | normalizacja zastosowana, brak wpływu na jakość | trim nagłówka, zmiana `12345` na `12-345`, usunięcie parametru trackingowego |

### 2.4 Rejestr reguł

Każda reguła ma stabilny identyfikator:

```text
{area}.{field}.{rule}
```

Przykłady: `geo.lat.out_of_poland`, `text.name.empty`, `addr.postcode.format`,
`access.opening_hours.parse`, `device.serial.redacted`, `lifecycle.run.suspicious`.

Kontrakt reguły:

```ts
type Severity = "fatal" | "quarantine" | "warning" | "info";
type Decision = "accept" | "accept_with_warning" | "quarantine" | "reject";

interface Rule {
  id: string;                 // stabilny, snake_case z kropkami
  version: number;            // zmiana semantyki = +1
  severity: Severity;
  appliesTo: string[];        // pola kanoniczne
  evaluate(ctx: RecordContext): Issue | Issue[];
  message: string;            // po polsku, bez danych osobowych
  remediation?: string;       // co ma zrobić recenzent lub adapter
}
```

`rule_version` jest zapisywany razem z issue. Zmiana wersji reguły nie zmienia
`aed_id`, ale uruchamia re-normalizację i przeliczenie decyzji.

### 2.5 Idempotencja i deterministyczność

- Klucz rekordu: `(source_id, source_record_id)`. Ponowny import tego samego
  rekordu nie tworzy nowego `aed`.
- `aed_id = UUIDv5(namespace, primary_source_record_id)`. Nie zależy od
  kolejności importu ani od pól opisowych.
- `source_payload_sha256` liczony z bajtów payloadu. Jeśli checksum się nie
  zgadza z zapisem, przebieg jest `partial`.
- Deduplikacja iteruje po posortowanych `(source_id, source_record_id)`, aby
  wynik nie zależał od kolejności wierszy.
- Czas bieżący wchodzi wyłącznie przez jawne `evaluated_at` przekazane do
  funkcji. Testy mogą podstawić zegar.
- Re-normalizacja z tą samą wersją reguł musi dać identyczny wynik. Jeśli nie,
  to błąd implementacji, nie „niestabilne dane”.

---

## 3. Walidacja i normalizacja pól

### 3.1 Reguły wspólne dla tekstu

Stosuj w podanej kolejności:

1. odrzuć `null`, `undefined`, `NaN`; zamień na `null`,
2. usuń BOM i znaki kontrolne poza `\n` i `\t`,
3. Unicode NFKC,
4. zamień NBSP i wąskie spacje na zwykłą spację,
5. usuń znaczniki HTML i encje (`<b>`, `&nbsp;`), jeśli pole nie jest jawnie
   HTML (dotyczy `description`; i tak czyścimy do tekstu),
6. zwiń ciągi białych znaków do jednej spacji,
7. trim,
8. jeśli wynik jest w słowniku placeholderów, zamień na `null` i zgłoś
   `text.value.placeholder`.

Słownik placeholderów (case-insensitive, po trim): `-`, `--`, `bd.`, `b.d.`,
`brak`, `brak danych`, `nie dotyczy`, `n/d`, `nd`, `null`, `none`, `nan`,
`unknown`, `nieznany`, `test`, `xxx`, `?`.

**Nie usuwaj polskich znaków.** `Łódź` i `Lodz` to różne wartości do wyświetlenia;
porównania używają formy złożonej (sekcja 3.1.1), ale zapis zostaje z diakrytykami.

#### 3.1.1 Klucz porównawczy tekstu

Do dopasowania (nie do zapisu) użyj `compare_key`:

```text
NFKD -> usuń znaki łączące (diakrytyki) -> lower ->
zamień ł->l, ø->o, đ->d, ß->ss -> usuń interpunkcję -> zwiń spacje
```

Przykład: `"Ul. Józefa Piłsudskiego"` i `"ul Jozefa Pilsudskiego"` mają ten sam
`compare_key`. Zapisywana wartość pozostaje pierwsza lub wybrana przez
proweniencję.

#### 3.1.2 Długości i limity

| Typ pola | Limit | Przekroczenie |
| --- | ---: | --- |
| nazwa, miejscowość, ulica | 200 znaków | obetnij do 200 + `warning` `text.value.truncated`; raw zostaje |
| opis, wejście, uwagi | 1 000 znaków | obetnij + `warning` |
| e-mail | 254 | `null` + `warning` |
| telefon | 32 wejściowe | normalizuj; po normalizacji E.164 |
| URL | 2 048 | `null` + `warning` |
| identyfikator źródłowy | 128 | `quarantine` `id.source_record.too_long` |

Obcinanie nigdy nie dotyczy `source_record_id`, `payload_json`, `serial_number`
(ten jest redagowany, nie obcinany) ani pól używanych do dopasowania.

### 3.2 Identyfikacja i źródło

| Pole | Wymagane | Reguła normalizacji | Walidacja | Kod i waga |
| --- | --- | --- | --- | --- |
| `source` | tak | lower, `[a-z0-9_]{2,32}` | musi istnieć w `source` i mieć `is_machine_readable` lub `manual` | `id.source.unknown` / `fatal` |
| `source_record_id` | tak | trim, zwijanie spacji, bez zmiany case | niepusty, ≤128, stabilny w snapshocie | `id.source_record.missing` / `fatal`; `id.source_record.too_long` / `quarantine` |
| `dataset_id` | nie | trim | jeśli jest, musi należeć do źródła | `id.dataset.unknown` / `warning` |
| `aed_id` | tak | `UUIDv5(NS_AED, primary_source_record_id)` | nie importuj z payloadu | `id.aed.mismatch` / `fatal` (payload próbuje nadpisać) |
| `public_code` | tak | `PL-AED-{woj:02d}-{base32(uuid)[0:8]}` | unikalny; wielkie litery | `id.public_code.collision` / `quarantine` |
| `ext_ident` | tak | `aed-` + 32 hex z UUIDv5 | ≤36 znaków, unikalny | `id.ext_ident.invalid` / `fatal` |
| `source_url` | nie | https, usuń `utm_*`, `fbclid`, `gclid` | host != localhost, nie `http:` | `url.source.insecure` / `warning` |
| `license_id` | tak | mapowanie z rejestru źródeł, nie z rekordu | musi być w słowniku licencji | `license.missing` / `fatal` dla publicznego eksportu; `warning` dla internal-only |
| `attribution` | tak | generowany z `source.attribution` | niepusty dla każdej publikowanej licencji | `license.attribution_missing` / `fatal` |

**Nadrzędność rejestru źródeł.** `license_id`, `attribution` i `source_url`
podstawy pochodzą z tabeli `source`. Jeśli rekord źródłowy deklaruje inną
licencję, traktuj to jako `license.conflict` / `quarantine` i nie publikuj do
czasu decyzji. Przykład: Przemyśl ma CC BY 4.0, a mirror na dane.gov.pl CC0 1.0;
oba są poprawne dla swoich rekordów, ale nie wolno mieszać ich w jednym
rekordzie.

**Identyfikatory źródłowe per adapter:**

| Źródło | Format `source_record_id` | Uwagi |
| --- | --- | --- |
| OSM | `node/{id}`, `way/{id}`, `relation/{id}` | `way`/`relation` z `emergency=defibrillator` nie są w OpenAEDMap; obsłuż osobno |
| OpenAEDMap | `openaedmap:{osm_type}/{osm_id}` | `properties["@osm_type"]` + `properties["@osm_id"]`; nie używaj samego `id` |
| Przemyśl | `przemysl:{resource_id}:{row_id}` | `row_id` = `id` z SOD; nie numer wiersza CSV |
| Krosno | `krosno:{Numer Id}` | trim nagłówka, `Numer Id` może mieć wiodącą spację |
| Marki | `marki:{Numer Id}` | po dwustopniowym parsowaniu CSV |
| Warszawa | `warszawa:{defibrillator_id}` | `properties.defibrillator_id` |
| KML | `{source_id}:kml:{hash(name+lon+lat)}` | KML nie ma stabilnego ID; hash z 3 pól |
| rejestry | `{source_id}:{lp}` | `candidate`; nie twórz `aed` bez potwierdzenia |

**Duplikat klucza w jednym snapshocie:**

- identyczny `payload_sha256`: `id.source_record.duplicate_identical` / `warning`,
  zapisz jeden `source_record`, policz oba wiersze w raporcie,
- różny payload: `id.source_record.duplicate_conflict` / `quarantine` dla obu,
  nie wybieraj zwycięzcy automatycznie.

### 3.3 Lokalizacja i geometria

| Pole | Wymagane | Reguła | Kod i waga |
| --- | --- | --- | --- |
| `lat` | warunkowo | liczba skończona, 7 miejsc, WGS84; wymagane dla `point/geocoded` | `geo.lat.invalid` / `fatal` |
| `lon` | warunkowo | liczba skończona, 7 miejsc, WGS84; wymagane dla `point/geocoded` | `geo.lon.invalid` / `fatal` |
| `location_status` | tak | `point|geocoded|address_only|unresolved|conflict` | `geo.location.status` / `warning` |
| `country_code` | tak | zawsze `PL`; inne = odrzuć z tego zbioru | `geo.country.not_pl` / `fatal` |
| `coord_precision_m` | nie | tylko z jawnych wartości lub tabeli źródła | `geo.precision.invalid` / `warning` |
| `geom_source` | warunkowo | `source | geocode | registry | survey | derived | none` | `geo.geom_source.invalid` / `warning` |
| `voivodeship` | nie | nazwa urzędowa, title case | `geo.region.unknown` / `warning` |
| `county` | nie | nazwa urzędowa | j.w. |
| `commune` | nie | nazwa urzędowa | j.w. |
| `city` | nie | nazwa miejscowości, bez „gm.” i „m.” | `geo.city.normalized` / `info` |
| `district` | nie | dzielnica/osiedle | `warning` tylko przy konflikcie z TERYT |
| `teryt_*`, `simc`, `ulic` | nie | patrz 3.4 | patrz 3.4 |

#### 3.3.1 Zakres Polski

Bounding box z dokumentu nadrzędnego:

```text
lat: 49.00 .. 54.90
lon: 14.10 .. 24.20
```

Walidacja:

1. `lat`/`lon` muszą być skończone i różne od `0`, `0` (`geo.coord.null_island` / `fatal`).
2. Poza bbox: `geo.out_of_poland` / `fatal`, chyba że źródło jawnie obejmuje
   punkt graniczny i rekord ma `country_code != PL` (wtedy i tak odpada).
3. Bbox obejmuje morze i skrawki sąsiednich państw. Test point-in-polygon
   (granica PRG) jest **ostrzeżeniem**, nie odrzuceniem:
   `geo.outside_polygon` / `warning`. Punkt na morzu może być poprawną platformą
   lub literówką; decyduje recenzent.
4. Współrzędne całkowite bez części dziesiętnej (np. `52`, `21`) mają
   `coord_precision_m >= 1000` i `warning` `geo.coord.low_precision`.

#### 3.3.2 Kolejność osi

Dla Polski zbiory wartości `lat` (49,00-54,90) i `lon` (14,10-24,20) są
rozłączne, więc kolejność da się wykryć deterministycznie:

```text
(a, b) gdzie a = pierwsza, b = druga wartość pary

if (49 <= a <= 54.9) and (14.1 <= b <= 24.2):   # (lat, lon)
    lat, lon = a, b
elif (14.1 <= a <= 24.2) and (49 <= b <= 54.9): # (lon, lat) -> zamiana
    lat, lon = b, a
    issue: geo.coord.swapped_axes / warning (albo quarantine, jeśli źródło
           deklarowało odwrotną kolejność)
elif (49 <= a <= 54.9) and (49 <= b <= 54.9):
    issue: geo.coord.ambiguous_axes / quarantine
elif (14.1 <= a <= 24.2) and (14.1 <= b <= 24.2):
    issue: geo.coord.ambiguous_axes / quarantine
else:
    issue: geo.out_of_poland / fatal
```

Zasady dodatkowe:

- **Deklaracja źródła nie jest święta.** Jeśli nagłówek CSV mówi `lon, lat`,
  ale wartości są w kolejności `lat, lon`, wygrywa zakres, a rekord dostaje
  `geo.coord.declaration_conflict` / `warning` (lub `quarantine`, jeśli
  zamiana zmienia gminę).
- **Marki `Numer Id = 7`:** para `21.7203, 49.7188` przechodzi test zakresu
  jako poprawna para `(lon, lat)`, ale leży ~350 km od Marek. Nie wystarczy
  test bbox. Potrzebny test obszaru źródła (3.3.3). Wynik:
  `geo.outside_source_area` / `quarantine`, nie `reject`.
- **Przemyśl CSV:** `geometry` to JSON string z kluczami `lat` i `long`, a nie
  tablica GeoJSON. Adapter musi czytać klucze, nie pozycję. Jeśli dostanie
  `{"lat": "...", "long": "..."}`, użyj wartości wprost; jeśli `{"lat": ...,
  "lon": ...}` również. Jeśli klucze są pomylone, wykryje to test zakresu.
- **Zagnieżdżone tablice:** `[[lon, lat]]` spłaszcz do `[lon, lat]`; jeśli
  po spłaszczeniu jest więcej niż 2 liczby, `geo.coord.unexpected_shape` /
  `quarantine`.
- **GML bez `srsName`:** adapter deklaruje `lat lon` (tak robi Przemyśl).
  Nie zgaduj z nazwy osi; stosuj test zakresu.
- **KML:** zawsze `lon,lat,alt`; ignoruj `alt` (zwykle `0`), zapisz
  `coord_precision_m = 15` tylko jeśli źródło ma geometrię punktową; dla list
  adresowych bez geometrii nie twórz punktu z centrum miejscowości. Wynik
  dopasowany tylko do miejscowości ustawia `location_status=address_only`,
  `geom_source=none` i nie jest publikowany na mapie. Wyjątek wymaga jawnej
  decyzji recenzenta i `coord_precision_m=1000`.

#### 3.3.3 Obszar źródła

Każde źródło ma `coverage_teryt` (gmina, powiat, województwo) lub jawny zasięg
„cała Polska”. Test:

```text
d = distance_haversine(point, centroid(declared_area))
if declared_area is gmina and d > 30 km:  geo.outside_source_area / quarantine
if declared_area is powiat and d > 50 km: geo.outside_source_area / quarantine
if declared_area is wojewodztwo and d > 150 km: geo.outside_source_area / quarantine
if declared_area is PL: skip
```

Dla źródeł ogólnokrajowych (OSM, OpenAEDMap) test nie ma zastosowania, ale
punkt na morzu albo poza polygonem nadal dostaje `warning`.

**Wyjątek:** źródło może publikować punkt poza swoim obszarem (np. gmina
kupuje AED dla szkoły w sąsiedniej gminie). Dlatego wynik jest `quarantine`,
nie `reject`; recenzent może zaakceptować z uzasadnieniem.

#### 3.3.4 Precyzja i geokodowanie

- Nie wymyślaj precyzji. Jeśli źródło jej nie podaje, `null`.
- Geokodowanie adresu dozwolone tylko wtedy, gdy:
  1. brak geometrii w źródle,
  2. istnieje co najmniej miejscowość + ulica lub pełny adres,
  3. wynik geokodera ma `confidence >= 0.8` i mieści się w Polsce,
  4. zapiszesz `geom_source=geocode`, `geocoder`, `geocoded_at`, `coord_precision_m`.
- Precyzja domyślna geokodowania: ulica `200 m`, budynek `50 m`, miejscowość
  `1000 m`. Nie ustawiaj `15 m` bez pomiaru.
- Punkt z geokodera nigdy nie dostaje `verification_status=confirmed` ani
  `probable` z tego powodu. To tylko lokalizacja, nie potwierdzenie urządzenia.
- `location_status` rozróżnia `point`, `geocoded`, `address_only`,
  `unresolved` i `conflict`. Rekord z adresem i bez punktu jest
  `address_only`, a nie `reject`. Rekord bez adresu i punktu jest `unresolved`
  z `geo.location.missing` / `quarantine`.
- `geocoded` wymaga confidence >= 0.8 i precyzji 50 m (budynek) lub 200 m
  (ulica). Dopasowanie do miejscowości daje `address_only` i nie jest
  publikowane jako punkt AED.
- `address_only`, `unresolved` i `conflict` nie trafiają do GeoJSON ani na
  mapę. Mogą być w panelu i w wewnętrznym CSV.

#### 3.3.5 Odległości i konflikty

- `distance <= 5 m` i różne `serial_number`/`label` -> **nie scalaj urządzeń**;
  wiele `aed` pod jednym `facility`.
- `distance <= 25 m` i zgodne adresy -> kandydat do scalenia.
- `distance > 100 m` między dwoma źródłami o tierze ≥ `official_local` ->
  `conflict.location.far` / `quarantine` dla obu obserwacji w kontekście
  kanonicznym; rekordy zostają, konflikt idzie do review.
- `distance > 1 km` między źródłami deklarującymi to samo urządzenie ->
  `conflict.location.implausible` / `quarantine`; prawdopodobnie dwa urządzenia
  albo błąd geokodowania.

### 3.4 Adres i TERYT

| Pole | Reguła normalizacji | Walidacja | Kod i waga |
| --- | --- | --- | --- |
| `voivodeship` | tytułami, urzędowa nazwa | mapa 16 województw | `addr.voivodeship.unknown` / `warning` |
| `county` | tytułami, usuń `powiat ` tylko do porównania | mapa TERYT | `addr.county.unknown` / `warning` |
| `commune` | tytułami, usuń `gm. `, `m. ` do porównania | mapa TERYT | `addr.commune.unknown` / `warning` |
| `city` | tytułami, usuń `gm.`, `m.`, `os.` | niepuste, ≤200 | `addr.city.normalized` / `info` |
| `district` | tytułami | ≤200 | `addr.district.normalized` / `info` |
| `street` | prefiks kanoniczny, reszta bez zmian gramatycznych | ≤200, nie placeholder | `addr.street.invalid` / `warning` |
| `house_number` | uppercase, usuń spację między numerem i literą | regex niżej | `addr.house_number.invalid` / `warning` |
| `postcode` | `XX-XXX` | regex, zakres | `addr.postcode.format` / `warning` |
| `address_text` | złóż z pól, nie nadpisuj źródła | ≤500 | `addr.text.composed` / `info` |
| `teryt_voivodeship` | 2 cyfry | istnieje, prefiks zgodny | `addr.teryt.invalid` / `warning` |
| `teryt_county` | 4 cyfry | prefiks = województwo | `addr.teryt.inconsistent` / `warning` |
| `teryt_commune` | 7 cyfr | prefiks = powiat | `addr.teryt.inconsistent` / `warning` |
| `simc` | 7 cyfr | istnieje w SIMC | `addr.simc.unknown` / `warning` |
| `ulic` | 7 cyfr | istnieje w ULIC | `addr.ulic.unknown` / `warning` |

#### 3.4.1 Ulica

Prefiksy kanoniczne:

| Wejście | Wyjście |
| --- | --- |
| `ul`, `ul.`, `ulica`, `ULICA` | `ul.` |
| `al`, `al.`, `aleja`, `aleje`, `ALEJA` | `al.` |
| `pl`, `pl.`, `plac`, `PLAC` | `pl.` |
| `os`, `os.`, `osiedle` | `os.` |
| `rondo`, `r.` | `rondo` |
| `skwer`, `skw.` | `skwer` |
| `bulwar`, `bulw.` | `bulwar` |

Nie poprawiaj przypadka (`Józefa Piłsudskiego` vs `Józef Piłsudski`). Do
dopasowania używaj `compare_key` bez prefiksu i bez imion patronów, ale zapis
zostaw źródłowy. Jeśli ulica jest tylko nazwiskiem bez prefiksu, nie dodawaj
`ul.` automatycznie, bo to zmienia znaczenie.

#### 3.4.2 Numer domu

Regex:

```text
^\d{1,5}[A-Z]?([/-]\d{1,4}[A-Z]?)?$
```

Normalizacja:

- `12 a` -> `12A`,
- `12A/3` -> `12A/3`,
- `12-14` -> `12-14`,
- `12/14/16` -> `warning` i zostaw bez zmian (nietypowy zakres),
- `""`, `-`, `b.d.`, `brak` -> `null`,
- `12 lok. 3` -> `warning`, `null` dla `house_number`, całość do `address_text`.

Nie usuwaj wiodącego zera (`05`), bo w niektórych gminach jest istotne.

#### 3.4.3 Kod pocztowy

```text
wejście: "12345", "12 345", "12-345", "PL 12-345", "12–345" (pauza)
wyjście: "12-345"
```

- prefiks `PL ` usuń,
- separator `–` (en dash) i `—` (em dash) zamień na `-`,
- 5 cyfr bez separatora -> wstaw `-`,
- cokolwiek innego -> `null` + `addr.postcode.format` / `warning`,
- kod musi mieścić się w `00-001 .. 99-999`; nie sprawdzaj nim gminy jako
  błędu twardego. Niezgodność z TERYT to `warning` `addr.postcode.teryt_mismatch`.

#### 3.4.4 TERYT

- `teryt_voivodeship` 2 znaki, `teryt_county` 4, `teryt_commune` 7.
- Hierarchia: `county[0:2] == voivodeship`, `commune[0:4] == county`.
- Jeśli hierarchia się nie zgadza: wyzeruj wszystkie trzy, `warning`
  `addr.teryt.inconsistent`; nie zgaduj, który poziom jest poprawny.
- Jeśli TERYT nie istnieje w tabeli referencyjnej: `null` + `warning`.
- Nie wyliczaj TERYT z nazwy gminy bez tabeli referencyjnej. Dopasowanie
  nazw bez TERYT to `addr.teryt.unresolved` / `warning`, a nie zgadywanie.
- `simc`/`ulic` tylko z ULIC/SIMC; samodzielnie wyliczone ID jest błędem.

#### 3.4.5 Składanie `address_text`

```text
[street] [house_number], [postcode] [city], [commune], [county], [voivodeship]
```

Pomiń puste segmenty i nie duplikuj miejscowości. `address_text` jest polem
prezentacyjnym; nie używaj go do deduplikacji, bo kolejność i format mogą się
różnić. Do dopasowania używaj `compare_key` z pól strukturalnych.

### 3.5 Dostęp

| Pole | Wymagane | Reguła | Kod i waga |
| --- | --- | --- | --- |
| `access_type` | tak | mapowanie z §8.1, bez zgadywania | `access.type.unmapped` / `warning`, wartość `unknown` |
| `opening_hours` | nie | składnia OSM `opening_hours` | `access.opening_hours.parse` / `warning`, `null` |
| `is_24_7` | nie | bool/null; tylko z jawnych danych | `access.is_24_7.invalid` / `warning` |
| `requires_dispatcher` | nie | bool/null | `access.dispatcher.invalid` / `warning` |
| `fee` | nie | bool/null | `access.fee.invalid` / `warning` |
| `wheelchair_access` | nie | `yes|limited|no|unknown` | `access.wheelchair.invalid` / `warning` |

#### 3.5.1 Mapowanie `access_type`

| Wartość źródłowa | Kanoniczna | Warunek |
| --- | --- | --- |
| `yes`, `public`, `publicly_accessible`, `1`, `true` | `public` | brak `locked` |
| `permissive` | `permissive` | |
| `customers`, `client`, `klienci` | `customers` | |
| `private`, `no`, `0`, `false` | `private` | |
| `locked`, `lock`, `key`, `na klucz` | `key` | `locked=yes` lub opis |
| `code`, `kod`, `pin` | `code` | tylko jawne pole/tag |
| `dispatcher`, `dyspozytor`, `call`, `phone` | `dispatcher` | tylko jawny opis |
| brak, `unknown`, `nieznany`, `?` | `unknown` | |

Zasady:

- `access=yes` + `locked=yes` -> `key`, `warning` `access.type.conflict`.
- `access=no` + `opening_hours` -> `private`, nie `public`.
- Opis „dostępny po zgłoszeniu na numer 112” -> `dispatcher`, ale **nie**
  publikuj numeru w otwartym eksporcie; numer zostaje w polu restricted.
- „24/7” w opisie bez `opening_hours` -> `is_24_7=true` tylko jeśli opis jest
  jawny (`24/7`, `całodobowo`, `przez całą dobę`). W przeciwnym razie `null`.
- `access_type=unknown` nie wyklucza publikacji, ale obniża pewność i UI musi
  pokazać „dostęp nieznany”. Nie koloruj go na zielono.

#### 3.5.2 `opening_hours`

- Parsuj parserem zgodnym z OSM. Jeśli parser zawiedzie: `opening_hours=null`,
  `warning`, raw zachowany w `source_record` i `field_provenance` z
  `accepted=false`.
- Nie tłumacz języka naturalnego na składnię OSM, jeśli nie ma reguły.
  „codziennie 8-20” można zmapować jawnie (`Mo-Su 08:00-20:00`) tylko w
  adapterze źródła; normalizator nie robi tego z dowolnego tekstu.
- `24/7`, `24h`, `całodobowo` -> `opening_hours="24/7"`, `is_24_7=true`.
- Jeśli `opening_hours` daje 24/7, a `is_24_7=false` -> konflikt
  `access.is_24_7.conflict` / `warning`; ustaw `is_24_7=true` tylko gdy oba
  źródła są jednoznaczne, inaczej `null`.
- Godziny obiektu (`facility.opening_hours`) i dostęp do urządzenia
  (`aed.is_24_7`, `access_type`) to różne pola. Konflikt rozstrzyga poziom
  `aed`; zapisz `warning` `access.facility_device_conflict`.

### 3.6 Urządzenie

| Pole | Wymagane | Reguła | Kod i waga |
| --- | --- | --- | --- |
| `label` | nie | trim, zwijanie spacji, uppercase tylko prefiksów (`AED`, `AED-`) | `device.label.normalized` / `info` |
| `manufacturer` | nie | słownik aliasów, bez fuzzy poza słownikiem | `device.manufacturer.unknown` / `info` |
| `model` | nie | trim, zachowaj oryginał; alias tylko z mapy | `device.model.unknown` / `info` |
| `serial_number` | nie | uppercase, usuń spacje; nie eksportuj | `device.serial.redacted` / `info` |
| `device_type` | tak | `public_aed|trainer|unknown` | `device.type.invalid` / `warning` |
| `pads_type` | nie | `adult|pediatric|dual|unknown` | `device.pads.invalid` / `warning` |
| `installed_at` | nie | data `YYYY-MM-DD` | `date.installed.invalid` / `warning` |
| `battery_expiry` | nie | data | `date.battery.invalid` / `warning` |
| `pads_expiry` | nie | data | `date.pads.invalid` / `warning` |
| `last_inspection_at` | nie | data | `date.inspection.invalid` / `warning` |
| `next_inspection_at` | nie | data | `date.inspection.invalid` / `warning` |

#### 3.6.1 Nazwy producentów

Mapa aliasów (case-insensitive, po `compare_key`):

| Aliasy | Kanoniczna |
| --- | --- |
| `zoll`, `zoll medical` | `ZOLL` |
| `defibtech`, `defibtech llc` | `Defibtech` |
| `philips`, `philips healthcare`, `heartstart` | `Philips` |
| `physio-control`, `physio control`, `lifepak`, `stryker` | `Stryker/Physio-Control` |
| `heartsine`, `heart sine` | `HeartSine` |
| `schiller`, `schiller ag` | `Schiller` |
| `mindray` | `Mindray` |
| `cu medical`, `cu medical systems`, `ipad` | `CU Medical` |
| `metrax`, `primedic` | `Primedic` |
| `nihon kohden` | `Nihon Kohden` |
| `a.m.i.`, `ami italia` | `A.M.I. Italia` |

Nie mapuj „Philips” i „HeartStart” na siłę, jeśli źródło używa `HeartStart` jako
modelu. `manufacturer` i `model` to osobne pola. Nowy alias dodawaj do słownika
z wersją; nie rób fuzzy matchingu w runtime.

#### 3.6.2 `device_type`

- `emergency=defibrillator` -> `public_aed` (domyślnie OSM/OpenAEDMap).
- `trainer`, `training`, `fantom`, `szkoleniowy`, `do ćwiczeń`, `defibrillator=no`
  -> `trainer`.
- `device_type=trainer` **nie jest publikowany na mapie publicznej**. Może być
  w bazie i w raporcie, ale nie w eksporcie `aed.csv`/`aed.geojson`.
- Brak danych -> `unknown`, nigdy `public_aed` „na wszelki wypadek”.
- Urządzenie w pojeździe OSP (mobilne) ma `facility_type=osp_fire_station` lub
  `other` z `notes`, ale nadal może być `public_aed`; dostęp `dispatcher` lub
  `private`. Nie zgaduj `public`.

#### 3.6.3 Numery seryjne

- Normalizuj do uppercase bez spacji.
- Nie publikuj w otwartym eksporcie, API publicznym ani GeoJSON.
- Nie używaj do dopasowania między źródłami bez zgodności co najmniej 6 znaków
  i braku konfliktu innego pola. Numer może się powtarzać w błędnych danych.
- Jeśli źródło podaje numer jako `unknown`, `n/a`, `0`, `123456` -> `null`.
- `serial_number` nie może być kluczem deduplikacji samodzielnie.

#### 3.6.4 Daty i terminy

- Akceptuj `YYYY-MM-DD`, `YYYY/MM/DD`, `DD.MM.YYYY`, `DD-MM-YYYY` tylko w
  adapterze źródła. Normalizator przyjmuje już `YYYY-MM-DD`.
- Data bez dnia (`2024-11`, `2024`) -> `null` + `warning`, chyba że źródło ma
  osobne pole `precision=month|year`; wtedy zapisz `installed_at=YYYY-MM-01`
  z `date_precision=month` i `warning`.
- `installed_at > today + 1 day` -> `date.future` / `quarantine`.
- `battery_expiry`/`pads_expiry` w przeszłości -> `warning`
  `device.consumable.expired`; **nie** zmieniaj `status` na `removed`.
- `last_inspection_at > today + 1 day` -> `null` + `warning`.
- `last_inspection_at > next_inspection_at` -> `warning`
  `device.inspection.order`; nie poprawiaj automatycznie.
- Strefa czasowa: daty bez czasu traktuj jako lokalne `Europe/Warsaw`, ale
  zapisuj jako datę, nie timestamp. Timestampy zawsze ISO 8601 UTC.

### 3.7 Status, weryfikacja i pewność

| Pole | Wymagane | Reguła | Kod i waga |
| --- | --- | --- | --- |
| `status` | tak | `active|out_of_service|removed|planned|unknown` | `status.invalid` / `warning` |
| `status_reason` | nie | tekst ≤500, bez danych osobowych | `status.reason.invalid` / `warning` |
| `verification_status` | tak | wyliczany, nie importowany | `verification.invalid` / `warning` |
| `confidence` | tak | wyliczany (sekcja 5) | `confidence.out_of_range` / `fatal` |
| `last_verified_at` | nie | data/czas dowodu, nigdy data importu | `date.verified.invalid` / `warning` |
| `last_seen_at` | tak | ustawiany przez lifecycle | `date.seen.invalid` / `warning` |
| `is_public` | nie | bool/null; `false` wyklucza eksport | `status.private` / `info` |

Zasady:

- `status=active` tylko z dowodem weryfikacji (operator, urząd, oględziny,
  świeży `check_date` społecznościowy dający `probable`). Sam import nie daje
  `active`.
- `status=out_of_service` tylko z jawnego zgłoszenia/awarii. Nie wywnioskuj
  z braku `check_date`.
- `status=removed` tylko z dowodu usunięcia albo lifecycle (sekcja 4).
- `status=planned` tylko ze źródła oficjalnego, które mówi o planie.
- `status=unknown` jest domyślne i uczciwe.
- `verification_status` i `confidence` są **wyliczane** w sekcjach 4 i 5.
  Adapter może dostarczyć `verification_method` i `evidence`, ale nie może
  ustawić `confirmed` bez dowodu.

### 3.8 Operator i kontakt

| Pole | Reguła | Kod i waga |
| --- | --- | --- |
| `operator_name` | trim, usuń formy prawne tylko do porównania, zapis zachowaj | `operator.name.normalized` / `info` |
| `operator_type` | enum §8.5; mapowanie z rejestru | `operator.type.unmapped` / `warning` |
| `nip` | 10 cyfr, usuń `PL`, myślniki; waliduj sumę kontrolną | `operator.nip.invalid` / `warning` |
| `regon` | 9 lub 14 cyfr; waliduj sumę | `operator.regon.invalid` / `warning` |
| `phone` | E.164, `+48` dla polskich | `operator.phone.invalid` / `warning` |
| `email` | lowercase, regex; tylko kontakt organizacyjny | `operator.email.personal` / `warning` |
| `website` | https, bez trackingu | `operator.website.insecure` / `warning` |

#### 3.8.1 Telefon

Algorytm:

1. usuń spacje, myślniki, kropki, nawiasy, `tel:`,
2. usuń prefiks `0048`, `+48`, `48` tylko gdy długość po usunięciu to 9 cyfr,
3. usuń wiodące `0` z numeru 10-cyfrowego,
4. jeśli 9 cyfr i zaczyna się od 1-9 -> `+48XXXXXXXXX`,
5. jeśli numer zagraniczny z `+` i 8-15 cyfr -> zostaw,
6. w przeciwnym razie `null` + `warning`.

Nie publikuj numerów komórkowych osób fizycznych. Jeśli źródło ma
`phone` jako numer opiekuna, przenieś do pola restricted i wyzeruj publiczne.

#### 3.8.2 E-mail

- Regex podstawowy: `^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$`.
- Lowercase całego adresu.
- Publikuj tylko adres organizacyjny:
  - domena nie jest darmowa (`gmail.com`, `wp.pl`, `onet.pl`, `interia.pl`,
    `o2.pl`, `yahoo.com`, `outlook.com`),
  - local part należy do listy (`sekretariat`, `biuro`, `kontakt`, `info`,
    `urzad`, `office`, `admin`, `bip`, `aed`, `ratownictwo`).
- W przeciwnym razie `email=null`, `warning` `operator.email.personal`,
  oryginał w polu restricted.
- Nie zgaduj, czy `jan.kowalski@urzad.gmina.pl` jest osobą fizyczną, jeśli
  domena jest organizacyjna. Zasada: domena organizacyjna + local part
  imienny -> `warning` i do restricted, bo ryzyko RODO jest wyższe niż korzyść.

### 3.9 Media i metadane

| Pole | Reguła | Kod i waga |
| --- | --- | --- |
| `photo_url` | https, usuń tracking, max 2048 | `media.url.invalid` / `warning` |
| `photo_license` | musi być zgodna z licencją źródła lub jawna | `media.license.unknown` / `warning` |
| `media.captured_at` | data, jeśli źródło podaje | `media.date.invalid` / `warning` |
| `source_payload_sha256` | 64 hex, liczony z raw | `meta.checksum.mismatch` / `fatal` |
| `fetched_at` | ISO UTC, wymagane | `meta.fetched_at.invalid` / `fatal` |
| `source_updated_at` | ISO UTC, ≤ `fetched_at + 1 day` | `meta.source_updated.future` / `warning` |
| `updated_at` | ISO UTC, ustawiane przez store | `meta.updated_at.invalid` / `fatal` |

Zasady medialne:

- Zdjęcie z OSM ma licencję ODbL tylko jeśli pochodzi z OSM/OpenAEDMap.
  Zdjęcie z galerii Przemyśla ma CC BY 4.0. Nie kopiuj zdjęcia między źródłami.
- `attachment` Base64 z API Warszawy nie jest URL-em. Zapisz jako `media` z
  `media_type=photo`, `storage=local`, `license_id=CC-BY-4.0`, a w eksporcie
  podaj URL do własnego zasobu lub pomiń, jeśli nie masz prawa do rehostingu.
- Jeśli licencja zdjęcia jest nieznana, **nie eksportuj zdjęcia**, ale zostaw
  rekord. `photo_url` może zostać w bazie jako dowód, z `is_public=false`.
- Miniatury i cache to pochodne; muszą zachować atrybucję.

### 3.10 Spójność cross-field

| Reguła | Warunek | Wynik |
| --- | --- | --- |
| `xf.coord.address` | punkt > 5 km od centroidu miejscowości/adresu | `quarantine` `xf.coord_address.far` |
| `xf.teryt.address` | TERYT gminy nie zawiera miejscowości | `warning` `xf.teryt_address.mismatch` |
| `xf.indoor.level` | `indoor=false` i `level`/`room` niepuste | `warning` `xf.indoor_level.conflict`; `level`/`room` nieeksportowane |
| `xf.indoor.entrance` | `indoor=false` i opis wejścia mówi „w budynku” | `warning` `xf.indoor_entrance.conflict` |
| `xf.status.removed` | `status=removed` i świeża obserwacja `active` | `quarantine` `xf.status.conflict` |
| `xf.access.opening` | `is_24_7=true` i godziny nie obejmują całą dobę | `warning` `xf.access.conflict`; `is_24_7=null` |
| `xf.device.serial` | ten sam `serial_number` w > 1 lokalizacji | `warning` `xf.serial.duplicate`; nie scalaj |
| `xf.device.type` | `device_type=trainer` i `emergency=defibrillator` | `warning` `xf.device_type.conflict`; wyklucz z mapy |
| `xf.operator.facility` | operator przypisany do wielu obiektów bez związku | `warning` `xf.operator.multi_facility` |
| `xf.license.photo` | licencja zdjęcia węższa niż źródła | `warning` `xf.license.photo`; nie eksportuj zdjęcia |

**Zasada konfliktu:** przy konflikcie dwóch pól nie wybieraj po cichu. Zapisz
oba w `field_provenance` z `accepted=false` dla przegranego i utwórz issue.
Wartość kanoniczna może zostać wybrana według precedencji (sekcja 5.6), ale
konflikt pozostaje widoczny do review.

### 3.11 Reguły adapterów źródeł

#### 3.11.1 OSM

- Tylko `emergency=defibrillator` tworzy `public_aed`. `disused:emergency=defibrillator`
  -> `status=removed`, `device_type=public_aed`, `removal_evidence=osm_disused`.
- `defibrillator:location:pl` > `defibrillator:location` > `description` dla
  `entrance_description`; nie łącz ich w jeden tekst.
- `ref` -> `label`, nie `serial_number`.
- `check_date` -> `last_verified_at` + `verification_method=community`.
- `survey:date` -> `last_verified_at` z `warning` `osm.survey_date.lower_confidence`.
- Brak `check_date` -> `last_verified_at=null`, `verification_status=unverified`
  lub `stale` wg sekcji 4, nigdy `probable`.
- `access=no` -> `private`, nie `public`.
- `opening_hours` waliduj parserem; OSM może mieć nietypowe, ale poprawne wpisy.
- `image` -> `photo_url` tylko jeśli licencja OSM obejmuje plik; w OSM plik ma
  zwykle własną licencję, więc sprawdź `image:license` lub pozostaw `warning`.
- `operator` bez `operator:type` -> `operator_type=unknown`, nie zgaduj.
- Wersja OSM (`version`) zapisana w `source_record` do wykrywania zmian.

#### 3.11.2 OpenAEDMap

- `properties` to wszystkie tagi OSM jako stringi. Mapowanie identyczne jak OSM.
- `@osm_type` + `@osm_id` -> `source_record_id=openaedmap:{type}/{id}`.
- `@osm_version` zapisz jako `source_version`.
- Eksport krajowy zawiera tylko node. Way/relation z OSM trzeba dociągnąć
  osobno i oznaczyć `source_id=osm`, nie `openaedmap`.
- OpenAEDMap to **rodzina OSM**. Nie licz jako niezależnego potwierdzenia.
- Snapshot krajowy bywa opóźniony. Jeśli `@osm_timestamp` jest starszy niż
  90 dni, `warning` `source.snapshot.stale`; nie zmieniaj statusu urządzenia.

#### 3.11.3 Przemyśl

- Preferuj GeoJSON lub `/structured`. CSV z API SOD jest technicznie wadliwy:
  `text/csv` zawiera JSON string z escapowanym BOM, a domyślny limit to 10/21.
- Jeśli używasz CSV: najpierw `JSON.parse` literału stringa, potem CSV parser,
  potem trim nagłówków. Bez `limit` pobierzesz 10 rekordów. Wykryj
  `parse.rows.partial` / `fatal`, jeśli liczba wierszy < licznik z metadanych.
- `geometry.coordinates` w GeoJSON: `[lon, lat]`.
- CSV `geometry` w mirrorze dane.gov.pl ma klucze `lat`/`long` i kolejność
  `lat, lon`; nie używaj pozycji.
- `name` zawiera prefiks „Defibrylator (AED …)”. `location_name` bez prefiksu,
  `device_identifier` z regex `AED\s*-?\s*(\d{4,5})`.
- `gallery[0].url` -> `photo_url`; licencja CC BY 4.0.
- Duplikat numeru AED 7639 w rekordach 757/764: `device.label.duplicate` /
  `quarantine`; nie scalaj automatycznie, bo mogą to być dwa urządzenia.
- `description` to tekst edukacyjny, nie opis lokalizacji. Nie mapuj go na
  `entrance_description`.

#### 3.11.4 Krosno

- Nagłówki mają wiodące spacje (` Nazwa`, ` Lokalizacja`, ` Adres`, ` Numer Id`).
  Trim nagłówków, `info` `parse.header.trimmed`.
- Kolumny: `Długość geograficzna`, `Szerokość geograficzna`; kolejność
  `lon, lat` zgodna z nazwami, ale i tak zastosuj test zakresu.
- `Nazwa` -> `name`; `Lokalizacja` -> `entrance_description` lub
  `facility_type` przez słownik; `Adres` -> `address_text` + parser adresu.
- Brak API i brak daty weryfikacji -> `verification_status=unverified`,
  `last_verified_at=null`.

#### 3.11.5 Marki

- Każdy wiersz jest owinięty w cudzysłów, wewnętrzne cudzysłowy podwojone.
  Dwustopniowy parser: zdejmij zewnętrzne cudzysłowy, potem parsuj CSV.
  Jeśli po pierwszym kroku liczba kolumn != liczba nagłówków:
  `parse.columns.count_mismatch` / `quarantine`.
- Nagłówek deklaruje `lon, lat`, ale 7 z 8 wierszy ma `lat, lon`. Test zakresu
  wykryje i naprawi, `warning` `geo.coord.declaration_conflict`.
- `Numer Id=7` (`21.7203, 49.7188`) leży poza obszarem Marki:
  `geo.outside_source_area` / `quarantine`; nie publikuj na mapie.
- `Adres` może zawierać miejscowość bez ulicy; nie twórz ulicy z nazwy obiektu.

#### 3.11.6 Warszawa

- `properties.device_availability` to tekst. `is_24_7=true` tylko dla jawnego
  „24/7”/„całodobowo”. `device_public_access` mapuj na `access_type` według
  słownika; „tak” -> `public`, „nie” -> `private`, „częściowo” -> `permissive`.
- `device_location` i `location_description` -> `entrance_description`.
- `location_building` -> `facility.name` lub `name`.
- `attachment` Base64 -> media lokalne, nie URL; sprawdź rozmiar i typ.
- Brak tokena to błąd ingestii (`sync_run.status=failed`, HTTP 403), nie błąd
  normalizacji. Nie twórz pustego rekordu.
- API może zwracać `null` dla współrzędnych; wtedy rekord dostaje
  `location_status=address_only` lub `unresolved`, odpada z mapy i GeoJSON,
  ale może zostać jako `candidate` w bazie i w panelu.

#### 3.11.7 KML i listy HTML

- KML: `lon,lat,alt`, geometria punktowa, brak daty modyfikacji. Ustaw
  `geom_source=source`, `coord_precision_m=15`, `last_verified_at=null`.
- KML z `Placemark` bez `coordinates` to lista adresowa, nie geometria. Nie
  geokoduj automatycznie bez adresu; jeśli adres jest, geokoduj z precyzją 200 m.
- Po geokodowaniu listy adresowej ustaw `location_status=geocoded` lub
  `address_only`; nie ustawiaj `point` ani `verification_status=confirmed`.
- Lista HTML bez współrzędnych: dopuszczalna tylko jako `candidate` lub po
  geokodowaniu; nie publikuj jako `confirmed`.
- HTML może mieć kolejność `lat, lon` albo `lon, lat`; stosuj test zakresu.
- Google My Maps to nieoficjalny endpoint. Jeśli KML zniknie, nie usuwaj
  rekordów; oznacz źródło jako `failing` i zachowaj ostatni snapshot.

#### 3.11.8 Rejestry KSRG/OSP, NFZ, RSPO

- Nie tworzą `aed` z `device_type=public_aed` bez potwierdzenia urządzenia.
- Rekord rejestrowy może utworzyć `facility` i `candidate` z
  `verification_status=candidate`, `status=unknown`, `is_public=false`.
- `candidate` nie jest publikowany na mapie publicznej. Może być w warstwie
  „do weryfikacji” dla admina.
- Obecność OSP w KSRG nie dowodzi AED. Obowiązek R-1 od 2026-07-01 jest
  przesłanką do ankiety, nie dowodem posiadania.
- NFZ/RSPO mogą wzbogacić operatora i adres, ale nie nadają statusu AED.
  `operator_source` zapisz w proweniencji.

### 3.12 Fixtures i testy normalizacji

Minimalny zestaw testów, który musi przejść implementacja:

| # | Wejście | Oczekiwany wynik |
| ---: | --- | --- |
| 1 | OSM node z `lat=52.2`, `lon=21.0`, `check_date=2025-11-22` | accept, `probable`, `last_verified_at=2025-11-22` |
| 2 | OSM node bez `check_date` | accept_with_warning, `unverified`, `last_verified_at=null` |
| 3 | OSM `access=no`, `locked=yes` | `access_type=key`, warning o konflikcie |
| 4 | Przemyśl GeoJSON z `[22.7, 49.7]` | accept, lat 49.7, lon 22.7 |
| 5 | Przemyśl CSV `geometry={"lat":"49.7","long":"22.7"}` | accept po adapterze, bez zamiany |
| 6 | Przemyśl CSV bez `limit` (10/21) | `parse.rows.partial` / fatal, brak publikacji przebiegu |
| 7 | Marki wiersz `id=7`, `21.7203,49.7188` | quarantine `geo.outside_source_area` |
| 8 | Marki nagłówek `lon,lat`, wartości `52.3,21.1` | swap + warning, punkt w Markach |
| 9 | Krosno nagłówek ` Nazwa` | trim + info, `name` poprawna |
| 10 | dwa OSM nodes 3 m apart, różne `serial_number` | dwa `aed`, jedno `facility`, bez scalenia |
| 11 | ten sam OSM node w OSM i OpenAEDMap | jeden `aed`, dwa aliasy, jedna rodzina dowodowa |
| 12 | Przemyśl + jego mirror dane.gov.pl | jedna rodzina, brak podwójnego potwierdzenia |
| 13 | punkt `0,0` | reject `geo.coord.null_island` |
| 14 | punkt `52.0, 52.0` | quarantine `geo.coord.ambiguous_axes` |
| 15 | punkt `40.0, 10.0` | reject `geo.out_of_poland` |
| 16 | postcode `12345` | `12-345` + info |
| 17 | telefon `+48 (22) 123-45-67` | `+48221234567` |
| 18 | e-mail `jan.kowalski@um.warszawa.pl` | `null` publiczny + restricted + warning |
| 19 | `opening_hours="codziennie 8-20"` | null + warning (bez tłumaczenia) |
| 20 | `is_24_7=true`, `opening_hours=Mo-Fr 08:00-16:00` | `is_24_7=null`, warning |
| 21 | `device_type=trainer` | accept, ale wykluczony z eksportu publicznego |
| 22 | `status=removed`, świeża obserwacja active | quarantine `xf.status.conflict` |
| 23 | data `2027-01-01` przy `today=2026-11-21` | quarantine `date.future` |
| 24 | `source_payload_sha256` niezgodny | reject przebiegu `meta.checksum.mismatch` |
| 25 | brak licencji, źródło `internal_only` | accept wewnętrznie, brak eksportu |
| 26 | duplikat `(source_id, source_record_id)` z różnym payloadem | quarantine obu |
| 27 | HTML lista bez współrzędnych, z adresem | geocode 200 m, `geom_source=geocode`, nie `confirmed` |
| 28 | OSP KSRG bez AED | `candidate`, `is_public=false`, brak `aed` publicznego |

Testy 1-28 powinny być fixtures w `src/` lub `backend/normalize/fixtures/`
i uruchamiane przez `bun test`. Nie wymagają sieci.

---

## 4. Cykl życia: obecność, świeżość i usunięcie

### 4.1 Pięć wymiarów stanu

Nie wolno łączyć ich w jedno pole. Rekord ma jednocześnie:

| Wymiar | Pole / enum | Pytanie, na które odpowiada |
| --- | --- | --- |
| Obecność w źródle | `presence_state`: `seen`, `absent_pending`, `absent_confirmed`, `resurrected` | czy źródło nadal wymienia ten rekord? |
| Stan urządzenia | `aed.status`: `active`, `out_of_service`, `removed`, `planned`, `unknown` | czy urządzenie działa i jest na miejscu? |
| Podstawa weryfikacji | `verification_basis`: `confirmed`, `probable`, `unverified`, `candidate` | jak silny jest dowód, że rekord jest prawdziwy? |
| Świeżość dowodu | `freshness_state`: `fresh`, `aging`, `old`, `expired`, `undated` | jak stary jest dowód? |
| Publikacja | `publish_state`: `published`, `suppressed`, `quarantined`, `archived` | czy rekord może być w eksporcie? |

Przykład poprawnego stanu:

```text
presence_state   = seen            # źródło nadal ma rekord
status           = active          # operator potwierdził działanie
verification_basis = confirmed
freshness_state  = aging           # potwierdzenie ma 18 miesięcy
publish_state    = published
```

Przykład błędnego rozumowania: „nie ma go w najnowszym CSV, więc `removed`”.
Brak w jednym źródle to `presence_state=absent_pending`, nie usunięcie
urządzenia.

### 4.2 Znaczenie timestampów

| Pole | Definicja | Kto ustawia | Nie wolno używać jako |
| --- | --- | --- | --- |
| `first_seen_at` | pierwsze wystąpienie `(source_id, source_record_id)` | ingest | data weryfikacji |
| `last_seen_at` | ostatni pełny snapshot/odczyt, w którym rekord był obecny | ingest | dowód działania |
| `observed_at` | data, której dotyczy obserwacja (np. `check_date`, data pliku) | adapter | data importu |
| `fetched_at` | data pobrania bajtów | ingest | data weryfikacji |
| `source_updated_at` | data modyfikacji rekordu w źródle, jeśli podana | adapter | data weryfikacji |
| `last_verified_at` | data dowodu potwierdzającego urządzenie | adapter lub recenzent | data importu |
| `last_inspection_at` | ostatni przegląd techniczny | źródło | data weryfikacji lokalizacji |
| `status_changed_at` | data ostatniej zmiany `aed.status` | lifecycle | data weryfikacji |
| `removed_at` | data potwierdzenia usunięcia | lifecycle/review | data braku w źródle |
| `evaluated_at` | „teraz” dla obliczeń, wstrzykiwane | pipeline | nie zapisujemy jako fakt źródłowy |

**Zasada:** import nie odmładza dowodu. Jeśli źródło nie podało daty
weryfikacji, `last_verified_at=null`, a `freshness_state=undated`. Nie ustawiaj
`last_verified_at=fetched_at`.

### 4.3 Wykrywanie obecności per typ źródła

| Typ źródła | Przykłady | Czy brak rekordu oznacza usunięcie? | Warunek |
| --- | --- | --- | --- |
| Pełny snapshot | OpenAEDMap `PL.geojson`, CSV Krosno/Marki, eksport KML | tak, po grace i weryfikacji | przebieg `ok`, kompletny, > 0 rekordów, licznik nie spadł podejrzanie |
| API z pełną listą i paginacją | Warszawa (jeśli zwraca pełny zbiór) | tak, po grace | wszystkie strony pobrane, `next` puste, checksum kompletny |
| API pojedynczego rekordu | OpenAEDMap `/node/{id}`, Warszawa `get_scb...` per ID | **nie** | brak odpowiedzi nie dowodzi usunięcia; może to być 404 przejściowy |
| Źródło przyrostowe | RSS, webhook, zmiany od daty | **nie** | brak w delcie nic nie mówi o całości |
| HTML/PDF | listy gminne | tak, ostrożnie | pełne pobranie strony, brak rekordu, strona nie jest błędem/404 |
| Rejestr | KSRG, NFZ, RSPO | **nie** dla AED | rejestr nie jest rejestrem urządzeń |

Dodatkowe warunki dla pełnego snapshotu:

- `sync_run.status = ok`, nie `partial`/`failed`,
- `records_fetched > 0`,
- `records_fetched >= 0.5 * median(records_fetched, ostatnie 30 dni)`; inaczej
  `lifecycle.run.suspicious_drop` / `quarantine` na poziomie przebiegu i
  **brak zmian lifecycle**,
- checksum payloadu obecny i zgodny,
- dla CSV/HTML: parser nie zgłosił `parse.rows.partial`.

### 4.4 Algorytm braku w źródle

Dla każdego rekordu i źródła utrzymuj:

```text
consecutive_absences   integer
first_absent_at        timestamp | null
last_present_at        timestamp | null
presence_state         enum
```

Po każdym poprawnym pełnym snapshocie:

```text
if record_present:
    consecutive_absences = 0
    first_absent_at = null
    last_present_at = fetched_at
    if presence_state in (absent_pending, absent_confirmed):
        presence_state = resurrected
    else:
        presence_state = seen
else:
    consecutive_absences += 1
    if first_absent_at is null: first_absent_at = fetched_at
    if consecutive_absences == 1: presence_state = absent_pending
    if consecutive_absences >= 2: presence_state = absent_confirmed
```

Zasady:

- `absent_pending` to jeszcze nie sygnał do usunięcia. To sygnał do raportu.
- `absent_confirmed` oznacza, że źródło konsekwentnie nie ma rekordu.
- **Brak w jednym źródle nie zmienia `aed.status`.** Kanoniczny rekord może
  być nadal obecny w OSM i w źródle lokalnym.
- `resurrected` jest stanem przejściowym na jeden przebieg; potem `seen`.
- Dla źródeł przyrostowych i per-record `consecutive_absences` nie rośnie.
- Jeśli źródło jest `failing` lub przebieg `partial`, nie modyfikuj licznika.

### 4.5 Usunięcie kanoniczne

Kandydat do usunięcia powstaje, gdy:

```text
all active source aliases have presence_state in (absent_confirmed)
AND min(first_absent_at) <= evaluated_at - 90 days
AND number_of_consecutive_complete_runs_for_all_aliases >= 3
AND no active observation with verification_basis in (confirmed, probable)
AND no status active/out_of_service from a still-live source
```

Wtedy `aed.status=removed` **nie jest ustawiane automatycznie**. Powstaje
`review_item` typu `removal_candidate` z dowodem:

- lista źródeł i dat ostatniej obecności,
- liczba kolejnych pełnych snapshotów bez rekordu,
- ostatnia znana weryfikacja,
- czy inne źródła nadal go widzą.

Recenzent może:

| Akcja | Wynik |
| --- | --- |
| potwierdź usunięcie | `status=removed`, `removed_at`, `removal_reason=absent_all_sources`, tombstone |
| odrzuć | `presence_state` wraca do `seen` na podstawie dowodu, `review_item` closed |
| oznacz `out_of_service` | `status=out_of_service`, rekord zostaje, nie publikowany jako aktywny |
| przedłuż grace | `deferred`, kolejny przegląd za 30 dni |

**Wyjątek automatyczny:** jeśli źródło o tierze `official_local` lub wyższym
samo deklaruje `removed`/`disused` i ma datę, `status=removed` może być
ustawione automatycznie z `removal_evidence=source_status`. Nadal zapisuj
`review_item` o niskim priorytecie do audytu. Dla źródła `community` wymagany
jest recenzent.

### 4.6 Hierarchia dowodów usunięcia

| Poziom | Dowód | Automatyczne `removed`? | Wymagany review? |
| --- | --- | --- | --- |
| E1 | pismo/komunikat operatora lub urzędu, zgłoszenie z podpisem | tak | opcjonalny audyt |
| E2 | oględziny / zdjęcie z datą, protokół przeglądu | tak | opcjonalny audyt |
| E3 | pole źródła `status=removed`, `disused:emergency=defibrillator` | tak dla tieru ≥ `official_local`; nie dla community | tak dla community |
| E4 | brak we wszystkich pełnych snapshotach (3 przebiegi, 90 dni) | nie | tak, `removal_candidate` |
| E5 | brak w jednym źródle | nie | nie, tylko raport |

`removal_evidence` zapisuj jako kod i dowód w `observation.notes` oraz
`audit_log`. Nie wystarczy `status=removed` bez `removal_evidence`.

### 4.7 `out_of_service` i `planned`

**`out_of_service`:**

- tylko z jawnego zgłoszenia (awaria, serwis, kradzież, uszkodzenie).
- nie wywodź z braku `check_date`, z `battery_expiry` w przeszłości ani
  z braku w źródle.
- rekord pozostaje na mapie jako „czasowo niedostępny”, jeśli polityka UI
  na to pozwala; domyślnie inny kolor i niższa pozycja.
- po 90 dniach bez potwierdzenia: `verification_basis=unverified`,
  `freshness_state=old`, `review_item` `out_of_service_expired`.
- po potwierdzeniu naprawy: `status=active`, `last_verified_at=data naprawy`,
  `verification_basis=confirmed` (jeśli dowód jest silny).

**`planned`:**

- tylko źródło oficjalne i data planowana lub jawny opis „w planach”.
- `planned` nie jest publikowane jako aktywny punkt na mapie publicznej.
- po `planned_date + 30 dni` bez dowodu instalacji: `status=unknown`,
  `review_item` `planned_overdue`.
- po dowodzie instalacji: `status=active` lub `unverified` zależnie od dowodu.

### 4.8 Maszyna stanów weryfikacji

`verification_basis` to najsilniejszy aktualny dowód, niezależny od wieku.
`verification_status` to stan pochodny, który uwzględnia wiek i konflikty.

```text
verification_status =
  removed     if status == removed and removal_evidence is confirmed
  disputed    if unresolved conflict
  candidate   if basis == candidate
  stale       if age > ttl_for(basis)
  confirmed   if basis == confirmed
  probable    if basis == probable
  unverified  otherwise
```

Kolejność pierwszeństwa: `removed` > `disputed` > `candidate` > `stale` >
`confirmed` > `probable` > `unverified`.

TTL dla przejścia w `stale`:

| `verification_basis` | TTL do `stale` | Uzasadnienie |
| --- | ---: | --- |
| `confirmed` | 24 miesiące | dokument nadrzędny §11.3 |
| `probable` | 12 miesięcy | dokument nadrzędny §11.3 |
| `unverified` | 6 miesięcy | import bez potwierdzenia szybko się starzeje |
| `candidate` | 12 miesięcy | rejestr może być nieaktualny, ale nie jest dowodem |

Przejścia:

| Z | Do | Wyzwalacz | Warunek |
| --- | --- | --- | --- |
| `candidate` | `unverified` | import z poprawną geometrią i nazwą | źródło nie jest wyłącznie rejestrowe |
| `candidate` | `confirmed` | potwierdzenie operatora/oględziny | dowód E1/E2 |
| `unverified` | `probable` | świeży `check_date`/community survey | ≤ 12 miesięcy, brak konfliktu |
| `unverified` | `confirmed` | operator/urząd/oględziny | dowód E1/E2 |
| `unverified` | `stale` | wiek > 6 miesięcy | brak nowego dowodu |
| `probable` | `confirmed` | operator/urząd/oględziny | dowód E1/E2 |
| `probable` | `stale` | wiek > 12 miesięcy | brak nowego dowodu |
| `confirmed` | `stale` | wiek > 24 miesiące | brak nowego dowodu |
| dowolny | `disputed` | konflikt nierozstrzygnięty | co najmniej dwa źródła, sprzeczne pola |
| dowolny | `removed` | dowód E1-E4 | patrz 4.5 |
| `stale` | `confirmed`/`probable` | nowy dowód | data nowego dowodu |
| `disputed` | poprzedni lub niższy | recenzent rozstrzygnął | zapis w `review_action` |
| `removed` | `unverified`/`probable` | nowa obserwacja | `presence_state=resurrected`, nigdy auto `confirmed` |

### 4.9 Świeżość dowodu

`freshness_state` liczymy od `last_verified_at`, a jeśli go nie ma, od
`observed_at` lub `source_updated_at`. Jeśli żadna data nie istnieje:
`undated`.

| `verification_basis` | `fresh` | `aging` | `old` | `expired` |
| --- | ---: | ---: | ---: | ---: |
| `confirmed` | ≤ 12 mies. | 12-24 mies. | 24-36 mies. | > 36 mies. |
| `probable` | ≤ 6 mies. | 6-12 mies. | 12-24 mies. | > 24 mies. |
| `unverified` | ≤ 3 mies. | 3-6 mies. | 6-12 mies. | > 12 mies. |
| `candidate` | ≤ 6 mies. | 6-12 mies. | 12-24 mies. | > 24 mies. |
| brak daty | `undated` | | | |

`freshness_state` nie zmienia `aed.status`. Może zmienić `verification_status`
na `stale` i obniżyć `recency` w pewności.

### 4.10 Przykład osi czasu

```text
2025-06-01  OSM check_date, OSM/OpenAEDMap obecny
            basis=probable, freshness=fresh, status=unknown

2026-08-01  nadal obecny w OSM, brak nowego check_date
            age=14 mies.
            verification_status=stale (probable > 12 mies.)
            freshness_state=old
            last_seen_at=2026-08-01 (dowód obecności, nie działania)

2026-11-01  OpenAEDMap nie ma rekordu po raz pierwszy
            presence_state(OpenAEDMap)=absent_pending
            status nadal unknown, rekord nadal widoczny przez OSM

2026-12-01  OpenAEDMap nie ma rekordu po raz drugi
            presence_state(OpenAEDMap)=absent_confirmed
            nadal nie ma podstaw do removed, bo OSM go ma

2027-02-01  OSM również nie ma rekordu po raz trzeci, min. 90 dni
            removal_candidate -> review

2027-02-10  recenzent potwierdza usunięcie
            status=removed, removed_at=2027-02-10,
            removal_evidence=absent_all_sources
```

### 4.11 Zdrowie źródła a życie rekordu

`source_health` to osobny wymiar:

| Stan | Warunek | Wpływ |
| --- | --- | --- |
| `ok` | ostatni przebieg `ok`, opóźnienie ≤ 2 × `update_frequency` | brak |
| `degraded` | 1 nieudany przebieg lub opóźnienie 2-4 × częstotliwości | `warning` w raporcie, brak zmian lifecycle |
| `failing` | ≥ 3 kolejne nieudane przebiegi lub brak sukcesu > 7 dni | `source_health=failing`, rekordy nie są usuwane, baner „dane mogą być nieaktualne” |
| `disabled` | źródło wyłączone decyzją | rekordy zamrożone, nie usuwane |

**Awaria źródła nie jest dowodem usunięcia urządzenia.** To najczęstszy błąd
w systemach agregujących. Jeśli OpenAEDMap nie odpowiada, nie oznaczaj 18 tys.
punktów jako `removed`.

### 4.12 Retencja i usuwanie danych

- `source_record` i `payload_json`: 24 miesiące, potem archiwum skompresowane
  albo usunięcie, zależnie od licencji i RODO.
- `aed` i `observation`: tombstone bezterminowo; rekord `removed` nadal istnieje
  z `removed_at`, `removal_evidence`, historią.
- `audit_log`: bezterminowo, ale bez danych osobowych.
- Dane osobowe (e-mail imienny, telefon komórkowy opiekuna): usuń lub zredaguj
  po 12 miesiącach od ostatniej weryfikacji; wcześniej trzymaj w polu restricted.
- Żądanie RODO: usuń dane osobowe i zredaguj rekord, ale zachowaj niezbędny
  minimalny zapis (hash, data, powód), aby nie złamać audytu i licencji.
- Nie usuwaj rekordów tylko dlatego, że źródło zniknęło. Tombstone jest
  informacją publiczną i chroni przed „zmartwychwstaniem” błędnych danych.

### 4.13 Testy cyklu życia

| # | Scenariusz | Oczekiwany wynik |
| ---: | --- | --- |
| L1 | pełny snapshot bez rekordu, 1 raz | `absent_pending`, `status` bez zmian |
| L2 | pełny snapshot bez rekordu, 2 razy | `absent_confirmed`, `status` bez zmian, raport |
| L3 | 3 pełne snapshoty bez rekordu, 90 dni, brak innych źródeł | `removal_candidate`, nie automatyczne `removed` |
| L4 | przebieg `failed` bez rekordu | brak zmian lifecycle |
| L5 | przebieg `ok` z 20% poprzedniej liczby rekordów | `lifecycle.run.suspicious_drop`, brak zmian |
| L6 | rekord wraca po `absent_confirmed` | `resurrected` -> `seen`, absence reset |
| L7 | źródło deklaruje `removed` (official_local) | `removed` + `removal_evidence=source_status` |
| L8 | źródło community deklaruje `removed` | `review_item`, nie automatyczne `removed` |
| L9 | `confirmed` ma 25 miesięcy | `verification_status=stale`, `freshness=old` |
| L10 | `probable` ma 13 miesięcy | `stale`, `freshness=old` |
| L11 | `removed` + nowa obserwacja active | `resurrected`, `verification_status=unverified`, nie `confirmed` |
| L12 | `out_of_service` 91 dni bez potwierdzenia | `review_item` `out_of_service_expired`, status bez zmian do decyzji |
| L13 | `planned` po `planned_date+30` | `status=unknown`, `review_item` `planned_overdue` |
| L14 | źródło `failing` 10 dni, rekordy obecne | `source_health=failing`, rekordy bez zmian |
| L15 | punkt tylko w rejestrze KSRG | `candidate`, brak publikacji, brak `removed` |

---

## 5. Pewność i uzgadnianie źródeł

### 5.1 Cztery poziomy pewności

Nie ma jednej „pewności rekordu”, która zastępuje wszystkie inne. Utrzymuj:

| Poziom | Zakres | Do czego służy |
| --- | --- | --- |
| `confidence` | cały rekord | sortowanie, filtrowanie, raport |
| `location_confidence` | geometria + adres | czy pokazać punkt na mapie |
| `status_confidence` | `status` urządzenia | czy pokazać „aktywne”/„niedostępne” |
| `field_confidence` | pojedyncze pole | proweniencja i rozstrzyganie konfliktów |

Rekord może mieć `confidence=0.72`, ale `status_confidence=0`, bo nikt nie
potwierdził działania. UI nie może wtedy pisać „aktywne”. To najważniejsza
zasada bezpieczeństwa publicznego w tym dokumencie.

### 5.2 Rodziny dowodów

Dwa źródła są **niezależne**, tylko jeśli mają różne `evidence_family_id`
i różnych wydawców. To blokuje sztuczne potwierdzenie przez kopie tego samego
danych.

| `evidence_family_id` | Źródła w rodzinie | Uwagi |
| --- | --- | --- |
| `osm` | OSM, OpenAEDMap, aedmapa.pl, Ratujemy.com.pl, warstwa OSM w Geoportalu, Google My Maps z OSM | jedna baza, wiele interfejsów |
| `przemysl` | Przemyśl SOD, mirror dane.gov.pl 4581 | mirror to ta sama publikacja |
| `krosno` | Krosno, mirror dane.gov.pl 3624 | |
| `marki` | Marki, mirror dane.gov.pl 4955 | |
| `warszawa` | Warszawa API, mirror dane.gov.pl 39512 | |
| `ksrg` | KSRG/OSP, wykaz KG PSP, karta OSP | rejestr, nie dowód AED |
| `nfz` | NFZ API, placówki NFZ | rejestr placówek |
| `rspo` | RSPO/SIO, XLSX RSPO | rejestr szkół |
| `operator` | bezpośrednie potwierdzenie operatora, protokół, ankieta OSP | dowód E1/E2 |
| `field` | oględziny, zdjęcie z datą, zgłoszenie moderowane | dowód E2 |
| `partner` | SOS DAE, Ratuj z Sercem, Staying Alive, tylko po umowie | własne bazy, nie OSM |
| `user` | zgłoszenia użytkowników po moderacji | dowód najniższy |

Zasady:

- W jednej rodzinie wybierz **najlepszą obserwację**: najwyższy tier, potem
  najświeższa, potem najwyższa kompletność. Pozostałe są aliasami/wariantami.
- `dane.gov.pl` nie jest rodziną. To kanał publikacji; rodzina to wydawca
  oryginalny.
- Dwa rekordy z tej samej rodziny nie zwiększają `cross_source_agreement`.
  Mogą zwiększyć kompletność pól, ale nie niezależność.
- Jeśli partner publikuje dane OSM, oznacz `evidence_family_id=osm`, nie
  `partner`. Umowa nie zmienia pochodzenia danych.

### 5.3 `source_tier`

Wartości i mapowanie:

| Tier | Wartość | Przykłady |
| --- | ---: | --- |
| `authoritative` | 1.00 | rejestr państwowy z mandatem, potwierdzenie ministra/urzędu, dane z ustawowym obowiązkiem |
| `official_local` | 0.85 | miasto/gmina, oficjalne API miejskie, dane.gov.pl wydawcy lokalnego |
| `community` | 0.60 | OSM, sprawdzone zgłoszenie społecznościowe |
| `aggregator` | 0.50 | portal agregujący cudze dane bez własnej weryfikacji |
| `derived` | 0.45 | OpenAEDMap, aedmapa, Ratujemy, warstwa OSM WMS, KML z OSM |
| `app` | 0.30 | aplikacja komercyjna bez otwartej licencji i bez API |
| `register` | 0.40 | KSRG/OSP, NFZ, RSPO jako dowód lokalizacji/operatora, nie AED |

`register` nie jest nowym tierem w schemacie Drizzle. W `source.reliability_tier`
zapisz `authoritative` lub `official_local` zależnie od rejestru, a w
`evidence_role=register` i `verification_method=import`. Wartość 0,40 jest
używana tylko wtedy, gdy rejestr próbuje współtworzyć rekord AED; normalnie
taki rekord ma `basis=candidate` i nie jest publikowany.

### 5.4 Komponent `recency`

`evidence_date`:

1. `last_verified_at`, jeśli istnieje,
2. w przeciwnym razie `observed_at`,
3. w przeciwnym razie `source_updated_at`,
4. w przeciwnym razie `null`.

`age = evaluated_at - evidence_date` w miesiącach (30,44 dnia).

| `age` | `recency` |
| --- | ---: |
| ≤ 6 miesięcy | 1.00 |
| ≤ 12 miesięcy | 0.70 |
| ≤ 24 miesięcy | 0.40 |
| > 24 miesięcy | 0.10 |
| brak daty | 0.00 |

Uwagi:

- `fetched_at` nie jest `evidence_date`. Import nie odmładza dowodu.
- `last_seen_at` nie jest `evidence_date`. Obecność w źródle nie jest
  potwierdzeniem działania.
- Data pliku (`source_updated_at`) może być użyta tylko wtedy, gdy źródło nie
  ma daty weryfikacji; wtedy `verification_method=import` i tak obniża wynik.
- `age` liczony od początku dnia w `Europe/Warsaw`, aby wynik był stabilny.

### 5.5 Komponent `verification_method`

| Metoda | Wartość | Kiedy |
| --- | ---: | --- |
| `field_survey` | 1.00 | oględziny, protokół, zdjęcie z datą i lokalizacją |
| `operator` | 0.90 | pismo/komunikat operatora, potwierdzenie dyspozytora |
| `official_register` | 0.80 | rejestr państwowy lub urzędowy z datą |
| `official_api` | 0.80 | oficjalne API miasta z aktualizacją |
| `community` | 0.50 | OSM `check_date`, sprawdzony survey społecznościowy |
| `import` | 0.20 | import CSV/JSON/HTML bez potwierdzenia |
| `inferred` | 0.10 | pole wyliczone przez normalizator, nie źródło |

Dla wielu obserwacji w rodzinie wybierz **najsilniejszą metodę**, ale nie
sumuj metod. Dwie metody w jednej rodzinie to nadal jedna rodzina.

### 5.6 Komponent `field_completeness`

Wagi pól (suma 1,00):

| Pole | Waga | Uznane za wypełnione, gdy |
| --- | ---: | --- |
| `lat`+`lon` | 0.20 | poprawne współrzędne w Polsce |
| `name` | 0.12 | niepuste, nie placeholder |
| `facility_type` | 0.08 | enum != `unknown` |
| adres | 0.12 | ulica+numer albo miasto+kod pocztowy |
| `access_type` | 0.10 | enum != `unknown` |
| `status` | 0.12 | enum != `unknown` |
| `operator_name` lub `operator_type` | 0.08 | niepuste, typ != `unknown` |
| `opening_hours` lub `is_24_7` | 0.06 | poprawne godziny lub jawny bool |
| `photo_url` | 0.04 | poprawny URL i znana licencja |
| kontakt (`phone`/`email`/`website`) | 0.04 | co najmniej jedno poprawne |
| `device` (`label`/`manufacturer`/`model`) | 0.04 | co najmniej jedno niepuste |

`field_completeness = suma wag wypełnionych pól`.

Nie wliczaj `license_id`, `attribution`, `source_url`, `payload_sha256`.
To bramki publikacji, nie kompletność. Rekord bez licencji jest odrzucany
niezależnie od kompletności.

### 5.7 Uzgadnianie lokalizacji

Dla każdej rodziny wybierz najlepszą obserwację i jej punkt. Następnie:

1. Posortuj obserwacje po `(family_id, distance_to_centroid, source_id)`.
2. Klastruj metodą najbliższego reprezentanta z promieniem 50 m:
   - pierwsza obserwacja tworzy klaster,
   - kolejna dołącza do najbliższego klastra, jeśli odległość ≤ 50 m,
   - w przeciwnym razie tworzy nowy klaster.
3. `weight(family) = source_tier(family)`; jeśli rodzina ma wiele obserwacji,
   użyj najwyższego tieru.
4. `largest_share = suma wag największego klastra / suma wag wszystkich rodzin`.
5. `spread = max pairwise distance` w największym klastrze.

`location_agreement`:

| Warunek | Wartość |
| --- | ---: |
| `largest_share ≥ 0.75` i `spread ≤ 25 m` | 1.00 |
| `largest_share ≥ 0.60` i `spread ≤ 50 m` | 0.80 |
| `largest_share ≥ 0.50` i `spread ≤ 100 m` | 0.50 |
| `largest_share < 0.50` lub `spread > 100 m` | 0.20 |
| tylko jedna rodzina | 0.50 |
| brak geometrii u wszystkich | 0.00 |

`spread` liczony po `haversine`. Dla punktów w jednym budynku 5-15 m to
normalne. Dla dwóch punktów 200 m od siebie to prawdopodobnie dwa urządzenia,
nie błąd.

### 5.8 Uzgadnianie atrybutów

W największym klastrze porównaj znormalizowane wartości pól. Dla każdego pola
z co najmniej dwiema niepustymi wartościami:

| Zgodność | Punkty pola |
| --- | ---: |
| wszystkie równe (`compare_key`) | 1.0 |
| ≥ 2/3 rodzin zgodnych | 0.5 |
| brak większości | 0.0 |
| pole puste u wszystkich lub tylko jedna rodzina | wyklucz z mianownika |

Wagi pól:

| Pole | Waga |
| --- | ---: |
| adres (`street`+`house_number`) | 0.25 |
| `name` | 0.20 |
| `access_type` | 0.20 |
| `status` | 0.15 |
| `city` | 0.10 |
| `manufacturer`+`model` | 0.10 |

`attribute_agreement = suma(waga * punkty) / suma(wag uwzględnionych)`.
Jeśli nie ma żadnego porównywalnego pola: `attribute_agreement=0.5` dla jednej
rodziny, `0.5` dla wielu rodzin (brak danych nie jest konfliktem).

`cross_source_agreement`:

```text
if number_of_families == 0: 0.0
elif number_of_families == 1: 0.5
else: 0.65 * location_agreement + 0.35 * attribute_agreement
```

### 5.9 Wykrywanie konfliktów

| Konflikt | Warunek | Kod | Kara |
| --- | --- | --- | --- |
| lokalizacja | dwie rodziny ≥ `official_local`, odległość > 100 m | `conflict.location.far` | `location_agreement=0.2`, cap `confidence ≤ 0.55` |
| lokalizacja | odległość > 1 km dla tego samego urządzenia | `conflict.location.implausible` | `quarantine`, cap 0.45 |
| status | `active` vs `removed` w dwóch rodzinach | `conflict.status.active_removed` | cap `status_confidence ≤ 0.30`, `disputed` |
| status | `active` vs `out_of_service` | `conflict.status.active_out` | cap `status_confidence ≤ 0.50`, review |
| dostęp | `public` vs `private` | `conflict.access.public_private` | cap `confidence ≤ 0.70`, review |
| dostęp | `24/7` vs godziny wykluczające całą dobę | `conflict.access.hours` | `is_24_7=null`, cap 0.70 |
| urządzenie | różny `serial_number` przy tym samym `label` | `conflict.device.serial` | cap 0.70, nie scalaj |
| urządzenie | różny `manufacturer`/`model` | `conflict.device.model` | cap 0.80, warning |
| licencja | różne licencje dla tego samego rekordu | `conflict.license` | `quarantine`, brak publikacji |
| nazwa | podobna lokalizacja, podobieństwo nazw < 0,5 (znormalizowany Levenshtein) | `conflict.name` | `warning`, nie obniżaj poniżej 0.5 |

Kary:

- każdy **nierozstrzygnięty** konflikt typu mnoży wynik przez 0,85,
- kara nakładana raz na typ, nie za każdą parę,
- capy działają po mnożnikach,
- wynik końcowy `clamp(0.0, 1.0)`,
- konflikt rozwiązany przez recenzenta nie karze, ale zostaje w historii,
- konflikt na poziomie statusu ustawia `verification_status=disputed` do
  rozwiązania.

### 5.10 Wzór końcowy

Dla rekordu:

```text
confidence =
    0.30 * source_tier
  + 0.25 * recency
  + 0.20 * cross_source_agreement
  + 0.15 * verification_method
  + 0.10 * field_completeness

confidence = clamp(confidence * conflict_multiplier, 0, 1)
confidence = min(confidence, conflict_cap)
```

`source_tier` to najwyższy tier wśród rodzin, a `verification_method` to metoda
obserwacji z tej rodziny. `cross_source_agreement` liczymy ze wszystkich rodzin.
`field_completeness` z kanonicznego rekordu, nie z pojedynczej obserwacji.

`conflict_multiplier = 0.85 ^ (liczba nierozstrzygniętych typów konfliktu)`.
Wszystkie warianty pewności są przycinane do zakresu 0-1 po zastosowaniu kar.

Warianty:

```text
location_confidence =
    0.35 * source_tier
  + 0.25 * recency
  + 0.25 * location_agreement
  + 0.15 * verification_method

status_confidence =
    0.35 * source_tier_status
  + 0.25 * recency_status
  + 0.20 * status_agreement
  + 0.20 * verification_method_status
```

`status_confidence=0`, jeśli nie ma żadnej obserwacji ze statusem != `unknown`
albo `status=unknown`. `status_agreement` to 1,0, gdy wszystkie rodziny ze
statusem są zgodne, 0,5 dla jednej rodziny, 0,0 przy konflikcie.
`status_confidence` nigdy nie jest liczony z obecności rekordu.

`field_confidence(field)`:

```text
field_confidence =
    source_tier_of_field
  * recency_of_field
  * method_factor_of_field
  * (1.0 if direct else 0.7)
  * (0.5 if unresolved_conflict_on_field else 1.0)
```

Zapisz `field_confidence` w `field_provenance`. Wartość pola wygrywa wyższa
`field_confidence`; przy remisie wygrywa wyższy tier, potem świeższa data, potem
`source_id` leksykograficznie (determinizm).

### 5.11 Progi i znaczenie w UI

| Zakres | Etykieta | Znaczenie |
| --- | --- | --- |
| ≥ 0.85 | wysoka | co najmniej dwa niezależne źródła lub silny dowód terenowy |
| 0.70-0.85 | dobra | jedno wiarygodne źródło, świeże dane |
| 0.55-0.70 | umiarkowana | jedno źródło lub starsze dane |
| 0.40-0.55 | niska | import bez weryfikacji, niekompletne |
| < 0.40 | bardzo niska | nie publikuj automatycznie |

Bramki publikacji:

- mapa publiczna: `publish_state=published`, `confidence ≥ 0.40`,
  poprawne współrzędne, licencja i atrybucja, `device_type != trainer`,
  `status != removed`, `is_public != false`.
- etykieta „aktywne”: `status=active` **oraz** `status_confidence ≥ 0.60`
  **oraz** `verification_status` w (`confirmed`, `probable`)
  **oraz** dowód statusu ≤ 12 miesięcy.
- etykieta „24/7”: `is_24_7=true` i `field_confidence(is_24_7) ≥ 0.70`.
- etykieta „zweryfikowane”: `verification_status=confirmed` i
  `confidence ≥ 0.70`.
- `unknown` nigdy nie jest prezentowane jako `false` ani jako „brak AED”.
  UI ma pokazać „brak danych o dostępności/statusie”.

### 5.12 Przeliczanie i determinizm

Przeliczaj `confidence`:

- po nowej obserwacji,
- po zmianie `source.reliability_tier` lub `evidence_family_id`,
- po przekroczeniu progu wieku (6/12/24 miesiące) w jobie dziennym,
- po rozwiązaniu konfliktu,
- po ręcznej weryfikacji,
- po zmianie `confidence_version` lub `normalization_version`.

Zapisuj:

```text
confidence_version
computed_at
inputs_json        # tier, recency, agreement, method, completeness, conflicts
```

`inputs_json` pozwala odtworzyć wynik i wyjaśnić „dlaczego 0,62”. Nie
przechowuj w nim danych osobowych.

### 5.13 Przykłady obliczeń

**Przykład A: pojedynczy OSM node, świeży `check_date`.**

```text
source_tier          = 0.60 (community)
recency              = 1.00 (check_date 2 mies. temu)
cross_source_agreement = 0.50 (jedna rodzina)
verification_method  = 0.50 (community)
field_completeness   = 0.50 (coords, name, facility_type, access)

confidence = 0.30*0.60 + 0.25*1.00 + 0.20*0.50
           + 0.15*0.50 + 0.10*0.50
           = 0.18 + 0.25 + 0.10 + 0.075 + 0.05
           = 0.655
```

Wynik: `0.655`, etykieta „umiarkowana”. `status_confidence=0`, bo brak statusu.

**Przykład B: Przemyśl, plik z 2024-11-05, import w 2026-11.**

```text
age = 24,5 mies. -> recency 0.10
source_tier = 0.85, method = 0.20 (import)
completeness = 0.60 (brak access/status/operator/hours, jest photo i kontakt)
single family -> agreement 0.50

confidence = 0.255 + 0.025 + 0.10 + 0.03 + 0.06 = 0.470
```

Wynik: `0.47`, „niska”. Rekord może być na mapie tylko z etykietą
„dane z 2024 r., niepotwierdzone”. To poprawne zachowanie, nie błąd.

**Przykład C: dwa niezależne źródła zgodne, jedno potwierdzenie terenowe.**

```text
source_tier = 0.85 (official_local), recency = 1.00
location_agreement = 1.00 (15 m), attribute_agreement = 0.80
agreement = 0.65*1.00 + 0.35*0.80 = 0.93
verification_method = 1.00 (field survey)
completeness = 0.85

confidence = 0.255 + 0.25 + 0.186 + 0.15 + 0.085 = 0.926
```

**Przykład D: konflikt statusu active vs removed.**

```text
source_tier = 0.60, recency = 0.70, agreement = 0.20
method = 0.50, completeness = 0.70

baza = 0.18 + 0.175 + 0.04 + 0.075 + 0.07 = 0.540
kara statusu x0.85 = 0.459
cap statusu = 0.55 -> 0.459
status_confidence = min(0.30, ...) = 0.30
verification_status = disputed
```

Rekord idzie do review, nie na mapę jako aktywny.

**Przykład E: OSM + OpenAEDMap + aedmapa.**

```text
wszystkie trzy mają evidence_family_id = osm
liczba rodzin = 1
agreement = 0.50, nie 1.00
```

To jest test regresji nr C1. Trzy interfejsy tej samej bazy nie są trzema
potwierdzeniami.

### 5.14 Testy pewności i uzgadniania

| # | Scenariusz | Oczekiwany wynik |
| ---: | --- | --- |
| C1 | OSM + OpenAEDMap + aedmapa, ten sam punkt | jedna rodzina, `agreement=0.50` |
| C2 | Przemyśl + dane.gov.pl 4581 | jedna rodzina, `agreement=0.50` |
| C3 | OSM + Przemyśl, 15 m, zgodny adres | `location_agreement=1.0`, `agreement ≥ 0.8` |
| C4 | OSM + Warszawa, 300 m | `conflict.location.far`, cap 0.55, `disputed` |
| C5 | OSM + Warszawa, 1200 m | `conflict.location.implausible`, quarantine |
| C6 | OSM active + urząd removed | `status_confidence ≤ 0.30`, `disputed` |
| C7 | dwa źródła public vs private | cap 0.70, review |
| C8 | ten sam `label`, różny `serial_number` | `conflict.device.serial`, cap 0.70, brak scalenia |
| C9 | brak daty weryfikacji | `recency=0.00`, `freshness=undated` |
| C10 | `check_date` 25 miesięcy | `recency=0.10`, `verification_status=stale` |
| C11 | brak statusu | `status_confidence=0`, `status=unknown` |
| C12 | status active, 13 miesięcy | brak etykiety „aktywne” |
| C13 | pełna kompletność, jedno źródło community | `field_completeness=1.0` |
| C14 | konflikt rozwiązany przez recenzenta | brak kary, `disputed` znika, audyt |
| C15 | zmiana tieru źródła | przeliczenie, nowa `confidence_version` |

---

## 6. Kwarantanna, review i raporty jakości

### 6.1 Definicja kwarantanny

Kwarantanna to **stan publikacji**, nie usunięcie i nie odrzucenie. Rekord:

- pozostaje w `source_record` i w bazie kanonicznej,
- ma `publish_state=quarantined`,
- nie trafia do mapy, eksportu CSV/GeoJSON ani publicznego API,
- ma co najmniej jedno otwarte `validation_issue` z wagą `quarantine`,
- ma `review_item` z dowodem i priorytetem,
- może wrócić do publikacji po decyzji recenzenta lub automatycznym ustąpieniu
  przyczyny (np. poprawiony parser przy ponownym imporcie).

Kwarantanna nie może być używana jako „miękki delete”. Jeśli rekord jest
bezużyteczny i nie ma czego recenzować, decyzja to `reject` i `archived`, nie
kwarantanna.

### 6.2 Przyczyny kwarantanny

| Kod przyczyny | Warunek | Priorytet | Automatyczne wyjście |
| --- | --- | --- | --- |
| `geo.coord.ambiguous_axes` | obie wartości w zakresie lat lub lon | P1 | tak, po poprawce źródła |
| `geo.outside_source_area` | punkt > 30/50/150 km od obszaru źródła | P1 | tak, po poprawce |
| `xf.coord.address.far` | punkt > 5 km od zadeklarowanego adresu | P1 | tak, po poprawce |
| `id.source_record.duplicate_conflict` | ten sam klucz źródłowy, różny payload | P1 | nie, wymaga człowieka |
| `parse.columns.count_mismatch` | liczba kolumn != nagłówki | P1 | tak, po poprawce parsera |
| `parse.rows.partial` | mniej wierszy niż deklaruje źródło | P0 | tak, po pełnym pobraniu |
| `parse.double_encoding` | podwójne cytowanie/encoding nie do naprawy | P1 | tak, po poprawce |
| `xf.status.conflict` | removed vs active | P0 | nie |
| `xf.coord.address.far` | punkt i adres się wykluczają | P1 | tak, po korekcie |
| `xf.license.conflict` | różne licencje dla tego samego rekordu | P0 | nie |
| `license.missing` | brak licencji i brak zgody | P0 | nie, chyba że internal-only |
| `date.future` | data weryfikacji/instalacji > +1 dzień | P2 | tak, po poprawce |
| `device.label.duplicate` | ten sam numer AED w dwóch rekordach | P1 | nie, review |
| `conflict.location.implausible` | punkt > 1 km od tego samego urządzenia | P1 | nie |
| `source.snapshot.stale` | snapshot starszy niż 90 dni | P3 | tak, po nowym snapshocie |
| `lifecycle.run.suspicious_drop` | spadek liczby rekordów > 50% | P0 | tak, po potwierdzeniu przebiegu |
| `manual.hold` | recenzent wstrzymał ręcznie | P2 | tylko ręcznie |

Kody `P0` dotyczą bezpieczeństwa, prawa lub integralności całego przebiegu.
Kody `P1` dotyczą pojedynczego rekordu i zwykle wymagają korekty lub decyzji.
Kody `P2`/`P3` mogą zostać rozwiązane automatycznie przez nowy import.

Tabela łączy kwarantannę rekordu ze stanami przebiegu, które ją wywołują.
`parse.rows.partial` i `lifecycle.run.suspicious_drop` są `fatal` na poziomie
przebiegu i nie tworzą kwarantanny pojedynczego rekordu. `license.missing` jest
`fatal` i kończy się `reject`/`archived`, nie kwarantanną. `source.snapshot.stale`
jest `warning`, a nie kwarantanną; wpis oznacza wstrzymanie publikacji przebiegu
do czasu nowego snapshotu.

### 6.3 Cykl życia kwarantanny

```text
quarantined
   │  tworzony review_item
   ▼
review_pending ──(SLA)──> escalated
   │                         │
   ├── accept ──> resolved_accepted ──> published
   ├── reject ──> resolved_rejected ──> archived
   ├── defer  ──> deferred ──(termin)──> review_pending
   └── auto_fix ──> resolved_auto ──> published
```

Zasady:

- `review_pending` tworzy się automatycznie raz na `dedup_key`. Nowe dowody
  otwierają istniejący item zamiast tworzyć nowy.
- `escalated` po przekroczeniu SLA lub przy nowym konflikcie P0.
- `deferred` wymaga daty i uzasadnienia. Po terminie wraca do `review_pending`.
- `resolved_accepted` i `resolved_rejected` są terminalne dla danego itemu, ale
  nowy konflikt może otworzyć nowy item.
- `auto_expired`: po 180 dniach bez decyzji rekord pozostaje `archived`,
  `publish_state=suppressed`, a nie `deleted`. Wymaga raportu.
- Każda zmiana stanu zapisuje `review_action` i `audit_log`.

### 6.4 Model `review_item`

```ts
type ReviewKind =
  | "record_quarantine"
  | "dedup_merge"
  | "attribute_conflict"
  | "status_conflict"
  | "removal_candidate"
  | "out_of_service_expired"
  | "planned_overdue"
  | "submission"
  | "source_schema_change"
  | "source_failure"
  | "license_issue"
  | "sample_qc";

interface ReviewItem {
  id: string;
  dedupKey: string;              // unikalny, stabilny
  kind: ReviewKind;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "review_pending" | "in_review" | "escalated" | "deferred"
        | "resolved_accepted" | "resolved_rejected" | "auto_expired";
  entityType: "source_record" | "aed" | "facility" | "source" | "submission";
  entityId: string;
  sourceId?: string;
  sourceRecordId?: string;
  title: string;
  evidenceJson: string;          // bez danych osobowych
  assignee?: string;
  dueAt: string;                 // ISO
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;           // wymagane przy resolved_*
  version: number;               // optimistic locking
}
```

`dedup_key`:

```text
sha256(kind | source_id | entity_id | rule_id | normalization_version)
```

Nie wstawiaj `created_at` ani danych losowych. Ten sam problem ma ten sam klucz.
Zamknięty item nie tworzy nowego, chyba że zmienił się `normalization_version`
albo pojawił się nowy dowód (`evidence_hash`).

### 6.5 Priorytet i SLA

Priorytet bazowy z tabeli przyczyn. Dodatkowo:

```text
priority_score =
    0.50 * severity_weight
  + 0.20 * age_factor
  + 0.20 * impact_factor
  + 0.10 * (1 - confidence)

severity_weight: P0=1.0, P1=0.7, P2=0.4, P3=0.2
age_factor      = min(1, days_open / sla_days)
impact_factor   = min(1, log10(1 + affected_records) / 4)
```

`affected_records` to liczba rekordów, których dotyczy ten sam problem (np.
wszystkie wiersze z tym samym błędem parsera). `priority_score` służy do
sortowania kolejki, a `priority` do SLA.

| Priorytet | SLA pierwszej reakcji | SLA rozwiązania | Przykłady |
| --- | ---: | ---: | --- |
| P0 | 4 godziny | 24 godziny | konflikt active/removed, brak licencji, partial snapshot |
| P1 | 1 dzień roboczy | 5 dni roboczych | złe współrzędne, duplikat, konflikt dostępu |
| P2 | 5 dni roboczych | 20 dni roboczych | brak adresu, niepoprawny telefon, przyszła data |
| P3 | 20 dni roboczych | 60 dni roboczych | kosmetyka, brak zdjęcia, stary snapshot |

SLA liczone w dni robocze w `Europe/Warsaw`, bez weekendów i świąt państwowych.
Przekroczenie SLA eskaluje do `P{max(0, n-1)}` i zwiększa `priority_score` o 0,1
za każde 7 dni opóźnienia (cap 0,3).

### 6.6 Widoki kolejki

| Widok | Filtr | Przeznaczenie |
| --- | --- | --- |
| `P0_safety` | `priority=P0`, `status` otwarty | dyżur, natychmiast |
| `coords` | `kind in (record_quarantine, attribute_conflict)` i reguła geo | kartograf / GIS |
| `dedup` | `kind=dedup_merge` | kurator danych |
| `removal` | `kind in (removal_candidate, out_of_service_expired)` | opiekun źródeł |
| `licenses` | `kind=license_issue` | prawnik / product owner |
| `source_health` | `kind in (source_failure, source_schema_change)` | inżynier ingestii |
| `submissions` | `kind=submission` | moderator społeczności |
| `stale` | `priority_score` rosnący, `age > SLA` | kierownik jakości |
| `my_queue` | `assignee=current_user` | recenzent |

Każdy widok pokazuje: liczbę, najstarszy wiek, SLA breach, top 10 według
`priority_score`. Bez tego kolejka staje się archiwum.

### 6.7 Akcje recenzenta

| Akcja | Wymagane uprawnienie | Efekt | Wymagane pola |
| --- | --- | --- | --- |
| `accept_record` | `review.record` | `publish_state=published`, issue zamknięte | `reason` |
| `reject_record` | `review.record` | `publish_state=archived`, `status` bez zmian | `reason` |
| `correct_field` | `review.field` | nowa wartość + `field_provenance` | `field`, `value`, `reason` |
| `merge` | `review.merge` | aliasy i wybór pól | `primary_aed_id`, `reason` |
| `split` | `review.merge` | rozdzielenie aliases, nowe `aed_id` | `aed_ids`, `reason` |
| `mark_duplicate` | `review.merge` | alias do istniejącego `aed` | `target_aed_id` |
| `confirm_removal` | `review.status` | `status=removed`, tombstone | `evidence`, `reason` |
| `confirm_active` | `review.status` | `status=active` tylko z dowodem | `evidence`, `reason` |
| `mark_out_of_service` | `review.status` | `status=out_of_service` | `evidence`, `reason` |
| `add_evidence` | `review.evidence` | nowa obserwacja/dowód | `source`, `url`, `date` |
| `defer` | `review.defer` | `deferred` | `until`, `reason` |
| `escalate` | `review.escalate` | wyższy priorytet | `reason` |
| `redact` | `review.redact` | usuń dane osobowe | `fields`, `reason` |

Niezmienniki:

1. `confirm_active` bez `evidence` i `reason` jest odrzucane.
2. `accept_record` nie może opublikować rekordu bez licencji i współrzędnych.
3. `merge` nie może połączyć `trainer` z `public_aed`.
4. `merge` nie może połączyć dwóch rekordów z różnym `serial_number` bez
   jawnego `force` i drugiego recenzenta.
5. `split` musi zachować historię aliasów i proweniencję.
6. Każda akcja zapisuje `before_json`/`after_json` w `audit_log`.
7. Konflikt wersji (`version`) zwraca `409`, nie nadpisuje po cichu.
8. Po każdej akcji uruchom przeliczenie `confidence`, `verification_status`
   i bramkę publikacji dla dotkniętych rekordów.

### 6.8 Review deduplikacji

Kandydaci do scalenia:

| Wynik | Decyzja |
| ---: | --- |
| ≥ 0,80 i brak konfliktu tożsamości | automatyczne scalenie z `match_method=auto` |
| 0,60-0,80 | `review_item` `dedup_merge` |
| < 0,60 | osobne rekordy, bez review |
| ≤ 5 m i różny `serial_number`/`label` | **nie scalaj**, wiele urządzeń |
| różny `device_type` | **nie scalaj** |
| `status=removed` i `active` | review, nie automat |

Scoring z dokumentu nadrzędnego §9.2, z uzupełnieniami:

- odległości są rozłączne (≤15 m nie dodaje +0,20 za ≤50 m),
- wynik przycinaj do 1,0,
- `+0,20` za adres tylko gdy `compare_key` adresu jest równy,
- `+0,15` za operatora tylko gdy `compare_key` nazwy i NIP/REGON są zgodne,
- `-0,30` za różny `serial_number`, chyba że jeden jest `null`,
- `-0,10` za różny producent/model,
- nie używaj nazwy urządzenia jako głównego dowodu, bo bywa marketingowa.

UI review musi pokazać:

- dwa rekordy obok siebie, wszystkie pola i różnice,
- odległość w metrach i mapę,
- `match_score` z rozbiciem na składniki,
- źródła i `field_confidence`,
- zdjęcia i licencje,
- historię wcześniejszych scaleń,
- przycisk `merge`, `mark_duplicate`, `keep_separate`, `defer`.

Scalanie:

1. `primary_aed_id` wybierz według: wyższy tier głównego źródła, potem więcej
   pól, potem starsze `first_seen_at` (stabilność), potem mniejsze `aed_id`.
2. `aed_alias` zachowuje wszystkie `(source_id, source_record_id)`.
3. Dla każdego pola wybierz wartość o najwyższym `field_confidence`.
4. `facility_id`: jeśli adresy zgodne, wybierz facility o wyższym tierze.
5. `serial_number` nie jest przenoszony, jeśli jest konflikt.
6. `status`: wybierz najwyższy dowód, nie „najnowszy import”.
7. Zapisz `merge` w `review_action` i `audit_log`.
8. Nie usuwaj przegranego `aed` fizycznie. Oznacz `merged_into` i zachowaj
   aliasy oraz historię.

### 6.9 Review konfliktów atrybutów

Widok konfliktu pokazuje macierz:

| Pole | OSM | Przemyśl | Warszawa | Rekomendacja | field_confidence |
| --- | --- | --- | --- | --- | ---: |
| `access_type` | public | unknown | customers | public | 0.62 |
| `status` | unknown | unknown | active | unknown | 0.40 |
| `address` | brak | ul. X 1 | ul. X 1 | ul. X 1 | 0.88 |

Zasady:

- Rekomendacja to wartość o najwyższym `field_confidence`.
- Recenzent może wybrać inną wartość, ale musi podać `reason`, jeśli wybiera
  niższy tier.
- Konflikt `public` vs `private` wymaga dowodu, nie głosowania.
- Konflikt `active` vs `removed` zawsze P0.
- Po rozwiązaniu `verification_status` wraca do stanu z basis, chyba że pozostaje
  inny konflikt.

### 6.10 Review usunięcia i statusu

Widok `removal` pokazuje:

- wszystkie źródła z `presence_state`, `last_present_at`, `consecutive_absences`,
- ostatni znany dowód działania i jego wiek,
- czy inne źródła nadal widzą rekord,
- historię statusów,
- link do OSM/OpenAEDMap i źródła lokalnego.

Recenzent nie może potwierdzić usunięcia, jeśli:

- którekolwiek aktywne źródło ma rekord obecny,
- istnieje obserwacja `confirmed`/`probable` młodsza niż 12 miesięcy,
- brakuje `removal_evidence`,
- rekord jest `candidate` z rejestru.

### 6.11 Raport przebiegu

Każdy `sync_run` generuje raport JSON, niezależnie od sukcesu:

```json
{
  "report_version": 1,
  "run_id": "run_2026-11-21_osm_001",
  "source_id": "openaedmap",
  "started_at": "2026-11-21T02:00:00Z",
  "finished_at": "2026-11-21T02:01:12Z",
  "status": "ok",
  "http_status": 200,
  "payload_sha256": "…",
  "records_fetched": 18298,
  "records_accepted": 17901,
  "records_warning": 324,
  "records_quarantined": 68,
  "records_rejected": 5,
  "records_new": 41,
  "records_updated": 210,
  "records_unchanged": 17650,
  "absent_pending": 12,
  "absent_confirmed": 3,
  "reject_reasons": {"geo.out_of_poland": 3, "id.source_record.missing": 2},
  "quarantine_reasons": {"geo.coord.ambiguous_axes": 41, "geo.outside_source_area": 27},
  "confidence": {"p50": 0.61, "p95": 0.84},
  "freshness": {"fresh": 8120, "aging": 4200, "old": 5100, "expired": 800, "undated": 78},
  "duration_ms": 72100,
  "source_health": "ok"
}
```

Pola obowiązkowe: `report_version`, `run_id`, `source_id`, `status`, liczniki
`fetched/accepted/warning/quarantined/rejected`, `reject_reasons`,
`quarantine_reasons`, `duration_ms`. Raport nie zawiera danych osobowych ani
surowych rekordów.

### 6.12 Scorecard źródła

Raport tygodniowy per źródło:

| Metryka | Wzór | Próg ostrzeżenia |
| --- | --- | --- |
| dostępność | udane przebiegi / zaplanowane | < 95% |
| świeżość źródła `p50` | mediana `now - last_success_at` | > 2 × częstotliwość |
| świeżość źródła `p95` | percentyl 95 | > 4 × częstotliwość |
| acceptance rate | `accepted / fetched` | < 90% |
| quarantine rate | `quarantined / fetched` | > 5% |
| reject rate | `rejected / fetched` | > 2% |
| kompletność pól | średnia `field_completeness` | < 0,60 |
| pokrycie statusu | rekordy ze `status != unknown` / wszystkie | < 20% |
| pokrycie dostępu | `access_type != unknown` / wszystkie | < 60% |
| konflikty | rekordy z otwartym konfliktem / wszystkie | > 2% |
| duplikaty | `dedup_merge` otwarte / wszystkie | > 1% |
| schema drift | zmiana nazw/typów pól vs konfiguracja | każda zmiana P1 |
| koszt | czas przebiegu i bajty / 1000 rekordów | trend +50% |

### 6.13 Raport pokrycia i jakości kraju

Agregaty dzienne i miesięczne:

| Metryka | Definicja |
| --- | --- |
| `published_total` | liczba `publish_state=published` |
| `by_verification` | liczby `confirmed/probable/unverified/stale/disputed` |
| `by_freshness` | liczby `fresh/aging/old/expired/undated` |
| `by_device_type` | `public_aed/trainer/unknown` |
| `by_facility_type` | liczby per enum |
| `by_source_family` | udział rodzin dowodowych |
| `by_teryt` | liczba punktów per gmina/powiat/województwo |
| `gminy_with_records` | liczba gmin z co najmniej jednym punktem |
| `gminy_without_records` | liczba gmin bez punktu (nie znaczy „brak AED”) |
| `records_per_100k` | punkty na 100 tys. mieszkańców, jeśli dostępna populacja |
| `license_mix` | udział ODbL/CC BY/CC0/inne |
| `open_license_share` | rekordy z licencją otwartą / wszystkie |
| `tombstones` | `status=removed` i `removed_at` w okresie |
| `resurrections` | rekordy `resurrected` w okresie |
| `conflict_open` | otwarte konflikty |
| `review_backlog` | otwarte `review_item` |
| `review_median_age_days` | mediana wieku otwartych |
| `sla_compliance` | rozwiązane w SLA / wszystkie rozwiązane |

**Pokrycie nie jest kompletnością.** „Gmina bez rekordu” nie oznacza „gmina bez
AED”. W raporcie i UI używaj języka „brak danych w naszych źródłach”, nie
„brak AED”.

### 6.14 Bramka publikacji eksportu

Eksport publiczny (`aed.csv`, `aed.geojson`, API) może powstać tylko, gdy:

1. Wszystkie rekordy mają `publish_state=published`.
2. Każdy ma `license_id`, `attribution`, `source_url` i `ext_ident`.
3. `ext_ident` są unikalne i ≤ 36 znaków.
4. Brak rekordów `status=removed`, `device_type=trainer`, `is_public=false`,
   `publish_state in (quarantined, archived)`.
5. Brak `status=active` z `status_confidence < 0.60` lub bez dowodu ≤ 12 mies.
6. Brak zduplikowanych `aed_id`, `public_code`, `ext_ident`.
7. Brak danych osobowych: `serial_number`, prywatne e-maile, numery komórkowe
   opiekunów, kody dostępu.
8. Wszystkie współrzędne przechodzą bbox i nie są `0,0`.
9. CSV przechodzi walidację schematu, GeoJSON przechodzi RFC 7946 i walidację
   typów.
10. Raport przebiegu ma `status in (ok, partial)` i `records_rejected` wyjaśnione.
11. Licencja całości jest zgodna z decyzją (§12 dokumentu nadrzędnego):
    domyślnie ODbL, jeśli eksport zawiera OSM.
12. Wygenerowany plik ma checksum i datę w manifeście.

Jeśli którykolwiek warunek nie jest spełniony: eksport `blocked`, raport
`quality_gate_failed`, alert P0. Nie publikuj „częściowo poprawnych” plików bez
oznaczenia w manifeście.

### 6.15 Alerty

| Alert | Warunek | Priorytet |
| --- | --- | --- |
| `source.failed` | 3 kolejne nieudane przebiegi | P1 |
| `source.suspicious_drop` | liczba rekordów spadła > 30% vs mediana 30 dni | P0 |
| `source.zero_records` | `records_fetched=0` przy oczekiwanych > 0 | P0 |
| `parse.reject_spike` | reject rate > 10% w jednym przebiegu | P1 |
| `parse.schema_drift` | nowe/brakujące pole vs konfiguracja | P1 |
| `quality.quarantine_backlog` | > 500 otwartych lub najstarszy > 14 dni | P1 |
| `quality.conflict_spike` | > 2% rekordów z nowym konfliktem | P1 |
| `quality.freshness` | p95 wieku dowodu > 12 miesięcy | P2 |
| `quality.duplicate_spike` | > 1% nowych kandydatów do scalenia | P2 |
| `quality.license` | nowy rekord bez licencji lub zmiana licencji źródła | P0 |
| `export.gate_failed` | bramka publikacji nie przeszła | P0 |
| `review.sla_breach` | > 10% otwartych po SLA | P2 |

Alert trafia do `review_item` (jeśli dotyczy rekordu) i do kanału operacyjnego
(jeśli dotyczy przebiegu). Nie duplikuj alertów: jeden `dedup_key` na problem
na okres.

### 6.16 Artefakty raportów

| Artefakt | Format | Retencja | Zawartość |
| --- | --- | --- | --- |
| `reports/runs/{run_id}.json` | JSON | 24 miesiące | raport przebiegu |
| `reports/sources/{source_id}/{week}.json` | JSON | 24 miesiące | scorecard |
| `reports/quality/{date}.json` | JSON | 24 miesiące | agregaty kraju |
| `reports/quality/{date}.md` | Markdown | 24 miesiące | podsumowanie dla ludzi |
| `reports/export/{date}/manifest.json` | JSON | bezterminowo | lista plików, checksum, licencja |
| `reports/export/{date}/aed.csv` | CSV | wersjonowane | eksport |
| `reports/export/{date}/aed.geojson` | GeoJSON | wersjonowane | eksport |
| `reports/review/{date}.csv` | CSV | 12 miesięcy | backlog i SLA |

Raporty JSON są maszynowe i stabilne. Markdown może się zmieniać. Manifest
eksportu jest dowodem, co dokładnie opublikowano i na jakiej licencji.

### 6.17 Testy kwarantanny i raportów

| # | Scenariusz | Oczekiwany wynik |
| ---: | --- | --- |
| Q1 | rekord z `geo.coord.ambiguous_axes` | `quarantine`, `review_item` P1, brak eksportu |
| Q2 | ten sam problem w 100 rekordach | jeden `review_item` z `affected_records=100`, nie 100 itemów |
| Q3 | poprawiony parser w kolejnym przebiegu | `resolved_auto`, publikacja, wpis w audycie |
| Q4 | brak decyzji 180 dni | `auto_expired`, `archived`, nie `deleted` |
| Q5 | recenzent `accept_record` bez reason | walidacja odrzuca akcję |
| Q6 | `confirm_active` bez dowodu | walidacja odrzuca akcję |
| Q7 | merge 3 m apart, różne seriale | brak automatycznego merge, review |
| Q8 | merge 10 m, zgodne dane | auto merge, aliasy zachowane |
| Q9 | split po merge | dwa `aed`, historia aliasów zachowana |
| Q10 | eksport z rekordem `trainer` | bramka blokuje eksport |
| Q11 | eksport z `status=active`, `status_confidence=0.4` | bramka blokuje lub obniża do `unknown` |
| Q12 | raport przebiegu z 10% reject | alert `parse.reject_spike` |
| Q13 | przebieg z 0 rekordów | `source.zero_records`, P0, brak zmian lifecycle |
| Q14 | dwa raporty tego samego problemu | jeden `dedup_key`, brak duplikatu |
| Q15 | SLA P1 przekroczone | `escalated`, `priority_score` rośnie |
| Q16 | eksport bez atrybucji | `export.gate_failed`, P0 |

---

## 7. Kontrakt implementacyjny

### 7.1 Interfejs silnika reguł

```ts
interface RecordContext {
  source: Source;
  raw: SourceRecord;
  candidate: AedCandidate;
  normalized: AedCandidate;
  issues: ValidationIssue[];
  now: Date;
  rulesVersion: string;
  normalizationVersion: string;
}

interface ValidationIssue {
  ruleId: string;
  ruleVersion: number;
  severity: "fatal" | "quarantine" | "warning" | "info";
  field?: string;
  code: string;
  message: string;
  remediation?: string;
  valueJson?: string;        // znormalizowana wartość, bez PII
}

interface RecordDecision {
  decision: "accept" | "accept_with_warning" | "quarantine" | "reject";
  publishState: "published" | "suppressed" | "quarantined" | "archived";
  issues: ValidationIssue[];
  confidence: number;
  locationConfidence: number;
  statusConfidence: number;
}
```

Pipeline:

```ts
async function evaluateRecord(ctx: RecordContext): Promise<RecordDecision> {
  const issues: ValidationIssue[] = [];

  for (const rule of rules.forStage("normalize")) {
    applyNormalization(rule, ctx);
  }
  for (const rule of rules.forStage("validate")) {
    issues.push(...rule.evaluate(ctx));
  }
  for (const rule of rules.forStage("crossField")) {
    issues.push(...rule.evaluate(ctx));
  }

  const decision = aggregate(issues);
  if (decision === "reject") {
    return finalize("reject", "archived", issues, ctx);
  }

  const confidence = computeConfidence(ctx, issues);
  return finalize(decision, publishStateFor(decision), issues, confidence);
}
```

Zasady implementacyjne:

- reguły normalizujące nie tworzą issue `fatal`; mogą `warning`/`info`,
- reguły walidacyjne nie modyfikują wartości,
- `aggregate` jest czystą funkcją issue,
- `computeConfidence` dostaje `inputs_json` i nie czyta bazy bezpośrednio,
- `publishStateFor` mapuje decyzję i dodatkowe bramki (licencja, PII),
- wszystkie funkcje są testowalne bez sieci.

### 7.2 Dodatkowe tabele SQLite/Drizzle

Tabele uzupełniają schemat z dokumentu nadrzędnego §13. Nie zastępują go.

```sql
-- Rodziny dowodowe
CREATE TABLE evidence_family (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT,
  created_at            TEXT NOT NULL
);

ALTER TABLE source ADD COLUMN family_id TEXT REFERENCES evidence_family(id);
ALTER TABLE source ADD COLUMN evidence_role TEXT; -- aed | operator | address | register

-- Obecność rekordu w źródle
CREATE TABLE source_presence (
  source_id             TEXT NOT NULL REFERENCES source(id),
  source_record_id      TEXT NOT NULL,
  presence_state        TEXT NOT NULL,             -- seen | absent_pending | absent_confirmed | resurrected
  consecutive_absences  INTEGER NOT NULL DEFAULT 0,
  first_absent_at       TEXT,
  last_present_at       TEXT,
  first_seen_at         TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  PRIMARY KEY (source_id, source_record_id)
);

-- Decyzja per rekord
CREATE TABLE record_decision (
  source_record_id      TEXT PRIMARY KEY,
  decision              TEXT NOT NULL,             -- accept | accept_with_warning | quarantine | reject
  publish_state         TEXT NOT NULL,             -- published | suppressed | quarantined | archived
  rules_version         TEXT NOT NULL,
  normalization_version TEXT NOT NULL,
  evaluated_at          TEXT NOT NULL,
  confidence            REAL NOT NULL,
  location_confidence   REAL NOT NULL,
  status_confidence     REAL NOT NULL,
  inputs_json           TEXT NOT NULL
);

-- Issue walidacyjne
CREATE TABLE validation_issue (
  id                    TEXT PRIMARY KEY,
  source_record_id      TEXT NOT NULL,
  rule_id               TEXT NOT NULL,
  rule_version          INTEGER NOT NULL,
  severity              TEXT NOT NULL,
  field_name            TEXT,
  code                  TEXT NOT NULL,
  message               TEXT NOT NULL,
  remediation           TEXT,
  value_json            TEXT,
  created_at            TEXT NOT NULL,
  resolved_at           TEXT,
  resolution            TEXT
);

-- Kolejka review
CREATE TABLE review_item (
  id                    TEXT PRIMARY KEY,
  dedup_key             TEXT NOT NULL UNIQUE,
  kind                  TEXT NOT NULL,
  priority              TEXT NOT NULL,              -- P0 | P1 | P2 | P3
  priority_score        REAL NOT NULL DEFAULT 0,
  status                TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  entity_id             TEXT NOT NULL,
  source_id             TEXT REFERENCES source(id),
  source_record_id      TEXT,
  title                 TEXT NOT NULL,
  evidence_json         TEXT NOT NULL,
  affected_records      INTEGER NOT NULL DEFAULT 1,
  assignee              TEXT,
  due_at                TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  resolved_at           TEXT,
  resolution            TEXT,
  version               INTEGER NOT NULL DEFAULT 1
);

-- Historia akcji review
CREATE TABLE review_action (
  id                    TEXT PRIMARY KEY,
  review_item_id        TEXT NOT NULL REFERENCES review_item(id),
  action                TEXT NOT NULL,
  actor                 TEXT NOT NULL,
  reason                TEXT,
  before_json           TEXT,
  after_json            TEXT,
  created_at            TEXT NOT NULL
);

-- Zdrowie źródła
CREATE TABLE source_health (
  source_id             TEXT PRIMARY KEY REFERENCES source(id),
  status                TEXT NOT NULL,              -- ok | degraded | failing | disabled
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  last_success_at       TEXT,
  last_error_at         TEXT,
  last_error            TEXT,
  updated_at            TEXT NOT NULL
);

-- Raporty jakości
CREATE TABLE quality_report (
  id                    TEXT PRIMARY KEY,
  scope                 TEXT NOT NULL,              -- run | source | country | export
  source_id             TEXT,
  run_id                TEXT,
  period_start          TEXT,
  period_end            TEXT,
  status                TEXT NOT NULL,              -- ok | warning | failed
  metrics_json          TEXT NOT NULL,
  created_at            TEXT NOT NULL
);

-- Indeksy
CREATE INDEX idx_issue_record ON validation_issue(source_record_id, severity);
CREATE INDEX idx_issue_code ON validation_issue(code, created_at);
CREATE INDEX idx_review_status ON review_item(status, priority, due_at);
CREATE INDEX idx_review_kind ON review_item(kind, created_at);
CREATE INDEX idx_review_entity ON review_item(entity_type, entity_id);
CREATE INDEX idx_presence_state ON source_presence(presence_state, updated_at);
CREATE INDEX idx_decision_publish ON record_decision(publish_state, confidence);
```

Uwagi:

- `ALTER TABLE` w SQLite jest ograniczony. Jeśli migracja jest problemem, dodaj
  `family_id` i `evidence_role` do nowej tabeli `source_family_map` zamiast
  `ALTER`. Drizzle migration musi być wygenerowana, nie ręczna.
- `source_record_id` w `record_decision` i `validation_issue` odnosi się do
  `source_record.id`, nie do zewnętrznego identyfikatora. Nazwa jest myląca,
  ale spójna z dokumentem nadrzędnym. W implementacji użyj `source_record_pk`.
- Wszystkie timestampy to ISO 8601 UTC, zgodnie z `src/db/index.ts`.
- WAL i `synchronous=NORMAL` zostają.

### 7.3 Konfiguracja progów

Domyślne wartości, nadpisywalne w `config/quality.yaml`:

```yaml
quality:
  coord_precision_default_m: null
  geocode_min_confidence: 0.8
  geocode_precision:
    building_m: 50
    street_m: 200
    city_m: 1000
  source_area_km:
    gmina: 30
    powiat: 50
    wojewodztwo: 150
  confidence:
    publish_min: 0.40
    active_min: 0.60
    verified_min: 0.70
    high: 0.85
  recency_months:
    fresh: 6
    aging: 12
    old: 24
  freshness_ttl_months:
    confirmed: 24
    probable: 12
    unverified: 6
    candidate: 12
  lifecycle:
    absences_to_confirm: 2
    full_snapshot_runs_for_removal: 3
    removal_grace_days: 90
    suspicious_drop_ratio: 0.5
  dedup:
    auto_merge: 0.80
    review_min: 0.60
    cluster_radius_m: 50
    max_device_distance_m: 5
  review:
    quarantine_ttl_days: 180
    defer_default_days: 30
  publication:
    require_license: true
    require_coords: true
    max_export_age_months: 24
```

Progi są wersjonowane razem z dokumentem. Zmiana progu wymaga testu regresji
i wpisu w changelogu.

### 7.4 Wersjonowanie i wdrożenie

1. `rules_version` i `normalization_version` są zapisane w każdym
   `record_decision`.
2. Nowa wersja reguł uruchamia `dry_run` na 100% bazy, ale nie publikuje.
3. Raport `dry_run` porównuje decyzje stare vs nowe, liczbę nowych kwarantann
   i zmian pewności.
4. Jeśli różnica > 5% rekordów, wymagany review przed wdrożeniem.
5. Po akceptacji uruchom `recompute` partiami, z idempotencją.
6. Nie zmieniaj `aed_id` przy zmianie reguł.
7. Rollsback: wróć do poprzedniego `rules_version` i przelicz ponownie.
8. Każda migracja Drizzle jest wersjonowana i sprawdzona na kopii `dev.db`.

### 7.5 Kolejność wdrożenia

| Krok | Zakres | Zależy od |
| ---: | --- | --- |
| 1 | tabele `evidence_family`, `source_presence`, `record_decision`, `validation_issue` | schemat z §13 |
| 2 | silnik reguł + fixtures 1-28 | ten dokument, §3 |
| 3 | lifecycle + fixtures L1-L15 | §4 |
| 4 | confidence + fixtures C1-C15 | §5 |
| 5 | review queue + fixtures Q1-Q16 | §6 |
| 6 | raporty i bramka eksportu | §6, `backend/gov-api` |
| 7 | UI kolejki i panel szczegółów | `frontend/map` |

Nie zaczynaj od UI. Najpierw reguły, dane i raporty, bo UI bez jakości pokaże
piękną mapę z błędnymi punktami.

---

## 8. Decyzje otwarte i ryzyka

### 8.1 Decyzje do podjęcia

| # | Decyzja | Domyślna propozycja | Właściciel |
| ---: | --- | --- | --- |
| D1 | Czy publikować `removed` w API z `include_removed=true`? | tak, ale nie w mapie i nie w CSV | product owner |
| D2 | Czy publiczny próg pewności to 0,40 czy 0,50? | 0,40 dla mapy, 0,50 dla eksportu | product owner |
| D3 | Czy geokodować listy HTML bez współrzędnych? | tak, tylko z jawnym adresem i precyzją 200 m | data lead |
| D4 | Czy dopuścić `dispatcher` do eksportu publicznego? | tak, bez numeru telefonu | prawnik |
| D5 | Czy publikować e-mail organizacyjny z imieniem? | nie, do restricted | prawnik |
| D6 | Czy OSM i OpenAEDMap mogą być osobnymi zasobami w jednym datasecie? | tak, ale jedna rodzina dowodowa | data lead |
| D7 | Jak długo trzymać `source_record`? | 24 miesiące, potem archiwum | prawnik |
| D8 | Czy `candidate` ma być widoczny w adminie? | tak, w warstwie „do weryfikacji” | product owner |
| D9 | Czy automatycznie scalać przy 0,80? | tak, tylko bez konfliktu tożsamości | data lead |
| D10 | Czy dopuścić wiele `aed` w jednym `facility`? | tak, zawsze | architekt |

### 8.2 Ryzyka

1. **Kwarantanna może stać się wysypiskiem.** Bez SLA i raportów backlog rośnie
   i nikt nie wraca do rekordów. Mitygacja: alerty, tygodniowy przegląd,
   automatyczne wygaszanie.
2. **Fałszywe scalenie jest gorsze niż duplikat.** Próg 0,80 i zakaz scalania
   różnych seriali minimalizują ryzyko, ale review musi być dostępny.
3. **Źródła znikają.** KML, HTML i API bez umowy mogą przestać działać.
   Mitygacja: snapshoty, `source_health`, brak automatycznego usuwania.
4. **Licencje są niespójne.** Przemyśl CC BY vs CC0, OSM ODbL. Mitygacja:
   rejestr źródeł, manifest eksportu, decyzja o licencji całości.
5. **Pewność może być myląca.** Wysoka pewność jednego źródła nie oznacza
   prawdy. UI musi pokazywać źródło i datę, nie tylko procent.
6. **Dane osobowe.** E-maile i telefony opiekunów. Mitygacja: redakcja,
   restricted fields, retencja.
7. **Brak centralnego rejestru.** System nie stworzy kompletności. Raporty
   muszą mówić „brak danych”, nie „brak AED”.
8. **Zmiana schematu źródła.** Nowe pole lub zmiana nazwy może cicho wyzerować
   dane. Mitygacja: schema drift detection i `parse.columns.count_mismatch`.
9. **Wydajność.** 18 tys. rekordów OSM + lokalne to nie big data, ale
   re-normalizacja całej bazy przy każdej zmianie reguł może być kosztowna.
   Mitygacja: partie, idempotencja, indeksy.
10. **Rozjazd dokumentów.** Ten dokument musi być spójny z dokumentem
    nadrzędnym. Zmiana enuma lub wzoru wymaga aktualizacji obu.

### 8.3 Changelog

| Wersja | Data | Zmiana |
| --- | --- | --- |
| 0.1 | 2026-11-21 | pierwszy draft: pipeline, reguły pól, lifecycle, pewność, review, raporty |
| 1.0 | 2026-11-21 | integracja z dokumentem nadrzędnym, fixtures, DDL, bramka eksportu |

---

> **Uwaga końcowa:** ten dokument jest wykonawczy, ale nie jest kodem. Przed
> implementacją należy potwierdzić decyzje z §8.1, szczególnie próg publikacji,
> politykę `removed` i geokodowanie. Reguły należy wdrażać od danych do UI,
> z fixtures i raportem `dry_run` przed każdą zmianą wersji.
