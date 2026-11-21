# Audyt źródeł AED - województwo mazowieckie

**Data badania:** 2026-11-21, godz. 18:48-19:05 UTC (19:48-20:05 czasu lokalnego).
**Lane:** `audit-mazowieckie`.
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_mazowieckie.json` (111 jednostek).
**Zakres:** jednostki z `score >= 5` lub `registry_hint = true` (14), a także znane źródła A
(Warszawa, Marki), urząd marszałkowski oraz wybrane jednostki o wysokim `max_count`
poza priorytetem (Rzekuń, Ostrołęka, Teresin, Michałowice, Młodzieszyn, Pułtusk).

**Metoda:** bezpośrednie zapytania HTTP (`curl`) do stron gmin, wyszukiwarek gminnych,
API `api.dane.gov.pl` 1.4, katalogu Otwartych Danych Warszawy oraz odczyt pobranych
plików CSV, XLSX i PDF. Kody HTTP i liczby punktów z dnia badania.

## Legenda

- **A** - maszynowy zbiór lub API AED (CSV, JSON, XLSX, GeoJSON, GML).
- **B** - oficjalna strona lub PDF z listą albo mapą wielu AED, bez API.
- **C** - tylko wzmianka lub news, pojedyncze urządzenie bez pełnej listy.
- **D** - brak danych, brak wyników lub fałszywy alarm.

## 1. Podsumowanie

| Klasa | Liczba | Źródła |
|---|---|---|
| **A** | 2 | Warszawa (dane.gov.pl / API UM), Marki (dane.gov.pl) |
| **B** | 3 | Nieporęt (PDF, 10 punktów), Żuromin (news, 7), Rzekuń (news, 13, poza priorytetem) |
| **C** | 6 | Żabia Wola, Latowicz, Baranowo, Piaseczno, Grabów nad Pilicą, mazovia.pl |
| **D** | 7 | Poświętne, Rzeczniów, Załuski, Zbuczyn, Miastków Kościelny, Pacyna, Rościszewo |

**Najlepsze rejestry:**

1. **Warszawa** - najbardziej kompletny schemat opisowy, JSON, CC BY 4.0, aktualizacja
   codzienna. Wada: API wymaga tokena, bez niego HTTP 403.
2. **Marki** - CSV i XLSX, CC BY 4.0, 8 urządzeń. Wada: wadliwe cytowanie CSV,
   zamieniona kolejność osi i błędne współrzędne jednego rekordu.
3. **Nieporęt** - oficjalny PDF z 10 lokalizacjami, adresami, telefonami i godzinami
   dostępu. Brak współrzędnych i licencji.
4. **Żuromin** i **Rzekuń** - listy 7 i 13 lokalizacji w artykułach, tylko nazwy obiektów,
   bez adresów i współrzędnych.

Nie ma wojewódzkiego rejestru AED prowadzonego przez urząd marszałkowski.

## 2. Źródła klasy A

### 2.1. Warszawa

| Pole | Wartość |
|---|---|
| Strona zbioru | https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed |
| Katalog źródłowy | https://dane.um.warszawa.pl/pl/catalogue/7bc32ffc-c2ac-4d32-83c9-b6f7a0b38de8 |
| API | `POST https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow` |
| HTTP bez tokena | **403** `Access denied: Nieautoryzowany: brak ważnego tokena lub API key` |
| Liczba punktów | nieznana bez tokena (dokumentacja pokazuje `defibrillator_id` 622) |
| Format | JSON (tablica obiektów, geometria GeoJSON-like) |
| Licencja | **CC BY 4.0** |
| Układ współrzędnych | EPSG:4326, kolejność `[lon, lat]`, czasem tablica zagnieżdżona `[[lon, lat]]` |
| Aktualizacja | codziennie (CKAN `source.update_frequency = codziennie`) |
| Auth | wymagany nagłówek `Authorization: token_uzytkownika` |

**Pola:** `geometry.type`, `geometry.coordinates`, `properties.defibrillator_id`,
`device_access_description`, `device_availability`, `device_location`,
`device_manufacturer`, `device_public_access`, `location_building`,
`location_city`, `location_description`, `location_object_name`,
`location_postcode`, `location_street`, `attachment` (Base64, tylko w szczegółach).

**Uwagi:** najlepszy schemat miejski w województwie. Zawiera adres, współrzędne,
typ lokalizacji, dostępność, producenta i dostęp publiczny. Brak statusu urządzenia,
modelu, numeru seryjnego i dat przeglądów. `device_availability` jest opisowe
(np. `Ograniczona`), więc nie mapuje się wprost na boolean.

### 2.2. Marki

| Pole | Wartość |
|---|---|
| Strona zbioru | https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI |
| CSV | https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv |
| XLSX | https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.xlsx |
| Liczba punktów | **8** (wiersze 2-9) |
| Format | CSV (UTF-8 BOM), XLSX |
| Licencja | **CC BY 4.0** |
| Układ współrzędnych | EPSG:4326, ale nagłówek deklaruje `Długość geograficzna, Szerokość geograficzna`, a wartości są w kolejności `lat, lon` |
| Aktualizacja | jednorazowe udostępnienie, plik z 2025-07-10 |

**Pola:** `Długość geograficzna`, `Szerokość geograficzna`, `Nazwa`, `Lokalizacja`,
`Adres`, `Numer Id`.

**Uwagi:** CSV jest wadliwie zapisany. Każdy wiersz jest objęty jednym cudzysłowem,
więc standardowy parser widzi 1 kolumnę zamiast 6. Dodatkowo wiersz 7 ma
współrzędne `21.720344, 49.718809`, które nie należą do Marek (prawdopodobnie
zamienione osie i błędna wartość). Pozostałe 7 rekordów ma poprawne współrzędne
Marek. XLSX może być łatwiejszy do zasilenia niż CSV.

## 3. Źródła klasy B

### 3.1. Nieporęt - 10 punktów

- Strona: https://www.nieporet.pl/defibrylatory-aed
- PDF: https://www.nieporet.pl/sites/default/files/paragraph.attachments.field_attachments/2026-05/plakat_defiblyratory_aed_word-1.pdf
- HTTP: 200, PDF 1 strona, 241 KB.
- Liczba punktów: **10**.
- Format: HTML + PDF.
- Licencja: brak jawnej licencji na stronie i w PDF.
- Pola: nazwa obiektu, adres, umiejscowienie (wewnątrz, na zewnątrz, w wozie),
  godziny dostępu, telefon.
- Współrzędne: brak.

Lokalizacje: Straż Gminna (Dzika Plaża), Legionowskie WOPR w Zegrzu Południowym,
OSP Kąty Węgierskie, OSP Nieporęt, OSP Wólka Radzymińska, Centrum Medyczne Nieporęt,
Aquapark FALA w Stanisławowie Pierwszym, kompleks PILAWA, Urząd Gminy Nieporęt,
Michałów Grabina. To najlepsza lista klasy B w województwie, ale wymaga ręcznego
przepisania lub OCR do CSV.

### 3.2. Żuromin - 7 punktów

- URL: https://zuromin.info/?p=36997 (artykuł "Montaż defibrylatorów", 16.12.2025)
- Liczba punktów: **7**.
- Format: HTML, artykuł news.
- Licencja: brak jawnej licencji.
- Pola: nazwa obiektu, bez adresu i współrzędnych.
- Lokalizacje: Żuromińskie Centrum Kultury, SP nr 1, SP nr 2, SP w Chamsku,
  SP w Poniatowie, Stadion Miejski, dworzec autobusowy.

To artykuł, a nie dedykowana strona rejestru, dlatego jakość jest ograniczona.
Zawiera jednak pełną listę 7 urządzeń, więc klasyfikuję jako B, a nie C.

### 3.3. Rzekuń - 13 punktów (poza priorytetem)

- URL: https://www.rzekun.pl/ug/aktualnosci/13-defibrylatorow-aed-na-terenie-gminy-rzekun
- Liczba punktów: **13** (7 w szkołach, 6 na zewnątrz budynków).
- Format: HTML, artykuł news.
- Licencja: brak jawnej licencji.
- Pola: nazwa szkoły lub budynku, bez adresu i współrzędnych.
- Lokalizacje: szkoły w Laskowcu, Dzbeninie, Rzekuniu, Borawem, Drwęczy, Ołdakach
  oraz Urząd Gminy Rzekuń, biblioteka w Laskowcu, świetlica w Drwęczy, remizy OSP
  w Dzbeninie i Borawem, dawna świetlica w Nowej Wsi Wschodniej.

Jednostka miała `score = -1` i nie była w priorytecie. Sprawdzona dodatkowo z powodu
`max_count = 18`. To najlepsza lista poza priorytetem, ale nadal tylko news.

## 4. Źródła klasy C

| Jednostka | URL | Co jest | Dlaczego C |
|---|---|---|---|
| Żabia Wola | https://www.zabiawola.pl/1404,aed-defibrylatory | 1 AED przed wejściem do Urzędu Gminy | pojedyncze urządzenie, brak listy |
| Latowicz | https://www.gmina-latowicz.pl/pl/wyszukaj?search=defibrylator | wzmianka o defibrylatorach wśród sprzętu OSP | brak lokalizacji AED |
| Baranowo | https://www.baranowo.pl/281,defibrylator?tresc=1106 | 1 AED w kapsule na budynku Urzędu Gminy | pojedyncze urządzenie |
| Piaseczno | https://piaseczno.eu/?s=defibrylator | szkolenia i newsy o pierwszej pomocy | brak listy lub mapy AED, w sitemapie 0 stron o AED |
| Grabów nad Pilicą | https://www.grabow.pl/wszystkie-artykuly-nowe1/urzadzenie-ratujace-zycie-w-augustowie | 1 AED w Augustowie | pojedyncze urządzenie, news |
| mazovia.pl | https://www.mazovia.pl/cms/search/index?q=defibrylator | 61 wyników, wszystkie newsy, przetargi i opisy sprzętu szpitalnego | brak rejestru lub mapy AED |

## 5. Źródła klasy D

| Jednostka | Sprawdzony URL | Wynik |
|---|---|---|
| Poświętne | https://gminaposwietne.pl/?s=defibrylator | 0 wyników |
| Rzeczniów | https://rzeczniow.pl/?s=defibrylator | 0 wyników |
| Załuski | https://zaluski.iap.pl/wiadomosci/szukaj?q=defibrylator | 0 wyników |
| Zbuczyn | https://zbuczyn.eu/?s=defibrylator | 0 wyników |
| Miastków Kościelny | https://www.miastkowkoscielny.pl/wyszukaj-w-serwisie?q=defibrylator | 0 wyników |
| Pacyna | https://pacyna.mazowsze.pl/?s=defibrylator | 0 wyników |
| Rościszewo | http://rosciszewo.pl/?s=defibrylator | 0 wyników |

## 6. Urząd marszałkowski

Sprawdzono wyszukiwarkę **mazovia.pl** (Urząd Marszałkowski Województwa
Mazowieckiego), zapytanie `defibrylator`:

- URL: https://www.mazovia.pl/cms/search/index?q=defibrylator
- HTTP: 200, 61 wyników.
- Charakter wyników: newsy o zakupach sprzętu dla szpitali, karetkach dla OSP,
  modernizacjach oddziałów, szkoleniach. Brak wykazu lokalizacji AED, mapy,
  pliku CSV lub API.
- Klasa: **C**. Urząd marszałkowski nie prowadzi publicznego rejestru AED.

Dodatkowo sprawdzono, że `api.dane.gov.pl` dla zapytań `defibrylator`
i `defibrylatory` zwraca dokładnie 4 zbiory w kraju: Krosno, Przemyśl, Marki
i Warszawa. W mazowieckim są tylko dwa: Warszawa i Marki.

## 7. Jednostki poza priorytetem

Pozostałe 97 jednostek z pliku kandydatów ma `score < 5` i `registry_hint = false`.
Nie były indywidualnie weryfikowane poza wyrywkową kontrolą jednostek o wysokim
`max_count`:

- **Rzekuń** - B, 13 lokalizacji (opis wyżej).
- **Ostrołęka** - C, news o zakupie sprzętu i defibrylatorów AED, bez listy lokalizacji.
- **Teresin** - C, news o nowych defibrylatorach w sołectwie Paprotnia.
- **Michałowice** - C, newsy o pojedynczych AED w Pęcicach i gminie.
- **Młodzieszyn** - C, newsy, brak listy.
- **Pułtusk** - C, news o przekazaniu AED placówkom oświatowym.

Te jednostki należy traktować jako niesprawdzone indywidualnie, a nie jako
potwierdzone D. Skan kandydatów nie dał podstaw do poszerzenia listy A/B poza
wymienione źródła.

## 8. Wnioski i rekomendacje

1. **Warszawa** to jedyne źródło A o pełnym schemacie. Priorytet: uzyskać token API
   od Stołecznego Centrum Bezpieczeństwa i pobrać pełny zbiór. Liczba punktów
   pozostaje nieznana do czasu autoryzacji.
2. **Marki** to mały, ale otwarty zbiór. Przed importem naprawić CSV (6 kolumn)
   i zweryfikować współrzędne, szczególnie rekord `Numer Id = 7`.
3. **Nieporęt** to najlepsza lista klasy B. Warto przepisać PDF do CSV i uzupełnić
   współrzędne przez geokodowanie adresów.
4. **Żuromin** i **Rzekuń** wymagają ręcznego przepisania nazw obiektów i uzupełnienia
   adresów oraz współrzędnych.
5. **Urząd marszałkowski** nie jest źródłem rejestru AED. Nie ma sensu budować
   ingestu z mazovia.pl.
6. W województwie mazowieckim nie ma publicznego, kompletnego rejestru AED.
   Pokrycie maszynowe ogranicza się do Warszawy i Marek, czyli do dwóch miast.

## 9. Powtórzenie badania

```bash
# kandydaci i priorytety
jq -r '.units[] | select(.score >= 5 or .registry_hint) | [.name,.score,.registry_hint,.website] | @tsv' \
  /home/zdziszkee/.jcode/scratch/candidates2_mazowieckie.json

# dane.gov.pl - wszystkie zbiory AED w kraju
curl -s 'https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=50' \
  | jq -r '.data[] | [.id,.attributes.title,.attributes.license_name] | @tsv'

# Warszawa - API wymaga tokena
curl -s -X POST -H 'Content-Type: application/json' \
  'https://dane.um.warszawa.pl/api/action/get_scb_lokalizacja_defibrylatorow' -d '{}'

# Marki - CSV i XLSX
curl -sL 'https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv'

# Nieporęt - PDF z listą 10 lokalizacji
curl -sL 'https://www.nieporet.pl/sites/default/files/paragraph.attachments.field_attachments/2026-05/plakat_defiblyratory_aed_word-1.pdf'

# urząd marszałkowski
curl -sL 'https://www.mazovia.pl/cms/search/index?q=defibrylator'
```

## 10. Pliki

- `mazowieckie.csv` - tabela audytu źródeł i jednostek.
- `../municipal-open-data.md` - wcześniejsze, niezależne badanie Warszawy i Marek.
- `../gov-registers.md` - rejestry krajowe i kontekst dane.gov.pl.
