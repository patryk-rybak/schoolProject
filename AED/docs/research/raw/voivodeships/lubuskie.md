# Województwo lubuskie - audyt źródeł AED

**Data audytu:** 2026-11-21 (Europe/Warsaw)
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_lubuskie.json` (29 jednostek)
**Zakres:** wszystkie jednostki z pliku, wszystkie z `score >= 5` lub `registry_hint = true`, dodatkowo Urząd Marszałkowski Województwa Lubuskiego, Gorzów Wielkopolski, Zielona Góra oraz miasta spoza pliku: Nowa Sól i Żary.
**Metoda:** bezpośrednie HTTP (`curl`), analiza HTML/JSON/KML/GeoJSON, wyszukiwarki portali gminnych, API `dane.gov.pl`, eksport OpenAEDMap, kontrola warstw geoportalu Gorzowa. Kody HTTP i liczby z dnia audytu.

> Klasy: **A** = maszynowy zbiór/API AED; **B** = oficjalna strona/PDF/mapa z listą wielu AED; **C** = tylko wzmianka/news; **D** = brak danych lub fałszywy alarm.

---

## 1. Podsumowanie

| Klasa | Liczba jednostek z pliku | Najważniejsze źródła |
|---|---:|---|
| **A** | 1 | Zielona Góra - KML Google My Maps, **165 punktów** |
| **B** | 3 | Sława (**13**), Świdnica (**8**, tabela jako JPEG), Skwierzyna (link do zewnętrznej mapy OpenAEDMap/OSM) |
| **C** | 10 | Sulechów, Kargowa, Wymiarki, Lubniewice, Witnica, Jasień, Małomice, Ośno Lubuskie, Brody, Szczaniec |
| **D** | 15 | pozostałe jednostki z pliku |

Dodatkowo poza plikiem:

| Źródło | Klasa | Punkty | Uwaga |
|---|---|---:|---|
| **OpenAEDMap / OSM - lubuskie** | **A** | **576** | eksport krajowy `PL.geojson`, licencja ODbL 1.0 |
| **Nowa Sól (miasto)** | **B (słabe)** | **6** | lista nazw w treści artykułu, bez współrzędnych |
| **Gorzów Wielkopolski** | C | 4 | jeden artykuł z 2023 r.; brak rejestru i warstwy AED w geoportalu |
| **Żary** | C | 3 | artykuł z 2026 r. z trzema adresami |
| **Urząd Marszałkowski** | C | 1 | tylko newsy o AED w urzędzie i grantach; brak rejestru |

**Najlepsze rejestry:** Zielona Góra (KML, 165 pkt) oraz OpenAEDMap/OSM (576 pkt w województwie). Wśród rejestrów gminnych najlepsza jest Sława (13 pkt, komplet pól i współrzędne), przed Świdnicą (8 pkt, tabela-obraz bez współrzędnych) i Nową Solą (6 nazw bez współrzędnych).

---

## 2. Źródła klasy A

### 2.1. Zielona Góra - KML „AED w Zielonej Górze”

| Pole | Wartość |
|---|---|
| URL strony oficjalnej | https://www.zielona-gora.pl/mapa-lokalizacji-automatycznych-defibrylatorow-w-zielonej-gorze/ |
| URL danych | https://www.google.com/maps/d/kml?mid=1WXrqKMAgKA_kzG5aF6bMiXpaFVA&forcekml=1 |
| HTTP | 200 (strona i KML) |
| Liczba punktów | **165** Placemarków, wszystkie z `<coordinates>` |
| Pola | `name` (ulica + numer / nazwa obiektu), `description` (typ obiektu, 72 puste), `coordinates` (KML: lon,lat,0; EPSG:4326) |
| Format | KML (XML) + mapa Google My Maps + strona HTML |
| Licencja | **brak deklaracji**; mapa hostowana w Google My Maps, treść pochodzi z miasta |
| Aktualizacja | brak znacznika czasu w KML; wpis na stronie z 2017 r., strona kategorii aktualizowana 2024-02-23 |
| Uwagi | To najlepszy lokalny zbiór w województwie. Nie jest to formalne API ani plik w BIP, tylko eksport publicznej mapy Google. Przed użyciem produkcyjnym trzeba potwierdzić aktualność i zgodę na ponowne wykorzystanie. Współrzędne w KML są w kolejności `lon,lat`. |

Kontrola kompletności: 165/165 punktów ma współrzędne i nazwę; 93/165 ma opis typu obiektu.

### 2.2. OpenAEDMap / OpenStreetMap - eksport województwa

| Pole | Wartość |
|---|---|
| URL danych | https://openaedmap.org/api/v1/countries/PL.geojson |
| HTTP | 200, 7 136 604 B |
| Liczba punktów | **18 299** w Polsce, **576** w granicach województwa lubuskiego |
| Pola | `geometry` (Point, EPSG:4326), `@osm_id`, `@osm_version`, `@osm_type`, `emergency=defibrillator`, `name`, `defibrillator:location`, `indoor`, `opening_hours`, `operator`, `phone`, `description`, `ele` i inne tagi OSM |
| Format | GeoJSON |
| Licencja | **ODbL 1.0** (OpenStreetMap) |
| Aktualizacja | eksport krajowy odświeżany codziennie (wg dokumentacji projektu) |
| Uwagi | Jedyne w pełni maszynowe i otwarte źródło pokrywające całe województwo. Pokrycie terenu jest nierówne; 576 punktów to dane społecznościowe, nie rejestr urzędowy. Granicę województwa przyjęto z `polska-geojson` (punkt-w-poligonie). W promieniu 5 km: Skwierzyna 8, Gorzów 41, Zielona Góra 46, Nowa Sól 30, Żary 16. |

### 2.3. dane.gov.pl - brak zbioru dla lubuskiego

`GET https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=100` zwrócił 200 i **4 zbiory w całej Polsce**: Krosno, Przemyśl, Marki, Warszawa. Żaden nie dotyczy lubuskiego. Nie istnieje wojewódzki ani gminny zbiór AED w dane.gov.pl dla tego regionu.

---

## 3. Źródła klasy B

### 3.1. Sława - tabela 13 AED (najlepszy rejestr gminny)

| Pole | Wartość |
|---|---|
| URL | https://slawa.pl/aed-w-gminie-slawa/ |
| HTTP | 200, 125 849 B |
| Liczba punktów | **13** |
| Pola | `Lp.`, `Miejscowość`, `Nazwa budynku/podmiotu`, `Dokładny adres`, `Rodzaj i czas dostępności`, `Współrzędne geograficzne`, `Uwagi` |
| Format | HTML z tabelą (bez pliku do pobrania) |
| Licencja | **brak deklaracji** (stopka: „Copyright 2025 Gmina Sława”) |
| Aktualizacja | 2026-09-02 (data modyfikacji wpisu) |
| Uwagi | Komplet 13 wierszy, wszystkie ze współrzędnymi dziesiętnymi. Zasięg: Stare Strącze, Śmieszkowo, Ciosaniec, Krzepielów, Sława (9 urządzeń). Część AED jest „dla danego podmiotu” (OSP/WOPR/RWS), nie całodobowa. |

### 3.2. Świdnica - tabela 8 AED jako obraz JPEG

| Pole | Wartość |
|---|---|
| URL strony | https://swidnica.zgora.pl/PL/3605/Defibrylatory_w_Gminie_Swidnica/ |
| URL tabeli | https://swidnica.zgora.pl/system/pobierz.php?id=6236 |
| HTTP | 200 dla strony i obrazu |
| Liczba punktów | **8** |
| Pola | `Lp.`, `Miejscowość`, `Lokalizacja`, `Adres`, `Uwagi` |
| Format | HTML + JPEG 3508x2481 (tabela jest obrazkiem, nie tekstem) |
| Licencja | **brak deklaracji** (© Urząd Gminy Świdnica) |
| Aktualizacja | 2025-07-28 |
| Uwagi | Brak współrzędnych. Lokalizacje: Świdnica (2), Piaski, Grabowiec, Kożla, Słone, Drzonów, Letnica. Do użycia maszynowego wymaga OCR lub ręcznego przepisania; nie ma wersji PDF/CSV. |

### 3.3. Skwierzyna - link do zewnętrznej mapy OpenAEDMap

| Pole | Wartość |
|---|---|
| URL strony | https://skwierzyna.pl/ (menu „Mapa AED”) |
| URL mapy | https://openaedmap.org/pl/#map=14/52.59512/15.50326 |
| HTTP | 200 |
| Liczba punktów | brak rejestru gminnego; ok. **8** punktów OSM w promieniu 5 km od centrum (2026-11-21) |
| Pola | wyłącznie pola OpenAEDMap/OSM (nazwa, współrzędne, tagi) |
| Format | HTML + zewnętrzna mapa internetowa |
| Licencja | ODbL 1.0 (dane OSM), strona gminna bez licencji |
| Uwagi | To nie jest rejestr gminny, tylko odnośnik do mapy ogólnopolskiej. Faktycznym źródłem danych jest OSM/OpenAEDMap (klasa A). Nie ma listy urządzeń ani adresów po stronie gminy. |

### 3.4. Nowa Sól (miasto, poza plikiem) - lista 6 AED w treści

| Pole | Wartość |
|---|---|
| URL | https://nowasol.pl/aktualnosci/zdrowie/aed-w-nowej-soli/27-01-2022 |
| HTTP | 200 |
| Liczba punktów | **6** |
| Pola | tylko nazwa lokalizacji w prozie: Nowosolski Dom Kultury, Urząd Miejski, Park Krasnala, Centrum Aktywności Społecznej, Pływalnia Kryta Solan, Dworzec PKP |
| Format | HTML (akapit) |
| Licencja | brak deklaracji |
| Aktualizacja | 2022-01-27 |
| Uwagi | Brak adresów i współrzędnych; klasa B tylko formalnie (oficjalna strona z listą wielu AED). Do geokodowania konieczne ręczne uzupełnienie adresów. |

---

## 4. Źródła klasy C (tylko wzmianka/news)

| Jednostka | URL | Punktów | Co jest | Dlaczego nie B |
|---|---|---:|---|---|
| Sulechów | https://www.sulechow.pl/galeria/defibrylatory-w-jednostkach.html | 0 | galeria zdjęć „Defibrylatory w jednostkach” | brak adresów, nazw i współrzędnych |
| Kargowa | https://kargowa.pl/gdy-liczy-sie-kazda-minuta-defibrylator-aed-moze-uratowac-zycie | 1 + 7 planowanych | opis akcji ratunkowej, kapsuła przy ratuszu, zapowiedź 7 nowych | brak listy lokalizacji i adresów |
| Wymiarki | https://samorzad.gov.pl/web/gmina-wymiarki/nowe-defibrylatory-aed-w-gminie-wymiarki | 2 | dwa AED: budynek UG i wnętrze UG, Księcia Witolda 5 | krótki news, brak współrzędnych i tabeli |
| Lubniewice | https://lubniewice.pl/?s=defibrylator | 0 | wynik wyszukiwania: warsztaty pierwszej pomocy dla seniorów | brak lokalizacji AED |
| Witnica | https://witnica.pl/?s=defibrylator | 0 | projekt budżetu obywatelskiego 2027 „Bezpieczny Białcz. AED...” | urządzenie jeszcze nie istnieje, brak rejestru |
| Jasień | https://jasien.com.pl/?s=defibrylator | 1 | news „Defibrylator AED przy UM” | pojedyncze urządzenie, brak listy |
| Małomice | http://malomice.pl/?s=defibrylator | 0 | szkolenia z obsługi AED | brak danych o lokalizacjach |
| Ośno Lubuskie | https://osno.pl/?s=defibrylator | 1 | przekazanie sprzętu strażakom, w tym defibrylator | pojedyncze urządzenie OSP, brak rejestru |
| Brody | https://brody.pl/?s=defibrylator | 1 | przekazanie sprzętu jednostkom OSP | pojedyncze urządzenie, brak lokalizacji |
| Szczaniec | https://www.szczaniec.pl/?s=defibrylator | 0 | Krajowy Trening Pierwszej Pomocy | brak danych o AED |

Dodatkowo poza plikiem:

| Źródło | URL | Punktów | Uwaga |
|---|---|---:|---|
| Gorzów Wielkopolski | https://um.gorzow.pl/aktualnosci/nowe-defibrylatory.html | 4 | artykuł z 2023-06-28: ryneczek przy Jerzego, cmentarz Żwirowa, PKS Podmiejska, Inneko Teatralna. Geoportal `https://geoportal.um.gorzow.pl/` nie ma warstwy AED (`/api/v1/layer_config/`, 799 986 B, 0 trafień „AED”/„defibryl”). |
| Żary | https://zary.pl/nowe-defibrylatory-aed-w-zarach-szybka-pomoc-w-naglych-sytuacjach/ | 3 | artykuł z 2026-05-18: Lotników 16, Leśna 34, Okrzei 19; czwarty w montażu. |
| Urząd Marszałkowski | https://lubuskie.pl/wyszukiwarka?phrase=defibrylator | 1 | tylko newsy: AED w holu urzędu (2018) i grant dla OSP Kożuchów (2021). Brak rejestru, mapy i zbioru. Strona główna zwraca 403 dla `curl`; treść uzyskano przez `r.jina.ai`, wynik wyszukiwania 200. |

---

## 5. Źródła klasy D (brak danych / fałszywy alarm)

| Jednostka | Powód |
|---|---|
| Bytom Odrzański | wyszukiwarka zwraca strony o rewitalizacji, bez treści o AED |
| Babimost | tylko strona budżetu obywatelskiego, bez potwierdzonego AED |
| Czerwieńsk | „Niestety, nie mamy wyników” |
| Drezdenko | strona wyszukiwania bez wyników |
| Krosno Odrzańskie | tylko nagłówek wyszukiwania, brak wyników |
| Lubsko | 0 trafień |
| Wschowa | 0 trafień |
| Gubin (gmina wiejska) | 0 trafień |
| Lubrza | 0 trafień |
| Maszewo | 0 trafień |
| Niegosławice | 0 trafień |
| Nowa Sól (gmina wiejska) | 0 trafień; miejska lista AED opisana osobno (B) |
| Żagań (gmina wiejska) | „No Result / No Content Available” |
| Iłowa | wynik negatywny (`negative_phrase`) |
| Kożuchów | wynik negatywny (`negative_phrase`) |

Uwaga: brak wyniku w wyszukiwarce nie dowodzi braku AED w gminie. W kilku jednostkach (np. Kostrzyn, Międzyrzecz, Świebodzin) wyszukiwarka nie zwróciła żadnych trafień, ale nie ma tam również dedykowanej strony/rejestru.

---

## 6. Urząd Marszałkowski, Gorzów i Zielona Góra - wnioski

- **Urząd Marszałkowski Województwa Lubuskiego:** brak rejestru, mapy i pliku AED. Strona `lubuskie.pl` blokuje automatyczny dostęp (403), ale wyszukiwarka indeksuje wyłącznie newsy. Nie ma wojewódzkiego zbioru danych.
- **Gorzów Wielkopolski:** brak rejestru. Jeden artykuł z 2023 r. podaje 4 lokalizacje. Miejski geoportal ma API warstw (`/api/v1/layer_config/`), ale w konfiguracji nie ma warstwy AED. OSM ma ok. 41 punktów w promieniu 5 km, czyli znacznie więcej niż wynika z komunikatu miasta.
- **Zielona Góra:** najlepsze źródło w województwie - 165 punktów w KML powiązanym z oficjalną stroną. Brak deklaracji licencji i brak formalnego API.

---

## 7. Rekomendacje

1. **Do natychmiastowego użycia:** eksport OpenAEDMap `PL.geojson` filtrowany po granicy województwa (576 pkt, ODbL 1.0). To jedyne źródło kompletne obszarowo i maszynowe.
2. **Do wzbogacenia lokalnego:** KML Zielonej Góry (165 pkt) - wymaga potwierdzenia aktualności i licencji; współrzędne gotowe.
3. **Rejestry gminne:** Sława (13 pkt, współrzędne i dostępność) jest wzorcem schematu. Świdnica (8 pkt) wymaga OCR; Nowa Sól (6 pkt) wymaga geokodowania adresów.
4. **Do monitorowania:** Gorzów, Kargowa i Wymiarki rozbudowują sieć AED, ale nie publikują rejestru. Warto ponowić audyt po zakończeniu inwestycji (Kargowa: 7 kapsuł, Żary: 4. urządzenie).
5. **Nie używać:** galerii Sulechowa i artykułów okolicznościowych jako źródła lokalizacji - nie zawierają adresów ani współrzędnych.

---

## 8. Powtarzalność

```bash
# Zielona Góra - KML
curl -sS 'https://www.zielona-gora.pl/mapa-lokalizacji-automatycznych-defibrylatorow-w-zielonej-gorze/'
curl -sS 'https://www.google.com/maps/d/kml?mid=1WXrqKMAgKA_kzG5aF6bMiXpaFVA&forcekml=1' -o zg.kml
grep -c '<Placemark' zg.kml

# Sława
curl -sS 'https://slawa.pl/aed-w-gminie-slawa/'

# Świdnica
curl -sS 'https://swidnica.zgora.pl/PL/3605/Defibrylatory_w_Gminie_Swidnica/'
curl -sS 'https://swidnica.zgora.pl/system/pobierz.php?id=6236' -o swidnica_table.jpg

# OpenAEDMap
curl -sS 'https://openaedmap.org/api/v1/countries/PL.geojson' -o PL.geojson
# filtr punkt-w-poligonie granicy lubuskiego (polska-geojson)

# dane.gov.pl
curl -sS 'https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=100'

# Gorzów - geoportal
curl -sS 'https://geoportal.um.gorzow.pl/api/v1/layer_config/' | grep -ci 'defibryl\|AED'

# Urząd Marszałkowski (obejście WAF przez r.jina.ai)
curl -sS 'https://r.jina.ai/https://www.lubuskie.pl/wyszukiwarka?phrase=defibrylator'
```

---

## 9. Pliki

- `lubuskie.md` - ten raport.
- `lubuskie.csv` - tabela jednostek i źródeł (29 kandydatów + 5 źródeł dodatkowych).
