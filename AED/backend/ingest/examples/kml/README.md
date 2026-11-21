# Konfiguracje KML (Google My Maps)

Osiem konfiguracji JSON zgodnych z
[`../../source-config.schema.json`](../../source-config.schema.json). Sześć to
punktowe mapy AED, dwie pozostałe pokrywają przypadki brzegowe: listę adresową
bez geometrii (Bydgoszcz) i dokument z wielokątami zasięgu (Piła).

Wszystkie wpisy mają `source.enabled: false` i `publish.enabled: false`, bo
Google My Maps nie daje licencji na dane, a endpoint `forcekml=1` jest
nieudokumentowany. Konfiguracja jest gotowa do dry-runu i shadow, ale aktywacja
wymaga decyzji licencyjnej (bramka G2).

## Spis plików

| Plik | `mid` | Dokument KML | Placemarki | Point | Polygon | Bez geometrii |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `zielona-gora.json` | `1WXrqKMAgKA_kzG5aF6bMiXpaFVA` | `AED w Zielonej Górze` | 165 | 165 | 0 | 0 |
| `lodz.json` | `1FMKFbebKJPYqD4C87pXWPqNjEHuEswE` | `defibrylatory AED` | 136 | 136 | 0 | 0 |
| `olsztyn.json` | `1J5zJj9kL49uq8799g5qNgfl21NoztwzK` | `Mapa ogólnodostępnych defibrylatorów AED w Olsztynie` | 43 | 43 | 0 | 0 |
| `belchatow.json` | `171VXaQTmWbIPbtUvHfuzwQredJE3krA` | `Wykaz defibrylatorów AED na terenie Bełchatowa` | 32 | 32 | 0 | 0 |
| `pawlowice.json` | `1DSs_ESjkEU6AaxZjgpLgwtk5tlG11gc` | `Defibrylatory AED - Gmina Pawłowice` | 12 | 12 | 0 | 0 |
| `tczew.json` | `1FJwYx26MGn5rWzS6mN2GJN_OZvy-EzY` | `AED Tczew` | 13 | 13 | 0 | 0 |
| `bydgoszcz-no-geometry.json` | `1_gVCuQGcZRIviaAxxvbjC02u33s` | `AED w Bydgoszczy` | 114 | 1 | 1 | 111 |
| `pila-polygons.json` | `15xg0I18PBJ0QZ48TCXPfNzfLkVOCfNSo` | `Pilska Sieć AED` | 97 | 25 | 9 | 63 |

Liczby pochodzą z próby endpointów wykonanej 2026-11-21. Różnią się od
wcześniejszego audytu w trzech miejscach:

1. Tczew ma 13 punktów, nie 12.
2. Piła ma 25 punktów, 9 polygonów i 63 placemarki bez geometrii, a nie same
   97 polygonów. Polygony nadal nie są AED, ale dokument nie jest czysto
   polygonowy.
3. Bydgoszcz ma 1 `Point`, 1 `LineString`, 1 `Polygon` i 111 placemarków bez
   geometrii. To nadal lista adresowa, nie mapa punktowa.

## Pola KML w schemacie

`parse.kml` rozszerzono o pola, których wymaga parser:

| Pole | Znaczenie |
| --- | --- |
| `point_only` | Odrzuca `Polygon`, `LineString` i inne geometrie niepunktowe. |
| `document_name_must_match` | Wymaga dokładnej zgodności `Document/name`. Chroni przed podmianą mapy pod tym samym `mid`. |
| `document_name_pattern` | Alternatywa regex dla dokumentów, których nazwa zmienia się między snapshotami. |
| `placemark_name_pattern` | Opcjonalny filtr nazw placemarków, np. prefiks `defibrylator - `. |
| `require_coordinates` | Placemark bez `Point/coordinates` nie może stać się rekordem AED. |
| `on_missing_geometry` | `reject`, `review` albo `skip` dla placemarku bez geometrii. |
| `on_non_point_geometry` | `reject`, `review` albo `skip` dla polygonu/linii. |
| `min_point_ratio` | Minimalny udział punktów wśród placemarków z geometrią. |
| `on_low_point_ratio` | `warn`, `review` albo `fail`, gdy udział punktów spadnie poniżej progu. |
| `extended_data_as_object` | Zamienia `ExtendedData/Data[@name]/value` na obiekt `ExtendedData: {name: value}`. |
| `strip_cdata` | Usuwa `CDATA` z `name` i `description`. |
| `description_format` | `text` albo `html`. Dla `html` mapowanie używa `strip_html`. |

Definicja `min_point_ratio`:

```text
points / (points + non_point_geometries)
```

Placemarki bez geometrii nie wchodzą do mianownika, bo są osobną kategorią
obsługiwaną przez `require_coordinates` i `on_missing_geometry`. Dla Piły
wskaźnik wynosi `25 / (25 + 9) = 0.735`, więc przy `min_point_ratio: 1.0`
przebieg trafia do `review`. Dla Bydgoszczy `1 / 3 = 0.333`.

## Tożsamość rekordu KML

KML nie ma stabilnego identyfikatora. Reguła jest deterministyczna i nie zależy
od kolejności placemarków w dokumencie:

```text
source_record_id = "{source_id}:kml:{sha256(parts)[0:16]}"
parts            = normalized_name | normalized_lon | normalized_lat
```

Normalizacja części:

- `name`: trim, zwijanie białych znaków, usunięcie `CDATA`, Unicode NFC. Case
  pozostaje bez zmian, bo nazwy obiektów mogą różnić się wielkością liter.
- `lon`, `lat`: liczba dziesiętna z 7 miejscami po kropce, z jawnym znakiem.
  KML zawsze ma kolejność `lon,lat[,alt]`; `alt` jest ignorowane.
- separator części: `|`.

Konfiguracje używają funkcji DSL `stable_hash`, która składa argumenty w ten
sposób i zwraca pierwsze 16 znaków hex SHA-256. `template` dokłada prefiks
`{source_id}:kml:` z `builtin: source_id`.

Dla Bydgoszczy, gdzie nie ma współrzędnych, hash obejmuje
`name | address | ExtendedData.NR | ExtendedData.INSTYTUCJA`. To jedyny
przypadek, w którym tożsamość opiera się na adresie, i dlatego config nie może
utworzyć rekordu AED.

Zasady:

1. `identity.stable: false`, bo KML nie gwarantuje niezmienności nazwy ani
   współrzędnych. Normalizacja liczy `aed_id` jako
   `UUIDv5(namespace, source_record_id)`.
2. `dedupe.key` używa tej samej pary `name` + `coordinates`, a nie samego
   `name`, bo dwie instytucje mogą mieć identyczną nazwę w różnych miejscach.
3. Kolizja dokładnie tej samej trójki w jednym snapshocie to
   `id.source_record.duplicate_conflict` i `quarantine` dla obu rekordów, nie
   cichy wybór zwycięzcy. `dedupe.on_duplicate: warn` tylko sygnalizuje
   identyczny payload.
4. Indeks placemarku nie jest częścią tożsamości. Kolejność w KML może się
   zmienić przy każdej edycji mapy.
5. Edycja nazwy albo współrzędnych zmienia `source_record_id`. Dla źródła bez
   licencji i bez daty jest to akceptowalne: diff pokaże usunięcie i dodanie,
   a nie fałszywą aktualizację tego samego urządzenia.

## Rozwiązywanie pól XML

Mapowanie używa dot-pathów po drzewie XML:

- `name` to `Placemark/name`,
- `description` to `Placemark/description`,
- `address` to `Placemark/address`,
- `coordinates` to pierwszy `Point/coordinates`,
- `ExtendedData.NR` to `Placemark/ExtendedData/Data[@name="NR"]/value`.

`extended_data_as_object: true` sprawia, że cały `ExtendedData` jest również
dostępny w payloadzie rekordu. `field` zwraca `null`, gdy elementu nie ma; nie
zgaduje wartości.

## Mapowanie na model kanoniczny

Wspólne dla sześciu map punktowych:

| Pole kanoniczne | Źródło |
| --- | --- |
| `name` | `Placemark/name`, z usunięciem prefiksu w Łodzi i Pawłowicach |
| `description` | `Placemark/description` (HTML zamieniony na tekst) |
| `lat`, `lon` | `Point/coordinates`, `format: kml` |
| `coord_precision_m` | `15` (jawna wartość dla KML) |
| `country_code` | `PL` |
| `device_type` | `public_aed` |
| `status` | `unknown` |
| `verification_status` | `unverified` |
| `confidence` | `0.55` |
| `access_type` | `unknown` |

Dodatki per źródło:

| Źródło | Dodatkowe mapowanie |
| --- | --- |
| Zielona Góra | `description` to typ obiektu (szkoła, OSP). |
| Łódź | `indoor` z opisu (`wewnątrz`), `entrance_description` z opisu. |
| Olsztyn | brak opisu i ExtendedData. |
| Bełchatów | `photo_url` z `ExtendedData.gx_media_links`; `photo_license: unknown`. |
| Pawłowice | `description` mapowany na `address_text`. |
| Tczew | tylko `name` i współrzędne. |
| Bydgoszcz | `address_text`, `note` z `NR` i `INSTYTUCJA`, `verification_status: candidate`, `confidence: 0.35`. |
| Piła | `verification_status: candidate`, `confidence: 0.45`. |

Nie ustawiamy `last_verified_at` ani `source_updated_at`, bo KML nie ma daty
modyfikacji. Nie ustawiamy `operator_name`, `phone`, `opening_hours` ani
`access_type`, bo dokumenty ich nie zawierają. Brak danych to `null`, nie
wartość domyślna.

## Przypadki brzegowe

### Bydgoszcz: brak geometrii

`bydgoszcz-no-geometry.json` jest guardem, nie źródłem AED:

- `require_coordinates: true` i `on_missing_geometry: reject` odrzucają 111
  placemarków bez `Point/coordinates`.
- `point_only: true` i `on_non_point_geometry: reject` odrzucają `LineString`
  i `Polygon`.
- `min_point_ratio: 1.0` daje `review`, bo udział punktów wynosi 0.333.
- `drift.volume.min_records: 5` przy jednym punkcie daje `fail`, więc przebieg
  nie opublikuje nawet tego punktu.

Listę adresową można wykorzystać wyłącznie jako wejście do geokodowania i
weryfikacji, poza tym configiem. Nie wolno tworzyć `aed` bez współrzędnych.

### Piła: wielokąty zasięgu

`pila-polygons.json` rozdziela trzy kategorie:

- 25 `Point` to kandydaci na AED,
- 9 `Polygon` to zasięgi osiedli i są odrzucane przez `point_only`,
- 63 placemarki bez geometrii są odrzucane przez `require_coordinates`.

`min_point_ratio: 1.0` i `on_low_point_ratio: review` zapewniają, że dokument
zdominowany przez polygony nie przejdzie jako źródło punktowe. Próg
`volume.min_records: 20` przepuszcza 25 punktów, ale nie ukrywa spadku liczby
punktów poniżej 20.

## Walidacja

```bash
cd AED/backend/ingest
python3 - <<'PY'
import json, glob, sys
import jsonschema

schema = json.load(open("source-config.schema.json"))
jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
ok = True
for f in sorted(glob.glob("examples/kml/*.json")):
    try:
        v.validate(json.load(open(f)))
        print("OK  ", f)
    except jsonschema.ValidationError as e:
        ok = False
        print("FAIL", f, list(e.path), e.message)
sys.exit(0 if ok else 1)
PY
```

## Zasady operacyjne

1. Endpoint `https://www.google.com/maps/d/kml?mid={mid}&forcekml=1` jest
   nieudokumentowany. Jego awaria nie usuwa ostatniego snapshotu; źródło
   przechodzi w `failing`.
2. `document_name_must_match` jest obowiązkowe. Sam `mid` nie wystarcza, bo
   mapa może zostać podmieniona na inwestycje lub szlaki turystyczne.
3. Nie podnosimy `confidence` powyżej 0.55 bez niezależnego potwierdzenia.
   KML nie ma daty, wersji ani licencji.
4. Nie włączamy `publish` przed pisemną zgodą wydawcy. Google ToS nie jest
   licencją na redystrybucję danych.
5. Nowe mapy dodajemy jako nowy plik JSON, nie przez edycję istniejącego
   `source.id`. `source.id` jest niezmienne.

## Powiązane dokumenty

- [`../../source-config.schema.json`](../../source-config.schema.json) — schemat
  konfiguracji i rozszerzone pola `parse.kml`.
- [`../../../docs/ingest-source-config.md`](../../../docs/ingest-source-config.md)
  — DSL, rodziny connectorów i dryf.
- [`../../../docs/research/raw/voivodeships/google-my-maps-kml.md`](../../../docs/research/raw/voivodeships/google-my-maps-kml.md)
  — pierwotny audyt KML i pułapki.
- [`../../../docs/design/aed-data-quality-spec.md`](../../../docs/design/aed-data-quality-spec.md)
  — reguły identyfikacji i jakości KML.
