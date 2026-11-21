# Priorytety źródeł adresowych B i B-

| | |
| --- | --- |
| Data | 2026-11-21 |
| Wersja | 1.0 (projekt do review) |
| Zakres | 44 źródła klasy B i 9 klasy B- z audytu JST |
| Dokument bazowy | [`../aed-data-sources-common-schema.md`](../aed-data-sources-common-schema.md), sekcja 19 |
| Powiązane | [`address-only-sources.md`](./address-only-sources.md), [`../research/raw/voivodeships/national-registries.md`](../research/raw/voivodeships/national-registries.md) |
| Status | rekomendacja kolejności; nie zastępuje decyzji prawnej ani zgody wydawcy |

## 0. TL;DR

1. **Kolejność nie zależy od liczby mieszkańców.** Liczy się kompletność adresu, struktura danych, zasięg i to, czy lista wnosi coś ponad OSM.
2. **Wszystkie 53 źródła B/B- mają brak licencji.** To nie znaczy „wolno”, tylko „wolno dopiero po zgodzie wydawcy”. Do tego czasu `publish.enabled=false`.
3. **Fala 1 to 11 źródeł z pełnymi adresami i wysokim zasięgiem:** Lublin, Przemęt, Bydgoszcz, Toruń, powiat szamotulski, Kraków, powiat starogardzki, Słupsk, Śmigiel, Kołbaskowo, Nieporęt.
4. **Bydgoszcz i Toruń to najlepszy pierwszy cel weryfikacji OSM**, bo mają dużo adresów i są źródłami oficjalnymi. Bydgoszcz ma 114 adresów w KML bez geometrii.
5. **B- nie geokodujemy bez uzupełnienia adresu.** Obraz, sama nazwa obiektu albo news bez adresu nie daje punktu, tylko `unresolved` i `review_item`.
6. **Najpierw adres, potem geokoder.** Nie odwrotnie. Geokodowanie bez numeru budynku daje `address_only`, nie punkt.
7. **Weryfikacja OSM przed tworzeniem nowych rekordów.** Dla W1/W2 domyślnie `verification_only`, a nowy `aed` powstaje tylko przy pełnym adresie i braku dopasowania.
8. **Legalność jest bramką, nie opcją.** Pierwsza akcja to wniosek o licencję do największych wydawców, nie import.

## 1. Metoda scoringu

### 1.1 Kryteria

| Symbol | Kryterium | Wartość |
| --- | --- | --- |
| `N` | zasięg | `3` >= 20 punktów, `2` 10-19, `1` < 10 |
| `A` | kompletność adresu | `3` ulica + numer, `2` częściowy lub część adresów, `1` miejscowość/obiekt, `0` brak |
| `S` | struktura | `3` tabela/PDF tekstowy/DOCX, `2` lista HTML, `1` news/search, `0` obraz/OCR |
| `F` | świeżość | `2` data >= 2025, `1` brak daty lub starsze |
| `L` | ścieżka prawna | `1` oficjalna strona JST bez zakazu, `0` ToS/brak zgody |
| `P` | kara B- | `-4` dla klasy B-, bo lista jest niepełna albo bez adresów |

```text
score = 3*N + 3*A + 2*S + F + L + P
```

Zakres 0-27. Próg fali:

- **W1**: score >= 23 i `A >= 3`,
- **W2**: score 18-22,
- **W3**: score 15-17,
- **W4**: score 11-14,
- **W5**: score <= 10 albo `A = 0` bez ścieżki uzupełnienia.

### 1.2 Role

| Rola | Znaczenie |
| --- | --- |
| `verify` | najpierw dopasuj do OSM/OpenAEDMap; nowe `aed` tylko przy braku dopasowania |
| `candidate` | pełny adres i nazwa instytucji; można utworzyć `candidate` po geokodowaniu |
| `review_only` | tylko `review_item` i uzupełnienie danych, bez `aed` |
| `blocked` | brak adresu lub brak danych do geokodowania; czeka na OCR/ręczne uzupełnienie |

### 1.3 Bramki

Każde źródło przechodzi przed importem:

1. Zgoda wydawcy albo jednoznaczna licencja. Bez tego `publish.enabled=false`.
2. Dry-run na 100% wierszy, nie na pierwszej stronie.
3. Test pokrycia adresów: co najmniej 80% rekordów ma miejscowość i ulicę.
4. Test duplikatów: adres + nazwa + operator.
5. Test geokodera: 20 adresów ręcznie sprawdzonych.
6. Decyzja redakcji, czy źródło jest `verify` czy `candidate`.

## 2. Fala 1: natychmiastowa wartość weryfikacyjna

| Priorytet | Jednostka | Woj. | Klasa | Punkty | N | A | S | F | Score | Rola | Uzasadnienie |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Lublin | lubelskie | B | 48 (46 adresów) | 3 | 3 | 3 | 2 | 27 | verify | PDF z warstwą tekstową, pełne adresy, piętro/wejście, data 2026-03 |
| 2 | Przemęt | wielkopolskie | B | 21/20 | 3 | 3 | 2 | 2 | 25 | verify | lista 24/7, adresy, część linków do map, data 2025 |
| 3 | Bydgoszcz | kujawsko-pomorskie | B | 114 adresów | 3 | 3 | 2 | 1 | 24 | verify | największa lista adresowa, KML bez geometrii, idealna do weryfikacji OSM |
| 4 | Toruń | kujawsko-pomorskie | B | 46 | 3 | 3 | 2 | 1 | 24 | verify | uporządkowana lista miejska, nazwa + adres |
| 5 | powiat szamotulski | wielkopolskie | B | 47 | 3 | 3 | 3 | 1 | 24 | verify | DOCX w BIP, 47 lokalizacji |
| 6 | Kraków | małopolskie | B | 58/74 | 3 | 3 | 3 | 1 | 24 | verify | tabela HTML z adresami, paginacja, deklarowane 74 |
| 7 | powiat starogardzki | pomorskie | B | 28 | 3 | 3 | 2 | 1 | 24 | verify | sieć PAD, lista adresów |
| 8 | Słupsk | pomorskie | B | 25 | 3 | 3 | 3 | 1 | 24 | verify | tabela, instytucja + adres + lokalizacja AED |
| 9 | Śmigiel | wielkopolskie | B | 17 | 2 | 3 | 3 | 1 | 23 | verify | tabela adres/lokalizacja/dostępność/operator |
| 10 | Kołbaskowo | zachodniopomorskie | B | 15 | 2 | 3 | 3 | 1 | 23 | verify | 14 stacjonarnych + 1 mobilny, tabela częściowa |
| 11 | Nieporęt | mazowieckie | B | 10 | 2 | 3 | 3 | 1 | 23 | verify | PDF z adresami, telefonami i godzinami |

**Dlaczego nie Warszawa/Przemyśl/Krosno/Marki?** To klasa A, nie B/B-. Mają geometrię i są opisane w modelu kanonicznym.

## 3. Fala 2: duże i dobrze ustrukturyzowane

| Priorytet | Jednostka | Woj. | Klasa | Punkty | N | A | S | F | Score | Rola | Uzasadnienie |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 12 | Pruszcz Gdański | pomorskie | B | 15 | 2 | 3 | 2 | 1 | 21 | verify | 15 adresów i object ID e-mapa |
| 13 | Kobierzyce | dolnośląskie | B | 13 | 2 | 3 | 2 | 1 | 21 | verify | najlepszy komplet adresów w regionie |
| 14 | Lwówek | wielkopolskie | B | 14 | 2 | 3 | 2 | 1 | 21 | verify | 14 lokalizacji |
| 15 | Suchy Las | wielkopolskie | B | 12 | 2 | 3 | 2 | 1 | 21 | verify | 12 lokalizacji |
| 16 | Czaplinek | zachodniopomorskie | B | 11 | 2 | 3 | 2 | 1 | 21 | verify | wykaz gminny |
| 17 | Polkowice | dolnośląskie | B | 21/23 | 3 | 2 | 2 | 1 | 21 | verify | dużo punktów, część adresów bez numeru |
| 18 | Gdańsk | pomorskie | B | 26 | 3 | 2 | 2 | 1 | 21 | verify | duży zasięg, lista z 2020, wymaga świeżości |
| 19 | Żukowo | pomorskie | B | 27 | 3 | 1 | 2 | 1 | 18 | review_only | głównie nazwy obiektów, adresy niepełne |
| 20 | Piła | wielkopolskie | B | 15 | 2 | 2 | 2 | 1 | 18 | verify | KML to polygon zasięgu; używać listy adresów, nie KML |
| 21 | Strzegom | dolnośląskie | B | 15/19 | 2 | 2 | 2 | 1 | 18 | verify | wykaz z 2024, OSP i pojazdy, część adresów |

## 4. Fala 3: średnie listy z adresami

| Priorytet | Jednostka | Woj. | Klasa | Punkty | N | A | S | F | Score | Rola | Uzasadnienie |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 22 | powiat bocheński | małopolskie | B | 10 | 2 | 2 | 1 | 1 | 16 | verify | lista obiektów, 10 nowych AED |
| 23 | Łomża | podlaskie | B | 10 | 2 | 2 | 1 | 1 | 16 | verify | 10 lokalizacji w artykułach |
| 24 | Gorzyce | śląskie | B | 12 | 2 | 2 | 1 | 1 | 16 | verify | 12 sołectw, adresy częściowe |
| 25 | Ostróda | warmińsko-mazurskie | B | 6 | 1 | 3 | 1 | 1 | 16 | verify | 4 InPost + 2 ratusz, pełne adresy w dwóch artykułach |
| 26 | Lubawa | warmińsko-mazurskie | B | 5 | 1 | 3 | 1 | 1 | 16 | verify | 5 lokalizacji |
| 27 | Biskupiec | warmińsko-mazurskie | B | 2 | 1 | 3 | 1 | 1 | 16 | verify | 2 lokalizacje, niski priorytet przez rozmiar |
| 28 | Brzeźnica | małopolskie | B | 6 | 1 | 3 | 1 | 1 | 16 | verify | 6 OSP/Dom Seniora |
| 29 | Budzów | małopolskie | B | 5 | 1 | 3 | 1 | 1 | 16 | verify | 5 OSP, model znany |
| 30 | Lubień | małopolskie | B | 4 | 1 | 3 | 1 | 1 | 16 | verify | 4 OSP, model znany |
| 31 | Barlinek | zachodniopomorskie | B | 8-9 | 1 | 2 | 2 | 1 | 15 | verify | lista adresów + e-mapa, rozbieżność 8/9 |
| 32 | Góra | dolnośląskie | B | 8 | 1 | 3 | 2 | 1 | 15 | verify | 8 lokalizacji, link do OpenAEDMap |
| 33 | Świdwin | zachodniopomorskie | B | 5 | 1 | 2 | 2 | 1 | 15 | verify | lista gminna |
| 34 | Lubin (gmina wiejska) | dolnośląskie | B | 3+ | 1 | 2 | 2 | 1 | 15 | verify | lista może być niepełna |
| 35 | Imielin | śląskie | B | 5 | 1 | 2 | 2 | 1 | 15 | verify | 2 zewnętrzne 24/7, 3 wewnętrzne, e-mapa |
| 36 | Koźmin Wielkopolski | wielkopolskie | B | 3 | 1 | 2 | 2 | 1 | 15 | verify | 3 lokalizacje, e-mapa |

## 5. Fala 4: małe lub częściowe, tylko po uzupełnieniu

| Priorytet | Jednostka | Woj. | Klasa | Punkty | N | A | S | F | Score | Rola | Uzasadnienie |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 37 | Radłów | małopolskie | B | 3 | 1 | 2 | 1 | 1 | 13 | review_only | 3 OSP, link do OpenAEDMap |
| 38 | powiat krakowski | małopolskie | B | 3 | 1 | 2 | 1 | 1 | 13 | review_only | 3 domy pomocy |
| 39 | Jordanów | małopolskie | B | 5 | 1 | 2 | 1 | 1 | 13 | review_only | lista w wynikach wyszukiwania |
| 40 | Wierzchosławice | małopolskie | B | 5 | 1 | 2 | 1 | 1 | 13 | review_only | lista w wynikach wyszukiwania |
| 41 | Połczyn-Zdrój | zachodniopomorskie | B | 8 | 1 | 2 | 1 | 1 | 13 | review_only | lista w artykule, adresy częściowe |
| 42 | Szemud | pomorskie | B | 13 | 2 | 2 | 0 | 1 | 14 | blocked | mapa JPG z adresami, brak listy tekstowej |
| 43 | Nowa Wieś Lęborska | pomorskie | B | 10 | 2 | 2 | 0 | 1 | 14 | blocked | tabela jako PNG |
| 44 | Kosakowo | pomorskie | B | 10 | 2 | 0 | 2 | 1 | 12 | blocked | brak adresów i współrzędnych, tylko link do OpenAEDMap |
| 45 | Kcynia | kujawsko-pomorskie | B- | 5 | 1 | 2 | 2 | 1 | 11 | blocked | B-, mapa 404, lista niepełna |

## 6. Fala 5: nie importować bez nowych danych

| Priorytet | Jednostka | Woj. | Klasa | Punkty | N | A | S | F | Score | Rola | Uzasadnienie |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 46 | Dziadowa Kłoda | dolnośląskie | B- | 5+ | 1 | 2 | 1 | 1 | 9 | blocked | wpisy rozproszone w aktualnościach |
| 47 | UMWL - instytucje kultury | lubelskie | B- | 10 | 2 | 0 | 2 | 1 | 8 | blocked | brak adresów, tylko instytucje |
| 48 | Koszęcin | śląskie | B- | 2 | 1 | 1 | 2 | 1 | 8 | blocked | 2 urządzenia, reszta tylko w OSM |
| 49 | Dopiewo | wielkopolskie | B- | 11 | 2 | 1 | 0 | 1 | 7 | blocked | tylko mapa JPG, brak listy |
| 50 | Świdnica (gmina) | lubuskie | B- | 8 | 1 | 2 | 0 | 1 | 7 | blocked | tabela JPEG, wymaga OCR |
| 51 | Rzekuń | mazowieckie | B- | 13 | 2 | 0 | 1 | 1 | 6 | blocked | tylko nazwy obiektów |
| 52 | Żuromin | mazowieckie | B- | 7 | 1 | 0 | 1 | 1 | 3 | blocked | tylko nazwy obiektów |
| 53 | Nowa Sól (miasto) | lubuskie | B- | 6 | 1 | 0 | 1 | 1 | 3 | blocked | nazwy w artykule, bez adresów |

## 7. Co zrobić z każdą falą

### 7.1 Fala 1

1. Wystąp o licencję do Lublina, Bydgoszczy, Torunia, Krakowa, powiatu szamotulskiego, powiatu starogardzkiego, Słupska, Śmigłowa, Kołbaskowa, Nieporętu i Przemętu.
2. Zrób transkrypcję PDF/DOCX do CSV z polami `name`, `address_text`, `city`, `street`, `house_number`.
3. Uruchom dry-run i geokodowanie na 20 adresach.
4. Dopasuj do OpenAEDMap po adresie, nazwie i odległości <= 150 m.
5. Nowe `aed` tylko jako `candidate`, `is_public=false`.
6. Po uzyskaniu zgody włącz `publish.enabled=true` i eksport.

### 7.2 Fala 2

1. Te same kroki, ale najpierw sprawdź, czy lista nie jest duplikatem OSM.
2. Dla Gdańska i Piły najpierw ustal aktualność: lista z 2020 i KML z polygonami mogą być nieaktualne.
3. Dla Polkowic i Strzegomia uzupełnij brakujące numery domów przed geokodowaniem.

### 7.3 Fala 3

1. Traktuj jako uzupełnienie luk, nie jako masowy import.
2. Dla miejsc bez pełnego adresu nie twórz `aed`; twórz `review_item`.
3. Dla małych gmin (2-5 punktów) najpierw sprawdź, czy punkty są już w OSM.

### 7.4 Fala 4

1. Nie geokoduj, dopóki nie ma tekstowej listy adresów.
2. Dla map JPG/PNG uruchom OCR tylko z ręczną weryfikacją każdego wiersza.
3. Dla Kcyni i Kosakowa najpierw ustal, czy źródło jest aktualne; 404 i brak adresów dyskwalifikują.

### 7.5 Fala 5

1. Nie importuj.
2. Zbierz nowe dane: kontakt do wydawcy, nowy BIP, arkusz, API.
3. Jeśli gmina ma tylko nazwy obiektów, użyj ich do `review_item`, nie do `aed`.
4. Wpis w rejestrze źródeł zostaje z `enabled=false` i `notes`.

## 8. Wnioski prawne i organizacyjne

1. **Brak licencji to nie brak danych.** Lista może być publiczna, ale redystrybucja wymaga zgody. Do tego czasu dane są wewnętrzne.
2. **Nie publikuj geokodowanych punktów z list bez licencji.** Nawet jeśli geokoder ma otwartą licencję, źródło adresu jej nie ma.
3. **Nie mieszaj atrybucji.** Adres z listy gminnej i punkt z OSM to dwa różne źródła. `field_provenance` musi to pokazać.
4. **Nie traktuj listy jako dowodu AED.** To dowód instytucji i adresu. Potwierdzenie urządzenia wymaga operatora, urzędu lub oględzin.
5. **Nie zgaduj lokalizacji z nazwy obiektu.** „Remiza OSP w X” nie jest adresem, dopóki nie ma ulicy i numeru albo współrzędnych.

## 9. Kryteria odrzucenia źródła

Źródło zostaje `blocked` albo `disabled`, jeśli:

- nie ma żadnego adresu ani współrzędnych,
- adresy są tylko na obrazie bez możliwości OCR,
- mapa jest nieaktualna (> 3 lata) i nie ma daty,
- wydawca zabrania pobierania albo robots.txt blokuje,
- liczba punktów jest mniejsza niż 2 i nie wnosi nowej informacji,
- nie da się ustalić TERYT ani obszaru źródła,
- geokoder myli się na > 20% próbki 20 adresów,
- źródło jest w całości duplikatem OSM bez nowych pól.

## 10. Powiązane pliki

| Plik | Zawartość |
| --- | --- |
| [`address-only-sources.md`](./address-only-sources.md) | model, geokodowanie, publikacja, konfiguracja |
| [`../research/raw/voivodeships/national-registries.md`](../research/raw/voivodeships/national-registries.md) | pełna tabela 69 źródeł A/B+/B/B- |
| [`../research/raw/voivodeships/national-registries.csv`](../research/raw/voivodeships/national-registries.csv) | ta sama tabela w CSV |
| [`../../backend/ingest/datasources-config.json`](../../backend/ingest/datasources-config.json) | rejestr źródeł, w tym konfiguracje adresowe `address_only` |
