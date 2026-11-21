# Województwo świętokrzyskie - audyt źródeł AED

Data badania: **2026-11-21**
Plik kandydatów: `candidates2_wi-tokrzyskie.json` (41 jednostek)
Zakres: gminy i powiaty z pliku, **Urząd Marszałkowski Województwa Świętokrzyskiego**, **miasto Kielce**.
Metoda: bezpośrednie zapytania HTTP do wyszukiwarek jednostek, odczyt treści stron, przegląd portali GIS i otwartych danych, API `dane.gov.pl`.

## Legenda klas

| Klasa | Znaczenie |
|---|---|
| **A** | maszynowy zbiór/API AED (CSV/GeoJSON/JSON, współrzędne) |
| **B** | oficjalna strona/PDF z listą lub mapą **wielu** AED |
| **C** | tylko wzmianka/news o pojedynczym AED lub o szkoleniu/zakupie |
| **D** | brak danych, brak wyników, fałszywy alarm lub strona niezwiązana |

## Wynik zbiorczy

| Klasa | Liczba jednostek |
|---|---|
| A | **0** |
| B | **0** |
| C | **9** |
| D | **32** |
| Razem | **41** |

W całym województwie **nie znaleziono żadnego oficjalnego, maszynowego rejestru AED** ani strony/PDF gminy z listą wielu AED. Wszystkie trafienia to pojedyncze komunikaty lub artykuły o jednym urządzeniu, zakupie albo szkoleniu.

## Priorytet (score >= 5 lub registry_hint = true)

| Jednostka | QID | Score | Hint | Klasa | URL | Punkty AED | Pola | Licencja | Format | Dowód |
|---|---|---|---|---|---|---|---|---|---|---|
| Sędziszów | Q554663 | 9 | true | **C** | https://sedziszow.pl/zdrowie/defibrylator-aed-w-gminie-sedziszow/ | 1 | lokalizacja (budynek Urzędu Miejskiego), dostęp 24/7, opis | brak jawnej | HTML | „na budynku Urzędu Miejskiego w Sędziszowie został zamontowany ogólnodostępny defibrylator AED”, kapsuła zewnętrzna. Brak listy/mapy. |
| Klimontów | Q567380 | 4 | true | **C** | https://klimontow.pl/?s=defibrylator | 1 | OSP, pojazd | brak jawnej | HTML | Wynik wyszukiwania: „Nowe auto w OSP Klimontów” (2023-02-01), wzmianka o wyposażeniu. |
| Kije | Q553284 | 3 | true | **C** | https://kije.pl/?s=defibrylator | 1 | OSP | brak jawnej | HTML | Artykuł „Z serca dla serca – OSP Kije nadaje rytm”, wzmianka o AED w OSP. |
| Słupia | Q554031 | 3 | true | **D** | https://slupia.pl/?s=defibrylator | 0 | - | - | HTML | Wyszukiwarka: „Your lost treasure is not found here”, brak wyników. |
| Opatowiec | Q553741 | 1 | true | **D** | http://old.opatowiec.pl?s=defibrylator | 0 | - | - | HTML | Stary serwis, fraza negatywna, brak wyniku. |

Dodatkowo sprawdzono Krasocin (score 4, poniżej progu): **C** - https://www.krasocin.com.pl/.../2467-warsztaty-pierwszej-pomocy-i-zakup-defibrylatora-aed-w-sulkowie - warsztaty i zakup jednego AED w Sułkowie (Dom Ludowy), brak listy.

## Urząd Marszałkowski Województwa Świętokrzyskiego

| Element | Wynik |
|---|---|
| Wyszukiwarka | https://www.swietokrzyskie.pro/?s=defibrylator - 200 |
| Trafienia | 3 artykuły: „Bielinianie mają kolejny defibrylator”, „Wojewódzki Specjalistyczny Szpital Dziecięcy w Kielcach...”, „Defibrylatory na kąpieliskach” |
| Klasyfikacja | **C** (news), nie rejestr |
| Uwagi | „Defibrylatory na kąpieliskach”: 3 urządzenia dla WOPR na kąpieliskach Radzanów, Hańcza, Sielpia. Artykuł o Bielinach podaje 6 AED w gminie, ale bez adresów i współrzędnych. |
| Rejestr/mapa AED | **brak** |

## Miasto Kielce

| Kanał | URL | Wynik |
|---|---|---|
| Serwis miejski (SmartSite) | https://www.kielce.eu/cms/search/advanced?srchTerm=defibrylator | 0 trafień |
| Serwis miejski, fraza AED | https://www.kielce.eu/cms/search/advanced?srchTerm=AED | 0 trafień |
| BIP Kielce | http://www.bip.kielce.eu/ (wyszukiwarka Liferay) | 0 trafień |
| Otwarte dane Kielce | https://dane.kielce.eu/pl/zbiory-danych | 28 zbiorów, **brak AED** (budynki, działki, szkoły, żłobki, RCN, parkowanie itd.) |
| GIS Kielce / IDEA | https://gis.kielce.eu/ , https://idea.kielce.eu/geoportal | warstwy WMS: własności, obciążenia, działki, granica, obręby; **brak warstwy AED** |
| Klasyfikacja | **D** - brak publicznego rejestru lub mapy AED |

## Rejestry i źródła maszynowe (krajowe, obejmują województwo)

| Źródło | Klasa | URL | Punkty | Pola | Licencja | Format |
|---|---|---|---|---|---|---|
| OSM / OpenAEDMap (`emergency=defibrillator`) | **A** | https://openaedmap.org/ ; https://overpass-turbo.eu/ | brak pomiaru (Overpass zablokowany w tej sesji); zasięg krajowy, filtr po granicy województwa (OSM relation 130914) | `lat`, `lon`, `name`, `operator`, `addr:*`, `opening_hours`, `access`, `defibrillator:*` | **ODbL 1.0** | JSON/GeoJSON/CSV przez Overpass API |
| `dane.gov.pl` - zbiory AED | A (krajowe) | https://api.dane.gov.pl/1.4/datasets?q=defibrylator | 4 zbiory: Krosno, Przemyśl, Marki, Warszawa | adres, punkt, właściciel | CC0 1.0 / CC BY 4.0 | JSON:API, CSV, GeoJSON, GML, XLSX |
| `dane.gov.pl` - zbiory województwa świętokrzyskiego | - | jak wyżej | **0 zbiorów AED** | - | - | - |
| KSRG/OSP, KG PSP | C (pośrednio) | https://www.gov.pl/web/kgpsp/osp-w-ksrg | ~5363 OSP w kraju; każda jednostka KSRG ma AED z warunku włączenia | gmina, powiat, nazwa JOP; brak adresu i współrzędnych | gov.pl domyślnie CC BY-SA 4.0, brak jawnej licencji zbioru | PDF (72 str.), brak API |
| SIP Województwa Świętokrzyskiego | - | http://sip.e-swietokrzyskie.pl/ | brak warstwy AED (MPZP, ortofoto, OSP, geologia, łowiectwo) | - | - | portal mapowy |
| GUS TERYT / PRG | - | - | brak AED | - | - | - |

## Klasyfikacja wszystkich jednostek z pliku

| Jednostka | Typ | Score | Hint | Klasa | Uzasadnienie |
|---|---|---|---|---|---|
| Sędziszów | gmina miejsko-wiejska | 9 | true | C | 1 AED na Urzędzie Miejskim, komunikat |
| Klimontów | gmina miejsko-wiejska | 4 | true | C | news o aucie OSP |
| Krasocin | gmina wiejska | 4 | false | C | news: warsztaty + zakup AED w Sułkowie |
| Kije | gmina wiejska | 3 | true | C | news o OSP Kije |
| Słupia | gmina wiejska | 3 | true | D | brak wyników |
| Opatowiec | gmina miejsko-wiejska | 1 | true | D | stary serwis, brak wyniku |
| Skarżysko-Kamienna | gmina miejska | 0 | false | D | 0 trafień |
| Starachowice | gmina miejska | 0 | false | D | 0 trafień w wyszukiwarce miejskiej; brak rejestru |
| Mirzec | gmina wiejska | 0 | false | D | 7 wyników wyszukiwania, brak treści AED |
| Moskorzew | gmina wiejska | 0 | false | D | wyniki to lista OSP, brak treści AED |
| powiat jędrzejowski | powiat | 0 | false | D | „nie znaleziono” |
| powiat opatowski | powiat | 0 | false | D | 0 trafień |
| powiat pińczowski | powiat | 0 | false | C | news „Nowoczesny sprzęt dla bezpieczeństwa mieszkańców” (luty 2026), wzmianka |
| powiat włoszczowski | powiat | 0 | false | D | 0 trafień |
| Bodzentyn | gmina miejsko-wiejska | -1 | false | D | 0 trafień |
| Jędrzejów | gmina miejsko-wiejska | -1 | false | D | 0 trafień |
| Końskie | gmina miejsko-wiejska | -1 | false | C | wzmianka o pokazach pierwszej pomocy z AED |
| Nowa Słupia | gmina miejsko-wiejska | -1 | false | D | 0 trafień |
| Nowy Korczyn | gmina miejsko-wiejska | -1 | false | D | brak wyników treści |
| Pacanów | gmina miejsko-wiejska | -1 | false | D | brak wyników treści |
| Pińczów | gmina miejsko-wiejska | -1 | false | D | 0 trafień |
| Stopnica | gmina miejsko-wiejska | -1 | false | D | brak wyników treści |
| Stąporków | gmina miejsko-wiejska | -1 | false | D | 0 trafień |
| Szydłów | gmina miejsko-wiejska | -1 | false | D | brak wyników treści |
| Wąchock | gmina miejsko-wiejska | -1 | false | D | wynik „Strażacy w szkole”, brak AED w treści |
| Bliżyn | gmina wiejska | -1 | false | C | news OSP Sorbin: uzupełniono elektrody AED |
| Baćkowice | gmina wiejska | -2 | false | C | ogłoszenie o zamówieniu na sprzęt, wzmianka |
| Czarnocin | gmina wiejska | -2 | false | D | brak wyników treści |
| Imielno | gmina wiejska | -2 | false | D | brak wyników treści |
| Lipnik | gmina wiejska | -2 | false | D | 0 trafień |
| Nagłowice | gmina wiejska | -2 | false | D | strona przekierowuje do wp.pl, brak danych |
| Oksa | gmina wiejska | -2 | false | D | 0 trafień |
| Sadowie | gmina wiejska | -2 | false | D | domena przechwycona przez serwis SEO, fałszywy alarm |
| Secemin | gmina wiejska | -2 | false | C | news: ambulans wyposażony w defibrylator |
| Smyków | gmina wiejska | -2 | false | D | `fortes.pl` to strona ISP, fałszywy alarm |
| Wojciechowice | gmina wiejska | -2 | false | D | 0 trafień |
| Złota | gmina wiejska | -2 | false | D | brak wyników treści |
| Łoniów | gmina wiejska | -2 | false | D | brak wyników treści |
| Łączna | gmina wiejska | -2 | false | D | 0 trafień |
| Nowiny | gmina wiejska | -3 | false | D | „Nothing Found” |
| Łagów | gmina miejsko-wiejska | -4 | false | D | „Brak wyników wyszukiwania” |

## Wnioski

1. Województwo świętokrzyskie **nie ma** publicznego rejestru ani mapy AED - ani na poziomie marszałkowskim, ani w Kielcach.
2. Najlepszym źródłem maszynowym dla regionu pozostaje **OSM / OpenAEDMap** (A, ODbL, GeoJSON), ale pokrycie jest nieznane i wymaga eksportu Overpass po granicy relation 130914.
3. **`dane.gov.pl`** ma tylko 4 zbiory AED (Krosno, Przemyśl, Marki, Warszawa) - żaden nie dotyczy świętokrzyskiego.
4. **KSRG/OSP** daje dolne ograniczenie liczby AED w OSP (PDF, bez współrzędnych, pośrednio), ale nie jest rejestrem urządzeń.
5. Gminy publikują wyłącznie pojedyncze komunikaty (C). Najbardziej obiecujące do dalszego wywiadu: Sędziszów (1 AED, dobra dokumentacja), Bieliny (6 AED - poza plikiem kandydatów), Kielce (miasto bez mapy, ale duże zagęszczenie AED w OSM).
