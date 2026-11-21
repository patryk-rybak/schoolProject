# Audyt źródeł AED: województwo podlaskie

**Data badania:** 2026-11-21 (godz. 18:48-19:15 UTC)
**Zakres:** 43 jednostki z pliku `candidates2_podlaskie.json` oraz dodatkowo
Białystok i Urząd Marszałkowski Województwa Podlaskiego.
**Metoda:** bezpośrednie zapytania HTTP (`curl`), analiza sitemap i wyszukiwarek
stron urzędowych, analiza API `dane.gov.pl`, eksportu OpenAEDMap oraz API
InfoRatunek i SOS DAE. Nie zmieniano kodu i nie wykonywano commitów.

Legenda:
- **A** - maszynowy zbiór/API AED (JSON, GeoJSON, CSV, shardy),
- **B** - oficjalna strona/PDF z listą lub mapą wielu AED,
- **C** - tylko wzmianka/news o AED, bez listy/mapy,
- **D** - brak źródła lub fałszywy alarm.

> **Uwaga interpretacyjna:** klasy A/B/C/D dotyczą źródeł przypisanych do
> jednostki. OSM/OpenAEDMap jest źródłem regionalnym, wspólnym dla całego
> województwa, więc nie podnoszę nim klasy każdej gminy do A. Lokalnych źródeł
> klasy A nie znaleziono. Źródła regionalne zestawiono osobno w sekcji 3.

---

## 1. Wnioski w skrócie

1. **Brak lokalnego rejestru klasy A.** Żadna z 43 jednostek nie publikuje
   własnego zbioru/API AED. `dane.gov.pl` ma tylko cztery zbiory AED
   (Warszawa, Przemyśl, Krosno, Marki); żaden nie dotyczy Podlaskiego.
2. **Najlepsze pokrycie daje OSM/OpenAEDMap:** 350 punktów w województwie,
   w tym 83 w Białymstoku, licencja ODbL, format GeoJSON i API.
3. **Jedno źródło klasy B:** Łomża. Oficjalne artykuły miejskie podają 10
   lokalizacji (4 szkoły ponadpodstawowe, Park Wodny MOSiR i 5 szkół
   podstawowych), ale bez współrzędnych i licencji.
4. **Białystok nie ma publicznej listy AED.** BIP zawiera dwa postępowania
   (2017 - unieważnione, 2022 - monitoring) oraz umowę na monitoring, ale bez
   wykazu lokalizacji. Miasto ma jednak 83 punkty w OSM i 9 rekordów w
   InfoRatunek.
5. **Urząd Marszałkowski nie prowadzi rejestru/mapy AED.** Wyszukiwarka
   `podlaskie.eu` zwraca 19 wyników dla „defibrylator”, wyłącznie newsy i
   przetargi. Stara domena `wrotapodlasia.pl` nie rozwiązuje się z tego
   środowiska; obowiązująca jest `podlaskie.eu`.
6. **Trzy fałszywe alarmy wymagają oznaczenia D:** Kołaki Kościelne i Mały
   Płock (wyszukiwarki nie zwracają wyników), powiat siemiatycki (artykuł o
   mechanicznej kompresji klatki piersiowej, nie o lokalizacji AED).

### Liczby

| Klasa | Jednostki z pliku | Dodatkowe | Razem |
|---|---:|---:|---:|
| A (lokalne) | 0 | 0 | **0** |
| B | 1 (Łomża) | 0 | **1** |
| C | 8 | 2 (Białystok, UMWP) | **10** |
| D | 34 | 0 | **34** |
| **Razem** | **43** | **2** | **45** |

Regionalne źródła maszynowe (poza klasyfikacją jednostek): **4**
(OpenAEDMap/OSM, snapshot OSM InfoRatunek, SOS DAE, własne API InfoRatunek).

---

## 2. Kwalifikacja jednostek

| Jednostka | Typ | Score | Registry hint | Klasa | Podstawa |
|---|---|---:|---|---|---|
| Łomża | miasto na prawach powiatu | 6 | tak | **B** | 10 lokalizacji w dwóch oficjalnych artykułach |
| Hajnówka | gmina miejska | 10 | tak | **C** | 1 AED przy Urzędzie Miasta, artykuł 2020 |
| Narewka | gmina wiejska | 3 | nie | **C** | 1 AED w Urzędzie Gminy + zapowiedź kolejnego |
| Wąsosz | gmina wiejska | 0 | nie | **C** | 1 AED na budynku OPS, artykuł 2025 |
| Zbójna | gmina wiejska | 4 | tak | **C** | 2 AED dla OSP Zbójna i OSP Kuzie, news 2018 |
| Szumowo | gmina wiejska | 4 | nie | **C** | szkolenie OSP z obsługi AED, brak lokalizacji |
| Rajgród | gmina miejsko-wiejska | 0 | nie | **C** | wzmianka o zakupie sprzętu ratowniczego |
| powiat sokólski | powiat | 2 | nie | **C** | projekt PCK, szkolenia pierwszej pomocy |
| Suwałki (gmina wiejska) | gmina wiejska | -3 | nie | **C** | szkolenie seniorów z AED |
| powiat siemiatycki | powiat | 2 | nie | **D** | fałszywy alarm: mechaniczna kompresja, nie AED |
| Kołaki Kościelne | gmina wiejska | 0 | tak | **D** | wyszukiwarka: brak wyników |
| Mały Płock | gmina wiejska | 0 | tak | **D** | wyszukiwarka: brak wyników |
| Augustów | gmina miejska | 0 | nie | **D** | brak wyniku |
| Siemiatycze (miasto) | gmina miejska | 0 | nie | **D** | brak wyniku |
| Wysokie Mazowieckie | gmina miejska | 0 | nie | **D** | brak wyniku |
| Korycin | gmina wiejska | 0 | nie | **D** | brak wyniku |
| powiat łomżyński | powiat | 0 | nie | **D** | brak wyniku |
| Sejny (miasto) | gmina miejska | -1 | nie | **D** | brak wyniku |
| Goniądz | gmina miejsko-wiejska | -1 | nie | **D** | brak wyniku |
| Jedwabne | gmina miejsko-wiejska | -1 | nie | **D** | brak wyniku |
| Krynki | gmina miejsko-wiejska | -1 | nie | **D** | brak wyniku |
| Grodzisk | gmina wiejska | -1 | nie | **D** | brak wyniku |
| Klukowo | gmina wiejska | -1 | nie | **D** | brak wyniku |
| powiat suwalski | powiat | -1 | nie | **D** | brak wyniku, hint negatywny |
| Milejczyce | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Narew | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Przerośl | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Płaska | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Radziłów | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Siemiatycze (gmina) | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Zawady | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Łomża (gmina) | gmina wiejska | -2 | nie | **D** | brak wyniku |
| Miastkowo | gmina wiejska | -3 | nie | **D** | brak wyniku |
| Nowe Piekuty | gmina wiejska | -3 | nie | **D** | brak wyniku |
| Sejny (gmina) | gmina wiejska | -3 | nie | **D** | brak wyniku |
| powiat kolneński | powiat | -3 | nie | **D** | brak wyniku, hint negatywny |
| powiat wysokomazowiecki | powiat | -3 | nie | **D** | brak wyniku, hint negatywny |
| Szczuczyn | gmina miejsko-wiejska | -4 | nie | **D** | brak wyniku, hint negatywny |
| Mońki | gmina miejsko-wiejska | -5 | nie | **D** | brak wyniku |
| Filipów | gmina wiejska | -5 | nie | **D** | brak wyniku, hint negatywny |
| Kulesze Kościelne | gmina wiejska | -5 | nie | **D** | brak wyniku, hint negatywny |
| Perlejewo | gmina wiejska | -5 | nie | **D** | brak wyniku, hint negatywny |
| Sztabin | gmina wiejska | -5 | nie | **D** | brak wyniku, hint negatywny |
| Białystok (dodatkowo) | miasto na prawach powiatu | - | - | **C** | BIP: przetargi/monitoring, brak listy; OSM 83 |
| UMWP (dodatkowo) | urząd marszałkowski | - | - | **C** | 19 newsów/przetargów, brak mapy/rejestru |

---

## 3. Źródła klasy A (maszynowe)

### 3.1. OpenAEDMap / OSM - najlepsze źródło regionalne

| Parametr | Wartość |
|---|---|
| URL eksportu | `https://openaedmap.org/api/v1/countries/PL.geojson` |
| HTTP | 200, `application/geo+json`, 7 135 986 B |
| Format | GeoJSON (FeatureCollection, EPSG:4326) |
| Punkty w Polsce | 18 298 |
| Punkty w Podlaskiem | **350** (wszystkie `node`) |
| Punkty w Białymstoku | **83** |
| Licencja | **ODbL 1.0**, © OpenStreetMap contributors |
| API dodatkowe | `https://openaedmap.org/api/v1/node/{id}`, kafle MVT `/api/v1/tile/{z}/{x}/{y}.mvt` |

**Pola:** `@osm_id`, `@osm_type`, `@osm_version`, `name`, `operator`,
`defibrillator:location`, `defibrillator:location:pl`, `access`, `indoor`,
`level`, `opening_hours`, `phone`, `wheelchair`, `check_date`, `description`,
`ref`, oraz pozostałe tagi OSM.

**Pokrycie pól w 350 punktach podlaskich:**

| Pole | Liczba punktów |
|---|---:|
| `defibrillator:location` | 250 |
| `access` | 331 |
| `indoor` | 311 (185 tak, 126 nie, 39 brak) |
| `opening_hours` | 145 |
| `operator` | 113 |
| `check_date` | 97 |
| `level` | 67 |
| `phone` | 62 |
| `name` | 1 |
| `addr:street` / `addr:housenumber` | 2 / 2 |
| `addr:city` | 1 |

**Ocena:** najlepsza dostępność maszynowa i najlepsze pokrycie, ale jakość
adresowa jest słaba (prawie brak `addr:*`). Lokalizację trzeba budować z
`defibrillator:location` i geometrii. OSM jest źródłem pierwotnym dla
OpenAEDMap, SOS DAE i snapshotu InfoRatunek.

### 3.2. InfoRatunek - snapshot OSM

| Parametr | Wartość |
|---|---|
| URL | `https://inforatunek.pl/data/aed.geojson.gz` |
| HTTP | 200, `application/gzip`, 1 040 308 B (11 409 127 B po dekompresji) |
| Format | GeoJSON.gz |
| Punkty w Polsce | 16 214 |
| Punkty w Podlaskiem | **317** |
| Licencja | dane OSM - ODbL; brak regulaminu/licencji portalu (`/regulamin` 404) |

**Pola:** tagi OSM, m.in. `@osm_type`, `@osm_id`, `@osm_version`,
`defibrillator:location:pl`, `access`, `indoor`, `level`, `check_date`.

**Ocena:** wygodny snapshot, ale starszy od OpenAEDMap (16 214 vs 18 298
punktów w Polsce; 317 vs 350 w Podlaskiem). Do importu wybrać OpenAEDMap.

### 3.3. SOS DAE

| Parametr | Wartość |
|---|---|
| Strona | `https://sosdae.com/pl/` |
| Metadane | `https://sosdae.com/data/v/2e81f4932d64/dae_meta.json` (200, 37 387 B) |
| Format | wersjonowane JSON + shardy `.json.gz` + binarny indeks współrzędnych |
| Zasięg globalny | 549 681 rekordów, 119 krajów, wersja 2026-09-18 |
| Licencja | ODbL dla danych OSM; regulamin zakazuje masowego wyciągania bazy |

**Pola:** `id` (np. `node/...`), `nome`, `posizione` (tłumaczenia), `ente`,
`telefono`, `piano`, `foto`, `ultima_verifica`; współrzędne w
`dae_index.bin` (`coordScale=100000`), godziny w `dae_oh.json`.

**Ocena:** technicznie dobre, ale regionalnej liczby dla Podlaskiego nie
policzono (indeks bbox/shardy). Prawnie bezpieczniej korzystać z OSM.

### 3.4. InfoRatunek - własne API

| Parametr | Wartość |
|---|---|
| URL | `https://inforatunek.pl/api/aed` |
| HTTP | 200, `application/json`, 4 145 B |
| Format | JSON (lista) |
| Liczba rekordów | **16** (9 w granicach Białegostoku) |
| Licencja | **brak** (strona nie ma regulaminu ani polityki licencyjnej) |

**Pola:** `id` (UUID), `name`, `address`, `lat`, `lng`, `availability`,
`indoor`, `location_pl`.

**Ocena:** mały, nieoficjalny zbiór okołobiałostocki. 16 rekordów to m.in.
Urząd Miejski, Białostockie Centrum Onkologii, PKS, przedszkola, Juchnowiec
Kościelny. Przydatne jako uzupełnienie, nie jako rejestr.

---

## 4. Źródło klasy B: Łomża

**URL 1:** `https://lomza.pl/index.php?wiad=14106` (2026-03-10)
**URL 2:** `https://lomza.pl/index.php?wiad=14204` (2026-05-11)
**Format:** HTML, bez pliku do pobrania, bez licencji, bez współrzędnych.

**Liczba punktów: 10** (4 szkoły ponadpodstawowe + Park Wodny + 5 szkół
podstawowych).

| Lp. | Lokalizacja | Adres | Źródło |
|---:|---|---|---|
| 1 | Zespół Szkół Ekonomicznych i Ogólnokształcących nr 6 | ul. Kopernika 16 | art. 14106 |
| 2 | III Liceum Ogólnokształcące | ul. Senatorska 13 | art. 14106 |
| 3 | Zespół Szkół Technicznych i Ogólnokształcących nr 4 | ul. Zielona 21 | art. 14106 |
| 4 | I Liceum Ogólnokształcące | ul. Bernatowicza 4 | art. 14106 |
| 5 | Park Wodny MOSiR | ul. Ks. Kard. Stefana Wyszyńskiego 15 | art. 14106 |
| 6 | Szkoła Podstawowa nr 4 | brak adresu w artykule | art. 14204 |
| 7 | Szkoła Podstawowa nr 5 | brak adresu w artykule | art. 14204 |
| 8 | Szkoła Podstawowa nr 7 | brak adresu w artykule | art. 14204 |
| 9 | Szkoła Podstawowa nr 9 | brak adresu w artykule | art. 14204 |
| 10 | Szkoła Podstawowa nr 10 | brak adresu w artykule | art. 14204 |

**Pola:** nazwa placówki, typ (szkoła/obiekt sportowy), częściowo adres
uliczny. **Brak:** współrzędnych, numerów seryjnych, modelu, daty instalacji,
dostępu 24/7. **Licencja:** brak. To nie jest rejestr, tylko oficjalna
informacja miejska z listą lokalizacji.

---

## 5. Pozostałe źródła klasy C

### 5.1. Hajnówka - 1 AED przy Urzędzie Miasta

- URL: `https://www.hajnowka.pl/aktualnosc/dla-mieszkanca/844-publiczny-defibrylator-przy-urzedzie-miasta`
- HTTP 200, HTML, artykuł z 2020-12-29.
- Treść: publiczny AED przy wejściu do budynku urzędu, elektrody
  jednorazowe, instrukcja poniżej urządzenia.
- Pola: opis słowny, brak współrzędnych, brak licencji.
- Dlaczego C: tylko jeden punkt, brak listy/mapy.

### 5.2. Narewka - 1 AED w Urzędzie Gminy

- URL: `https://www.narewka.pl/pl/urzd_gminy/komunikaty_2/debifrylator-aed-w-ug-narewka.html`
- HTTP 200 (certyfikat wymaga `-k`), HTML.
- Treść: AED za wejściem do budynku Urzędu Gminy (z prawej strony);
  zapowiedź kolejnego urządzenia w przestrzeni publicznej.
- Dlaczego C: jeden punkt, brak listy/mapy.

### 5.3. Wąsosz - 1 AED na budynku OPS

- URL: `https://gminawasosz.pl/defibrylator-aed-w-wasoszu/`
- HTTP 200, HTML, artykuł z 2025-08-29.
- Treść: AED na budynku Ośrodka Pomocy Społecznej w Wąsoszu.
- Dlaczego C: jeden punkt.

### 5.4. Zbójna - 2 AED dla OSP

- URL: `https://zbojna.pl/szukaj?q=defibrylator`
- HTTP 200, HTML, news z 2018-12-12.
- Treść: w ramach Funduszu Sprawiedliwości zakupiono m.in. dwa automatyczne
  defibrylatory dla OSP Zbójna i OSP Kuzie.
- Dlaczego C: sprzęt OSP, brak publicznych lokalizacji i współrzędnych.

### 5.5. Szumowo - szkolenie OSP

- URL: `https://www.szumowo.pl/3203-bezpieczenstwo-mieszkancow-przede-wszystkim-strazacy-ochotnicy-z-gminy-szumowo-szkolili-sie-z-pierwszej-pomocy-i-obslugi-defibrylatorow`
- HTTP 200, HTML, 2026-11-16.
- Treść: szkolenie strażaków OSP z RKO i obsługi AED.
- Dlaczego C: brak lokalizacji AED.

### 5.6. Rajgród - zakup sprzętu

- URL: `https://umrajgrod.pl/?s=defibrylator`
- HTTP 200, HTML.
- Treść: wynik wyszukiwania prowadzi do informacji o zakupie sprzętu
  ratowniczo-gaśniczego; brak listy AED.
- Dlaczego C: wzmianka zakupowa.

### 5.7. powiat sokólski - projekt PCK

- URL: `https://sokolka-powiat.pl/?s=defibrylator`
- HTTP 200, HTML.
- Treść: „Uczmy się pierwszej pomocy” - projekt PCK, szkolenia.
- Dlaczego C: brak lokalizacji AED.

### 5.8. Suwałki (gmina wiejska) - szkolenie seniorów

- URL: `https://gmina.suwalki.pl/?s=defibrylator`
- HTTP 200, HTML.
- Treść: szkolenie z pierwszej pomocy i zasad używania AED.
- Dlaczego C: brak lokalizacji AED.

---

## 6. Białystok i Urząd Marszałkowski

### 6.1. Białystok

**Wynik: brak publicznego rejestru lub mapy AED.**

Sprawdzone kanały:

| Kanał | Wynik |
|---|---|
| `https://www.bialystok.pl/cms/search?q=defibrylator` | 200, „Brak wyników” |
| `https://www.bialystok.pl/cms/search?q=defibrylatory` | 200, „Brak wyników” |
| `https://bip.bialystok.pl/cms/search?q=defibrylatory` | 200, 2 postępowania + monitoring |
| `https://bip.bialystok.pl/.../dostawa-14-sztuk-defibrylatorow...` | 200, przetarg z 2017, **unieważniony** |
| `https://bip.bialystok.pl/.../monitoring-stanu-defibrylatorow-zewnetrznych-aed-1.html` | 200, umowa 2022 z AEDMAX.PL, 82 449,36 zł brutto |
| `https://www.gisbialystok.pl/` | 200, brak warstwy AED w serwisach i ArcGIS |
| `https://bialystok.maps.arcgis.com` (org `jN5LJsqeW33UjdlH`) | brak warstwy AED |
| OSM/OpenAEDMap | **83 punkty** w granicach miasta |
| InfoRatunek `/api/aed` | **9 rekordów** w granicach miasta |

**Wniosek:** miasto ma urządzenia i system monitoringu, ale nie publikuje
wykazu lokalizacji. Najlepszym dostępnym zbiorem jest OSM (83 punkty), a
uzupełnieniem InfoRatunek (9 punktów). Postępowanie z 2017 r. dotyczyło 14
sztuk, ale zostało unieważnione; nie można go traktować jako listy
zainstalowanych AED.

### 6.2. Urząd Marszałkowski Województwa Podlaskiego

- Domena obowiązująca: `https://www.podlaskie.eu/` (HTTP 200).
- Stara domena `wrotapodlasia.pl` i `www.wrotapodlasia.pl` nie rozwiązuje się
  (DNS) w tym środowisku; `ugnarewka.wrotapodlasia.pl` również.
- `https://www.podlaskie.eu/cms/search/index?q=defibrylator` - 200,
  **19 wyników**, wszystkie to newsy i przetargi (ambulanse, defibrylatory dla
  szpitali/pogotowia, sprzęt OSP).
- `https://bip.podlaskie.eu/cms/search?q=defibrylator` - 200, brak rejestru.
- Brak mapy, pliku CSV/JSON, API lub PDF z listą AED.

**Wniosek:** UMWP nie prowadzi publicznego rejestru AED. Dane o zakupach
regionalnych nie zawierają lokalizacji urządzeń.

---

## 7. Fałszywe alarmy i brak danych (D)

1. **Kołaki Kościelne** - `https://www.kolaki.pl/wyszukiwarka?q=defibrylator`
   zwraca „nie znaleziono żadnych wyników”. `registry_hint=true` był
   fałszywy.
2. **Mały Płock** - `https://www.malyplock.pl/index.php/component/finder/search?q=defibrylator`
   zwraca „nie znaleziono żadnych wyników”. `registry_hint=true` był fałszywy.
3. **powiat siemiatycki** - artykuł „Siemiatycki szpital pozyskał nowoczesne
   urządzenia do mechanicznej kompresji klatki piersiowej” wspomina
   defibrylator tylko jako element resuscytacji, nie jako lokalizację AED.
4. **Pozostałe 31 jednostek** - brak wyniku w wyszukiwarce, brak strony
   tematycznej, brak śladu w sitemapie. Nie oznacza to braku urządzeń, tylko
   brak publicznego źródła.

---

## 8. Powtarzalność i log HTTP

Kluczowe zapytania (wszystkie z 2026-11-21):

| Zapytanie | HTTP | Wynik |
|---|---:|---|
| `GET https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=100` | 200 | 4 zbiory, żaden z Podlaskiego |
| `GET https://openaedmap.org/api/v1/countries/PL.geojson` | 200 | 18 298 punktów, 7 135 986 B |
| `GET https://inforatunek.pl/data/aed.geojson.gz` | 200 | 16 214 punktów, 1 040 308 B |
| `GET https://inforatunek.pl/api/aed` | 200 | 16 rekordów, 4 145 B |
| `GET https://sosdae.com/data/v/2e81f4932d64/dae_meta.json` | 200 | 549 681 rekordów globalnie |
| `GET https://www.podlaskie.eu/cms/search/index?q=defibrylator` | 200 | 19 wyników, brak rejestru |
| `GET https://bip.bialystok.pl/cms/search?q=defibrylatory` | 200 | 2 postępowania + monitoring |
| `GET https://www.gisbialystok.pl/` | 200 | brak warstwy AED |
| `GET https://www.bialystok.pl/cms/search?q=defibrylator` | 200 | brak wyników |
| `GET https://zbojna.pl/szukaj?q=defibrylator` | 200 | 2 AED dla OSP |
| `GET https://www.hajnowka.pl/.../844-publiczny-defibrylator...` | 200 | 1 AED |
| `GET https://www.narewka.pl/pl/urzd_gminy/.../debifrylator-aed-w-ug-narewka.html` | 200 | 1 AED |
| `GET https://gminawasosz.pl/defibrylator-aed-w-wasoszu/` | 200 | 1 AED |
| `GET https://lomza.pl/index.php?wiad=14106` | 200 | 5 lokalizacji |
| `GET https://lomza.pl/index.php?wiad=14204` | 200 | 5 kolejnych lokalizacji |

---

## 9. Rekomendacje

1. **Import bazowy:** OpenAEDMap `PL.geojson`, filtr po granicy województwa
   (350 punktów), licencja ODbL, atrybucja „© OpenStreetMap contributors”.
2. **Uzupełnienie:** własne API InfoRatunek (16 rekordów) tylko po wyjaśnieniu
   licencji; dane są nieoficjalne i częściowo poza Białymstokiem.
3. **Łomża:** wykorzystać 10 lokalizacji z artykułów jako źródło B, ale
   zweryfikować współrzędne i status instalacji (część to zapowiedzi).
4. **Białystok:** wystąpić o wykaz urządzeń objętych umową monitoringu z
   2022 r. (AEDMAX.PL) - umowa wskazuje na istniejącą sieć, ale wykaz nie jest
   publiczny.
5. **UMWP:** brak rejestru; ewentualne zapytanie o dane z projektów
   regionalnych i zakupów dla WSPR.
6. **Nie używać** `registry_hint` bez weryfikacji: Kołaki Kościelne i Mały
   Płock dały fałszywe alarmy, a Hajnówka (score 10) to tylko jeden AED.

---

## 10. Pliki

- `podlaskie.md` - ten raport,
- `podlaskie.csv` - tabela jednostek i źródeł (45 rekordów jednostek +
  4 rekordy źródeł regionalnych).
