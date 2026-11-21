# Google My Maps jako źródło AED: eksport KML

Data: 2026-11-21
Status: `Verified` dla wymienionych map i liczb punktów.

## 1. Dlaczego to ważne

Wiele gmin osadza mapę AED jako **Google My Maps** (`google.com/maps/d/embed?mid=...`). Mapa nie jest API, ale Google udostępnia nieudokumentowany eksport KML:

```text
https://www.google.com/maps/d/kml?mid={MID}&forcekml=1
```

Dla map punktowych KML zawiera `Placemark` z `name`, `description` i `coordinates` w układzie `lon,lat,alt`. To wystarcza, aby zbudować rekordy `aed` i `facility` bez scrapingowania JavaScriptu.

## 2. Potwierdzone mapy

| JST | `mid` | Placemarki | Geometria | Punkty AED | Pola | Licencja |
| --- | --- | ---: | --- | ---: | --- | --- |
| Łódź | `1FMKFbebKJPYqD4C87pXWPqNjEHuEswE` | 136 | `Point` | 136 | `name` = `defibrylator - <adres>`, `description` = dostęp (np. `wewnątrz`), `coordinates` | brak, ToS Google |
| Bełchatów | `171VXaQTmWbIPbtUvHfuzwQredJE3krA` | 32 | `Point` | 32 | `name` = obiekt + ulica, `coordinates` | brak, ToS Google |
| Pawłowice | `1DSs_ESjkEU6AaxZjgpLgwtk5tlG11gc` | 12 | `Point` | 12 | `name` = obiekt, `description` = adres, `coordinates` | brak, ToS Google |
| Bydgoszcz | `1_gVCuQGcZRIviaAxxvbjC02u33s` | 114 | brak geometrii | 0 | `name` = adres, `ExtendedData` = `NR`, `INSTYTUCJA` | brak, ToS Google |
| Piła | `15xg0I18PBJ0QZ48TCXPfNzfLkVOCfNSo` | 97 | `Polygon` | 0 | nazwy osiedli, zasięgi, nie punkty AED | brak, ToS Google |

Mapy bez związku z AED, znalezione tym samym skanem:

| JST | `mid` | Co zawiera |
| --- | --- | --- |
| Walim | `1HIsAY5TFC0uxD6pTbDRxickSGKkmKe8` | szlaki turystyczne `LegendMan` |
| Michałowice | `12W5_hrDNsRVXr68XJSTrCj87fNQX6AUf` | inwestycje gminne |

Wniosek: sam `mid` nie wystarcza. Trzeba sprawdzić nazwę dokumentu, nazwy `Placemark` i typ geometrii.

## 3. Struktura KML

Przykład z Łodzi:

```xml
<Placemark>
  <name>defibrylator - ul. Złotnicza 10, 91-836 Łódź</name>
  <description><![CDATA[wewnątrz]]></description>
  <styleUrl>#icon-1899-...</styleUrl>
  <Point>
    <coordinates>19.4632551,51.7899422,0</coordinates>
  </Point>
</Placemark>
```

Przykład z Bydgoszczy (brak geometrii):

```xml
<Placemark>
  <name>Bydgoszcz ul. Jezuicka 1</name>
  <address>Bydgoszcz ul. Jezuicka 1</address>
  <description><![CDATA[NR: 1<br>INSTYTUCJA: Urząd Miasta Bydgoszczy (portiernia)]]></description>
  <ExtendedData>
    <Data name="NR"><value>1.0</value></Data>
    <Data name="INSTYTUCJA"><value>Urząd Miasta Bydgoszczy (portiernia)</value></Data>
  </ExtendedData>
</Placemark>
```

Przykład z Piły (wielokąt zasięgu):

```xml
<Placemark>
  <name>Podlasie</name>
  <description>Osiedle Podlasie</description>
  <Polygon>
    <outerBoundaryIs>
      <LinearRing>
        <coordinates>16.7648466,53.1669384,0 ...</coordinates>
      </LinearRing>
    </outerBoundaryIs>
  </Polygon>
</Placemark>
```

## 4. Parsowanie

Minimalny parser:

1. Pobierz KML.
2. Dla każdego `Placemark`:
   - `name` i `description`,
   - `Point/coordinates` (pierwsza para to `lon,lat`),
   - `Polygon` i `LineString` odrzuć, jeśli szukasz punktów AED.
3. Odfiltruj placemarki, których `name` nie zawiera `AED`, `defibryl`, `defibrylator` ani adresu.
4. Znormalizuj `name`:
   - usuń prefiks `defibrylator - `,
   - rozdziel obiekt i adres, jeśli to możliwe,
   - zostaw pełną nazwę w `facility.name`, jeśli nie da się rozdzielić.
5. Zapisz `source_record.external_id = "{mid}:{index}"` albo `"{mid}:{name}"`.
6. Ustaw `source.kind = 'kml'`, `source.format = 'KML'`, `source.license = 'unknown'`.
7. `confidence` obniż o 0.1, bo to mapa edytowalna, bez wersjonowania i bez daty.

## 5. Pułapki

- **Brak geometrii**: Bydgoszcz ma 114 placemarków bez `coordinates`. To lista adresów, nie mapa punktowa. Nie można jej importować jako `aed` bez geokodowania.
- **Wielokąty**: Piła ma 97 `Polygon` opisujących zasięgi osiedli. To nie są lokalizacje AED.
- **Mapy tematyczne**: Walim i Michałowice mają `mid`, ale dotyczą szlaków i inwestycji.
- **Kolejność osi**: KML zawsze `lon,lat`, ale w HTML i CSV bywa odwrotnie. Sprawdź zakres: dla Polski `lat` 49-55, `lon` 14-24.
- **Brak licencji**: Google My Maps nie daje licencji na dane. Stopka gminy często mówi „wszystkie prawa zastrzeżone”. Import do aplikacji może wymagać zgody wydawcy.
- **Endpoint nieudokumentowany**: `forcekml=1` może przestać działać. Nie buduj na nim jedynego kanału harvestingu.
- **Brak daty**: KML nie ma `last_modified`. Nie wiadomo, kiedy mapa była aktualizowana.

## 6. Mapowanie na schemat

| Pole KML | Pole kanoniczne | Uwagi |
| --- | --- | --- |
| `Document/name` | `source.title` | np. `AED w Bydgoszczy` |
| `mid` | `source.external_id` | identyfikator mapy |
| `Placemark/name` | `facility.name` lub `aed.label` | zależy od formatu |
| `Placemark/description` | `observation.notes`, `aed.access` | często HTML |
| `Point/coordinates` | `aed.lon`, `aed.lat` | `lon,lat,alt` |
| `Placemark/address` | `facility.address` | jeśli występuje |
| `ExtendedData/Data` | `source_record.raw` | zachowaj jako JSON |
| brak | `source.license` | `unknown` |
| brak | `observation.observed_at` | `NULL` |

## 7. Reprodukcja

```bash
# Łódź
curl -sS "https://www.google.com/maps/d/kml?mid=1FMKFbebKJPYqD4C87pXWPqNjEHuEswE&forcekml=1" -o lodz.kml
grep -c "<Placemark>" lodz.kml
grep -c "<coordinates>" lodz.kml

# Bełchatów
curl -sS "https://www.google.com/maps/d/kml?mid=171VXaQTmWbIPbtUvHfuzwQredJE3krA&forcekml=1" -o belchatow.kml

# Pawłowice
curl -sS "https://www.google.com/maps/d/kml?mid=1DSs_ESjkEU6AaxZjgpLgwtk5tlG11gc&forcekml=1" -o pawlowice.kml
```

## 8. Ocena

Google My Maps KML to **najlepszy dostępny format** dla map osadzonych na stronach gmin, ale tylko wtedy, gdy mapa ma geometrię punktową. Dla Łodzi, Bełchatowa i Pawłowic daje odpowiednio 136, 32 i 12 punktów z współrzędnymi. Dla Bydgoszczy daje listę 114 adresów bez geometrii. Dla Piły daje zasięgi, nie punkty.

Traktuj KML jako **źródło klasy A bez licencji**: dane są użyteczne do weryfikacji i seedowania, ale nie do masowego redystrybuowania bez zgody wydawcy.
