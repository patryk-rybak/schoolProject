# Dolnośląskie: audyt publicznych rejestrów AED

Data audytu: 2026-11-21
Zakres: 60 JST z pliku kandydatów `candidates2_dolno-l-skie.json` oraz dodatkowo Wrocław i Urząd Marszałkowski Województwa Dolnośląskiego.
Metoda: pobranie stron oficjalnych i wyszukiwarek JST, analiza treści HTML, linków do PDF oraz map. Sprawdzono też dane.gov.pl i portal otwartych danych Wrocławia. Nie zmieniano kodu i nie commitowano.

## 1. Wynik w skrócie

| Zakres | A | B | C | D | Razem |
| --- | ---: | ---: | ---: | ---: | ---: |
| 60 JST z pliku kandydatów | 0 | 6 | 19 | 35 | 60 |
| Wrocław i urząd marszałkowski | 0 | 0 | 1 | 1 | 2 |
| Razem | 0 | 6 | 20 | 36 | 62 |

- **A = 0.** Nie znaleziono publicznego, maszynowego zbioru AED (CSV, JSON, GeoJSON, XLSX, WMS, WFS, ArcGIS) prowadzonego przez JST województwa dolnośląskiego.
- **B = 6.** Najlepsze rejestry: Kobierzyce, Polkowice, Strzegom, Góra, Lubin, Dziadowa Kłoda.
- Wszystkie rejestry B są stronami HTML. Nie mają współrzędnych, API ani otwartej licencji. Licencja: brak otwartej licencji, dane jako informacja publiczna, ponowne użycie wymaga weryfikacji i podania źródła.
- Wrocław ma tylko artykuł o pojedynczym AED i link do zewnętrznej mapy `ratujzsercem.pl`. Brak własnej listy lub mapy miasta.
- Urząd marszałkowski nie prowadzi publicznego rejestru AED. W sitemapie i wyszukiwarce portalu są tylko wzmianki o szkoleniach i bezpiecznej zimie.

## 2. Rejestry klasy B

| JST | URL | Punkty | Pola | Format | Licencja | Uwagi |
| --- | --- | ---: | --- | --- | --- | --- |
| Kobierzyce | https://www.ugk.pl/defibrylatory-aed | 13 | miejscowość, obiekt, ulica i numer, dostęp 24/7 | HTML | brak otwartej licencji | Lista 13 lokalizacji z adresami, m.in. KOK Kobierzyce, szkoły i świetlice. Najlepszy komplet adresów w województwie. |
| Polkowice | https://polkowice.eu/defibrylator-ratuje-zycie/ | 21 miejsc / 23 urządzenia | nazwa obiektu, adres częściowy, operator, liczba urządzeń | HTML | brak otwartej licencji | 23 AED, 21 opisanych miejsc. Część adresów bez numeru. Brak współrzędnych i statusu. |
| Strzegom | https://strzegom.pl/aktualnosci/n,406305,wykaz-defibrylatorow-aed-na-terenie-gminy-strzegom.html | 15 miejsc / 19 urządzeń | obiekt, miejscowość lub ulica, typ miejsca (budynek, samochód), liczba sztuk | HTML | brak otwartej licencji | Wykaz z 2024-09-27. Dużo OSP i pojazdów. Brak adresów pełnych i współrzędnych. |
| Góra | https://gora.com.pl/lokalizacje-aed.html | 8 | obiekt, ulica i numer, opis wejścia | HTML | brak otwartej licencji | 8 lokalizacji, w tym urząd, szkoły, dom kultury, OPS, szalet i OKF. Link do mapy OSM. |
| Lubin (gmina wiejska) | https://ug.lubin.pl/aed-urzadzenia-ratujace-zycie/ | 3+ | miejscowość, obiekt, dostęp 24/7, sposób montażu | HTML | brak otwartej licencji | Chróstnik, Niemstów, Gorzyca. Artykuł mówi o „coraz większej liczbie” punktów, więc lista może być niepełna. |
| Dziadowa Kłoda | https://www.dziadowakloda.pl/main/szukaj?szukaj=defibrylator | 5+ | miejscowość, obiekt (świetlica, remiza) | HTML | brak otwartej licencji | Wpisy rozproszone: Dziadowy Most, Lipka, Dalborowice, Gołębice, Radzowice. Brak jednej listy i adresów. |

### Ocena jakości rejestrów B

1. **Kobierzyce** - najbardziej kompletne adresy i jasny dostęp 24/7. Brak współrzędnych i daty weryfikacji.
2. **Polkowice** - największa liczba urządzeń, dobra nazwa obiektu, ale adresy częściowe.
3. **Strzegom** - dokładny wykaz urządzeń, także przenośnych i w pojazdach OSP.
4. **Góra** - krótka, czytelna lista z opisem wejścia.
5. **Lubin** - dobre opisy sposobu montażu i dostępności, lista niepełna.
6. **Dziadowa Kłoda** - dane użyteczne, ale rozproszone w aktualnościach.

## 3. Klasa C: pojedyncze wzmianki, zakupy, szkolenia

| JST | URL | Co zawiera |
| --- | --- | --- |
| Oleśnica | https://www.olesnica.wroc.pl/pl/artykul/defibrylatory-aed | Strona tematyczna, ale bez listy. AED są w OSP i na wozach. Link do mapy OSM. |
| Bogatynia | https://bogatynia.pl/aktualnosci/defibrylatory-w-trojce/ | 2 AED w jednej szkole. |
| Milicz | http://milicz.pl/2025/09/15/nowe-defibrylatory-aed-juz-dostepne-dla-mieszkancow/ | 2 AED publiczne i 8 w szkołach, bez pełnej listy adresów. |
| Środa Śląska | https://srodaslaska.pl/aktualnosci/defibrylatory-dla-dk-bp-i-lcaw/ | 4 urządzenia przekazane 3 placówkom. |
| Niemcza | https://um.niemcza.pl?s=defibrylator | Szkolenie z AED, brak lokalizacji. |
| Podgórzyn | https://www.podgorzyn.pl/component/content/article/nowy-defibrylator-aed-na-budynku-urzedu-gminy-podgorzyn.html | 1 AED na urzędzie gminy. |
| Miękinia | https://www.miekinia.pl/pl/OSP-Galow-zakupila-defibrylator-i-ubra,11,4287 | 1 AED dla OSP Gałów. |
| Bardo | https://www.bardo.pl/?s=defibrylator | 1 AED przekazany sołectwu Brzeźnica. |
| Gryfów Śląski | https://gryfow.pl/?s=defibrylator | Grant na 1 AED dla OSP. |
| Marcinowice | https://www.marcinowice.pl/?s=defibrylator | News o użyciu AED przez OSP Strzelce. |
| Mściwojów | https://www.msciwojow.pl/sprzet-dla-osp/ | Zakup sprzętu dla OSP, wzmianka o AED. |
| Wińsko | https://winsko.pl/?s=defibrylator | Jeden ogólnodostępny defibrylator. |
| Kamieniec Ząbkowicki | https://kamienieczabkowicki.eu/2018/04/ochotnicze-straze-pozarne-otrzymaly-dotacje-na-sprzet/ | Dofinansowanie AED dla OSP Kamieniec i OSP Ożary. |
| Syców | https://www.sycow.pl/main/szukaj?szukaj=defibrylator | Grant na AED dla OSP Działoszy i wzmianka o AED z budżetu obywatelskiego. |
| Oława | https://gminaolawa.pl/?s=defibrylator | Darowizna AED dla OSP Owczary. |
| Rudna | https://rudna.pl/?s=defibrylator | Darowizna na sprzęt ratowniczy, wzmianka o AED. |
| Stara Kamienica | https://strona.starakamienica.pl/blog/2026/07/17/program-pierwszy-ratownik-1r-nowoczesny-system-obywatelskiego-ratowania-zycia/ | Opis programu Pierwszy Ratownik, bez listy punktów. |
| Żarów | https://www.um.zarow.pl/wyszukiwarka.html?q=defibrylator | Zbiórka na AED w szkole w Imbramowicach. |
| Wisznia Mała | https://www.wiszniamala.pl/wyniki-wyszukiwania?search=defibrylator | AED przekazany OSP Wisznia Mała. |

## 4. Klasa D: brak treści lub fałszywy alarm

Prusice, Wiązów, Lądek-Zdrój, Prochowice, Przemków, Jerzmanowa, Kunice, Bolków, Kąty Wrocławskie, Leśna, Mirsk, Oborniki Śląskie, Olszyna, Wleń, Węgliniec, Kotla, Chojnów, Cieszków, Długołęka, Kondratowice, Lewin Kłodzki, Malczyce, Mysłakowice, Męcinka, Niechlów, Stare Bogaczowice, Łagiewniki, Żukowice, Janowice Wielkie, Marciszów, Głuszyca, Mieroszów, Twardogóra, Głogów.

Uwagi:
- Kotla: zakup fantomu i defibrylatora do ćwiczeń, nie publiczny AED.
- Niechlów: kandydat wskazywał na wyszukiwarkę Google i domenę spoza JST, fałszywy alarm.
- Twardogóra: kandydat wskazywał na `um.pl`, komercyjny portal, nie stronę gminy.
- Głogów: kandydat dotyczył gminy wiejskiej i strony `ugglogow.com.pl`, brak treści AED.

## 5. Wrocław i urząd marszałkowski

- **Wrocław, miasto:** klasa C. Artykuł `https://www.wroclaw.pl/dla-mieszkanca/nowy-defibrylator-aed-we-wroclawiu-kowale-kwidzynska` opisuje 1 AED przy ul. Kwidzyńskiej 6 i odsyła do zewnętrznej mapy `https://www.ratujzsercem.pl/map.aspx`. Portal otwartych danych Wrocławia (`https://open-data.cui.wroclaw.pl`) nie zawiera zbioru AED. Miejski GIS (`https://gis.um.wroc.pl`) nie ma widocznej warstwy AED.
- **Urząd Marszałkowski Województwa Dolnośląskiego:** klasa D. Sitemap `https://umwd.dolnyslask.pl/sitemap.xml` i wyszukiwarka portalu nie zawierają rejestru AED. `https://www.dolnyslask.pl` ma tylko wzmianki w artykułach o bezpieczeństwie.

## 6. Rekomendacje

1. Do dalszej pracy wybrać Kobierzyce, Polkowice i Strzegom jako źródła referencyjne dla regionu.
2. Uzupełnić sześć rejestrów B o współrzędne przez geokodowanie adresów. Wszystkie mają nazwę obiektu i co najmniej miejscowość lub ulicę.
3. Nie traktować stron C jako rejestrów. To materiał do ręcznej weryfikacji pojedynczych punktów.
4. Ponownie sprawdzić Polkowice i Górę pod kątem warstwy AED w systemie e-mapa. Serwer WMS zwraca 403, więc nie można potwierdzić dostępu maszynowego.
5. Dla Wrocławia jedynym źródłem pozostaje zewnętrzna mapa `ratujzsercem.pl`, bez otwartej licencji i bez kontroli miasta.
