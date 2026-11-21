# Audyt źródeł AED: województwo kujawsko-pomorskie

Data audytu: 2026-11-21
Zakres: 44 jednostki z pliku `candidates2_kujawsko-pomorskie.json` (gminy), uzupełniająco Bydgoszcz, Toruń, Urząd Marszałkowski Województwa Kujawsko-Pomorskiego oraz źródła regionalne i krajowe.
Metoda: weryfikacja HTTP stron oficjalnych i wyszukiwarek gminnych, odczyt osadzonych map, test eksportu GeoJSON/OpenAEDMap i usługi WMS Geoportal.gov.pl, policzenie punktów OSM w granicach województwa (point-in-polygon na snapshocie OpenAEDMap). Nie zmieniano kodu i nie commitowano.

## 1. Wnioski w skrócie

1. **Brak wojewódzkiego rejestru AED.** Urząd Marszałkowski nie publikuje listy ani mapy defibrylatorów. W wynikach są wyłącznie newsy, zakupy sprzętu i dokumenty o szpitalach, bez lokalizacji AED.
2. **Nie ma ustawowego krajowego rejestru AED.** Jedynym spójnym, maszynowym zbiorem dla województwa jest OpenStreetMap / OpenAEDMap (klasa A, ODbL).
3. **Najlepsze listy urzędowe miast to Bydgoszcz i Toruń (klasa B).**
   - Bydgoszcz: oficjalna strona „ABC bezpieczeństwa”, sekcja VI, z osadzoną mapą Google My Maps oraz artykuł z listą 17 nowych lokalizacji (2025).
   - Toruń: oficjalny „Wykaz lokalizacji” z 46 adresami, bez współrzędnych.
4. **Kcynia (score 10, registry_hint) to jedyna gmina z listą w pliku kandydatów, ale słaba (B-).** Strona podaje 5 lokalizacji i 13 urządzeń; osadzona mapa Google My Maps zwraca 404, więc nie ma warstwy do pobrania.
5. **Pozostałe gminy z `registry_hint` to szum:** Strzelno i Lubanie bez trafień (D), Lisewo, Wielgie i Brzozie tylko newsy o zakupie lub szkoleniu (C).
6. **Geoportal.gov.pl udostępnia warstwę „Defibrylatory” tylko jako WMS (raster, bez WFS).** To dobra warstwa referencyjna i wizualizacja, ale nie jest to wektorowy eksport danych.

## 2. Skala klas

| Klasa | Znaczenie |
| --- | --- |
| A | Maszynowy zbiór lub API z wieloma punktami AED, możliwy do pobrania i przetworzenia. |
| B | Oficjalna strona lub PDF z listą/mapą wielu AED, ale bez otwartego, maszynowego eksportu. |
| C | Tylko wzmianka, news, zakup sprzętu lub szkolenie, bez wykazu lokalizacji. |
| D | Brak danych, brak trafień, fałszywy alarm lub źródło nie dotyczy AED. |

## 3. Źródła klasy A

### 3.1. OpenAEDMap / OpenStreetMap — eksport kraju

| Pole | Wartość |
| --- | --- |
| URL | `https://openaedmap.org/api/v1/countries/PL.geojson` |
| Punkty w województwie | **815** (węzły `emergency=defibrillator`, snapshot 2026-11-21) |
| Pokrycie miast | Bydgoszcz ok. **157**, Toruń ok. **111** (liczone po współrzędnych) |
| Format | GeoJSON (`FeatureCollection`, geometria `Point`) |
| Licencja | **ODbL 1.0**, atrybucja „© OpenStreetMap contributors” |
| Pola | `@osm_id`, `@osm_type`, `@osm_version`, `emergency`, `access`, `indoor`, `defibrillator:location`, `defibrillator:location:pl`, `defibrillator:location:en`, `check_date`, `opening_hours`, `phone`, `operator`, `level`, `image`, `image:license`, `description`, `wheelchair`, `manufacturer`, `addr:city`, `addr:street`, `addr:housenumber`, `addr:postcode`, `name`, `ref`, `source` |
| Kompletność pól | `access` 752/815, `indoor` 706/815, `defibrillator:location` 465/815, `check_date` 336/815, `opening_hours` 232/815, `operator` 193/815 |
| Uwagi | Eksport zawiera tylko węzły, bez way/relacji. Brak `@osm_timestamp`. To najlepsze źródło bazowe i punkt odniesienia dla całego województwa. |

Zapytanie pomocnicze Overpass (region można odtworzyć z granicy administracyjnej):

```overpassql
[out:json][timeout:90];
area["name"="kujawsko-pomorskie"]["admin_level"="4"]->.a;
node["emergency"="defibrillator"](area.a);
out count;
```

## 4. Źródła klasy B

### 4.1. Bydgoszcz — oficjalny serwis miasta

| Pole | Wartość |
| --- | --- |
| URL | `https://typo3.um.bydgoszcz.pl/bezpieczenstwo/abc-bezpieczenstwa` (sekcja VI) |
| URL uzupełniający | `https://bydgoszczinformuje.pl/defibrylatory-moga-uratowac-zycie-aktualna-lista-lokalizacji-w-ktorych-znajdziesz-urzadzenie/` |
| Liczba punktów | Mapa Google My Maps bez jawnego licznika; artykuł z 2025 r. wymienia **17 nowych lokalizacji**; w 2021 r. miasto podawało **92** urządzenia; OSM ma ok. **157** punktów w Bydgoszczy |
| Pola | nazwa obiektu, adres (częściowo), pinezka na mapie; brak pól urządzenia i współrzędnych w treści HTML |
| Licencja | „Wszelkie prawa zastrzeżone” Miasto Bydgoszcz; osadzona mapa podlega warunkom Google |
| Format | HTML + osadzony Google My Maps (`mid=1_gVCuQGcZRIviaAxxvbjC02u33s`); eksport KML nie został potwierdzony |
| Uwagi | Ta sama mapa jest osadzona w oficjalnej sekcji VI. Lista w artykule jest częściowa (Bielawy i Fordon). |

### 4.2. Toruń — oficjalny wykaz lokalizacji

| Pole | Wartość |
| --- | --- |
| URL | `https://www.torun.pl/pl/zdrowie/defibrylatory-aed-wykaz-lokalizacji` |
| Liczba punktów | **46** lokalizacji |
| Pola | nazwa obiektu, adres, miasto; brak współrzędnych, operatora i danych urządzenia |
| Licencja | brak otwartej licencji, serwis miejski „© Urząd Miasta Torunia” |
| Format | HTML (lista par nazwa + adres); link do OpenAEDMap dla współrzędnych |
| Uwagi | Najbardziej uporządkowana lista miejska w województwie, ale wymaga geokodowania adresów. |

### 4.3. Kcynia — „Kropki życia AED”

| Pole | Wartość |
| --- | --- |
| URL | `https://kcynia.pl/421-kropki-zycia-aed.html` |
| URL mapy | `https://kcynia.pl/mapa-i-opis-kropek-zycia.html` (osadzony Google My Maps `mid=1suuW5J64npAI66kpcC5kAt5RGm9Q348`, obecnie **HTTP 404**) |
| Liczba punktów | **5 wymienionych lokalizacji**, projektowany zakup **13 defibrylatorów** (liczba z pliku kandydatów) |
| Pola | nazwa obiektu, ulica, miasto; brak współrzędnych, daty instalacji częściowo w opisie |
| Licencja | brak otwartej licencji, serwis gminny |
| Format | HTML; mapa niedostępna, brak eksportu |
| Uwagi | Najmocniejszy kandydat w pliku (score 10), ale realnie tylko 5 nazwanych miejsc. Klasa **B-** ze względu na martwą mapę. |

### 4.4. Geoportal.gov.pl — warstwa „Defibrylatory” (źródło krajowe, nie wojewódzkie)

| Pole | Wartość |
| --- | --- |
| URL | `https://mapy.geoportal.gov.pl/wss/ext/OSM/Defibrylatory?service=WMS&request=GetCapabilities` |
| Liczba punktów | **815** w województwie (dane OSM, te same co OpenAEDMap) |
| Pola | według OSM, dostępne przez `GetFeatureInfo`; brak WFS |
| Licencja | ODbL 1.0 dla danych OSM, usługa GUGiK |
| Format | WMS 1.3.0 (XML capabilities, PNG); `service=WFS` zwraca „WFS request not enabled” |
| Uwagi | Dobre do podkładu i wizualizacji, nie do masowego eksportu. Wymaga własnego zbierania punktów przez `GetFeatureInfo`. |

## 5. Źródła klasy C (tylko wzmianki)

| Jednostka | URL | Co jest |
| --- | --- | --- |
| Lisewo | `https://lisewo.com/?s=defibrylator` | News o zakupie sprzętu dla ochrony ludności, bez listy AED |
| Wielgie | `https://www.wielgie.pl/` | News „Cztery nowe defibrylatory AED dla mieszkańców gminy Wielgie”, bez adresów |
| Brzozie | `https://www.brzozie.pl/?s=defibrylator` | Wyniki wyszukiwania: szkolenia, kursy pierwszej pomocy, bez listy |
| Więcbork | `https://wiecbork.pl/?s=defibrylator` | Szkolenie instruktażowe AED (24.11.2025), bez lokalizacji |
| Górzno | `https://www.gorzno.pl?s=defibrylator` | Dokument „Program ochrony ludności”, wzmianka o AED |
| Koneck | `https://koneck.eu/?s=defibrylator` | Akademia Ochrony Ludności, materiały szkoleniowe |
| Dębowa Łąka | `https://www.ugdl.pl/?s=defibrylator` | Szkolenie pierwszej pomocy w klubie młodzieżowym |
| Gmina Gruta | `https://gruta.pl/` | Zakup defibrylatora dla szkoły, bez wykazu |

## 6. Źródła klasy D (brak lub fałszywy alarm)

- **Strzelno** (`registry_hint=true`, score 4): `https://strzelno.pl/?s=defibrylator` zwraca „Please try another search”, brak wyników.
- **Lubanie** (`registry_hint=true`): `https://lubanie.com/?s=defibrylator`, brak trafień.
- **Urząd Marszałkowski Województwa Kujawsko-Pomorskiego**: brak rejestru i mapy AED. Wyszukiwanie domeny daje wyłącznie newsy, opis wyposażenia WOPR (PDF z 13 AED) i zakupy sprzętu dla szpitali, bez lokalizacji.
- **dane.gov.pl**: brak zbioru dla kujawsko-pomorskiego. Zapytanie `defibrylator` zwraca tylko Krosno, Przemyśl, Marki i Warszawę.
- **e-mapa.net (wojewódzki SIP)**: brak warstwy AED w serwisie `https://kujawskopomorskie.e-mapa.net/`.
- Pozostałe 33 gminy: brak trafień, puste wyszukiwarki, wyłącznie nagłówki stron wyszukiwania lub wyniki negatywne. Pełna lista w CSV.

## 7. Jednostki priorytetowe (score >= 5 lub registry_hint)

| Jednostka | Score | Registry hint | Klasa | Źródło | Punkty |
| --- | --- | --- | --- | --- | --- |
| Kcynia | 10 | tak | **B** | `https://kcynia.pl/421-kropki-zycia-aed.html` | 5 lokalizacji / 13 urządzeń |
| Strzelno | 4 | tak | **D** | `https://strzelno.pl/?s=defibrylator` | 0 |
| Lisewo | 4 | tak | **C** | `https://lisewo.com/?s=defibrylator` | 0 (news) |
| Wielgie | 4 | tak | **C** | `https://www.wielgie.pl/` | 0 (news o 4 AED) |
| Brzozie | 3 | tak | **C** | `https://www.brzozie.pl/?s=defibrylator` | 0 (szkolenia) |
| Lubanie | 0 | tak | **D** | `https://lubanie.com/?s=defibrylator` | 0 |

## 8. Rekomendacja integracji

1. **Warstwa bazowa:** OpenAEDMap `PL.geojson`, filtrowana po granicy województwa (815 punktów, ODbL). To jedyne źródło A i jedyne, które pokrywa całe województwo.
2. **Weryfikacja urzędowa:** Bydgoszcz (oficjalna mapa + lista 17 nowych punktów) i Toruń (46 adresów). Adresy z Torunia geokodować i porównać z OSM; rozbieżności traktować jako kandydatów do uzupełnienia OSM.
3. **Kcynia:** traktować jako źródło pomocnicze (5 nazwanych miejsc), nie jako rejestr gminny. Mapa Google jest niedostępna.
4. **Geoportal WMS:** używać jako warstwy kontrolnej i ewentualnie do `GetFeatureInfo`, nie jako źródła eksportu.
5. **Nie budować integracji** na Urzędzie Marszałkowskim, e-mapa wojewódzkiej ani na stronach gmin klas C/D: brak tam danych lokalizacyjnych.

## 9. Ograniczenia

- Liczby OSM są snapshotem z 2026-11-21 i dotyczą tylko węzłów; mogą nie obejmować wszystkich AED w urzędach i firmach.
- Bydgoszcz nie podaje licznika punktów na mapie; liczby 17 i 92 pochodzą z artykułów, a 157 z OSM.
- Kcynia podaje 13 urządzeń, ale tylko 5 miejsc; nie wiadomo, czy pozostałe 8 to urządzenia przenośne.
- Nie weryfikowano terenowo aktualności urządzeń.
