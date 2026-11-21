# Źródła danych AED — pełna lista

Data: 2026-11-21

Pełny inwentarz źródeł danych o defibrylatorach AED w Polsce, zebranych podczas researchu (skan 16 województw + audyt agregatorów i aplikacji mobilnych). Łącznie **79 unikalnych źródeł**:

- **69 rejestrów** samorządowych i krajowych (w tym OpenAEDMap/OSM jako jedyne źródło krajowe),
- **10 agregatorów i aplikacji** (OpenAEDMap występuje w obu listach badawczych, ale liczony jest tylko raz).

Uwaga: dwie z dziesięciu aplikacji (Ratunek, mojeIKP) **nie zawierają danych AED** — zostały zbadane i wykluczone z importu, ale pozostają na liście jako źródła zweryfikowane. Trzy kolejne (aedmapa.pl, Ratujemy.com.pl, częściowo InfoRatunek i SOS DAE) to pochodne OSM, a nie niezależne bazy.

Klasy rejestrów:

| Klasa | Liczba | Znaczenie |
| --- | ---: | --- |
| **A** | 11 | maszynowy zbiór/API z geometrią (KML, CSV, JSON, GeoJSON, XLSX) |
| **B+** | 5 | HTML/PDF ze współrzędnymi, gotowe do parsowania |
| **B** | 44 | oficjalna lista/mapa wielu AED, bez współrzędnych lub bez maszynowego eksportu |
| **B-** | 9 | lista niepełna, tabela-obraz, tylko nazwy albo martwa mapa |

Klasa A nie oznacza licencji otwartej — licencja jest osobną kolumną. Część źródeł klasy A to KML z Google My Maps, bez deklaracji licencji i bez wersjonowania (ToS Google).

## 1. Rejestry samorządowe i krajowe (69)

### Klasa A — dane maszynowe z geometrią (11)

| Jednostka | Województwo | Format | Liczba punktów | Współrzędne | Licencja | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Bełchatów | łódzkie | KML (Google My Maps) | 32 | tak | brak; ToS Google | https://belchatow.pl/mapa-defibrylatorow-aed/ |
| Łódź | łódzkie | KML (Google My Maps) | 136 | tak | brak; ToS Google | https://www.lodz.pl/artykul/defibrylatory-na-ulicach-lodzi-jak-ich-uzywac-gdzie-je-znajdziesz-mapa-58563/ |
| Zielona Góra | lubuskie | KML (Google My Maps) | 165 | tak | brak; ToS Google | https://www.zielona-gora.pl/mapa-lokalizacji-automatycznych-defibrylatorow-w-zielonej-gorze/ |
| Marki | mazowieckie | CSV + XLSX | 8 | tak | CC BY 4.0 | https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miast |
| Warszawa | mazowieckie | JSON API | nieznana (~622 w dokumentacji) | tak | CC BY 4.0 | https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed |
| Krosno | podkarpackie | CSV | 21 | tak | CC0 1.0 | https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno |
| Przemyśl | podkarpackie | GeoJSON/JSON/CSV/GML | 21 | tak | CC0 1.0 | https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatoro |
| Tczew | pomorskie | KML (Google My Maps) | 12 | tak | brak; ToS Google | https://tczew.pl/aed/ |
| Olsztyn | warmińsko-mazurskie | KML (Google My Maps) | 43 | tak | brak; ToS Google | https://olsztyn.eu/urzad-miasta/zdrowie/defibrylatory-na-terenie-olsztyna.html |
| Pawłowice | śląskie | KML (Google My Maps) | 12 | tak | brak; ToS Google | https://www.pawlowice.pl/mieszkaniec/zdrowie/mapa-defibrylatorow-aed |
| OpenAEDMap / OSM | krajowe | GeoJSON + MVT + JSON node | 18 299 | tak | ODbL 1.0 | https://openaedmap.org/api/v1/countries/PL.geojson |

Uwagi do klasy A:
- Największe lokalne zbiory punktowe: Zielona Góra (165), Łódź (136), Olsztyn (43) — wszystkie KML z Google My Maps, bez licencji otwartej.
- Warszawa, Marki, Przemyśl i Krosno to jedyne zbiory AED w dane.gov.pl. API Warszawy wymaga tokena (bez tokena 403).
- CSV Marek ma wadliwe cytowanie i zamienione osie (nagłówek lon,lat; dane lat,lon); jeden rekord poza Markami. CSV Krosna ma BOM i wiodące spacje w nagłówkach.
- OpenAEDMap/OSM to jedyny pełny, otwarty zbiór krajowy (snapshot 2026-11-21: 18 299 obiektów; pokrycie nierówne, adresy słabe). Atrybucja „© OpenStreetMap contributors” obowiązkowa.

### Klasa B+ — HTML/PDF ze współrzędnymi (5)

| Jednostka | Województwo | Format | Liczba punktów | Współrzędne | Licencja | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Sława | lubuskie | HTML table | 13 | tak | brak | https://slawa.pl/aed-w-gminie-slawa/ |
| Tarnów Opolski | opolskie | HTML list | 10 urządzeń / 9 lokalizacji | tak | brak | https://opolsar.pl/aed/ |
| Czarne | pomorskie | PDF table | 20 | tak | brak | https://czarne.pl/files/file_add/download/35_document.pdf |
| Manowo | zachodniopomorskie | HTML list | 8 | tak | brak | https://manowo.pl/strona/defibrylator-aed-na-terenie-gminy-manowo |
| Suszec | śląskie | HTML table | 5 | tak | brak | https://suszec.pl/pl/6556/17612/informacja-na-temat-danych-lokalizacji-urzadzen-aed-na-terenie-gminy-suszec.html |

Te pięć źródeł można stosunkowo łatwo podnieść do klasy A parserem HTML/PDF: Sława (13/13 ze współrzędnymi), Manowo (współrzędne w nawiasach), Tarnów Opolski (GPS, telefon, model, dostęp), Suszec (współrzędne, telefon, godziny, mobilność), Czarne (PDF: współrzędne WGS84, adres, umieszczenie, dostępność).

### Klasa B — oficjalne listy i mapy bez współrzędnych (44)

| Jednostka | Województwo | Format | Liczba punktów | Współrzędne | Licencja | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Góra | dolnośląskie | HTML | 8 | nie | brak | https://gora.com.pl/lokalizacje-aed.html |
| Kobierzyce | dolnośląskie | HTML | 13 | nie | brak | https://www.ugk.pl/defibrylatory-aed |
| Lubin (gmina wiejska) | dolnośląskie | HTML | 3+ | nie | brak | https://ug.lubin.pl/aed-urzadzenia-ratujace-zycie/ |
| Polkowice | dolnośląskie | HTML | 21 miejsc / 23 urządzenia | nie | brak | https://polkowice.eu/defibrylator-ratuje-zycie/ |
| Strzegom | dolnośląskie | HTML | 15 miejsc / 19 urządzeń | nie | brak | https://strzegom.pl/aktualnosci/n,406305,wykaz-defibrylatorow-aed-na-terenie-gminy-strzegom.html |
| Bydgoszcz | kujawsko-pomorskie | HTML + KML (bez geometrii) | 114 adresów | nie | brak | https://typo3.um.bydgoszcz.pl/bezpieczenstwo/abc-bezpieczenstwa |
| Toruń | kujawsko-pomorskie | HTML list | 46 | nie | brak | https://www.torun.pl/pl/zdrowie/defibrylatory-aed-wykaz-lokalizacji |
| Lublin | lubelskie | HTML + PDF | 48 (46 unikalnych adresów) | nie | brak | https://lublin.eu/mieszkancy/zdrowie/aktualnosci/aed-w-lublinie,748,1345,1.html |
| Brzeźnica | małopolskie | HTML/news | 6 | nie | brak | https://www.xn--brzenica-o3b.pl/archiwum-artykulow/2754-aed-w-kazdej-miejscowosci-gminy-brzeznica |
| Budzów | małopolskie | HTML/search | 5 | nie | brak | https://budzow.pl?s=defibrylator |
| Jordanów | małopolskie | HTML/search | 5 | nie | brak | https://www.gmina-jordanow.pl/wyniki-wyszukiwania?search=defibrylator |
| Kraków | małopolskie | HTML table | 58 w tabeli / 74 deklarowane | nie | brak | https://krakow.pl/aed_-_impuls_zycia/3992,artykul,mapa_aed.html |
| Lubień | małopolskie | HTML | 4 | nie | brak | https://www.lubien.pl/asp/defibrylatory,1,artykul,1,3417 |
| powiat bocheński | małopolskie | HTML/news | 10 | nie | brak | https://www.powiat.bochnia.pl/aktualnosci/powiat-bochenski-inwestuje-w-bezpieczenstwo-10-nowych-defibrylatorow-aed.html |
| powiat krakowski | małopolskie | HTML/news | 3 | nie | brak | https://powiat.krakow.pl/aktualnosci-i-ogloszenia/aktualnosci/nowe-defibrylatory-aed-w-domach-pomocy-spolecznej-w-powiecie-krakowskim |
| Radłów | małopolskie | HTML | 3 | nie | brak | https://www.gminaradlow.pl/dla-mieszkanca/bezpieczenstwo/defibrylatory-aed |
| Wierzchosławice | małopolskie | HTML/search | 5 | nie | brak | https://wierzchoslawice.pl?s=defibrylator |
| Nieporęt | mazowieckie | HTML + PDF | 10 | nie | brak | https://www.nieporet.pl/defibrylatory-aed |
| Łomża | podlaskie | HTML/news | 10 | nie | brak | https://www.lomza.pl/ |
| Gdańsk | pomorskie | HTML list | 26 | nie | brak | https://www.gdansk.pl/budzet-obywatelski/Ogolnomiejski-Bezpieczny-Gdansk-26-defibrylatorow-do-ratowania-zycia-w-przestrzeni-miasta,a,164468 |
| Kosakowo | pomorskie | HTML list | 10 | nie | brak | https://gminakosakowo.pl/aktualnosci/informacja-o-zainstalowanych-ogolnodostepnych-defibrylatorach-aed-w-gminie-kosakowo/ |
| Nowa Wieś Lęborska | pomorskie | PNG table + HTML | 10 | nie | brak | https://www.nwl.pl/dla-mieszkanca/bezpieczenstwo/automatyczne-defibrylatory/ |
| powiat starogardzki | pomorskie | HTML list | 28 | nie | brak | https://powiatstarogard.pl/wydzial-nadzoru-wlascicielskiego-i-zdrowia/siec-defibrylatorow/ |
| Pruszcz Gdański | pomorskie | HTML list + e-mapa | 15 | nie (object ID e-mapa) | brak | https://pruszcz-gdanski.pl/defibrylatory |
| Słupsk | pomorskie | HTML table | 25 | nie | brak | https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed |
| Szemud | pomorskie | JPG map + HTML | 13 | nie | brak | https://szemud.pl/defibrylatory-aed.html |
| Żukowo | pomorskie | HTML list | 27 | nie | brak | https://www.zukowo.pl/Defibrylatory_AED_w_gminie_Zukowo,1007 |
| Biskupiec | warmińsko-mazurskie | HTML/news | 2 | nie | brak | https://www.gminabiskupiec.pl/2025/07/15/zewnetrzne-defibrylatory-aed-w-gminie-biskupiec/ |
| Lubawa | warmińsko-mazurskie | HTML | 5 | nie | brak | https://lubawa.pl/pomoc-na-wyciagniecie-reki/ |
| Ostróda | warmińsko-mazurskie | HTML | 6 | nie | brak | https://www.ostroda.pl/projekty/inpost-for-cities-puls-miasta-inicjatywa-aed/ |
| Koźmin Wielkopolski | wielkopolskie | HTML + e-mapa | 3 | nie (e-mapa) | brak | https://www.kozminwlkp.pl/index.php/defibrylatory |
| Lwówek | wielkopolskie | HTML | 14 | nie | brak | https://www.lwowek.com.pl/10-nowych-defibrylatorow-aed-w-gminie-lwowek/ |
| Piła | wielkopolskie | HTML list + KML (polygons) | 15 | nie | brak | https://www.pila.pl/346-pilskie-defibrylatory.html |
| powiat szamotulski | wielkopolskie | DOCX | 47 | nie | brak | https://powiat-szamotulski.pl/ |
| Przemęt | wielkopolskie | HTML list | 21 wpisów / 20 lokalizacji | nie (linki Google Maps) | brak | https://www.przemet.pl/2025,02,wykaz-aed/ |
| Suchy Las | wielkopolskie | HTML | 12 | nie | brak | https://suchylas.pl/ |
| Śmigiel | wielkopolskie | HTML table | 17 | nie | brak | http://smigiel.pl/lista-aed.html |
| Barlinek | zachodniopomorskie | HTML + e-mapa | 8-9 | nie (e-mapa) | brak | https://www.barlinek.pl/mapy-i-plany/mapa-defibrylatorow |
| Czaplinek | zachodniopomorskie | HTML | 11 | nie | brak | https://www.czaplinek.pl/wykaz-defibrylatorow |
| Kołbaskowo | zachodniopomorskie | HTML table | 15 | nie | brak | https://kolbaskowo.pl/gdzie-znalezc-aed-w-gminie-kolbaskowo.html |
| Połczyn-Zdrój | zachodniopomorskie | HTML/news | 8 | nie | brak | https://www.polczyn-zdroj.pl/news/defibrylatory-dostepne-na-terenie-miasta-i-gminy-polczyn-zdroj-0 |
| Świdwin | zachodniopomorskie | HTML | 5 | nie | brak | https://www.swidwin.pl/asp/defibrylatory-w-swidwinie,380 |
| Gorzyce | śląskie | HTML/news | 12 | nie | brak | https://www.gorzyce.pl/aktualnosci/index/Nowe-defibrylatory-AED-juz-dostepne-w-solectwach-Gminy-Gorzyce/idn:1469 |
| Imielin | śląskie | HTML + e-mapa | 5 | nie (e-mapa) | brak | https://www.imielin.pl/pl/205/6222/do-ratowania-zycia-defibrylatory-w-imielinie-.html |

Uwagi do klasy B:
- KML Bydgoszczy ma 114 placemarków bez geometrii (lista adresów); KML Piły ma 97 polygonów zasięgu, nie punkty AED.
- Źródła wymagające OCR/ekstrakcji: Lublin (PDF z warstwą tekstową), Nieporęt (PDF plakat), powiat szamotulski (DOCX w BIP), Szemud (mapa JPG), Nowa Wieś Lęborska (tabela PNG).
- Listy w wynikach wyszukiwania strony: Budzów, Jordanów, Wierzchosławice.
- Lista Gdańska pochodzi z 2020 r. i wymaga weryfikacji aktualności. Część wierszy Słupska opisuje kilka urządzeń w jednym budynku.
- Klasę B traktować jako weryfikację i uzupełnienie, nie jako źródło masowe: geokodować adresy i oznaczać niższe `confidence`.

### Klasa B- — dane niepełne (9)

| Jednostka | Województwo | Format | Liczba punktów | Współrzędne | Licencja | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Dziadowa Kłoda | dolnośląskie | HTML/search | 5+ | nie | brak | https://www.dziadowakloda.pl/main/szukaj?szukaj=defibrylator |
| Kcynia | kujawsko-pomorskie | HTML | 5 | nie | brak | https://kcynia.pl/421-kropki-zycia-aed.html |
| UMWL - instytucje kultury | lubelskie | HTML | 10 | nie | brak | https://www.lubelskie.pl/aktualnosci/defibrylatory-w-instytucjach-kultury-samorzadu-wojewodztwa-lubelskiego/ |
| Nowa Sól (miasto) | lubuskie | HTML/news | 6 | nie | brak | https://www.nowasol.pl/ |
| Świdnica (gmina) | lubuskie | JPEG table | 8 | nie | brak | https://swidnica.zgora.pl/PL/3605/Defibrylatory_w_Gminie_Swidnica/ |
| Rzekuń | mazowieckie | HTML/news | 13 | nie | brak | https://www.rzekun.pl/ug/aktualnosci/13-defibrylatorow-aed-na-terenie-gminy-rzekun |
| Żuromin | mazowieckie | HTML/news | 7 | nie | brak | https://zuromin.info/?p=36997 |
| Dopiewo | wielkopolskie | HTML + JPG map | 11 | nie | brak | https://dopiewo.pl/lokalizacje-defibrylatorow-aed |
| Koszęcin | śląskie | HTML | 2 | nie | brak | https://koszecin.pl/defibrylatory-aed-w-koszecinie.html |

Uwagi do klasy B-: mapa Google My Maps Kcyni zwraca 404 (projekt zakłada 13 urządzeń, lista ma 5 miejsc); UMWL obejmuje tylko instytucje kultury samorządu województwa, bez adresów; Świdnica i Dopiewo wymagają OCR; Żuromin, Rzekuń i Nowa Sól podają tylko nazwy obiektów. Nie importować bez weryfikacji.

### Czego nie ma na liście

- Żaden urząd marszałkowski nie prowadzi publicznego rejestru AED (16/16 województw sprawdzone).
- Największe miasta często nie mają rejestru: Poznań, Wrocław, Katowice, Kielce, Białystok, Szczecin, Gorzów Wielkopolski, Opole, Rzeszów, Gdynia.
- dane.gov.pl ma tylko 4 zbiory AED: Krosno, Przemyśl, Marki, Warszawa. Brak zbioru wojewódzkiego i centralnego.
- Geoportal nie jest źródłem AED — hostuje tylko warstwę WMS z danymi OSM (brak WFS i eksportu). Używać OpenAEDMap bezpośrednio.

## 2. Agregatory i aplikacje (10, bez OpenAEDMap)

OpenAEDMap/OSM jest już policzony w klasie A powyżej. Pozostałe 10 zbadanych agregatorów i aplikacji:

| Nazwa | URL | Dane AED | Dostęp maszynowy | Licencja | Uwagi |
| --- | --- | --- | --- | --- | --- |
| SOS DAE | https://sosdae.com/pl/ | tak, 549 681 globalnie | tak: publiczne wersjonowane JSON + shardy gzip + binarny indeks współrzędnych | ODbL (dane z OSM), ale regulamin zakazuje masowego wyciągania skompilowanej bazy | Bogate pola: operator, telefon, piętro, godziny, zdjęcia, data weryfikacji. Wysoka ocena technicznie, średnia prawnie; bezpieczna ścieżka to OSM/OpenAEDMap albo pisemna zgoda. |
| InfoRatunek | https://inforatunek.pl/ | tak: 16 własnych (okolice Białegostoku) + 16 214 OSM | tak: `/api/aed` (JSON) oraz `aed.geojson.gz` (snapshot OSM) | ODbL dla warstwy OSM; brak licencji i regulaminu dla 16 rekordów własnych | Snapshot OSM starszy niż eksport OpenAEDMap (16 214 vs 18 298); do importu lepszy OpenAEDMap. Własne rekordy tylko po ustaleniu licencji. |
| Ratuj z Sercem | https://www.ratujzsercem.pl/ | tak, 3 149 punktów (PL) | tak: nieudokumentowany publiczny endpoint `DBProxy.aspx` (JSON lista + HTML szczegóły) | brak otwartej; wymagana zgoda autorów i oznaczenie źródła | Własna baza (nie OSM): telefon, dokładny opis miejsca, dostępność (bitmaska), zdjęcia. Do produkcji wymagana pisemna zgoda. |
| Fundacja Ratuj Życie | https://fundacjaratujzycie.eu/ | brak publicznych danych (mapa bez markerów) | nie: brak API i eksportu | wszystkie prawa zastrzeżone | Zgłoszenia użytkowników trafiają do aplikacji Staying Alive. Wartościowy tylko schemat formularza zgłoszenia; integracja wyłącznie przez kontakt z Fundacją. |
| aedmapa.pl | https://aedmapa.pl/ | tak, pochodne OSM/OpenAEDMap | nie: brak własnego API (frontend woła OpenAEDMap) | ODbL (dane OSM) | Nie jest niezależnym źródłem; nie scrapować, używać OpenAEDMap/OSM. |
| Ratujemy.com.pl | https://ratujemy.com.pl/ | tak, OSM przez Overpass | nie: brak własnego API; Overpass wywoływany w przeglądarce | ODbL (dane OSM) | Pochodna OSM; do produkcji korzystać z OSM bezpośrednio. |
| Pierwszy Ratownik / Reanimator | https://pierwszyratownik.pl/ | tak, 10 000+ deklarowane (zamknięte) | nie: brak API i eksportu | brak otwartej | Baza ZOSP RP (wykonawca HomerSafe); „Reanimator” to wcześniejsza, wycofana aplikacja. Integracja wyłącznie po porozumieniu z ZOSP RP. |
| Staying Alive | https://stayingalive.org/ | tak, własna baza społecznościowa (zamknięta) | nie: brak API i eksportu | wszystkie prawa zastrzeżone | Operator: Association Staying Alive (Paryż); promowana w Polsce przez Fundację Ratuj Życie. Partner, nie źródło maszynowe. |
| Ratunek | https://www.ratunek.eu/ | nie | nie: brak API AED | regulamin usługi (brak danych AED) | Aplikacja Polkomtel/Paga Solutions do przekazywania lokalizacji dzwoniącego do GOPR/TOPR/WOPR/MOPR. Nie jest agregatorem AED — wykluczona z importu. |
| mojeIKP | https://pacjent.gov.pl/aplikacja-mojeikp | nie | nie: brak API AED | polityka prywatności (brak danych AED) | Aplikacja MZ/CeZ: poradnik pierwszej pomocy i telefony alarmowe, bez mapy AED. Wykluczona z importu. |

Wnioski: tylko cztery źródła audytu (OpenAEDMap, SOS DAE, InfoRatunek, Ratuj z Sercem) udostępniają dane w formie nadającej się do automatycznego pobrania, a jednoznaczną otwartą licencję ma tylko OSM/OpenAEDMap (ODbL). Rekomendowana kolejność: OpenAEDMap jako baza → snapshot InfoRatunek do porównań → SOS DAE i Ratuj z Sercem wyłącznie po zgodzie → pozostałe przez kontakt partnerski.

## 3. Źródła skonfigurowane w backendzie (11 z 79)

W `AED/backend/ingest/datasources-config.json` skonfigurowanych jest obecnie **11 źródeł** (wszystkie klasy A):

| ID | Źródło | Connector / parser | Status |
| --- | --- | --- | --- |
| `openaedmap` | OpenAEDMap — eksport krajowy PL | file_static / geojson | włączone (P0, warstwa bazowa) |
| `krosno` | Defibrylatory w Krośnie (dane.gov.pl) | file_static / csv | włączone (CC0 1.0) |
| `marki` | Defibrylatory w Markach (dane.gov.pl) | file_static / csv | włączone (CC BY 4.0) |
| `przemysl` | Otwarte Dane Przemyśl — AED (API SOD) | http_json / json | włączone (CC BY 4.0) |
| `warszawa` | Lokalizacja AED — m.st. Warszawa | http_json / json | wyłączone: wymaga tokena API |
| `belchatow` | Bełchatów (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |
| `lodz` | Łódź (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |
| `olsztyn` | Olsztyn (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |
| `pawlowice` | Pawłowice (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |
| `tczew` | Tczew (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |
| `zielona-gora` | Zielona Góra (Google My Maps KML) | google_my_maps_kml / kml | wyłączone: decyzja licencyjna |

Aktywne (`enabled: true`) są 4 źródła z otwartą licencją: `openaedmap`, `krosno`, `marki`, `przemysl`. Sześć map KML ma `enabled: false` do czasu decyzji licencyjnej (brak deklaracji, ToS Google), a `warszawa` do czasu uzyskania tokena API.

**Pozostałe 68 źródeł z tej listy to kandydaci do przyszłej integracji.** Priorytety z inwentarza: klasa B+ (Sława, Manowo, Tarnów Opolski, Suszec, Czarne) jako następne po parserach HTML/PDF (P2), większe listy klasy B po geokodowaniu (P2), małe listy B i cała klasa B- na końcu (P3, B- bez importu przed weryfikacją). Agregatory wymagają zgód licencyjnych lub porozumień partnerskich, zanim powstaną dla nich konektory.
