# Audyt źródeł AED - województwo wielkopolskie

**Data badania:** 2026-11-21, godz. 18:48-19:15 UTC (19:48-20:15 czasu lokalnego).
**Lane:** `audit-wielkopolskie`.
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_wielkopolskie.json` (100 jednostek).
**Zakres:** jednostki z `score >= 5` lub `registry_hint = true` (26), dodatkowo jednostki o wysokim `max_count` mimo niskiego score (m.in. Suchy Las, Puszczykowo, Słupca), a także Poznań i Urząd Marszałkowski.

**Metoda:** bezpośrednie zapytania HTTP do stron gmin i powiatów, analiza treści, tabel, linków do map/PDF/DOCX, próby API oraz wyszukiwanie w `api.dane.gov.pl` 1.4. Nie zmieniano kodu ani nie commitowano.

## Legenda

- **A** - maszynowy zbiór lub API AED (CSV, JSON, XLSX, GeoJSON, GML).
- **B** - oficjalna strona lub PDF/DOCX z listą albo mapą wielu AED, bez API.
- **C** - tylko wzmianka lub news, pojedyncze urządzenie bez pełnej listy.
- **D** - brak danych, brak wyników, fałszywy alarm lub jednostka poza województwem.

## 1. Podsumowanie

| Klasa | Liczba | Źródła |
|---|---:|---|
| **A** | 0 | brak |
| **B** | 8 | powiat szamotulski, Przemęt, Śmigiel, Piła, Lwówek, Suchy Las, Dopiewo, Koźmin Wielkopolski |
| **C** | 47 | m.in. Gostyń, Kościan, Swarzędz, powiat słupecki, Poznań, UMWW |
| **D** | 45 | m.in. Baranów (mazowieckie), Dorohusk, Dzierzkowice, Drelów, Rychwał |

**Najlepsze rejestry:**

1. **Powiat szamotulski** - 47 lokalizacji w DOCX, adresy, jednostki JST, uwagi o dostępie. Największy zbiór, ale bez współrzędnych i licencji.
2. **Przemęt** - 21 wpisów / 20 lokalizacji, adresy, opis miejsca, 24/7 i linki Google Maps ze współrzędnymi. Najlepsza jakość lokalizacji.
3. **Śmigiel** - 17 punktów w tabeli, adres, dokładne miejsce, dostępność i operator. Brak współrzędnych poza linkami.
4. **Piła** - 15 pozycji z adresami; miasto deklaruje co najmniej 51 AED, więc lista jest niepełna.
5. **Lwówek** - 14 punktów (10 nowych + 4 istniejące), tylko miejscowość i obiekt, część bez pełnego adresu.
6. **Suchy Las** - 12 punktów z adresami i dokładnym umiejscowieniem; artykuł, nie stały rejestr.
7. **Dopiewo** - 11 punktów, ale wyłącznie mapa rastrowa JPG, bez danych tekstowych.
8. **Koźmin Wielkopolski** - 3 punkty, poprawny wykaz, mały zasięg.

**Kluczowe wnioski:**

- W Wielkopolsce **nie ma źródła klasy A**. Żadna JST nie udostępnia API, CSV, GeoJSON ani XLSX z AED.
- `api.dane.gov.pl` nie zawiera zbioru AED dla Wielkopolski; dla frazy „defibrylator” zwraca tylko Krosno, Przemyśl, Marki i Warszawę.
- Wszystkie źródła B to HTML lub DOCX, bez otwartej licencji. Brak deklaracji CC/CC0, brak gotowych współrzędnych.
- Najczęstsze braki: współrzędne, numery/model urządzeń, data instalacji i przeglądu, status działania, jednolity operator.
- **Poznań** nie ma miejskiego rejestru AED; **Urząd Marszałkowski** nie ma rejestru wojewódzkiego. Oba źródła to klasa C (rozproszone wzmianki, programy, zamówienia).

## 2. Źródła klasy B

| Jednostka | URL | Punkty | Format | Licencja | Pola | Współrzędne |
|---|---|---:|---|---|---|---|
| powiat szamotulski | https://www.powiat-szamotulski.pl/dla-mieszkanca/aktualnosci/Wykaz-defibrylatorow-AED-w-Powiecie-Szamotulskim/idn:2903 | 47 | HTML + DOCX | brak wyraźnej licencji otwartej (copyright samorządowy) | JST; jednostka; adres/lokalizacja; uwagi/dostępność | brak |
| Przemęt | https://www.przemet.pl/2025,02,wykaz-aed/ | 21 wpisów / 20 lokalizacji | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | miejscowość; adres; opis lokalizacji; 24/7; link Google Maps | współrzędne w URL linków Google Maps |
| Śmigiel | http://smigiel.pl/lista-aed.html | 17 | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | adres; dokładna lokalizacja; dostępność; operator; link Google Maps | brak (tylko linki Google Maps) |
| Piła | https://www.pila.pl/346-pilskie-defibrylatory.html | 15 | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | nazwa obiektu; adres; godziny dostępu (częściowo) | brak |
| Lwówek | https://www.lwowek.com.pl/10-nowych-defibrylatorow-aed-w-gminie-lwowek/ | 14 | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | miejscowość; obiekt/budynek; opis lokalizacji | brak |
| Suchy Las | https://www.suchylas.pl/2026/10/15/nowe-aed-w-suchym-lesie/ | 12 | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | nazwa obiektu; adres; dokładna lokalizacja | brak |
| Dopiewo | https://dopiewo.pl/lokalizacje-defibrylatorow-aed | 11 | HTML + JPG | brak wyraźnej licencji otwartej (copyright samorządowy) | mapa rastrowa JPG z 11 punktami | brak |
| Koźmin Wielkopolski | https://www.kozminwlkp.pl/index.php/defibrylatory | 3 | HTML | brak wyraźnej licencji otwartej (copyright samorządowy) | nazwa obiektu; adres; dostępność/godziny | brak |

- **powiat szamotulski** - Załącznik DOCX 21,1 KB (https://www.powiat-szamotulski.pl/download/Wykaz-AED-w-Powiecie-Szamotulskim,626.docx). 47 lokalizacji, w tym 5 AED w pojazdach OSP. Link do OpenAEDMap. Największy wykaz w województwie.
- **Przemęt** - Dwa urządzenia pod Przemęt, ul. Jagiellońska 8. Strona modyfikowana 2026-11-16.
- **Śmigiel** - Oficjalna lista 17 punktów w tabeli. Najlepiej opisany operator i dostępność w województwie.
- **Piła** - Miasto deklaruje co najmniej 51 AED w Pile, ale lista na stronie ma 15 pozycji.
- **Lwówek** - 10 nowych + 4 wcześniejsze punkty. Część bez pełnego adresu (tylko miejscowość i budynek).
- **Suchy Las** - Znalezione poza progiem score (score=0, max_count=15). Pełna lista 12 punktów z adresami.
- **Dopiewo** - Liczba 11 podana w tekście; lokalizacje tylko na obrazku, bez tabeli i danych tekstowych.
- **Koźmin Wielkopolski** - Oficjalny wykaz 3 AED; część tylko w godzinach pracy urzędu.

## 3. Kandydaci priorytetowi - klasy C/D

| Jednostka | Score | Klasa | URL / dowód | Uzasadnienie |
|---|---:|---|---|---|
| Kościan | 10 | **C** | https://koscian.pl/automatyczny_defibrylator_zewnetrzny_aed_w_siedzibie_urzedu_miejskiego_kosciana.html | Trzy osobne artykuły po 1 AED; brak wykazu. |
| Gostyń | 10 | **C** | https://www.gostyn.pl/Defibrylatory-AED.html | Dedykowana strona, ale bez własnej listy/mapy; tylko link do OpenAEDMap. |
| Swarzędz | 9 | **C** | https://swarzedz.pl/index.php?id=631 | Dedykowana strona, ale dane tylko przez link do OpenAEDMap; brak listy. |
| Krzyż Wielkopolski | 6 | **C** | https://samorzad.gov.pl/web/gmina-krzyz-wielkopolski/mapa-strony/?show-bip=true | BIP: wzmianka/artykuł, brak wykazu. |
| powiat wolsztyński | 6 | **C** | https://www.powiatwolsztyn.pl/post/sprzet-ratujacy-zycie-trafi-do-wolsztynskich-szkol | News: 2 AED przekazane szkołom; brak listy. |
| Bojanowo | 5 | **C** | https://www.gminabojanowo.pl/asp/pl_start.asp?typ=13&menu=9&strona=1&sub=8 | News o 2 nowych AED; brak wykazu. |
| Kaczory | 5 | **C** | https://samorzad.gov.pl/web/miasto-i-gmina-kaczory/mapa-strony?show-bip=true | Tylko zapytanie ofertowe/zakup; brak publicznej listy. |
| Książ Wielkopolski | 5 | **C** | https://ksiaz-wlkp.pl/?search=defibrylator | Newsy o kolejnych AED; brak wykazu. |
| powiat pilski | 5 | **C** | https://www.powiat.pila.pl/szukaj?q=defibrylator | Pojedyncza wzmianka; brak listy. |
| powiat słupecki | 5 | **C** | https://powiat-slupca.pl?s=defibrylator | Wiele newsów o pojedynczych AED; brak wykazu. |
| Mikstat | 4 | **C** | https://mikstat.pl/?s=defibrylator | Tylko newsy/szkolenia; brak wykazu. |
| Murowana Goślina | 4 | **C** | https://www.murowana-goslina.pl/ | Wzmianka o mapie; brak dedykowanego wykazu. |
| Łubowo | 4 | **C** | https://www.lubowo.pl/search.html?search=defibrylator | Newsy o 4 AED; brak wykazu. |
| Baranów | 3 | **D** | http://www.gmina-baranow.pl/index.php?id=3&lan=pl | Baranów w powiecie grodziskim, woj. mazowieckie - poza Wielkopolską. |
| Dorohusk | 3 | **D** | http://www.dorohusk.com.pl/ | Dorohusk, woj. lubelskie - poza Wielkopolską. |
| Dzierzkowice | 3 | **D** | http://www.dzierzkowice.pl// | Dzierzkowice, woj. lubelskie - poza Wielkopolską. |
| Władysławów | 3 | **C** | https://www.wladyslawow.pl?s=defibrylator | 1 wynik wyszukiwania; brak wykazu. |
| Rychwał | 2 | **D** | http://www.rychwal.pl/ | Brak wyników wyszukiwania; fałszywy alarm. |
| Drelów | 0 | **D** | http://www.drelow.pl/ | Drelów, woj. lubelskie - poza Wielkopolską. |

## 4. Poznań i Urząd Marszałkowski

### Poznań

- **Portal Otwarte Dane:** https://www.poznan.pl/opendata/ - 95 zbiorów, 51 API. Wyszukiwanie „defibrylator” i „AED” daje **0 wyników** (stan 2026-11-21).
- **Strona miasta:** brak centralnej mapy/wykazu. Trafienia dotyczą PBO 2021/2025/2026/2027 (propozycje zakupu 8 AED), MOPR (2 AED, m.in. ul. Cześnikowska 18), szkół i WFOŚiGW.
- **Klasa:** C - rozproszone wzmianki, brak rejestru miejskiego.

### Urząd Marszałkowski Województwa Wielkopolskiego

- **BIP:** https://bip.umww.pl/ - brak pozycji AED w „Rejestry, ewidencje, wykazy”; wyszukiwarka BIP nie zwraca rejestru.
- **umww.pl:** tylko uchwały, dofinansowania (m.in. program „Pierwszy Ratownik”) i postępowania zakupowe; brak publicznej listy/mapy AED.
- **e-ZP:** np. „Dostawa 7 automatycznych defibrylatorów zewnętrznych AED” - zamówienie, nie rejestr.
- **Klasa:** C - wzmianki/programy, brak rejestru wojewódzkiego.

## 5. Klasyfikacja pełna

Pełna klasyfikacja 100 jednostek znajduje się w pliku [`wielkopolskie.csv`](./wielkopolskie.csv). Kolumny: `unit, qid, type, candidate_score, registry_hint, class, url, aed_points, format, license, fields, coordinates, notes, verified, confidence`.

**Ograniczenia:** dla jednostek spoza priorytetu klasy C/D opierają się głównie na heurystyce (`negative`, `max_count`, brak trafień); nie każdą stronę otwierano ręcznie. Dla wszystkich B i priorytetowych C/D wykonano weryfikację treści.

