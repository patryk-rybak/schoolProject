# Audyt rejestrów AED w polskich JST: metoda i pokrycie

Data: 2026-11-21
Zakres: 16 województw, 314 powiatów, 66 miast na prawach powiatu, gminy miejskie, miejsko-wiejskie i wiejskie.
Status: `Verified` dla pobranych stron i plików, `Partially verified` dla klasyfikacji opartych na snippetach, `NOT VERIFIED` dla jednostek bez publicznej strony.

## 1. Po co ten audyt

Raport główny (`../../aed-data-sources-common-schema.md`) odpowiada na pytanie, jakie są ogólnokrajowe źródła AED. Ten audyt odpowiada na pytanie uzupełniające: czy każda polska jednostka samorządu terytorialnego (JST) prowadzi publiczny rejestr AED i w jakiej formie.

Wynik nie jest listą wszystkich AED w Polsce. Jest listą **miejsc, w których taki rejestr istnieje**, oraz listą **wzorców technologicznych**, które można wykorzystać do harvestingu.

## 2. Lista jednostek

Listę zbudowano z Wikidata zapytaniem SPARQL o jednostki z Polski (`P17 = Q36`), które mają stronę internetową (`P856`) i typ należący do jednej z klas: gmina, powiat, województwo, miasto na prawach powiatu.

Plik: `/home/zdziszkee/.jcode/scratch/jst_units.csv`

| Kategoria | Liczba |
| --- | ---: |
| gminy wiejskie | 1 418 |
| gminy miejsko-wiejskie | 713 |
| powiaty | 314 |
| gminy miejskie | 232 |
| miasta na prawach powiatu | 66 |
| województwa | 16 |
| `gmina` bez podtypu | 6 |
| **Razem** | **2 765** |

Uwagi:

- To nie jest pełny rejestr 2 807 JST. Brakuje około 108 gmin, które nie mają strony w Wikidata albo mają stronę nieoznaczoną w `P856`. Pokrycie gmin wynosi około 95,6%, pokrycie powiatów 314/314, województw 16/16, miast na prawach powiatu 66/66.
- Etykiety województw w Wikidata są zaszumione. Przykład: Choroszcz (powiat białostocki) został oznaczony jako `zachodniopomorskie`. W surowych plikach lane'ów może więc występować jednostka z innego województwa. W raporcie końcowym jednostki są grupowane po faktycznym województwie, nie po etykiecie z pliku.
- 5 jednostek nie ma przypisanego województwa. Są ujęte w pliku `candidates2_*.json` jako osobna grupa.

## 3. Skan stron

Skrypt: `/home/zdziszkee/.jcode/scratch/scan_jst.py`

Zasady:

- `robots.txt` sprawdzany i cache'owany,
- timeout 4 s na żądanie,
- limit 1,5 MB na odpowiedź,
- 64 równoległe wątki,
- priorytet: województwa, miasta na prawach powiatu, powiaty, potem gminy,
- brak logowania, brak omijania autoryzacji, brak scrape'owania danych prywatnych.

Skan pobierał stronę główną, `sitemap.xml` (jeśli była), wyszukiwarkę gminną (`?s=defibrylator`, `?szukaj=...`) oraz linki wewnętrzne, których tekst zawierał `defibryl`, `AED` lub `defibrylator`.

Wynik:

| Metryka | Liczba |
| --- | ---: |
| jednostki ze stroną | 2 765 |
| jednostki z co najmniej jednym trafieniem | 947 |
| jednostki bez trafienia | 1 818 |
| jednostki z `score >= 5` | 101 |
| jednostki z `registry_hint = 1` | 173 |

Plik: `/home/zdziszkee/.jcode/scratch/scan_full.jsonl`
Plik zbiorczy: `/home/zdziszkee/.jcode/scratch/all_units_status.csv`

## 4. Drugi przebieg i scoring

Skrypt: `/home/zdziszkee/.jcode/scratch/refine_hits.py`

Drugi przebieg pobrał strony trafień i liczył wystąpienia `defibryl`, wykrywał frazy typu „brak wyników”, „nie znaleziono”, „0 wyników”. Dał 947 jednostek i 898 flag „strong”. Próg był zbyt luźny, bo wyszukiwarki gminne często zwracają echo zapytania albo pojedynczy news.

Skrypt: `/home/zdziszkee/.jcode/scratch/prepare_lanes2.py`

Scoring łączył:

- liczbę wystąpień `defibryl`/`AED`,
- obecność słów `rejestr`, `wykaz`, `lista`, `mapa`, `lokalizacje`,
- linki do plików CSV/JSON/GeoJSON/XLSX/PDF,
- typ jednostki (województwo, miasto, powiat),
- `registry_hint`, `dataset_hint`, `news_hint`.

Wynik: 16 plików `candidates2_{wojewodztwo}.json`, 173 `registry_hint`, 101 `score >= 5`.

## 5. Weryfikacja agentowa

Uruchomiono 16 agentów, po jednym na województwo. Każdy dostał plik kandydatów i zadanie:

1. Odrzucić echo wyszukiwarki i pojedyncze newsy.
2. Otworzyć strony o `score >= 5` lub `registry_hint`.
3. Sprawdzić urząd marszałkowski i miasto wojewódzkie.
4. Dla każdego rejestru podać URL, liczbę punktów, pola, format, licencję, współrzędne.
5. Zapisać `AED/docs/research/raw/voivodeships/{wojewodztwo}.md` i `.csv`.

Klasy:

- **A**: maszynowy zbiór lub API z lokalizacjami AED (CSV, JSON, GeoJSON, XLSX, KML, WMS/WFS, ArcGIS).
- **B**: oficjalna strona lub PDF z listą albo mapą wielu AED, bez maszynowego eksportu.
- **B+**: HTML-owa tabela lub lista z współrzędnymi; można ją sparsować do A niewielkim kosztem.
- **C**: pojedyncza wzmianka, news, zakup, szkolenie, link do zewnętrznej mapy.
- **D**: brak danych, brak wyników, fałszywy alarm.

## 6. Ogólnokrajowy ekstraktor treści

Skrypt: `/home/zdziszkee/.jcode/scratch/audit_content.py`

Z 947 jednostek wybrano 131 adresów, których ścieżka zawiera `aed` lub `defibryl` i nie jest wyszukiwarką. Pobrano 87 unikalnych stron (niektóre zwróciły błąd) i sprawdzono:

- liczbę wystąpień `defibryl`/`AED`,
- adresy (`ul.`, `al.`, `pl.` + numer),
- kody pocztowe,
- osadzone mapy Google My Maps (`mid=`),
- osadzone mapy e-mapa.net,
- ArcGIS, Mapy.cz, OSM,
- linki do CSV/JSON/GeoJSON/KML/XLSX/PDF,
- liczbę wierszy tabel.

Plik: `/home/zdziszkee/.jcode/scratch/content_audit.jsonl`

Wynik:

| Wzorzec | Liczba stron |
| --- | ---: |
| Google My Maps z `mid` | 3 |
| e-mapa.net | 25 |
| HTML z współrzędnymi w treści | 3 |
| tabela HTML z wieloma wierszami | 12 |

## 7. Skan map osadzonych na stronach głównych

Skrypt: `/home/zdziszkee/.jcode/scratch/scan_top_maps.py`

Pobrano strony główne 947 jednostek z trafieniem i wyszukano `mid=` oraz `e-mapa.net`.

Wynik:

| Wzorzec | Liczba jednostek |
| --- | ---: |
| Google My Maps `mid` | 2 |
| e-mapa.net | 215 |

Google My Maps jest rzadkie na stronach głównych. e-mapa jest dominującym systemem GIS w gminach, ale warstwa AED jest w nim tylko w części instancji.

## 8. Weryfikacja KML

Dla każdego znalezionego `mid` pobrano:

```text
https://www.google.com/maps/d/kml?mid={MID}&forcekml=1
```

Sprawdzono nazwę dokumentu, liczbę `Placemark`, obecność `coordinates` i nazwy punktów. To pozwoliło odróżnić:

- **mapy punktowe AED** (Łódź 136, Bełchatów 32, Pawłowice 12),
- **mapy zasięgu** (Piła, 97 wielokątów osiedli, nie punkty AED),
- **mapy tematyczne bez AED** (Walim, Michałowice),
- **listy adresowe bez geometrii** (Bydgoszcz, 114 placemarków bez `coordinates`).

Plik: `google-my-maps-kml.md`

## 9. Weryfikacja Geoportal

Sprawdzono warstwę:

```text
https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&request=GetCapabilities
```

Wynik: usługa WMS 1.3.0 działa, `GetMap` zwraca PNG. Warstwa jest **zasilana danymi OSM**, nie jest niezależnym rejestrem GUGiK. `GetFeatureInfo` nie zwrócił danych dla testowego punktu, a `application/json` nie jest obsługiwany mimo deklaracji w capabilities. Szczegóły: `geoportal-osm-wms.md`.

## 10. Ograniczenia

- Nie wszystkie JST mają stronę WWW. 108 gmin z oficjalnego rejestru nie weszło do skanu.
- Wyszukiwarki gminne są słabe. Wiele trafień to echo zapytania, a nie treść.
- Część stron blokuje boty albo zwraca 403. Nie obchodzono zabezpieczeń.
- Google My Maps KML jest nieudokumentowanym endpointem. Może zniknąć.
- e-mapa ładuje dane przez JavaScript. Bez headless browsera nie ma prostego eksportu.
- Współrzędne w HTML bywają podane w kolejności `lat, lon` lub `lon, lat`. Przed importem trzeba sprawdzić zakres i znak.
- Licencje rejestrów gminnych są najczęściej nieokreślone. To nie znaczy, że dane są wolne. Oznacza, że ponowne użycie wymaga kontaktu z wydawcą.

## 11. Reprodukcja

```bash
# 1. Skan JST
python3 /home/zdziszkee/.jcode/scratch/scan_jst.py --csv /home/zdziszkee/.jcode/scratch/jst_units.csv

# 2. Drugi przebieg
python3 /home/zdziszkee/.jcode/scratch/refine_hits.py

# 3. Scoring i lane'y
python3 /home/zdziszkee/.jcode/scratch/prepare_lanes2.py

# 4. Ekstraktor treści
python3 /home/zdziszkee/.jcode/scratch/audit_content.py

# 5. Skan map na stronach głównych
python3 /home/zdziszkee/.jcode/scratch/scan_top_maps.py

# 6. KML dla wybranego mid
curl -sS "https://www.google.com/maps/d/kml?mid={MID}&forcekml=1" -o mapa.kml

# 7. Geoportal WMS
curl -sS "https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&request=GetCapabilities"
```

## 12. Pliki wynikowe

| Plik | Zawartość |
| --- | --- |
| `national-registries.md` | tabela potwierdzonych rejestrów A/B |
| `national-registries.csv` | ta sama tabela w CSV |
| `google-my-maps-kml.md` | analiza KML i pułapek |
| `geoportal-osm-wms.md` | korekta dotycząca warstwy Geoportal |
| `{wojewodztwo}.md` | raport agenta dla województwa |
| `{wojewodztwo}.csv` | klasyfikacja A/B/C/D dla województwa |
