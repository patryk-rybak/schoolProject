# Audyt źródeł danych AED: województwo warmińsko-mazurskie

Data audytu: 2026-11-21 (CET)
Plik kandydatów: `/home/zdziszkee/.jcode/scratch/candidates2_warmi-sko-mazurskie.json`
Zakres: 44 jednostki z pliku kandydatów, uzupełniająco Olsztyn i Urząd Marszałkowski Województwa Warmińsko-Mazurskiego (UMWM).
Metoda: weryfikacja wyszukiwarek i stron oficjalnych, analiza artykułów, testy portali otwartych danych, pobranie eksportu KML z mapy Olsztyna. Nie zmieniano kodu i nie wykonywano commitów.

## 1. Wnioski w skrócie

| Klasa | Liczba | Jednostki |
| --- | ---: | --- |
| A — maszynowy zbiór/API AED | 0 | brak |
| B — oficjalna strona/PDF z listą lub mapą wielu AED | 4 | Olsztyn, Ostróda, Lubawa, Gmina Biskupiec |
| C — tylko wzmianka/news | 7 | powiat iławski, Działdowo, Dobre Miasto, gmina Iława, powiat działdowski, Budry, Janowiec Kościelny |
| D — brak/fałszywy alarm | 35 | pozostałe 34 jednostki z pliku + UMWM jako rejestr |

W pliku kandydatów: 3 × B, 7 × C, 34 × D. Olsztyn dodaje czwarte B. UMWM nie prowadzi rejestru AED.

**Najlepsze rejestry:**

| Miejsce | Klasa | Liczba punktów | URL | Pola | Licencja | Format |
| --- | --- | ---: | --- | --- | --- | --- |
| Olsztyn | B | 54 adresy / 43 punkty w KML | <https://olsztyn.eu/urzad-miasta/zdrowie/defibrylatory-na-terenie-olsztyna.html> | nazwa, adres, lat/lon (KML), typ obiektu z nazwy | brak otwartej licencji; Google My Maps ToS | HTML + Google My Maps (KML) |
| Ostróda | B | 6 (4 InPost + 2 ratusz) | <https://www.ostroda.pl/projekty/inpost-for-cities-puls-miasta-inicjatywa-aed/> | nazwa, adres/lokalizacja, dostęp częściowo | brak otwartej licencji | HTML (2 artykuły) |
| Lubawa | B | 5 | <https://lubawa.pl/pomoc-na-wyciagniecie-reki/> | nazwa obiektu, adres, dostęp 24/7 | brak otwartej licencji | HTML |
| Gmina Biskupiec | B | 2 | <https://www.gminabiskupiec.pl/2025/07/15/zewnetrzne-defibrylatory-aed-w-gminie-biskupiec/> | nazwa obiektu, adres, dostęp (zewn./wewn.) | brak otwartej licencji | HTML |

Priorytet `score >= 5` lub `registry_hint = true` objął trzy jednostki:

| Jednostka | score | registry_hint | Klasa | Werdykt |
| --- | ---: | --- | --- | --- |
| Ostróda | 6 | true | B | lista 4 nowych AED + artykuł o 2 AED w ratuszu |
| powiat iławski | 6 | true | C | wynik fałszywie dodatni: tylko newsy o wyposażeniu karetek/WOPR |
| Gmina Biskupiec | 4 | true | B | dedykowany artykuł z listą 2 lokalizacji |

## 2. Klasa A — brak

Nie znaleziono w województwie warmińsko-mazurskim otwartego, maszynowego zbioru AED ani publicznego API z danymi AED.

Sprawdzone:

- `dane.gov.pl` API (`/1.4/datasets?q=defibrylator`): cztery zbiory AED w Polsce — Krosno, Przemyśl, Marki, Warszawa. Brak zbioru dla warmińsko-mazurskiego.
- Portal otwartych danych Olsztyna (`otwartedane.olsztyn.eu`): zapytania `defibrylator`, `defibrylatory`, `AED`, `automatyczny defibrylator` — brak wyników.
- Strona UMWM (`warmia.mazury.pl`) — brak rejestru, tylko newsy.
- Strony powiatów i gmin z pliku kandydatów — brak deklarowanych zbiorów/API (`dataset_hint = false` we wszystkich rekordach).

Wniosek: żadne źródło nie spełnia jednocześnie warunków: publiczny dostęp maszynowy, jawne pochodzenie i licencja. Nawet mapa Olsztyna, choć technicznie eksportuje KML z 43 punktami, jest osadzona w Google My Maps i nie ma otwartej licencji, więc została zaklasyfikowana jako B, nie A.

## 3. Klasa B — oficjalne listy i mapy

### 3.1. Olsztyn — 54 adresy, 43 punkty na mapie

- URL: <https://olsztyn.eu/urzad-miasta/zdrowie/defibrylatory-na-terenie-olsztyna.html>
- Liczba punktów: 54 pozycje listy `<li>`; 43 placemarki w eksporcie KML mapy.
- Pola: nazwa instytucji/obiektu, adres tekstowy, `lat`/`lon` w KML (kolejność `lon,lat`), typ obiektu możliwy do wywnioskowania z nazwy. Brak telefonu, godzin otwarcia, operatora i statusu urządzenia.
- Licencja: brak otwartej licencji. Strona miasta objęta prawem autorskim; mapa hostowana w Google My Maps, podlega ToS Google. Brak licencji ODbL/CC.
- Format: HTML (lista adresowa) + osadzona mapa Google My Maps. Link do mapy: <https://www.google.com/maps/d/embed?mid=1J5zJj9kL49uq8799g5qNgfl21NoztwzK>. Techniczny eksport KML: `https://www.google.com/maps/d/kml?mid=1J5zJj9kL49uq8799g5qNgfl21NoztwzK&forcekml=1` (43 punkty, nazwa + współrzędne).
- Uwagi: lista zawiera m.in. Urząd Miasta, UMWM, Warmińsko-Mazurski Urząd Wojewódzki, sądy, ZUS, policję, straż pożarną, UWM, galerie handlowe, OSP Gutkowo. Występują duplikaty i obiekty z dwoma adresami, dlatego 54 pozycje listy to nie 54 unikalne urządzenia. To najlepszy rejestr w województwie pod względem pokrycia i współrzędnych.

### 3.2. Ostróda — 6 lokalizacji

- URL: <https://www.ostroda.pl/projekty/inpost-for-cities-puls-miasta-inicjatywa-aed/> oraz <https://www.ostroda.pl/defibrylatory-aed-na-wyposazeniu-ostrodzkiego-ratusza/>
- Liczba punktów: 6 — 4 AED z programu InPost for Cities (Szkoła Podstawowa nr 1, nr 2, nr 3 oraz wypożyczalnia sprzętu sportowego przy wyciągu nart wodnych) oraz 2 AED w Urzędzie Miejskim (Biuro Obsługi Interesanta i Straż Miejska).
- Pola: nazwa obiektu, lokalizacja opisowa, częściowo dostęp (wnętrze/zewnątrz). Brak współrzędnych, telefonów i godzin.
- Licencja: brak otwartej licencji; treść serwisu gminnego.
- Format: HTML, dwa artykuły. Brak jednej wspólnej listy lub mapy.
- Uwagi: `score = 6`, `registry_hint = true` — potwierdzone. To nie jest rejestr urzędowy, lecz dwie publikacje okolicznościowe.

### 3.3. Lubawa — 5 lokalizacji

- URL: <https://lubawa.pl/pomoc-na-wyciagniecie-reki/>
- Liczba punktów: 5 — Miejska Biblioteka Publiczna (ul. Kupnera 17), Ośrodek Sportu i Rekreacji (ul. Łąkowa 8), Szkoła Podstawowa (ul. Rzepnikowskiego 7), Szkoła Podstawowa (ul. Świętej Barbary 45), Ochotnicza Straż Pożarna (ul. Strażacka 1).
- Pola: nazwa obiektu, adres, dostęp 24/7 (deklarowany).
- Licencja: brak otwartej licencji; treść serwisu gminnego.
- Format: HTML, jeden artykuł z listą lokalizacji.
- Uwagi: artykuł zapowiada kolejne lokalizacje, więc lista może być nieaktualna. Brak współrzędnych.

### 3.4. Gmina Biskupiec — 2 lokalizacje

- URL: <https://www.gminabiskupiec.pl/2025/07/15/zewnetrzne-defibrylatory-aed-w-gminie-biskupiec/>
- Liczba punktów: 2 — Gminny Ośrodek Pomocy Społecznej w Biskupcu (zewnątrz, przy głównym wejściu) i Biblioteka-Ośrodek Kultury w Biskupcu (wewnątrz, główny hall).
- Pola: nazwa obiektu, adres opisowy, dostęp (zewn./wewn.).
- Licencja: brak otwartej licencji; treść serwisu gminnego.
- Format: HTML, dedykowany artykuł z sekcją „Lokalizacje defibrylatorów AED”.
- Uwagi: `score = 4`, `registry_hint = true` — potwierdzone. Tylko 2 punkty, brak współrzędnych.

## 4. Klasa C — tylko wzmianki i newsy

| Jednostka | URL | Co zawiera | Dlaczego nie B |
| --- | --- | --- | --- |
| powiat iławski | <https://powiat-ilawski.pl/?s=defibrylator> | newsy o defibrylatorach w karetkach i sprzęcie WOPR | brak listy, mapy i lokalizacji AED |
| Działdowo | <https://www.dzialdowo.pl/automatyczny-defibrylator-zewnetrzny-w-mbp-w-dzialdowie/> | dwa osobne newsy: AED w MBP i w MOSiR | brak wspólnej listy/mapy, tylko 2 publikacje |
| Dobre Miasto | <https://dobremiasto.com.pl/wyniki-wyszukiwania?q=defibrylator> | newsy o AED na plaży miejskiej i na elewacji UM | brak listy/mapy |
| gmina Iława | <http://www.gmina-ilawa.pl/pl/wyszukaj?search=defibrylator> | newsy o przekazaniu AED dla policji i mieszkańców Stradomna | brak rejestru, pojedyncze publikacje |
| powiat działdowski | <https://powiatdzialdowski.pl/minuty-wage-zycia/> | wzmianka o ćwiczeniach resuscytacji z defibrylatorem | brak danych o lokalizacjach AED |
| Budry | <https://budry.pl/?s=defibrylator> | artykuł o przygotowaniu na kryzysy i systemie Pierwszy Ratownik | brak lokalizacji AED |
| Janowiec Kościelny | <https://janowiec.com.pl/?s=defibrylator> | artykuł o systemie Pierwszy Ratownik | brak lokalizacji AED |

Działdowo i Dobre Miasto są graniczne: mają po 2 urządzenia opisane w osobnych newsach, ale nie tworzą jednej listy ani mapy. Gdyby przyjąć szerszą definicję B („co najmniej 2 lokalizacje na stronie oficjalnej”), można je promować do B. W tym audycie trzymano się wymogu jednej oficjalnej listy/mapy wielu AED.

## 5. Klasa D — brak danych lub fałszywe alarmy

34 jednostki z pliku kandydatów nie mają danych AED. Najważniejsze przypadki:

| Jednostka | Problem |
| --- | --- |
| Wydminy | domena z pliku (`wydminy.net`) przejęta przez spam (`nohu90c.cheap`); brak treści o AED |
| Miłakowo | domena `milakowo.ug.net.pl` wygasła i przekierowuje na `aftermarket.pl` |
| Wieliczki | plik wskazuje portal komercyjny `mazury.com.pl`, nie stronę gminy; oficjalna strona `ug.wieliczki.pl` nie ma wyników dla „defibrylator” |
| Braniewo (miasto) | wyszukiwarka: „Nie znaleziono wyników” |
| Jonkowo | wyszukiwarka: „Nie znaleziono wyników” |
| Kisielice | wyszukiwarka: „Nie znaleziono wyników” |
| Reszel | wyszukiwarka: „Nie znaleziono żadnych tekstów” |
| Markusy | brak wyników |
| Górowo Iławeckie, Sorkwity | wyszukiwarka: brak wyników |
| Nidzica, powiat nidzicki | brak wyników o AED |
| pozostałe powiaty i gminy | brak wyników lub wyłącznie treści niezwiązane z AED |

Pełna lista 44 jednostek i dodatków znajduje się w pliku CSV oraz w tabeli poniżej.

## 6. Urząd Marszałkowski i Olsztyn

### UMWM

- URL testowy: <https://warmia.mazury.pl/szukaj?q=defibrylator>
- Wynik: 6 pozycji, wszystkie to artykuły/newsy (m.in. szkolenia, defibrylatory w ambulansach, darowizny sprzętu). Brak rejestru, mapy, pliku ani API.
- Klasyfikacja jako źródło rejestru: D. Jednocześnie budynek UMWM przy ul. Emilii Plater 1 występuje na liście AED Olsztyna, ale to nie jest rejestr wojewódzki.
- Uwaga: strona UMWM ma wyszukiwarkę `/szukaj?q=...`; wyników nie należy mylić z rejestrem.

### Olsztyn

- Oficjalna strona miasta: B, 54 adresy i mapa Google My Maps (43 punkty KML).
- Portal otwartych danych Olsztyna: brak zbioru AED (sprawdzone zapytania jak wyżej).
- Mapa: <https://www.google.com/maps/d/embed?mid=1J5zJj9kL49uq8799g5qNgfl21NoztwzK>
- KML: 43 placemarki, pola `name` i `Point/coordinates`; brak `description`, telefonów i godzin.
- Licencja: brak otwartej licencji; nie można traktować jako A.

## 7. Ograniczenia i rekomendacje

- Żadne źródło B nie ma otwartej licencji. Do wykorzystania w projekcie trzeba osobno uzyskać zgodę lub opierać się na OSM/OpenAEDMap (ODbL).
- Listy B są dokumentacyjne, nieoperacyjne: brak współrzędnych (poza Olsztynem), statusu urządzenia, godzin dostępu i daty weryfikacji.
- Olsztyn jest jedynym źródłem z realnymi współrzędnymi dla wielu punktów; KML nadaje się do jednorazowego importu i porównania z OSM, ale nie jest oficjalnym API.
- Rekomendowana kolejność: OSM/OpenAEDMap jako baza, Olsztyn B do weryfikacji punktów w mieście, Ostróda/Lubawa/Biskupiec jako uzupełnienie lokalne.
- Audyt nie zmieniał kodu ani nie commitował plików.

## 8. Tabela klasyfikacji

| Jednostka | Typ | score | registry_hint | Klasa | Punkty | URL |
| --- | --- | ---: | --- | --- | ---: | --- |
| Ostróda | gmina miejska | 6 | true | B | 6 | https://www.ostroda.pl/projekty/inpost-for-cities-puls-miasta-inicjatywa-aed/ |
| powiat iławski | powiat | 6 | true | C | 0 | https://powiat-ilawski.pl/?s=defibrylator |
| Gmina Biskupiec | gmina wiejska | 4 | true | B | 2 | https://www.gminabiskupiec.pl/2025/07/15/zewnetrzne-defibrylatory-aed-w-gminie-biskupiec/ |
| Działdowo | gmina miejska | 2 | false | C | 2 | https://www.dzialdowo.pl/automatyczny-defibrylator-zewnetrzny-w-mbp-w-dzialdowie/ |
| Lubawa | gmina miejska | 2 | false | B | 5 | https://lubawa.pl/pomoc-na-wyciagniecie-reki/ |
| Bartoszyce | gmina miejska | 0 | false | D | 0 | http://www.bartoszyce.pl |
| Górowo Iławeckie | gmina miejska | 0 | false | D | 0 | http://www.gorowoilaweckie.pl/ |
| Szczytno | gmina miejska | 0 | false | D | 0 | https://miastoszczytno.pl/ |
| Dobre Miasto | gmina miejsko-wiejska | 0 | false | C | 2 | https://dobremiasto.com.pl/wyniki-wyszukiwania?q=defibrylator |
| powiat elbląski | powiat | 0 | false | D | 0 | http://www.powiat.elblag.pl |
| powiat kętrzyński | powiat | 0 | false | D | 0 | http://www.starostwo.ketrzyn.pl/ |
| powiat nidzicki | powiat | 0 | false | D | 0 | http://www.powiatnidzicki.pl |
| powiat olsztyński | powiat | 0 | false | D | 0 | http://www.powiat-olsztynski.pl |
| powiat ostródzki | powiat | 0 | false | D | 0 | http://www.powiat.ostroda.pl |
| powiat piski | powiat | 0 | false | D | 0 | http://www.powiat.pisz.pl |
| powiat węgorzewski | powiat | 0 | false | D | 0 | http://www.powiatwegorzewski.pl |
| Biała Piska | gmina miejsko-wiejska | -1 | false | D | 0 | http://bip.bialapiska.pl/ |
| Frombork | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.frombork.pl/ |
| Miłakowo | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.milakowo.ug.net.pl/ |
| Morąg | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.morag.pl/ |
| Młynary | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.mlynary.pl/ |
| Nidzica | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.nidzica.pl |
| Pisz | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.pisz.pl/ |
| Ryn | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.ryn.pl/ |
| Zalewo | gmina miejsko-wiejska | -1 | false | D | 0 | http://www.zalewo.pl |
| Iława | gmina wiejska | -1 | false | C | 0 | http://www.gmina-ilawa.pl/pl/wyszukaj?search=defibrylator |
| powiat działdowski | powiat | -1 | false | C | 0 | https://powiatdzialdowski.pl/minuty-wage-zycia/ |
| Braniewo | gmina wiejska | -2 | false | D | 0 | http://gminabraniewo.pl/ |
| Budry | gmina wiejska | -2 | false | C | 0 | https://budry.pl/?s=defibrylator |
| Gietrzwałd | gmina wiejska | -2 | false | D | 0 | http://www.gietrzwald.pl/ |
| Janowiec Kościelny | gmina wiejska | -2 | false | C | 0 | https://janowiec.com.pl/?s=defibrylator |
| Kolno | gmina wiejska | -2 | false | D | 0 | http://bip-kolno.sprint.com.pl/ |
| Kozłowo | gmina wiejska | -2 | false | D | 0 | http://www.kozlowo.pl |
| Lelkowo | gmina wiejska | -2 | false | D | 0 | http://www.uglelkowo.pl |
| Lubawa | gmina wiejska | -2 | false | D | 0 | http://www.gminalubawa.pl/ |
| Rozogi | gmina wiejska | -2 | false | D | 0 | http://www.rozogi.pl |
| Sorkwity | gmina wiejska | -2 | false | D | 0 | http://www.gminasorkwity.pl |
| Wieliczki | gmina wiejska | -2 | false | D | 0 | http://www.mazury.com.pl/gminy/wieliczki/ |
| Wydminy | gmina wiejska | -2 | false | D | 0 | http://www.wydminy.net |
| Braniewo | gmina miejska | -3 | false | D | 0 | http://www.braniewo.pl/ |
| Jonkowo | gmina wiejska | -3 | false | D | 0 | http://www.jonkowo.pl |
| Kisielice | gmina miejsko-wiejska | -4 | false | D | 0 | http://kisielice.warmia.mazury.pl/ |
| Reszel | gmina miejsko-wiejska | -4 | false | D | 0 | http://www.reszel.pl/ |
| Markusy | gmina wiejska | -5 | false | D | 0 | http://www.markusy.pl |
| Olsztyn | miasto (poza listą) | - | - | B | 54/43 | https://olsztyn.eu/urzad-miasta/zdrowie/defibrylatory-na-terenie-olsztyna.html |
| UMWM | urząd marszałkowski | - | - | D | 0 | https://warmia.mazury.pl/szukaj?q=defibrylator |

## 9. Pliki źródłowe

- `AED/docs/research/raw/voivodeships/warmi-sko-mazurskie.csv` — pełna tabela klasyfikacji z polami, licencją i formatem.
- `AED/docs/research/raw/voivodeships/warmi-sko-mazurskie.md` — ten dokument.
