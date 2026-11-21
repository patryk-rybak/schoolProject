# Województwo małopolskie — audyt źródeł AED

Data audytu: **2026-11-21**. Zakres: plik kandydatów
`candidates2_ma-opolskie.json` (87 jednostek), priorytet `score >= 5` lub
`registry_hint = true` (22 jednostki). Dodatkowo sprawdzono Kraków, Urząd
Marszałkowski Województwa Małopolskiego oraz kilka jednostek o wysokim
`max_count` spoza progu.

Legenda klas:

- **A** — maszynowy zbiór danych lub API AED (CSV/GeoJSON/JSON, licencja,
  powtarzalna aktualizacja).
- **B** — oficjalna strona/PDF z listą lub mapą wielu AED (HTML, bez API).
- **C** — tylko wzmianka/news, pojedyncze lokalizacje lub brak listy.
- **D** — brak danych albo fałszywy alarm (np. wynik wyszukiwania bez treści).

Metoda: żądania HTTP GET/POST, parsowanie HTML, ręczna weryfikacja treści.
Nie sprawdzano współrzędnych na mapach, jeśli strona ich nie publikuje.

## 1. Podsumowanie

| Klasa | Priorytet (22) | Dodatkowo | Razem |
|---|---:|---:|---:|
| A — lokalne zbiory/API | 0 | 0 | 0 |
| A — krajowe źródło pokrywające region | — | 1 | 1 |
| B — lista/mapa wielu AED | 6 | 3 | 9 |
| C — wzmianka/news | 9 | 5 | 14 |
| D — brak/fałszywy alarm | 7 | 0 | 7 |

Najważniejszy wniosek: **w Małopolsce nie ma lokalnego, maszynowego rejestru
AED**. Najlepsze źródła to pojedyncze gminy/powiaty publikujące listy w HTML
oraz krajowy eksport OpenStreetMap/OpenAEDMap. Urząd Marszałkowski nie prowadzi
rejestru AED. Kraków ma najlepszą listę miejską, ale również w HTML, bez API
i bez współrzędnych.

## 2. Klasa A — źródła maszynowe

### 2.1. Brak lokalnego A

Sprawdzone:

- `api.dane.gov.pl/1.4/datasets?q=defibrylator` — 4 zbiory: Krosno, Przemyśl,
  Marki, Warszawa. **Żaden nie dotyczy Małopolski.**
- `otwartedane.um.krakow.pl/search?q=defibrylator` — 0 wyników. Portal ma
  osobne warunki ponownego wykorzystania, ale nie publikuje zbioru AED.
- `msip.krakow.pl` — miejski system informacji przestrzennej; brak widocznej
  warstwy AED w HTML/API.
- `malopolska.pl` — brak rejestru (patrz sekcja 6).
- Geoportal.gov.pl — strona gminy Radłów twierdzi, że warstwa „Defibrylatory”
  jest w Geoportalu; audyt katalogu usług z 2026-11-21 nie potwierdził takiej
  warstwy (patrz `osm-ecosystem.md`, wpisy o Geoportal WMS).

### 2.2. Krajowe A: OpenAEDMap / OSM

| Pole | Wartość |
|---|---|
| URL | `https://openaedmap.org/api/v1/countries/PL.geojson` |
| Punkty w Małopolsce | **1 706** (snapshot 2026-11-21; filtr po granicy PL-MA) |
| Punkty w Polsce | 18 298 |
| Format | GeoJSON (`FeatureCollection`, EPSG:4326, kolejność lon/lat) |
| Licencja | ODbL 1.0 (dane OSM), wymagana atrybucja `© OpenStreetMap contributors` |
| Aktualizacja | ciągła, replikacja OSM |
| Pola (pokrycie w regionie) | `@osm_id` 100%, `@osm_type` 100%, `emergency` 100%, `access` 89%, `indoor` 84%, `defibrillator:location` 65%, `opening_hours` 31%, `operator` 30%, `phone` 22%, `level` 17%, `name` 0,6%, `addr:*` poniżej 1% |
| Uwagi | Świetne pokrycie punktów i dostęp 24/7, słabe adresy. To jedyne realne A dla całego województwa. |

Opcjonalnie Overpass API (te same dane OSM, zapytanie po `area["name"="województwo małopolskie"]`),
ale w audycie z 2026-11-21 główne instancje Overpass były niedostępne.

## 3. Klasa B — oficjalne listy/mapy wielu AED

| Jednostka | Punkty | URL | Pola | Format | Licencja | Uwagi |
|---|---:|---|---|---|---|---|
| **Kraków** (miasto) | **58 w tabeli / 74 deklarowane** | https://krakow.pl/aed_-_impuls_zycia/3992,artykul,mapa_aed.html | nazwa obiektu, adres, kategoria; brak współrzędnych (kolumna „Mapa” pusta) | HTML, 3 strony po 20/20/18 wierszy, paginacja `/instcbi/3992/2432/N/` | brak jawnej; dane publiczne, wymagana atrybucja | Program „Krakowski Impuls Życia AED”. Tabela jest listą, nie mapą. Strona programu podaje 74 AED, tabela 58 rekordów. |
| **powiat bocheński** | **10** | https://www.powiat.bochnia.pl/aktualnosci/powiat-bochenski-inwestuje-w-bezpieczenstwo-10-nowych-defibrylatorow-aed.html | nazwa obiektu, miasto/wieś, fragment adresu | HTML (news) | brak jawnej | Pełna lista 10 obiektów powiatowych: Starostwo, PCPR, OIK, SOSW, CKZiU Łapanów, Schronisko Rozdziele, ZS 1–3, II LO. Brak współrzędnych. |
| **Brzeźnica** (gmina) | **6** | https://www.xn--brzenica-o3b.pl/archiwum-artykulow/2754-aed-w-kazdej-miejscowosci-gminy-brzeznica | nazwa obiektu, miejscowość | HTML (news) | brak jawnej | OSP Łączany, OSP Chrząstowice, OSP Marcyporęba, OSP Kopytówka, Dom Seniora w Wyźrale, OSP Sosnowice. Artykuł wspomina mapę, ale nie linkuje jej w HTML. |
| **Budzów** (gmina) | **5** | https://budzow.pl?s=defibrylator | nazwa OSP, model urządzenia | HTML (wyniki wyszukiwania + news) | brak jawnej | OSP Budzów, Bieńkówka, Jachówka, Zachełmna, Palcza; Samaritan PAD 350P. Dodatkowo 2 AED z BO Małopolska 2026. |
| **Lubień** (gmina) | **4** | https://www.lubien.pl/asp/defibrylatory,1,artykul,1,3417 | nazwa OSP, adres | HTML | brak jawnej | OSP Lubień 34, OSP Tenczyn 701, OSP Skomielna Biała 601, OSP Krzeczów (bez adresu). Model CU Medical iPAD SP1. |
| **Radłów** (gmina) | **3** | https://www.gminaradlow.pl/dla-mieszkanca/bezpieczenstwo/defibrylatory-aed | nazwa OSP, adres | HTML | brak jawnej | OSP Radłów (Plac Kościuszki 5), OSP Przybysławice (48), OSP Wał-Ruda (240). Odsyła do OpenAEDMap i Geoportalu. |
| **powiat krakowski** | **3** | https://powiat.krakow.pl/aktualnosci-i-ogloszenia/aktualnosci/nowe-defibrylatory-aed-w-domach-pomocy-spolecznej-w-powiecie-krakowskim | nazwa placówki, gmina, typ | HTML (news) | brak jawnej | DPS Karniowice, DPS Owczary, DPS Czerna. Tylko nazwy, bez adresów. |
| *Jordanów (dodatkowo)* | **5+** | https://www.gmina-jordanow.pl/wyniki-wyszukiwania?search=defibrylator | nazwa obiektu, miejscowość | HTML (5 artykułów) | brak jawnej | Łętownia, OSP Osielec, OSP Wysoka, Kryta Pływalnia Naprawa, OSP Toporzysko. |
| *Wierzchosławice (dodatkowo)* | **5** | https://wierzchoslawice.pl?s=defibrylator | nazwa OSP, miejscowość | HTML (4 artykuły) | brak jawnej | 3 lokalizacje w Wierzchosławicach (w tym remiza), OSP Bogumiłowice, OSP Komorów. |

## 4. Klasa C — wzmianki i pojedyncze lokalizacje

| Jednostka | Punkty | URL | Co jest | Uwagi |
|---|---:|---|---|---|
| Słomniki | 1 nowy (13. w gminie) | https://www.slomniki.pl/index.php/start/aktualnosci/2525-nowy-defiblyrator-w-gminie-i-szkolenie-dla-mieszkancow-jak-uratowac-ludzkie-zycie-korzystajac-z-aed | świetlica w Zaborzu | Brak listy 13 lokalizacji. |
| Żabno | 2 | https://zabno.pl/?s=defibrylator | Żabno, Siedliszowice | News o 2 AED, brak adresów. |
| Trzebinia | 1 nazwany | https://www.trzebinia.pl/sprawy-mieszkancow/zdrowie-i-profilaktyka/rozmieszczenie-defibrylatorow | Dwór Zieleniewskich, ul. Piłsudskiego 47a | Strona „Rozmieszczenie” nie zawiera pełnej listy ani mapy. |
| Lipnica Murowana | 2 | https://www.lipnicamurowana.pl?s=defibrylator | Ośrodki zdrowia Lipnica Murowana i Rajbrot | News, brak adresów. |
| Słopnice | 2 | https://slopnice.pl/pl/6551/0/wyszukiwarka.html?q=defibrylator | OSP Słopnice Dolne i Górne | News, brak adresów. |
| Poronin | brak liczby | https://www.poronin.pl/szukaj?q=defibrylator | „wszystkie OSP” | Brak listy jednostek. |
| Wieprz | 1 | https://www.wieprz.pl/search/?search=defibrylator | OSP Frydrychowice | Pozostałe wyniki to kursy i granty. |
| Zembrzyce | 1 | https://zembrzyce.pl/wyszukiwarka?q=defibrylator | OSP Zembrzyce | Opis wyposażenia OSP. |
| Osiek | 0 nazwanych | https://osiek.pl/?s=defibrylator | zakup AED dla biblioteki | Brak lokalizacji. |
| Urząd Marszałkowski | 0 (rejestr) | https://www.malopolska.pl/wyniki-wyszukiwania?search_api_fulltext=defibrylator | 3 newsy | Patrz sekcja 6. |
| Bochnia (miasto, portal) | 10 (gmina Bochnia) | https://bochnianin.pl/?s=defibrylator | news portal | Nie jest stroną oficjalną; 10 AED gminy Bochnia. |
| Chełmek | 2+ | https://www.chelmek.pl/component/finder/search?Itemid=101&q=defibrylator | OSP Chełmek, 2 AED | News, brak pełnej listy. |
| Wadowice | brak liczby | https://wadowice.pl/?s=defibrylator | inicjatywa lokalna 2025 | Brak lokalizacji. |
| Oświęcim (gmina) | 2+ | https://gminaoswiecim.pl/pl/4078/0/wyszukiwarka.html?q=defibrylator | OSP Poręba Wielka, COT Brzezinka | News, brak pełnej listy. |

## 5. Klasa D — brak danych / fałszywy alarm

| Jednostka | URL | Powód |
|---|---|---|
| Nowe Brzesko | https://nowe-brzesko.iap.pl/wiadomosci/szukaj?q=defibrylator | Strona wyszukiwania bez wyników. |
| Skała | https://skala.pl/?s=defibrylator | 1 wynik niezwiązany („MOJA OKOLICA”). |
| Zator | https://zator.iap.pl/wiadomosci/szukaj?q=defibrylator | Brak wyników. |
| Polanka Wielka | https://polanka-wielka.iap.pl/wiadomosci/szukaj?q=defibrylator | Brak wyników. |
| Tomice | https://tomice.pl/?s=defibrylator | Tylko szkolenie pierwszej pomocy, brak AED. |
| Łapanów | https://lapanow.pl/?s=defibrylator | Tylko trening pierwszej pomocy, brak AED. |
| powiat tarnowski | https://powiat.tarnow.pl/component/finder/search?Itemid=101&q=defibrylator | „Nie znaleziono wyników”, `negative=true`. |

## 6. Urząd Marszałkowski Województwa Małopolskiego

- Wyszukiwarka: `https://www.malopolska.pl/wyniki-wyszukiwania?search_api_fulltext=defibrylator`
  (parametr `search_api_fulltext`, nie `q`).
- Wynik: **3 artykuły**, brak rejestru, mapy czy wykazu AED:
  - `defibrylatory-aed-dla-mieszkancow-powiatu-gorlickiego` (2024-05-23),
  - `powiat-myslenicki-10-defibrylatorow-aed-w-ramach-bo-malopolska` (2019-10-18),
  - `bo-malopolska-10-nowych-defibrylatorow-w-powiecie-myslenickim` (2019-07-26).
- Charakter: news o dofinansowaniu z Budżetu Obywatelskiego Małopolska i
  Programu Ochrony Ludności. Artykuły mogą zawierać listy 10 sztuk dla powiatu,
  ale są to materiały archiwalne, nie aktualny zbiór.
- **Klasa C** dla całego kanału. Brak A/B.

## 7. Kraków — szczegóły

- Strona programu: `https://krakow.pl/aed_-_impuls_zycia/3990,artykul,krakowski_impuls_zycia_aed.html`
  — deklaruje **74 AED** w sieci „Krakowski Impuls Życia AED”.
- Lista: `https://krakow.pl/aed_-_impuls_zycia/3992,artykul,mapa_aed.html`
  — tabela HTML, 3 strony: 20 + 20 + 18 = **58 rekordów**. Pola: nazwa
  obiektu/adres, kategoria „Defibrylatory zewnętrzne AED”, kolumna „Mapa”
  pusta. Brak współrzędnych i brak API.
- Formularz wyszukiwania tabeli działa przez POST (`searchString`), paginacja
  przez `/instcbi/3992/2432/{n}/`. To nadal HTML, nie JSON.
- Portal otwartych danych Krakowa (`otwartedane.um.krakow.pl`) nie ma zbioru
  AED (wyszukiwanie: 0 wyników). Warunki portalu pozwalają na ponowne
  wykorzystanie z podaniem źródła, ale strona `krakow.pl` nie ma jawnej
  licencji.
- **Klasa B**, najlepsza lista miejska w województwie, ale wymaga scrapingu i
  uzupełnienia współrzędnych.

## 8. Rekomendacje

1. **Kraków** — najlepsza lista adresowa (58/74), do scrapingu; uzupełnić
   geokodowaniem i ustalić aktualny stan 74 vs 58.
2. **powiat bocheński** — najlepsza lista powiatowa (10 obiektów, pełne nazwy).
3. **Brzeźnica (6)**, **Budzów (5)**, **Lubień (4)**, **Radłów (3)** — dobre
   listy gminne, małe, łatwe do ręcznej weryfikacji.
4. **OpenAEDMap** — jedyne źródło maszynowe dla całego województwa
   (1 706 punktów, GeoJSON, ODbL). Traktować jako bazę i uzupełniać adresami z
   list gminnych.
5. **Urząd Marszałkowski** — nie rokuje jako rejestr; ewentualnie jako źródło
   informacji o finansowaniu AED.
6. Nie używać jako A: Geoportal (brak potwierdzonej warstwy „Defibrylatory”),
   dane.gov.pl (brak zbioru małopolskiego).

## 9. Pliki

- Ten plik: `AED/docs/research/raw/voivodeships/ma-opolskie.md`
- Tabela: `AED/docs/research/raw/voivodeships/ma-opolskie.csv`
