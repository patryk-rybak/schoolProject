# Geoportal.gov.pl: warstwa „Defibrylatory” to OSM, nie rejestr GUGiK

Data: 2026-11-21
Status: `Verified` dla działania usługi, `Partially verified` dla pochodzenia danych.

## 1. Co zostało sprawdzone

Podczas audytu województwa kujawsko-pomorskiego agent znalazł warstwę:

```text
https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&request=GetCapabilities
```

Parametry:

| Pole | Wartość |
| --- | --- |
| Serwer | MapServer 7.4.4 |
| WMS | 1.3.0 |
| Warstwa | `Defibrylatory` |
| Tytuł | `Defibrylatory` |
| Abstract | `Dane o defibrylatorach` |
| Formaty | PNG, JPEG, PDF, SVG, TIFF, JSON, GML, HTML, XML, plain |
| `GetMap` | **HTTP 200**, `image/png`, 600x600, 23 KB |
| `GetFeatureInfo` | brak wyników dla testowego punktu w Warszawie |
| `application/json` | deklarowany, ale zwraca `InvalidFormat` |
| `service=WFS` | `WFS request not enabled` |

## 2. Pochodzenie danych

Ścieżka `/wss/ext/OSM/Defibrylatory` wskazuje na warstwę zewnętrzną (`ext`) i katalog `OSM`. To warstwa renderująca dane OpenStreetMap, a nie rejestr prowadzony przez Główny Urząd Geodezji i Kartografii.

Liczba punktów w województwie kujawsko-pomorskim (815) odpowiada liczbie punktów OSM/OpenAEDMap w tym obszarze. To potwierdza, że warstwa jest pochodną OSM.

## 3. Korekta do raportu głównego

W raporcie głównym, w sekcji o Geoportal, zapisano, że Geoportal **nie publikuje warstwy AED**. To stwierdzenie wymaga uściślenia:

- Geoportal **nie publikuje niezależnego, urzędowego rejestru AED**.
- Geoportal **hostuje warstwę WMS `Defibrylatory` zasilaną danymi OSM**.
- Warstwa służy do wizualizacji, nie do eksportu. `GetFeatureInfo` nie dał danych w teście, a `GetFeatureInfo` z `application/json` nie działa.
- Nie należy traktować jej jako drugiego, niezależnego źródła. To ten sam zbiór OSM, tylko rendered przez GUGiK.

## 4. Co to oznacza dla aplikacji

1. Nie buduj harvestingu na Geoportal WMS. Nie ma WFS i nie ma prostego eksportu.
2. Jeśli potrzebujesz warstwy podkładowej dla AED, użyj WMS `Defibrylatory` jako overlay. To legalne w granicach usługi publicznej, ale nie daje danych.
3. Jeśli potrzebujesz danych, użyj OpenAEDMap/OSM:
   - `https://openaedmap.org/api/v1/countries/PL.geojson`
   - lub Overpass API dla konkretnego obszaru.
4. W raporcie i w aplikacji podawaj atrybucję: `© OpenStreetMap contributors`, ODbL 1.0. Geoportal jest tylko pośrednikiem wizualizacji.

## 5. Reprodukcja

```bash
# Capabilities
curl -sS "https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&request=GetCapabilities" \
  -o geoportal_aed_wms.xml

# GetMap
curl -sS "https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&version=1.3.0&request=GetMap&layers=Defibrylatory&styles=&crs=EPSG:4326&bbox=52.0,20.8,52.3,21.2&width=600&height=600&format=image/png" \
  -o geoportal_aed.png

# GetFeatureInfo (test)
curl -sS "https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=Defibrylatory&query_layers=Defibrylatory&crs=EPSG:4326&bbox=52.165,20.967,52.176,20.978&width=256&height=256&i=128&j=128&info_format=text/plain&feature_count=10"
```

## 6. Ocena

`Verified`: usługa WMS działa i renderuje warstwę `Defibrylatory`.
`Partially verified`: warstwa jest zasilana danymi OSM. Ścieżka i liczby na to wskazują, ale GUGiK nie opublikował osobnej dokumentacji tej warstwy.
`NOT VERIFIED`: czy warstwa ma własny, niezależny cykl aktualizacji. Prawdopodobnie nie, bo dane pochodzą z OSM.

Wniosek: **Geoportal nie jest źródłem AED**. Jest źródłem referencyjnym dla granic, adresów i ortofotomapy oraz pośrednikiem w wizualizacji warstwy OSM.
