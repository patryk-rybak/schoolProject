# Województwo lubelskie: audyt źródeł AED

Data audytu: **2026-11-21**. Lane: `audit-lubelskie`.
Zakres: 64 gminy z pliku `candidates2_lubelskie.json`, miasto Lublin, Urząd
Marszałkowski Województwa Lubelskiego (UMWL), portale otwartych danych.

Legenda klas:
- **A** - maszynowy zbiór lub API z punktami AED.
- **B** - oficjalna strona lub PDF z listą/mapą wielu AED.
- **C** - tylko wzmianka, news, szkolenie, zakup bez wykazu lokalizacji.
- **D** - brak danych albo fałszywy alarm wyszukiwarki.

## 1. Wynik w skrócie

| Klasa | Liczba | Co to jest |
|---|---:|---|
| **A lokalne** | **0** | Brak zbioru/API AED dla województwa lub Lublina. |
| **B** | **2** | PDF Lublina (48 pozycji) i lista UMWL (10 instytucji kultury). |
| **C** | **13** | Gminy z newsami o AED, bez wykazu lokalizacji. |
| **D** | **51** | Pozostałe gminy, w tym 3 fałszywe alarmy z `registry_hint`. |

Najlepsze źródła regionalne:
1. **Lublin, oficjalny PDF**: 48 pozycji, 46 unikalnych adresów, stan
   17.03.2026. Najlepszy lokalny rejestr, ale tylko PDF, bez współrzędnych.
2. **UMWL, lista 10 instytucji kultury**: oficjalna strona, słabe pola
   (instytucja i miejscowość, bez adresu i współrzędnych).
3. **OpenStreetMap / OpenAEDMap**: jedyne w pełni maszynowe źródło w regionie,
   licencja ODbL, ale to zbiór ogólnopolski, nie urzędowy rejestr wojewódzki.

Nie ma lokalnego źródła klasy A. Nie ma też rejestru prowadzonego przez UMWL
ani przez Urząd Miasta Lublin w formacie CSV/API/GeoJSON.

## 2. Źródła A i B: szczegóły

| Klasa | Źródło | URL | Punkty | Pola | Licencja | Format |
|---|---|---|---:|---|---|---|
| **B** | Miasto Lublin, „AED w Lublinie” | https://lublin.eu/mieszkancy/zdrowie/aktualnosci/aed-w-lublinie,748,1345,1.html | **48** (46 unikalnych adresów) | nazwa, adres, piętro/wejście, godziny tylko dla 1 rekordu | brak jawnej licencji | HTML + PDF 2 str. |
| **B** | PDF „AED Lublin stan 17.03.2026.pdf” | https://lublin.eu/download/gfx/lublin/userfiles/_public/mieszkancy/zdrowie/aktualnosci/2026/aed_lublin_stan_17.03.2026.pdf | **48** | jak wyżej, bez lat/lon, bez telefonu | brak jawnej licencji | PDF 1.7, 47 632 B, warstwa tekstowa |
| **B-** | UMWL, „Defibrylatory w Instytucjach Kultury Samorządu Województwa Lubelskiego” | https://www.lubelskie.pl/aktualnosci/defibrylatory-w-instytucjach-kultury-samorzadu-wojewodztwa-lubelskiego/ | **10** | instytucja, miejscowość | brak jawnej licencji | HTML |
| **A** | OpenAEDMap / OSM, eksport krajowy | https://openaedmap.org/api/v1/countries/PL.geojson | 18 298 (cała Polska) | lat, lon, tagi OSM: `access`, `indoor`, `level`, `operator`, `opening_hours` | ODbL-1.0 | GeoJSON, MVT, JSON node |

Uwagi do Lublina:
- PDF ma 2 strony i 48 numerowanych pozycji. Pozycje 6 i 47 to ten sam adres
  (Radio Lublin, ul. Obrońców Pokoju 2). Pozycje 7 i 48 to ten sam adres
  (AGRO II, ul. Akademicka 15). Dlatego unikalnych adresów jest 46.
- Tylko pozycja 46 (Lubelski Urząd Wojewódzki) podaje godziny dostępności.
- Brak współrzędnych. Do mapy trzeba geokodować adresy, najlepiej z
  dokładnością do budynku.
- Strona Lublina odsyła też do `https://www.ratujzsercem.pl/map.aspx`. To
  zewnętrzny agregator, nie rejestr miejski i nie ma otwartego API.

Uwagi do UMWL:
- Artykuł z 15.02.2024 wymienia 10 instytucji kultury, do których kupiono AED.
- Brak adresów, współrzędnych i informacji o dostępności publicznej.
- Osobne wyszukiwanie na `lubelskie.pl` dla „defibrylator” daje 2 wyniki, oba
  dotyczą pociągów POLREGIO, nie rejestru AED.

## 3. Lista AED w Lublinie (48 pozycji)

Pełna tabela jest w `lubelskie_lublin_aed.csv`. Poniżej skrót pól i uwagi.

| Lp. | Obiekt | Adres | Dostęp |
|---:|---|---|---|
| 1 | Ośrodek Medyczny DMP | ul. Projektowa 5 |  |
| 2 | MPWiK Sp. z o.o. | ul. Zawilcowa 10 |  |
| 3 | GDDKiA Oddział w Lublinie | ul. Ogrodowa 21 |  |
| 4 | Klinika Okulistyki | ul. Chmielna 1 |  |
| 5 | Biblioteka UMCS | ul. Radziszewskiego 11 |  |
| 6 | Radio Lublin S.A. | ul. Obrońców Pokoju 2 | duplikat nr 47 |
| 7 | Budynek AGRO II | ul. Akademicka 15 | duplikat nr 48 |
| 8 | Rektorat UP w Lublinie | ul. Akademicka 13 |  |
| 9 | MPWiK Sp. z o.o. | al. Józefa Piłsudskiego 15 |  |
| 10 | Inergy Automotive Systems Poland | ul. Budowlana 28 |  |
| 11 | Dworzec Lublin | ul. Dworcowa 7 | poziom 0 |
| 12 | Filharmonia im. H. Wieniawskiego | ul. Skłodowskiej-Curie 5 |  |
| 13 | Galeria Felicity | al. Wincentego Witosa 32 |  |
| 14 | Galeria Plaza | ul. Lipowa 13 |  |
| 15 | Galeria Lubelska | al. Wincentego Witosa 6 |  |
| 16 | Sklep 4 Tactical | ul. Bernardyńska 11 |  |
| 17 | Kuratorium Oświaty | ul. 3 Maja 6 | parter |
| 18 | Poczta Polska, Poczta Główna | ul. Krakowskie Przedmieście 50 |  |
| 19 | Sąd Rejonowy Lublin-Zachód | ul. Krakowskie Przedmieście 76 |  |
| 20 | Filia nr 2 MBP, Centrum Kultury | ul. Peowiaków 12 | przy wejściu |
| 21 | CityFit | al. Spółdzielczości Pracy 26 |  |
| 22 | Centrum Medyczne Medicover | ul. Wallenroda 4C |  |
| 23 | Emergency Medical System Poland | ul. Ułanów 7 |  |
| 24 | Zakłady Produkcyjne Stock Polska | ul. Spółdzielcza 6 |  |
| 25 | SIPMA S.A. | ul. Budowlana 19 |  |
| 26 | GDDKiA, Laboratorium Drogowe | ul. Olszewskiego 1A |  |
| 27 | Areszt Śledczy | ul. Południowa 5 |  |
| 28 | I LO im. Staszica | al. Racławickie 26 | przy wejściu |
| 29 | Collegium Universum UM | ul. Chodźki 1 | lobby |
| 30 | IKEA, biuro obsługi klienta | al. Spółdzielczości Pracy 86 |  |
| 31 | Centrum Powiadamiania Ratunkowego | ul. Wojciechowska 1 |  |
| 32 | Szkoła Podstawowa nr 57 | ul. Z. Krasińskiego 7 | parter, sekretariat |
| 33 | Turck Automation Technology | ul. Plewińskiego 18 |  |
| 34 | Salon Black Red White | ul. Diamentowa 8 |  |
| 35 | Obiekty sportowe KUL | ul. Konstantynów 1G |  |
| 36 | Żeński Dom Studencki | ul. Konstantynów 1D |  |
| 37 | Filia nr 21 MBP | ul. Rynek 11 |  |
| 38 | KUL Collegium Jana Pawła | al. Racławickie 14 |  |
| 39 | KUL Collegium Iuridicum | ul. Spokojna 1 |  |
| 40 | Intrograf-Lublin S.A. | ul. Vetterów 22 |  |
| 41 | Uniwersytet Medyczny | al. Racławickie 1 | główny gmach |
| 42 | Regionalna Dyrekcja Lasów Państwowych | ul. Czechowska 4 |  |
| 43 | MPK Lublin | ul. Antoniny Grygowej 56 |  |
| 44 | Ratusz Urzędu Miasta | Plac Łokietka 1 |  |
| 45 | Biuro Obsługi Mieszkańców | ul. Wieniawska 14 |  |
| 46 | Lubelski Urząd Wojewódzki | ul. Spokojna 4 | w godzinach pracy urzędu |
| 47 | Radio Lublin S.A. | ul. Obrońców Pokoju 2 | duplikat nr 6 |
| 48 | Budynek AGRO II | ul. Akademicka 15 | duplikat nr 7 |

## 4. Lista UMWL: 10 instytucji kultury

1. Centrum Spotkania Kultur w Lublinie
2. Filharmonia im. H. Wieniawskiego w Lublinie
3. Muzeum Badań Polarnych w Puławach
4. Muzeum Nadwiślańskie w Kazimierzu Dolnym / Zamek w Janowcu
5. Muzeum Wsi Lubelskiej w Lublinie
6. Muzeum Zamojskich w Kozłówce
7. Opera Lubelska
8. Ośrodek Praktyk Teatralnych Gardzienice
9. Teatr im. Juliusza Osterwy w Lublinie
10. Wojewódzka Biblioteka Publiczna w Lublinie

## 5. Gminy priorytetowe (score >= 5 lub registry_hint)

| Gmina | Score | registry_hint | Klasa | Ustalenie |
|---|---:|---|---|---|
| Komarów-Osada | 4 | true | **C** | 2 AED w OSP Śniatycze i OSP Janówka, tylko news. |
| Milanów | 3 | true | **D** | Strona wyszukiwania bez wyników. Fałszywy alarm. |
| Łabunie | 3 | true | **C** | Szkolenie OSP i news o wyposażeniu, bez wykazu. |
| Wąwolnica | 1 | true | **D** | „Brak wyników wyszukiwania” dla defibrylatora. |
| Radzyń Podlaski | 0 | true | **D** | „Znaleziono 0 wyników”. Fałszywy alarm. |

Wniosek: żaden `registry_hint` w tym pliku nie oznacza rejestru. To głównie
wyniki wyszukiwania stron gminnych.

## 6. Pozostałe gminy klasy C

| Gmina | Sygnał |
|---|---|
| Grabowiec | Wzmianka przy pikniku edukacyjnym. |
| Karczmiska | News o dofinansowaniu OSP, możliwa wzmianka o AED. |
| Spiczyn | 5 newsów o kolejnych AED w 2026, w tym kapsuła zewnętrzna. |
| Komarówka Podlaska | AED w Banku Spółdzielczym Radzyń Podlaski. |
| Rokitno | Wzmianka w poradniku bezpieczeństwa. |
| Wilkołaz | Projekt „Bezpieczne Serce Wilkołaza”. |
| Wólka | Wzmianka przy podstronie OSP Łuszczów. |
| Żyrzyn | Wzmianka przy podsumowaniu projektu. |
| Kazimierz Dolny | Zbiórka na AED dla Rzeczycy. |
| Stary Brus | Sprzęt dla OSP z programu OC. |
| Łuków | News: OSP KSRG Dąbie otrzymała defibrylator. |

Spiczyn ma najwięcej sygnałów, ale nadal publikuje tylko osobne newsy, nie
listę ani mapę. Nie spełnia kryterium B.

## 7. Fałszywe alarmy i brak danych

- `Milanów`, `Wąwolnica`, `Radzyń Podlaski`: `registry_hint=true`, ale strony
  zwracają brak wyników lub 0 wyników. Klasy D.
- `Janów Podlaski`, `Nałęczów`, `Tarnogród`, `Stanin`: wynik wyszukiwarki bez
  treści o AED. Klasy D.
- `Kazimierz Dolny`, `Mełgiew`, `Krasnobród`, `Ryki`, `Siedliszcze` i 13 gmin
  z końca listy: `negative=true`, brak wyników. Klasy D.
- Część stron gminnych ma wynik „1” lub „2”, ale to licznik nagłówka
  wyszukiwarki, nie liczba AED.

## 8. Portale danych

| Portal | Test | Wynik |
|---|---|---|
| `api.dane.gov.pl/1.4/datasets?q=defibrylator` | 200, JSON | 4 zbiory: Krosno, Przemyśl, Marki, Warszawa. Brak Lublina i województwa. |
| `otwartedane.lublin.eu` CKAN `package_search?q=defibrylator` | 200, JSON | `count = 0`. Brak zbioru AED. |
| `otwartedane.lublin.eu` CKAN `package_search?q=AED` | 200, JSON | 183 wyniki, ale bez zbioru AED (dopasowania tekstowe). |
| `lubelskie.pl/?s=defibrylator` | 200, HTML | 2 wyniki, oba o pociągach POLREGIO. Brak rejestru. |
| `otwartedane.lubelskie.pl`, `dane.lubelskie.pl` | DNS/HTTP | Brak hosta. Województwo nie prowadzi własnego CKAN. |

## 9. Licencje i ponowne użycie

- PDF Lublina i strona UMWL **nie podają jawnej licencji open data**.
  Traktować jako informację publiczną bez określonych warunków ponownego
  użycia. Przed publikacją mapy trzeba potwierdzić zgodę lub podstawę prawną.
- OpenAEDMap / OSM: **ODbL-1.0**, wymagana atrybucja
  „© OpenStreetMap contributors” i share-alike dla bazy pochodnej.
- dane.gov.pl: zbiory AED mają CC0 1.0 lub CC BY 4.0, ale żaden nie dotyczy
  Lubelskie.

## 10. Rekomendacja wdrożeniowa

1. Zaimportować 48 pozycji z PDF Lublina jako rekordy `source=lublin_pdf`,
   z geokodowaniem adresów do lat/lon i oznaczeniem duplikatów 6/47 oraz 7/48.
2. Uzupełnić 10 instytucji UMWL jako rekordy o niższej pewności, bez
   współrzędnych do czasu weryfikacji adresów.
3. Dla pokrycia całego województwa użyć OSM/OpenAEDMap jako warstwy bazowej
   (ODbL), a punkty z PDF i UMWL traktować jako źródła urzędowe do scalenia.
4. Nie traktować wyników wyszukiwania gmin jako rejestrów. Gminy klasy C
   wymagają kontaktu z urzędem o wykaz lokalizacji, jeśli mają wejść do bazy.
5. Nie publikować danych z PDF bez wyjaśnienia licencji. Minimalny bezpieczny
   wariant to link do źródła i atrybucja, bez redystrybucji pełnej bazy.

## 11. Pliki

- `AED/docs/research/raw/voivodeships/lubelskie.csv` - audit 64 gmin oraz
  źródeł zewnętrznych (69 wierszy).
- `AED/docs/research/raw/voivodeships/lubelskie_lublin_aed.csv` - 48 pozycji
  z PDF Lublina.
