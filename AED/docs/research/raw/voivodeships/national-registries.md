# Rejestry AED w polskich JST: tabela zbiorcza

Data: 2026-11-21. Metoda: [`national-scan-method.md`](./national-scan-method.md). Plik maszynowy: [`national-registries.csv`](./national-registries.csv).

## 1. Podsumowanie

| Klasa | Liczba | Znaczenie |
| --- | ---: | --- |
| **A** | 11 | maszynowy zbiór/API z geometrią (KML, CSV, JSON, GeoJSON, XLSX) |
| **B+** | 5 | HTML/PDF z współrzędnymi, gotowe do parsowania |
| **B** | 44 | oficjalna lista/mapa wielu AED, bez współrzędnych lub bez maszynowego eksportu |
| **B-** | 9 | lista niepełna, tabela-obraz, tylko nazwy albo martwa mapa |

Klasa A nie oznacza licencji otwartej. Licencja jest osobną kolumną. Część A to KML z Google My Maps, bez deklaracji licencji i bez wersjonowania.

## 2. Klasa A: dane maszynowe z geometrią

| unit | voivodeship | type | format | points | coords | license | url | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Łódź | łódzkie | miasto na prawach powiatu | KML (Google My Maps) | 136 | tak | brak; ToS Google | https://www.lodz.pl/artykul/defibrylatory-na-ulicach-lodzi-jak-ich-uzywac-gdzie-je-znajdziesz-mapa-58563/ | KML: mid=1FMKFbebKJPYqD4C87pXWPqNjEHuEswE; 136/136 ze współrzędnymi. |
| Bełchatów | łódzkie | miasto | KML (Google My Maps) | 32 | tak | brak; ToS Google | https://belchatow.pl/mapa-defibrylatorow-aed/ | KML: mid=171VXaQTmWbIPbtUvHfuzwQredJE3krA; 32 punkty. |
| Zielona Góra | lubuskie | miasto | KML (Google My Maps) | 165 | tak | brak; ToS Google | https://www.zielona-gora.pl/mapa-lokalizacji-automatycznych-defibrylatorow-w-zielonej-gorze/ | KML: mid=1WXrqKMAgKA_kzG5aF6bMiXpaFVA; 165/165 ze współrzędnymi, 93/165 z opisem. |
| Pawłowice | śląskie | gmina wiejska | KML (Google My Maps) | 12 | tak | brak; ToS Google | https://www.pawlowice.pl/mieszkaniec/zdrowie/mapa-defibrylatorow-aed | KML: mid=1DSs_ESjkEU6AaxZjgpLgwtk5tlG11gc; 12 punktów; 7 OSP (AED w samochodach). |
| Olsztyn | warmińsko-mazurskie | miasto | KML (Google My Maps) | 43 | tak | brak; ToS Google | https://olsztyn.eu/urzad-miasta/zdrowie/defibrylatory-na-terenie-olsztyna.html | KML: mid=1J5zJj9kL49uq8799g5qNgfl21NoztwzK; 43 punkty, lista HTML ma 54 pozycje (duplikaty). Worker zaklasyfikował B z powodu braku licencji; format jest A. |
| Warszawa | mazowieckie | miasto na prawach powiatu | JSON API | unknown (~622 w docs) | tak | CC BY 4.0 | https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed | POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow; wymaga tokena, bez tokena 403. |
| Marki | mazowieckie | miasto | CSV + XLSX | 8 | tak | CC BY 4.0 | https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miast | CSV wadliwie zacytowany; nagłówek deklaruje lon,lat, dane są lat,lon; jeden rekord poza Markami. |
| Przemyśl | podkarpackie | miasto | GeoJSON/JSON/CSV/GML | 21 | tak | CC0 1.0 | https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatoro | Najbogatsze pola w kraju; API SOD. |
| Krosno | podkarpackie | miasto | CSV | 21 | tak | CC0 1.0 | https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno | Spacje wiodące w nazwach pól; brak operatora. |
| OpenAEDMap / OSM | - | źródło krajowe | GeoJSON + MVT + JSON node | 18 299 | tak | ODbL 1.0 | https://openaedmap.org/api/v1/countries/PL.geojson | Snapshot 2026-11-21; 18 299 feature. Pokrycie nierówne; adresy słabe. |
| Tczew | pomorskie | miasto | KML (Google My Maps) | 12 | tak | brak; ToS Google | https://tczew.pl/aed/ | KML: mid=1FJwYx26MGn5rWzS6mN2GJN_OZvy-EzY; 12 punktów, nazwa + współrzędne, bez opisu. |

### 2.1. Co z tego wynika

- Największe lokalne zbiory punktowe to **Zielona Góra (165)**, **Łódź (136)** i **Olsztyn (43)**. Wszystkie trzy to KML z Google My Maps, bez licencji otwartej.
- **Bełchatów (32)**, **Pawłowice (12)** i **Tczew (12)** to mniejsze mapy KML, ale z poprawnymi współrzędnymi.
- **Warszawa, Marki, Przemyśl i Krosno** to jedyne zbiory w dane.gov.pl z licencją CC. Warszawa wymaga tokena.
- **OpenAEDMap/OSM** pozostaje jedynym pełnym, otwartym zbiorem krajowym (ODbL 1.0).

## 3. Klasa B+: HTML/PDF z współrzędnymi

| unit | voivodeship | type | format | points | fields | url | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sława | lubuskie | gmina miejsko-wiejska | HTML table | 13 | Lp., miejscowość, obiekt, adres, dostępność, współrzędne, uwagi | https://slawa.pl/aed-w-gminie-slawa/ | 13/13 ze współrzędnymi; aktualizacja 2026-09-02; część AED tylko dla OSP/WOPR/RWS. |
| Manowo | zachodniopomorskie | gmina wiejska | HTML list | 8 | ID, adres, obiekt, współrzędne | https://manowo.pl/strona/defibrylator-aed-na-terenie-gminy-manowo | 8 punktów GM#1-GM#8; współrzędne w formacie (lat, lon). |
| Tarnów Opolski | opolskie | gmina wiejska | HTML list | 10 urządzeń / 9 lokalizacji | miejsce, adres, GPS, telefon, dostępność, model, tryb pediatryczny, opiekun | https://opolsar.pl/aed/ | Program OSP JRS Nakło; 10 urządzeń, w tym 2 w jednej lokalizacji. |
| Suszec | śląskie | gmina wiejska | HTML table | 5 | współrzędne, mobilność, adres/opis, telefon, dostęp, godziny | https://suszec.pl/pl/6556/17612/informacja-na-temat-danych-lokalizacji-urzadzen-aed-na-terenie-gminy-suszec.html | Najbogatsze pola w regionie: 4 AED w samochodach OSP + 1 kapsuła 24/7 w Rudziczce. |
| Czarne | pomorskie | gmina miejsko-wiejska | PDF table | 20 | lp, obiekt, adres, współrzędne WGS84, umieszczenie, dostępność | https://czarne.pl/files/file_add/download/35_document.pdf | Najlepszy schemat w regionie: 20 punktów, współrzędne, adres, umieszczenie i dostępność; wymaga ekstrakcji z PDF. |

Te pięć źródeł można stosunkowo łatwo podnieść do klasy A:
- **Sława**: tabela 13 wierszy, wszystkie ze współrzędnymi.
- **Manowo**: lista 8 punktów z współrzędnymi w nawiasach.
- **Tarnów Opolski**: lista 10 urządzeń z GPS, telefonem, modelem i dostępem.
- **Suszec**: 5 punktów z współrzędnymi, telefonem, godzinami i informacją o mobilności.
- **Czarne**: PDF z 20 punktami, współrzędnymi, adresem, umieszczeniem i dostępnością.

## 4. Klasa B: oficjalne listy i mapy

### 4.1. Rejestry z co najmniej 10 punktami

| unit | voivodeship | type | points | coords | url | notes |
| --- | --- | --- | --- | --- | --- | --- |
| Pruszcz Gdański | pomorskie | miasto | 15 | nie (object ID e-mapa) | https://pruszcz-gdanski.pl/defibrylatory | 15 adresów; linki do obiektów e-mapa. Worker potwierdził 15, nie 26. |
| powiat starogardzki | pomorskie | powiat | 28 | nie | https://powiatstarogard.pl/wydzial-nadzoru-wlascicielskiego-i-zdrowia/siec-defibrylatorow/ | 28 defibrylatorów w sieci PAD; lista adresów. |
| Bydgoszcz | kujawsko-pomorskie | miasto na prawach powiatu | 114 adresów | nie | https://typo3.um.bydgoszcz.pl/bezpieczenstwo/abc-bezpieczenstwa | KML mid=1_gVCuQGcZRIviaAxxvbjC02u33s ma 114 placemarków bez coordinates; to lista adresów. |
| Toruń | kujawsko-pomorskie | miasto | 46 | nie | https://www.torun.pl/pl/zdrowie/defibrylatory-aed-wykaz-lokalizacji | Najbardziej uporządkowana lista miejska w regionie. |
| Lublin | lubelskie | miasto | 48 (46 unikalnych adresów) | nie | https://lublin.eu/mieszkancy/zdrowie/aktualnosci/aed-w-lublinie,748,1345,1.html | PDF: aed_lublin_stan_17.03.2026.pdf; warstwa tekstowa. |
| Kraków | małopolskie | miasto na prawach powiatu | 58 w tabeli / 74 deklarowane | nie | https://krakow.pl/aed_-_impuls_zycia/3992,artykul,mapa_aed.html | Paginacja 20/20/18; kolumna Mapa pusta. |
| powiat bocheński | małopolskie | powiat | 10 | nie | https://www.powiat.bochnia.pl/aktualnosci/powiat-bochenski-inwestuje-w-bezpieczenstwo-10-nowych-defibrylatorow-aed.html | 10 nowych AED; lista obiektów. |
| Nieporęt | mazowieckie | gmina wiejska | 10 | nie | https://www.nieporet.pl/defibrylatory-aed | PDF: plakat_defiblyratory_aed_word-1.pdf. |
| Polkowice | dolnośląskie | gmina miejsko-wiejska | 21 miejsc / 23 urządzenia | nie | https://polkowice.eu/defibrylator-ratuje-zycie/ | Część adresów bez numeru. |
| Strzegom | dolnośląskie | gmina miejsko-wiejska | 15 miejsc / 19 urządzeń | nie | https://strzegom.pl/aktualnosci/n,406305,wykaz-defibrylatorow-aed-na-terenie-gminy-strzegom.html | Wykaz z 2024-09-27; OSP i pojazdy. |
| Kobierzyce | dolnośląskie | gmina wiejska | 13 | nie | https://www.ugk.pl/defibrylatory-aed | Najlepszy komplet adresów w regionie. |
| Kołbaskowo | zachodniopomorskie | gmina wiejska | 15 | nie | https://kolbaskowo.pl/gdzie-znalezc-aed-w-gminie-kolbaskowo.html | 14 stacjonarnych + 1 mobilny; tabela pokazuje część. |
| Czaplinek | zachodniopomorskie | gmina miejsko-wiejska | 11 | nie | https://www.czaplinek.pl/wykaz-defibrylatorow | Wykaz gminny. |
| Łomża | podlaskie | miasto | 10 | nie | https://www.lomza.pl/ | 10 lokalizacji w oficjalnych artykułach; bez współrzędnych. |
| powiat szamotulski | wielkopolskie | powiat | 47 | nie | https://powiat-szamotulski.pl/ | 47 lokalizacji; DOCX w BIP. |
| Przemęt | wielkopolskie | gmina miejsko-wiejska | 21 wpisów / 20 lokalizacji | nie (linki Google Maps) | https://www.przemet.pl/2025,02,wykaz-aed/ | Lista 24/7; częściowo linki do Google Maps. |
| Śmigiel | wielkopolskie | gmina miejsko-wiejska | 17 | nie | http://smigiel.pl/lista-aed.html | 17 wierszy; brak współrzędnych. |
| Piła | wielkopolskie | miasto | 15 | nie | https://www.pila.pl/346-pilskie-defibrylatory.html | KML mid=15xg0I18PBJ0QZ48TCXPfNzfLkVOCfNSo ma 97 polygonów zasięgu, nie punkty AED. |
| Lwówek | wielkopolskie | gmina miejsko-wiejska | 14 | nie | https://www.lwowek.com.pl/10-nowych-defibrylatorow-aed-w-gminie-lwowek/ | 14 lokalizacji. |
| Suchy Las | wielkopolskie | gmina wiejska | 12 | nie | https://suchylas.pl/ | 12 lokalizacji. |
| Gorzyce | śląskie | gmina wiejska | 12 | nie | https://www.gorzyce.pl/aktualnosci/index/Nowe-defibrylatory-AED-juz-dostepne-w-solectwach-Gminy-Gorzyce/idn:1469 | 12 lokalizacji w sołectwach. |
| Żukowo | pomorskie | gmina miejsko-wiejska | 27 | nie | https://www.zukowo.pl/Defibrylatory_AED_w_gminie_Zukowo,1007 | 27 pozycji; głównie nazwy obiektów. |
| Gdańsk | pomorskie | miasto na prawach powiatu | 26 | nie | https://www.gdansk.pl/budzet-obywatelski/Ogolnomiejski-Bezpieczny-Gdansk-26-defibrylatorow-do-ratowania-zycia-w-przestrzeni-miasta,a,164468 | Lista z 2020 r.; wymaga weryfikacji aktualności. |
| Słupsk | pomorskie | miasto | 25 | nie | https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed | 25 wierszy; część wierszy opisuje kilka urządzeń w jednym budynku. |
| Szemud | pomorskie | gmina wiejska | 13 | nie | https://szemud.pl/defibrylatory-aed.html | Mapa JPG z adresami; brak listy tekstowej. |
| Nowa Wieś Lęborska | pomorskie | gmina wiejska | 10 | nie | https://www.nwl.pl/dla-mieszkanca/bezpieczenstwo/automatyczne-defibrylatory/ | Tabela jako PNG; brak współrzędnych. |
| Kosakowo | pomorskie | gmina wiejska | 10 | nie | https://gminakosakowo.pl/aktualnosci/informacja-o-zainstalowanych-ogolnodostepnych-defibrylatorach-aed-w-gminie-kosakowo/ | 10 obiektów; brak adresów i współrzędnych; link do OpenAEDMap. |

### 4.2. Rejestry z mniej niż 10 punktami

| unit | voivodeship | type | points | coords | url | notes |
| --- | --- | --- | --- | --- | --- | --- |
| Brzeźnica | małopolskie | gmina wiejska | 6 | nie | https://www.xn--brzenica-o3b.pl/archiwum-artykulow/2754-aed-w-kazdej-miejscowosci-gminy-brzeznica | 6 OSP/Dom Seniora. |
| Budzów | małopolskie | gmina wiejska | 5 | nie | https://budzow.pl?s=defibrylator | 5 OSP; Samaritan PAD 350P. |
| Lubień | małopolskie | gmina wiejska | 4 | nie | https://www.lubien.pl/asp/defibrylatory,1,artykul,1,3417 | 4 OSP; CU Medical iPAD SP1. |
| Radłów | małopolskie | gmina wiejska | 3 | nie | https://www.gminaradlow.pl/dla-mieszkanca/bezpieczenstwo/defibrylatory-aed | 3 OSP; link do OpenAEDMap. |
| powiat krakowski | małopolskie | powiat | 3 | nie | https://powiat.krakow.pl/aktualnosci-i-ogloszenia/aktualnosci/nowe-defibrylatory-aed-w-domach-pomocy-spolecznej-w-powiecie-krakowskim | 3 domy pomocy. |
| Jordanów | małopolskie | gmina miejska | 5 | nie | https://www.gmina-jordanow.pl/wyniki-wyszukiwania?search=defibrylator | Lista w wynikach wyszukiwania. |
| Wierzchosławice | małopolskie | gmina wiejska | 5 | nie | https://wierzchoslawice.pl?s=defibrylator | Lista w wynikach wyszukiwania. |
| Góra | dolnośląskie | gmina miejsko-wiejska | 8 | nie | https://gora.com.pl/lokalizacje-aed.html | 8 lokalizacji; link do OpenAEDMap. |
| Lubin (gmina wiejska) | dolnośląskie | gmina wiejska | 3+ | nie | https://ug.lubin.pl/aed-urzadzenia-ratujace-zycie/ | Lista może być niepełna. |
| Barlinek | zachodniopomorskie | gmina miejsko-wiejska | 8-9 | nie (e-mapa) | https://www.barlinek.pl/mapy-i-plany/mapa-defibrylatorow | Lista adresów + e-mapa; worker podaje 8, extractor 9 adresów. |
| Połczyn-Zdrój | zachodniopomorskie | gmina miejsko-wiejska | 8 | nie | https://www.polczyn-zdroj.pl/news/defibrylatory-dostepne-na-terenie-miasta-i-gminy-polczyn-zdroj-0 | Lista w artykule. |
| Świdwin | zachodniopomorskie | gmina miejska | 5 | nie | https://www.swidwin.pl/asp/defibrylatory-w-swidwinie,380 | Lista gminna. |
| Ostróda | warmińsko-mazurskie | miasto | 6 | nie | https://www.ostroda.pl/projekty/inpost-for-cities-puls-miasta-inicjatywa-aed/ | 4 InPost + 2 ratusz; dwa artykuły. |
| Lubawa | warmińsko-mazurskie | miasto | 5 | nie | https://lubawa.pl/pomoc-na-wyciagniecie-reki/ | 5 lokalizacji. |
| Biskupiec | warmińsko-mazurskie | gmina miejsko-wiejska | 2 | nie | https://www.gminabiskupiec.pl/2025/07/15/zewnetrzne-defibrylatory-aed-w-gminie-biskupiec/ | 2 lokalizacje. |
| Koźmin Wielkopolski | wielkopolskie | gmina miejsko-wiejska | 3 | nie (e-mapa) | https://www.kozminwlkp.pl/index.php/defibrylatory | 3 lokalizacje; e-mapa. |
| Imielin | śląskie | miasto | 5 | nie (e-mapa) | https://www.imielin.pl/pl/205/6222/do-ratowania-zycia-defibrylatory-w-imielinie-.html | 2 zewnętrzne 24/7, 3 wewnętrzne; e-mapa userview=140. |

## 5. Klasa B-: dane niepełne

| unit | voivodeship | type | points | format | url | notes |
| --- | --- | --- | --- | --- | --- | --- |
| Kcynia | kujawsko-pomorskie | gmina miejsko-wiejska | 5 | HTML | https://kcynia.pl/421-kropki-zycia-aed.html | Mapa Google My Maps zwraca 404; projekt zakłada 13 urządzeń, lista ma 5 miejsc. |
| UMWL - instytucje kultury | lubelskie | województwo | 10 | HTML | https://www.lubelskie.pl/aktualnosci/defibrylatory-w-instytucjach-kultury-samorzadu-wojewodztwa-lubelskiego/ | Tylko instytucje kultury samorządu województwa; brak adresów. |
| Żuromin | mazowieckie | gmina miejsko-wiejska | 7 | HTML/news | https://zuromin.info/?p=36997 | Tylko nazwy obiektów. |
| Rzekuń | mazowieckie | gmina wiejska | 13 | HTML/news | https://www.rzekun.pl/ug/aktualnosci/13-defibrylatorow-aed-na-terenie-gminy-rzekun | Tylko nazwy obiektów. |
| Dziadowa Kłoda | dolnośląskie | gmina wiejska | 5+ | HTML/search | https://www.dziadowakloda.pl/main/szukaj?szukaj=defibrylator | Wpisy rozproszone w aktualnościach. |
| Dopiewo | wielkopolskie | gmina wiejska | 11 | HTML + JPG map | https://dopiewo.pl/lokalizacje-defibrylatorow-aed | Tylko mapa JPG; brak listy tekstowej. |
| Nowa Sól (miasto) | lubuskie | miasto | 6 | HTML/news | https://www.nowasol.pl/ | 6 nazw w artykule; bez adresów. |
| Świdnica (gmina) | lubuskie | gmina wiejska | 8 | JPEG table | https://swidnica.zgora.pl/PL/3605/Defibrylatory_w_Gminie_Swidnica/ | Tabela jako obraz JPEG; wymaga OCR. |
| Koszęcin | śląskie | gmina wiejska | 2 | HTML | https://koszecin.pl/defibrylatory-aed-w-koszecinie.html | Strona opisuje 2 urządzenia; reszta tylko w OpenAEDMap. |

## 6. Czego nie ma

- **Żaden urząd marszałkowski** nie prowadzi publicznego rejestru AED. 16/16 województw sprawdzone. Są tylko newsy, uchwały, szkolenia i zamówienia.
- **Największe miasta** często nie mają rejestru: Poznań, Wrocław, Katowice, Kielce, Białystok, Szczecin, Gorzów Wielkopolski, Opole, Rzeszów, Gdynia. Bydgoszcz ma listę adresową, ale nie ma kompletnego API.
- **dane.gov.pl** ma tylko 4 zbiory AED: Krosno, Przemyśl, Marki, Warszawa. Nie ma zbioru wojewódzkiego ani centralnego.
- **Geoportal** nie jest źródłem AED. Hostuje tylko warstwę WMS z danymi OSM. Szczegóły: [`geoportal-osm-wms.md`](./geoportal-osm-wms.md).

## 7. Wzorce technologiczne

| Wzorzec | Liczba miejsc | Co daje | Ryzyko |
| --- | ---: | --- | --- |
| Google My Maps KML | 6 (Zielona Góra, Łódź, Olsztyn, Bełchatów, Pawłowice, Tczew) + 1 lista bez geometrii (Bydgoszcz) | punkty, nazwy, często opis | brak licencji, endpoint nieudokumentowany, brak daty |
| HTML/PDF z współrzędnymi | 5 (Sława, Manowo, Tarnów Opolski, Suszec, Czarne) | punkty, adresy, dostępność | ręczny parser lub ekstrakcja PDF, brak licencji |
| HTML lista adresów | 40+ | adresy, obiekty | geokodowanie, brak współrzędnych |
| PDF/DOCX/PNG/JPG | 8+ (Nieporęt, Lublin, powiat szamotulski, Świdnica, Dopiewo, Szemud, Nowa Wieś Lęborska, Czarne) | adresy, czasem dostępność | OCR lub ręczne przepisanie |
| e-mapa.net | 25 stron z AED, 215 instancji w skanie | mapa, object ID | dane ładowane JS, brak prostego eksportu |
| WMS Geoportal | 1 warstwa | wizualizacja OSM | brak WFS, brak eksportu |

## 8. Rekomendacje

1. **Importuj najpierw A**: OpenAEDMap/OSM jako bazę, potem Warszawa, Marki, Przemyśl, Krosno, Łódź, Zielona Góra, Bełchatów, Pawłowice, Olsztyn, Tczew.
2. **B+ podnieś do A** parserem HTML/PDF: Sława, Manowo, Tarnów Opolski, Suszec, Czarne.
3. **B traktuj jako weryfikację**, nie jako źródło masowe. Geokoduj adresy i oznacz `confidence` niżej.
4. **Nie importuj B- bez weryfikacji**: Kcynia, Żuromin, Rzekuń, UMWL, Dziadowa Kłoda, Nowa Sól, Świdnica, Dopiewo, Koszęcin.
5. **Wystąp o licencje** do gmin z A/B+. Wszystkie mają „wszystkie prawa zastrzeżone” albo brak deklaracji. Potrzebna jest zgoda na redystrybucję.
6. **Uzupełnij 108 gmin** bez strony w Wikidata. Rekomendowany klucz: TERYT + BIP powiatu. To jedyna luka pokrycia.
7. **Nie buduj na Geoportal WMS**. Użyj OpenAEDMap bezpośrednio.

## 9. Pliki

| Plik | Zawartość |
| --- | --- |
| [`national-registries.csv`](./national-registries.csv) | tabela 69 źródeł A/B+/B/B- |
| [`national-scan-method.md`](./national-scan-method.md) | metoda, pokrycie, ograniczenia |
| [`google-my-maps-kml.md`](./google-my-maps-kml.md) | KML, pułapki, parsowanie |
| [`geoportal-osm-wms.md`](./geoportal-osm-wms.md) | korekta Geoportal |
| `{wojewodztwo}.md` | raporty 16 województw |
