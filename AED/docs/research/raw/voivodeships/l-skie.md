# Województwo śląskie — audyt źródeł AED

Data audytu: **2026-11-21**, godz. 19:48–20:15 czasu lokalnego (Europe/Warsaw).
Zakres: plik `candidates2_l-skie.json` — **72 jednostki** (gminy i powiaty).
Priorytet: `score >= 5` lub `registry_hint = true` — **18 jednostek**.
Dodatkowo sprawdzono: Urząd Marszałkowski Województwa Śląskiego, Katowice,
uruchomione strony/aplikacje gminne oraz krajowy eksport OpenAEDMap/OSM.

Legenda klas:

- **A** — maszynowy zbiór danych lub API AED (CSV/GeoJSON/JSON, licencja,
  powtarzalna aktualizacja).
- **B** — oficjalna strona/PDF z listą lub mapą wielu AED (HTML, bez API).
- **C** — tylko wzmianka/news, pojedyncze lokalizacje lub brak wykazu.
- **D** — brak danych albo fałszywy alarm (np. wynik wyszukiwania bez treści,
  błędna domena).

Metoda: żądania HTTP GET, parsowanie HTML i tabel, ręczna weryfikacja treści.
Nie sprawdzano współrzędnych na mapach, jeśli strona ich nie publikuje.
Nie zmieniano kodu i nie commitowano.

## 1. Podsumowanie

| Klasa | Priorytet (18) | Dodatkowo | Razem (72 kandydatów) |
|---|---:|---:|---:|
| A — lokalne zbiory/API | 0 | 0 | 0 |
| A — krajowe źródło pokrywające region | — | 1 | 1 |
| B — lista/mapa wielu AED | 5 | 1 | 6 |
| C — wzmianka/news | 11 | 19 | 30 |
| D — brak/fałszywy alarm | 2 | 34 | 36 |

Najważniejsze wnioski:

1. **W województwie śląskim nie ma lokalnego, maszynowego rejestru AED.**
   Wszystkie znalezione wykazy gminne to HTML albo osadzone mapy (Google My
   Maps, e-mapa), bez CSV/GeoJSON i bez jawnej licencji otwartej.
2. **Najlepsze rejestry urzędowe:** Bieruń (14 lokalizacji), Pawłowice (12),
   Gorzyce (12), Suszec (5 z współrzędnymi i pełnym opisem), Imielin (5),
   Koszęcin (2 opisane + link do OpenAEDMap).
3. **Jedynym realnym źródłem maszynowym dla całego województwa jest
   OpenAEDMap/OpenStreetMap** — 1 728 punktów w granicach województwa,
   GeoJSON, ODbL 1.0. To źródło bazowe, ale ma słabe adresy (`addr:*` ok. 1%).
4. **Urząd Marszałkowski nie prowadzi rejestru AED.** W BIP są tylko
   postępowania zakupowe (m.in. 63 AED, w tym Jaworzno 22 i powiat kłobucki 28)
   oraz newsy, bez listy zamontowanych urządzeń.
5. **Katowice nie publikują oficjalnej listy ani mapy AED.** Oficjalna strona
   ogranicza się do instrukcji pierwszej pomocy. Nieoficjalny portal
   24katowice.pl podaje 245 AED (68 ogólnodostępnych), ale to źródło trzecie.

## 2. Klasa A — źródła maszynowe

### 2.1. Brak lokalnego A

Sprawdzone:

- `api.dane.gov.pl/1.4/datasets?q=defibrylator` — 4 zbiory: Krosno, Przemyśl,
  Marki, Warszawa. **Żaden nie dotyczy Śląskiego.**
- `api.dane.gov.pl/1.4/datasets?q=AED` — 70 wyników, wśród trafnych tylko
  Przemyśl i Warszawa; brak jednostek śląskich.
- `otwartedane.katowice.eu` i `dane.katowice.eu` — timeout po 20 s
  (2026-11-21); brak potwierdzonego działającego portalu otwartych danych.
- `katowice.eu` — brak oficjalnej warstwy/listy AED (patrz sekcja 6).
- `slaskie.pl` i `bip.slaskie.pl` — brak rejestru (patrz sekcja 6).
- Żadna z 72 jednostek nie miała `dataset_hint = true`; żadna nie linkowała
  do CSV/GeoJSON/API AED.

### 2.2. Krajowe A: OpenAEDMap / OSM

| Pole | Wartość |
|---|---|
| URL | `https://openaedmap.org/api/v1/countries/PL.geojson` |
| Punkty w Śląskiem | **1 728** (snapshot 2026-11-21; point-in-polygon po granicy województwa) |
| Punkty w Polsce | 18 299 |
| Format | GeoJSON (`FeatureCollection`, `Point`, EPSG:4326, kolejność lon/lat) |
| Licencja | **ODbL 1.0** (dane OpenStreetMap), wymagana atrybucja `© OpenStreetMap contributors` |
| Aktualizacja | ciągła, replikacja OSM |
| Pola (pokrycie w regionie) | `@osm_id` 100%, `@osm_type` 100%, `@osm_version` 100%, `emergency` 100%, `access` 93%, `indoor` 88%, `defibrillator:location` 65%, `opening_hours` 39%, `check_date` 33%, `operator` 32%, `defibrillator:location:pl` 31%, `phone` 27%, `level` 25%, `addr:street` 1%, `addr:housenumber` 1%, `name` 2% |
| Uwagi | Najlepsze pokrycie punktów i dostępności, bardzo słabe adresy. Katowice w przybliżeniu 258 punktów (bbox), Gliwice ok. 117, Częstochowa ok. 103, Sosnowiec ok. 77. To jedyne realne A dla całego województwa. |

Opcjonalnie Overpass API z tą samą bazą OSM (główne instancje były wolne lub
niedostępne w dniu audytu; wynik policzono z eksportu OpenAEDMap).

## 3. Klasa B — oficjalne listy/mapy wielu AED

| Jednostka | Punkty | URL | Pola | Format | Licencja | Uwagi |
|---|---:|---|---|---|---|---|
| **Bieruń** | **14** | https://www.bierun.pl/mieszkancy/defibrylatory-aed-w-bieruniu | adres (ulica/nr), dokładne umiejscowienie; brak współrzędnych, godzin i operatora | HTML, tabela 15 wierszy (nagłówek + 14) | brak jawnej; treść serwisu, wymagana atrybucja | Największa pełna lista w regionie. Link do OpenAEDMap i Google Maps. `max_count` 13 w pliku kandydatów nieco zaniża rzeczywiste 14. |
| **Pawłowice** | **12** | https://www.pawlowice.pl/mieszkaniec/zdrowie/mapa-defibrylatorow-aed | miejsce, adres, lokalizacja wewnątrz/na zewnątrz | HTML, tabela 13 wierszy + osadzona Google My Maps `mid=1DSs_ESjkEU6AaxZjgpLgwtk5tlG11gc` | brak jawnej; mapa Google | Wykaz 12 obiektów, w tym 7 OSP (AED w samochodach). Mapa osadzona, brak eksportu KML/CSV z poziomu strony. |
| **Gorzyce** | **12** | https://www.gorzyce.pl/aktualnosci/index/Nowe-defibrylatory-AED-juz-dostepne-w-solectwach-Gminy-Gorzyce/idn:1469 | sołectwo/obiekt, opis miejsca (brama, ściana, wejście); brak współrzędnych | HTML (news oficjalny z listą) | brak jawnej | 12 lokalizacji: OSP Bełsznica, Bluszczów, Gorzyce, Gorzyczki, Uchylsko, GOTSiR Nautica, LASPOL, UG Gorzyce, Osiny, OSP Turza Śląska, OK Czyżowice, Świetlica w Odrze. |
| **Suszec** | **5** | https://suszec.pl/pl/6556/17612/informacja-na-temat-danych-lokalizacji-urzadzen-aed-na-terenie-gminy-suszec.html | **współrzędne**, mobilność (OSP/kapsuła), opis/adres, telefon zarządcy, dostęp, godziny | HTML, tabela 5 rekordów | brak jawnej | **Najbogatsze pola w regionie** i jedyna lista z współrzędnymi. 4 AED w samochodach OSP (dostęp po wezwaniu) + 1 w kapsule przy kościele w Rudziczce (24/7). |
| **Imielin** | **5** | https://www.imielin.pl/pl/205/6222/do-ratowania-zycia-defibrylatory-w-imielinie-.html | adres, dostęp (2 zewnętrzne 24/7, 3 wewnętrzne w godzinach otwarcia) | HTML + link do e-mapa `https://mimielin.e-mapa.net?userview=140` | brak jawnej | 5 lokalizacji: UM Imielin, Przedszkole nr 2, Hala Sapety, Hala SP2, Stadion Miejski. Link do mapy gminnej, ale bez API/WFS potwierdzonego w HTML. |
| **Koszęcin** | **2** | https://koszecin.pl/defibrylatory-aed-w-koszecinie.html | adres, opis miejsca, sposób otwarcia; brak współrzędnych | HTML + link do OpenAEDMap | brak jawnej | Strona opisuje tylko 2 urządzenia: DK przy ul. Sobieskiego 11b i Nadleśnictwo Koszęcin, ul. Sobieskiego 1. Reszta widoczna wyłącznie na OpenAEDMap. `max_count` 19 to liczba wystąpień słowa, nie punktów. |

Wspólne ograniczenia B: brak pól `operator`, `opening_hours`, `manufacturer`,
`serial`, `check_date`; brak licencji otwartej; dane trzeba przepisać ręcznie.
Suszec jest jedynym źródłem B z współrzędnymi gotowymi do geokodowania.

## 4. Klasa C — wzmianki, newsy i pojedyncze lokalizacje

### 4.1. Priorytet (score >= 5 lub registry_hint)

| Jednostka | score | URL | Co jest | Dlaczego C |
|---|---:|---|---|---|
| Myszków | 11 | https://www.miastomyszkow.pl/kategorie/1189-dwa-defibrylatory-dla-urzedu-miasta | news: 2 AED dla Urzędu Miasta | brak publicznej listy lokalizacji |
| powiat pszczyński | 6 | https://www.powiat.pszczyna.pl/szukaj/?q=defibrylator | news: 3 AED (Starostwo, Centrum Przesiadkowe, szkoła) | tylko 3 punkty, brak wykazu |
| Sławków | 6 | https://www.slawkow.pl/artykuly-z-tagiem,defibrylator | 2 lokalizacje (Ratusz, Młyńska 14a) | news, brak rejestru |
| Knurów | 5 | https://www.knurow.pl/main/szukaj?szukaj=defibrylator | wzmianki, m.in. projekt BO | brak listy |
| Pyskowice | 5 | https://www.pyskowice.pl/szukaj.html?search=defibrylator | wzmianka w sesji Rady Miejskiej | brak lokalizacji |
| Racibórz | 5 | https://www.raciborz.pl/urzad/aktualnosci_lista/Firma-Henkel-przekazala-defibrylatory-Miastu-Raciborz/idn:11338 | news: 4 lokalizacje (Visit Racibórz, Przedszkole nr 24, Park Roth, Arboretum) | 4 punkty w newsie, brak tabeli |
| Olsztyn (jurajski) | 4 | https://www.olsztyn-jurajski.pl/?s=defibrylator | news: 1 AED przekazany gminie | jedna lokalizacja |
| Jaworze | 4 | https://www.jaworze.pl/wyniki-wyszukiwania?search=defibrylator | news: 3 AED na terenie gminy | brak tabeli adresowej |
| Kruszyna | 4 | https://www.kruszyna.pl?s=defibrylator | news: zakup 4 AED, pierwszy w Urzędzie Gminy | brak pełnej listy |
| Mykanów | 4 | https://mykanow.pl?s=defibrylator | news o pierwszej pomocy | brak wykazu |
| Rajcza | 3 | https://rajcza.pl/?s=defibrylator | postępowanie na zakup AED | brak listy lokalizacji |

### 4.2. Inne jednostki z realną wzmianką

| Jednostka | URL | Co jest |
|---|---|---|
| Nędza | https://www.nedza.pl/main/szukaj?szukaj=defibrylator | AED przy paczkomatach InPost w Nędzy i Szymocicach |
| Godów | https://www.godow.pl/main/szukaj?szukaj=defibrylator | AED na remizie OSP Godów |
| powiat raciborski | https://www.powiatraciborski.pl/main/szukaj?szukaj=defibrylator | AED w PUP, PKS i jednostkach powiatu |
| powiat myszkowski | https://www.powiatmyszkowski.pl/wyszukiwarka?szukaj=defibrylator | defibrylatory w sprzęcie szpitalnym/karetkach |
| Ornontowice | https://ornontowice.pl/?s=defibrylator | AED i szkolenia w KS StandART |
| Radlin | https://miasto.radlin.pl/?s=defibrylator | wyniki wyszukiwania, brak wykazu |
| Lelów | https://www.lelow.pl/wyszukiwarka?szukaj=defibrylator | defibrylator szkoleniowy, brak AED publicznych |
| Konopiska | https://www.konopiska.pl/znalezione?szukaj=defibrylator | news o bezpieczeństwie, brak wykazu |
| Kornowac | https://www.kornowac.pl/wyszukiwarka.html?q=defibrylator | AED na remizie OSP Łańce |
| Niegowa | https://niegowa.bip.net.pl/ | zapytanie ofertowe na zakup AED |
| powiat bieruńsko-lędziński | https://www.powiatbl.pl/main/szukaj?szukaj=defibrylator | wyniki wyszukiwania/news |
| Kuźnia Raciborska | https://kuzniaraciborska.pl?s=defibrylator | wzmianka/news |
| Krzyżanowice | https://www.krzyzanowice.pl/?s=defibrylator | wzmianka/news |
| Miedźna | https://www.miedzna.pl/?s=defibrylator | wzmianka/news |
| Pawonków | https://www.pawonkow.pl/wyszukiwarka?szukaj=defibrylator | wzmianka/news |
| Wojkowice | https://www.wojkowice.pl/main/szukaj?szukaj=defibrylator | ogólny artykuł o pierwszej pomocy |
| Kobiór | https://samorzad.gov.pl/web/gmina-kobior/ | AED w Urzędzie Gminy i przy OSP |
| Koszarawa | https://gminakoszarawa.pl/aktualnosci/defibrylator-dla-ochotniczej-strazy-pozarnej-w-koszarawie | AED dla OSP Koszarawa |
| Rędziny | https://redziny.pl/nowy-defibrylator-aed-na-budynku-gok-w-redzinach/ | AED na budynku GOK |

## 5. Klasa D — brak danych i fałszywe alarmy

Najważniejsze przypadki:

- **Psary** — wyszukiwarka zwraca „Nie znaleziono wyników” dla „defibrylator”.
- **powiat rybnicki** — wynik wyszukiwania bez treści AED; brak wykazu.
- **Miasteczko Śląskie, Radzionków, Gaszowice, Mierzęcice** — wyszukiwarki
  zwracają brak wyników.
- **powiat będziński, Kamienica Polska** — „Nothing Found”.
- **Tarnowskie Góry, Włodowice, powiat tarnogórski, powiat mikołowski,
  Herby, Kłobuck, Pilchowice** — brak treści AED w wynikach.
- **Lipowa** — wynik wskazuje na `olegames.io` (błędna/hybrydowa domena),
  fałszywy alarm.
- Pozostałe D: Pszów, Rydułtowy, Wodzisław Śląski, Mysłowice, powiat
  częstochowski, powiat lubliniecki, Ogrodzieniec, Pilica, Pszczyna, Toszek,
  Wilamowice, Irządze, Kroczyce, Lipie, Mstów, Radziechowy-Wieprz, Węgierska
  Górka, Łodygowice, Żarnowiec, Wyry, Mierzęcice — brak trafień.

## 6. Urząd Marszałkowski i Katowice

### 6.1. Urząd Marszałkowski Województwa Śląskiego

- `https://www.slaskie.pl/cms/search/index?q=defibrylator` — wyniki to newsy
  (np. wyposażenie pociągów Kolei Śląskich w AED) i dokumenty, bez rejestru.
- `https://bip.slaskie.pl` — postępowanie **OR-ZN.272.1.58.2020.MJ** „Dostawa
  defibrylatorów AED wraz z dostawą szafek, montażem, oznakowaniem i
  szkoleniami”: **63 szt.**, w tym Jaworzno 22 i powiat kłobucki 28.
  To zakup, nie wykaz lokalizacji.
- Brak wojewódzkiej mapy, API, CSV lub PDF z listą AED.
- **Klasa C** dla celów rejestru (dokumentacja zakupowa, nie rejestr).

### 6.2. Katowice

- `https://katowice.eu/dla-mieszkańca/bezpieczeństwo-publiczne/instrukcje-postępowania/pierwsza-pomoc`
  — instrukcja pierwszej pomocy, bez listy AED.
- Wyszukiwarka `katowice.eu/search` nie zwraca wyników AED (SharePoint search
  nieskonfigurowany/JS); brak sitemapy.
- `otwartedane.katowice.eu` i `dane.katowice.eu` — timeout (2026-11-21).
- **Brak oficjalnego rejestru.** Nieoficjalny `https://24katowice.pl/defibrylatory`
  podaje **245 AED, w tym 68 ogólnodostępnych**; to agregator, klasa C.
- OSM/OpenAEDMap ma w przybliżeniu **258 punktów** w bbox Katowic.

## 7. Rekomendacje

1. **Do bazy punktowej:** użyć OpenAEDMap/OSM (A) jako szkieletu dla całego
   województwa, a następnie wzbogacić punktami z B.
2. **Priorytet importu B:**
   1. Bieruń — 14 lokalizacji z adresami,
   2. Pawłowice — 12 lokalizacji z adresami,
   3. Gorzyce — 12 lokalizacji z opisem miejsca,
   4. Suszec — 5 lokalizacji z współrzędnymi, telefonem i godzinami,
   5. Imielin — 5 lokalizacji z dostępem 24/7,
   6. Koszęcin — 2 lokalizacje + OpenAEDMap.
3. **Ręcznie uzupełnić** brakujące współrzędne dla Bierunia, Pawłowic,
   Gorzyc, Imielina i Koszęcina (geokodowanie adresów).
4. **Nie traktować** stron C jako źródła punktów bez weryfikacji; większość
   podaje liczbę urządzeń lub pojedyncze lokalizacje.
5. **Wystąpić o dane** do gmin B (Bieruń, Pawłowice, Gorzyce, Suszec, Imielin)
   o licencję i eksport CSV/GeoJSON; obecnie brak jawnej licencji otwartej.
6. **Katowice i urząd marszałkowski** wymagają osobnego wniosku o informację
   publiczną — publiczne rejestry nie istnieją.

## 8. Pliki

- `l-skie.md` — ten raport.
- `l-skie.csv` — tabela wszystkich 72 kandydatów + źródła dodatkowe
  (OpenAEDMap, urząd marszałkowski, Katowice, 24katowice.pl).
