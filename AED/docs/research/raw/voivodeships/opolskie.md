# Województwo opolskie - audyt źródeł AED

Data audytu: **2026-11-21**. Zakres: 13 jednostek z pliku
`candidates2_opolskie.json` oraz dodatkowo miasto Opole i urząd marszałkowski.
Priorytet: `score >= 5` lub `registry_hint = true`.

Legenda klas:
- **A** - maszynowy zbiór/API AED (JSON, CSV, GeoJSON, API).
- **B** - oficjalna strona/PDF z listą lub mapą wielu AED (HTML/PDF).
- **C** - tylko wzmianka/news lub link do zewnętrznej mapy.
- **D** - brak danych, pusty wynik wyszukiwania lub fałszywy alarm.

## 1. Wynik zbiorczy

| Klasa | Liczba kandydatów | Jednostki |
|---|---:|---|
| A | 0 | - |
| B | 1 | Tarnów Opolski |
| C | 3 | Wilków, Krapkowice, Reńska Wieś |
| D | 9 | Brzesko, Gorzów Śląski, Grodków, Kluczbork, Nysa, Czchów, Prudnik, Skarbimierz, Wołczyn |

Poza plikiem kandydatów: **Opole (miasto)** i **Urząd Marszałkowski
Województwa Opolskiego** - klasa **C** (wyłącznie newsy, bez wykazu lokalizacji).

Najważniejszy wniosek: w województwie opolskim **nie ma publicznego,
maszynowego rejestru AED**. Jedyny wartościowy zbiór punktowy to strona
programu gminnego w Tarnowie Opolskim (10 urządzeń z współrzędnymi GPS).

## 2. Kandydaci priorytetowi

### B - Tarnów Opolski (gmina wiejska)

- **URL**: <https://opolsar.pl/aed/>
- **URL z oficjalnej strony gminy**: <https://tarnowopolski.pl/> (link "Sieć gminnych defibrylatorów - AED")
- **Liczba punktów**: **10 urządzeń w 9 lokalizacjach** (dwa AED w tej samej
  remizie OSP Przywory). Licznik `max_count = 35` z crawlera to liczba
  wystąpień słów, nie liczba unikalnych AED.
- **Pola**: nazwa miejsca, adres, `lat`, `lon` (EPSG:4326), telefon, opis
  dostępności (24h / ograniczona / pojazd OSP), model AED, tryb pediatryczny,
  opiekun techniczny.
- **Licencja**: **brak jawnej licencji open data**. Strona OSP JRS Nakło /
  Fundacji OPOLSAR; dane należy traktować jako informację publiczną z podaniem
  źródła.
- **Format**: **HTML** (WordPress), lista opisowa. Brak API, JSON, CSV,
  GeoJSON. Mapa na stronie jest elementem HTML, nie osobnym plikiem danych.
- **Uwaga**: to strona programu gminnego prowadzona przez OSP JRS Nakło, a nie
  witryna BIP gminy. Jest jednak linkowana z oficjalnej strony gminy i zawiera
  pełny wykaz lokalizacji.

Wykaz punktów (przepisany ze strony):

| # | Miejsce | Adres | Lat | Lon | Dostęp | Model |
|---:|---|---|---:|---:|---|---|
| 1 | Urząd Gminy Tarnów Opolski | ul. Dworcowa 6, Tarnów Opolski | 50.5721346 | 18.0766169 | 24h | iPAD CU-SP1 |
| 2 | Gminny Ośrodek Kultury | Osiedle Zakładowe 7A, Tarnów Opolski | 50.5837412 | 18.0781437 | 24h | iPAD CU-SP1 |
| 3 | Biurowiec ZW LHOIST S.A. | ul. Wapiennicza 7, Tarnów Opolski | 50.5699251 | 18.0784086 | 7:00-15:00 | brak danych |
| 4 | NZOZ "TAR-MED" | ul. Wapiennicza 1, Tarnów Opolski | 50.5713733 | 18.0778343 | godziny pracy przychodni | brak danych |
| 5 | Budynek Sołecki (b. Stanica Strażacka) | ul. Kościelna 1, Nakło | 50.5795310 | 18.1178223 | 24h | iPAD CU-SP1 |
| 6 | Remiza OSP JRS Nakło | ul. Przedszkolna 1, Nakło | 50.5766077 | 18.1156709 | pojazd OSP | Samaritan Pad 500p |
| 7 | Remiza OSP Kosorowice | ul. Opolska 9a, Kosorowice | 50.5710420 | 18.0543190 | pojazd OSP | brak danych |
| 8 | Remiza OSP Raszowa | ul. Ozimska 39, Raszowa | 50.5998807 | 18.1279051 | 24h | PHILIPS |
| 9 | Remiza OSP Przywory | ul. Wiejska 81, Przywory | 50.5733966 | 17.9871905 | 24h (ściana) | iPAD CU-SP1 |
| 10 | Remiza OSP Przywory | ul. Wiejska 81, Przywory | 50.5733966 | 17.9871905 | pojazd OSP | brak danych |

### C - Wilków (gmina wiejska)

- **URL**: <https://wilkow.pl/10116/zakup-defibrylatora-aed-oraz-szkolenia-z-pierwszej-pomocy-i-kpp-dla-jednostki-osp-bukowie.html>
- **Liczba punktów**: 1 (OSP Bukowie).
- **Pola**: miejscowość, operator OSP, opis zakupu; brak współrzędnych i adresu.
- **Licencja**: brak jawnej licencji.
- **Format**: HTML, artykuł aktualności.
- **Ocena**: C - pojedynczy news o zakupie AED, nie wykaz.

### C - Krapkowice (gmina miejsko-wiejska)

- **URL**: <https://krapkowice.pl/827/mapa-serwisu.html>
- **Liczba punktów**: 0 własnych.
- **Pola**: brak.
- **Licencja**: nie dotyczy.
- **Format**: HTML; link "Najbliższy defibrylator" prowadzi do
  <https://openaedmap.org/pl/#map=12.8/50.4823/17.99094>.
- **Ocena**: C - gmina nie publikuje własnej listy, tylko odsyła do
  zewnętrznej mapy OpenAEDMap.

### C - Reńska Wieś (gmina wiejska)

- **URL**: <https://renskawies.pl/?s=defibrylator>
- **Liczba punktów**: 0.
- **Pola**: brak.
- **Licencja**: nie dotyczy.
- **Format**: HTML, wynik wyszukiwania.
- **Ocena**: C - jedyny wynik to relacja ze szkolenia z pierwszej pomocy w
  Pokrzywnicy; brak lokalizacji AED.

## 3. Kandydaci niskiej klasy (D)

| Jednostka | Score | URL sprawdzony | Wynik |
|---|---:|---|---|
| Brzesko | 0 | <https://www.brzesko.pl/search/?search=defibrylator> | Newsy o AED, ale gmina jest w **małopolskim**, poza zakresem; brak wykazu |
| Gorzów Śląski | -1 | <https://gorzowslaski.pl/search?s=defibrylator> | Strona wyszukiwania bez wyników; tylko tytuł zapytania |
| Grodków | -1 | <https://grodkow.pl/?s=defibrylator> | Brak wyników |
| Kluczbork | -1 | <https://kluczbork.eu/redir,szukaj?jezyk=1&szukaj=defibrylator> | Formularz bez wyników; brak treści o AED |
| Nysa | -1 | <https://nysa.eu/?s=defibrylator> | Brak wyników |
| Czchów | -2 | <https://www.czchow.pl/index.php/component/finder/search?q=defibrylator> | Brak wyników; gmina w **małopolskim**, poza zakresem |
| Prudnik | -2 | <https://prudnik.pl?s=defibrylator> | "Znaleziono: 0" |
| Skarbimierz | -3 | <https://skarbimierz.pl/search/defibrylator/> | Brak wyników |
| Wołczyn | -4 | <https://www.wolczyn.gmina.pl/?s=defibrylator> | "Nie znaleziono żadnych wyników" |

## 4. Miasto Opole

- **URL**: <https://www.opole.pl/dla-mieszkanca/aktualnosc/w-opolu-pojawily-sie-kolejne-defibrylatory>
- **Klasa**: **C**.
- **Liczba punktów**: 16 nazwanych lokalizacji (10 z 2018 r. i 6 z 2020 r.),
  ale bez adresów i współrzędnych.
- **Pola**: nazwa budynku/obiektu, rok; brak `lat`/`lon`, brak adresu.
- **Licencja**: brak jawnej licencji.
- **Format**: HTML, artykuł.
- **Wyszukiwarka**: <https://www.opole.pl/search/node?keys=defibrylator>
  zwraca tylko ten artykuł. Tagi `/tag/aed` i `/tag/defibrylator` również
  prowadzą wyłącznie do niego.
- **Wniosek**: brak miejskiego rejestru lub mapy AED.

## 5. Urząd Marszałkowski Województwa Opolskiego

- **URL wyszukiwania**: <https://www.opolskie.pl/?s=defibrylator>
- **Klasa**: **C**.
- **Liczba punktów**: 0 (brak wykazu lokalizacji).
- **Pola**: brak.
- **Licencja**: brak jawnej licencji dla treści; serwis gov.pl zwykle
  CC BY-SA, do potwierdzenia.
- **Format**: HTML, artykuły.
- **Znalezione treści**:
  - <https://www.opolskie.pl/2019/05/kolejne-defibrylatory-trafily-do-strazakow/>
    - 22 defibrylatory dla 11 jednostek OSP (Marszałkowski Budżet Obywatelski).
  - <https://www.opolskie.pl/2020/04/defibrylatory-dla-strazakow/>
    - łączna liczba 70 urządzeń kupionych w edycjach MBO; brak listy miejsc.
- **Wniosek**: urząd marszałkowski nie prowadzi publicznego rejestru AED.

## 6. Rejestry zewnętrzne i maszynowe

| Źródło | Klasa | URL | Punkty w opolskim | Pola | Licencja | Format |
|---|---|---|---|---|---|---|
| OpenAEDMap / OSM | A (zewnętrzne) | <https://openaedmap.org/pl/> | nie ustalono | `lat`, `lon`, nazwa, operator, godziny | dane OSM: ODbL 1.0 (potwierdzić w serwisie) | OSM / Overpass / GeoJSON |
| dane.gov.pl API 1.4 | A (zewnętrzne) | <https://api.dane.gov.pl/1.4/datasets?q=defibrylator> | **0** | zależne od zbioru | CC0 1.0 lub CC BY 4.0 | JSON:API, CSV, GeoJSON |

Szczegóły dane.gov.pl: zapytanie `q=defibrylator` zwraca **4 zbiory**:
Krosno (id 3624), Przemyśl (4581), Marki (4955) i Warszawa (39512).
**Żaden nie dotyczy województwa opolskiego.**

OpenAEDMap jest linkowany przez gminę Krapkowice, ale nie udało się pobrać
licznika punktów dla opolskiego: zapytania do Overpass API kończyły się
HTTP 504/000. Liczby nie należy więc podawać bez ponownej weryfikacji.

## 7. Rekomendacje

1. **Tarnów Opolski** - jedyne źródło gotowe do importu punktowego (10 AED,
   współrzędne, modele, dostępność). Wymaga ręcznego przepisania z HTML.
2. **OpenAEDMap / OSM** - jedyny maszynowy zbiór obejmujący całe województwo;
   przed użyciem sprawdzić pokrycie i aktualność dla Opola oraz powiatów.
3. **Opole i urząd marszałkowski** - kontaktować się z urzędami w celu
   pozyskania wykazu, ponieważ publicznie publikują tylko newsy.
4. **dane.gov.pl** - brak zbioru dla opolskiego; nie ma czego importować.
