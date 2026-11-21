# Audyt źródeł AED: województwo pomorskie

**Data:** 2026-11-21, godz. 19:20 UTC (20:20 czasu lokalnego)
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_pomorskie.json`
**Zakres:** 54 jednostki z pliku kandydatów oraz dodatkowo Gdańsk, Gdynia, Słupsk i Urząd Marszałkowski Województwa Pomorskiego.
**Metoda:** bezpośrednie zapytania HTTP, analiza HTML/PDF/PNG/JPG/KML oraz wyszukiwarek oficjalnych serwisów. Nie zmieniano kodu i nie commitowano.

## 1. Podsumowanie klas

| Klasa | Liczba | Znaczenie |
|---|---:|---|
| **A** | 1 | maszynowy zbiór/API AED (Tczew: KML z mapy Google) |
| **B** | 9 | oficjalna strona/PDF/mapa z listą wielu AED |
| **C** | 28 | tylko wzmianka, news, szkolenie lub pojedyncze urządzenie |
| **D** | 20 | brak danych, wynik negatywny lub fałszywy alarm |

**Wniosek:** w województwie pomorskim nie ma jednego centralnego, otwartego rejestru AED. Najlepsze pokrycie i jakość mają pojedyncze gminy/powiaty. Tylko Tczew udostępnia dane w formacie maszynowym (KML), ale jest to eksport z Google My Maps, bez formalnego API i bez licencji open data.

## 2. Źródła klasy A i B

| Jednostka | Klasa | URL | Liczba punktów | Pola | Licencja | Format |
|---|---|---|---:|---|---|---|
| **Tczew** | **A** (quasi-A) | https://tczew.pl/aed/ | **12** | nazwa (ulica + obiekt), współrzędne `lon,lat,0` | brak jawnej licencji; Google My Maps ToS | KML + HTML |
| **Czarne** | **B** | https://czarne.pl/files/file_add/download/35_document.pdf | **20** | lp, nazwa obiektu, adres, współrzędne WGS84, umieszczenie AED, uwagi/dostępność | brak jawnej licencji | PDF (tabela, 1 str.) |
| **powiat starogardzki** | **B** | https://powiatstarogard.pl/wydzial-nadzoru-wlascicielskiego-i-zdrowia/siec-defibrylatorow/ | **28** | lokalizacja/obiekt, adres | brak jawnej licencji | HTML (lista) + mapa obrazkowa |
| **Żukowo** | **B** | https://www.zukowo.pl/Defibrylatory_AED_w_gminie_Zukowo,1007 | **27** | nazwa obiektu/miejscowości, część z adresem | brak jawnej licencji | HTML (lista) |
| **Gdańsk** | **B** | https://www.gdansk.pl/budzet-obywatelski/Ogolnomiejski-Bezpieczny-Gdansk-26-defibrylatorow-do-ratowania-zycia-w-przestrzeni-miasta,a,164468 | **26** | lp, lokalizacja (ulica/punkt/obiekt) | brak jawnej licencji (copyright portalu) | HTML (lista) |
| **Słupsk** | **B** | https://www.slupsk.pl/mieszkaniec/zdrowie-i-sprawy-spoleczne/defibrylatory-aed | **25** | Lp, nazwa instytucji, adres, lokalizacja AED, dostępność | brak jawnej licencji | HTML (tabela) |
| **Pruszcz Gdański** | **B** | https://pruszcz-gdanski.pl/defibrylatory | **15** | adres, budynek/obiekt, sposób umieszczenia | brak jawnej licencji | HTML (lista) |
| **Szemud** | **B** | https://szemud.pl/defibrylatory-aed.html | **13** | miejscowość/obiekt, adres (na mapie) | brak jawnej licencji | JPG (mapa) + HTML |
| **Nowa Wieś Lęborska** | **B** | https://www.nwl.pl/dla-mieszkanca/bezpieczenstwo/automatyczne-defibrylatory/ | **10** | miejscowość/lokalizacja, adres, umieszczenie | brak jawnej licencji | PNG (tabela) + HTML |
| **Kosakowo** | **B** | https://gminakosakowo.pl/aktualnosci/informacja-o-zainstalowanych-ogolnodostepnych-defibrylatorach-aed-w-gminie-kosakowo/ | **10** | nazwa obiektu/miejscowość, brak adresu i współrzędnych | brak jawnej licencji | HTML (lista) |

### Uwagi do najlepszych źródeł

- **Czarne** ma najlepszy schemat: współrzędne, adres, typ umieszczenia i dostępność. To najlepszy punkt startowy do importu, mimo że dane są w PDF.
- **Tczew** ma 12 punktów w KML. Eksport: `https://www.google.com/maps/d/kml?mid=1FJwYx26MGn5rWzS6mN2GJN_OZvy-EzY&forcekml=1`. KML zawiera nazwę i współrzędne, bez opisu i bez formalnej licencji.
- **powiat starogardzki** deklaruje 28 zakupionych AED i ma 28 pozycji listy z adresami. Brak współrzędnych.
- **Gdańsk** ma listę 26 lokalizacji z 2020 r. Źródło jest oficjalne, ale może być nieaktualne.
- **Słupsk** ma tabelę 25 wierszy; część wierszy opisuje kilka urządzeń w jednym budynku.
- **Pruszcz Gdański** ma 15 pozycji, nie 26. Liczba 26 w pliku kandydatów wynika z liczby wystąpień słowa „defibrylator” na stronie.
- **Nowa Wieś Lęborska**, **Szemud** i **Kosakowo** publikują listy/mapy bez współrzędnych. Kosakowo odsyła dodatkowo do OpenAEDMap.

## 3. Gdańsk, Gdynia, Słupsk i urząd marszałkowski

| Jednostka | Klasa | Co ustalono |
|---|---|---|
| **Gdańsk** | **B** | Oficjalny portal gdansk.pl, lista 26 lokalizacji AED z 2020 r. Miasto ma też otwarte dane (47 zbiorów na dane.gov.pl), ale brak zbioru AED. |
| **Gdynia** | **C** | Brak miejskiego rejestru. Tylko artykuły o pojedynczych urządzeniach (Witomino: 2, Oksywie: 1). Otwarte dane Gdyni (CKAN): 0 wyników dla „defibrylator”. |
| **Słupsk** | **B** | Oficjalna tabela 25 lokalizacji z adresem i dostępnością. |
| **Urząd Marszałkowski Województwa Pomorskiego** | **C** | Tylko newsy: defibrylatory w pociągach, zakupy dla szpitali, konferencje. Brak rejestru publicznych AED. |

## 4. Pozostałe jednostki

### Klasa C (wzmianka/news, bez rejestru)

Lębork, powiat lęborski, Wejherowo, powiat kwidzyński, Kwidzyn, Reda, Prabuty (2 AED), Parchowo, Wicko, powiat gdański, Sztutowo (2 AED), Koczała, Chojnice, Rumia, Łeba (2 AED + mapka), Debrzno, Brusy, Czerwionka-Leszczyny, Kępice, Cewice, Choczewo, Kolbudy, Puck (gmina), Suchy Dąb, Dąbrowa Zielona, Studzienice.

### Klasa D (brak lub fałszywy alarm)

Trąbki Wielkie, Puck (miasto), powiat człuchowski, powiat kartuski, powiat nowodworski, powiat wejherowski, Czechowice-Dziedzice (jednostka spoza Pomorza), Czersk, Gniew, Kartuzy, Nowy Staw, Władysławowo, Chmielno, Gmina Linia, Miłoradz, Smętowo Graniczne, Stary Dzierzgoń, Zblewo, Skarszewy, Liniewo.

## 5. Ranking najlepszych rejestrów

1. **Czarne** - 20 punktów, współrzędne, adres, umieszczenie, dostępność. Najlepsza jakość danych, format PDF.
2. **Tczew** - 12 punktów, KML ze współrzędnymi. Jedyny maszynowy format w województwie.
3. **powiat starogardzki** - 28 punktów z adresami, HTML.
4. **Gdańsk** - 26 punktów z adresami/lokalizacjami, HTML (dane z 2020 r.).
5. **Słupsk** - 25 punktów, instytucja + adres + dostępność, HTML.
6. **Żukowo** - 27 punktów, głównie nazwy obiektów, HTML.
7. **Nowa Wieś Lęborska** - 10 punktów, adres + umieszczenie, PNG.
8. **Kosakowo** - 10 punktów, nazwy obiektów, HTML; dodatkowo OpenAEDMap.
9. **Szemud** - 13 punktów, mapa JPG z adresami.
10. **Pruszcz Gdański** - 15 punktów, adresy i budynki, HTML.

## 6. Ograniczenia

- Wszystkie źródła A/B poza Tczewem są w HTML, PDF, PNG lub JPG, więc wymagają ręcznego lub półautomatycznego parsowania.
- Żadne z badanych źródeł nie ma jawnej licencji open data. Należy założyć standardowe ograniczenia prawa autorskiego i warunki serwisu.
- Lista Gdańska pochodzi z 2020 r. i wymaga weryfikacji aktualności.
- Liczby punktów podano na podstawie liczby pozycji w źródle, a nie liczby urządzeń. Niektóre wiersze (np. Słupsk) opisują więcej niż jedno urządzenie.
- Plik CSV z pełną klasyfikacją 58 rekordów: [`pomorskie.csv`](./pomorskie.csv).
