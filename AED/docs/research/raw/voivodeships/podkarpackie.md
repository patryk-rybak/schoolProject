# Audyt źródeł AED - województwo podkarpackie

**Data badania:** 2026-11-21, godz. 18:48-19:10 UTC (19:48-20:10 czasu lokalnego).
**Lane:** `audit-podkarpackie`.
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_podkarpackie.json` (51 jednostek).
**Zakres:** jednostki z `score >= 5` lub `registry_hint = true` (10), znane źródła A
(Krosno, Przemyśl), urząd marszałkowski, Rzeszów oraz dodatkowo sprawdzona Stalowa Wola
i wybrane powiaty.

**Metoda:** bezpośrednie zapytania HTTP (`curl`) do stron gmin, wyszukiwarek gminnych,
BIP, API `api.dane.gov.pl` 1.4 oraz odczyt pobranych plików CSV i GeoJSON.
Kody HTTP i liczby punktów z dnia badania.

## Legenda

- **A** - maszynowy zbiór lub API AED (CSV, JSON, XLSX, GeoJSON, GML).
- **B** - oficjalna strona lub PDF z listą albo mapą wielu AED, bez API.
- **C** - tylko wzmianka lub news, pojedyncze urządzenie bez pełnej listy.
- **D** - brak danych, brak wyników lub fałszywy alarm.

## 1. Podsumowanie

| Klasa | Liczba | Źródła |
|---|---|---|
| **A** | 2 | Krosno (dane.gov.pl, CSV), Przemyśl (dane.gov.pl, GeoJSON/JSON/CSV/GML) |
| **B** | 1 | Stalowa Wola (oficjalna strona kierująca do mapy OpenAEDMap) |
| **C** | 9 | powiat stalowowolski, Grodzisko Dolne, Besko, Jasło, Przecław, Czermin, Trzebownisko, Rzeszów, urząd marszałkowski |
| **D** | 3 | Ulanów, Bobrowice, Jarosław (gmina wiejska) |

**Najlepsze rejestry:**

1. **Przemyśl** - 21 punktów, CC0 1.0, cztery formaty (GML, GeoJSON, JSON, CSV),
   najbogatszy zestaw pól adresowych i kontaktowych. Wada: dane z 2024-11-06,
   mimo deklarowanej codziennej aktualizacji.
2. **Krosno** - 21 punktów, CC0 1.0, prosty CSV. Wada: tylko sześć pól, brak
   operatora, dostępności i producenta, aktualizacja jednorazowa z 2024-02-19.
3. **Stalowa Wola** - jedyne oficjalne miasto w województwie z dedykowaną stroną AED,
   ale sama strona nie zawiera danych. Linkuje wyłącznie do mapy OpenAEDMap, czyli
   do danych OSM, bez własnej listy, liczby punktów i licencji.

Nie ma wojewódzkiego rejestru AED prowadzonego przez urząd marszałkowski.
Poza Krosnem i Przemyślem nie ma w województwie publicznego rejestru maszynowego.

## 2. Źródła klasy A

### 2.1. Krosno

| Pole | Wartość |
|---|---|
| Strona zbioru | https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno |
| CSV | https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv |
| Liczba punktów | **21** (21 wierszy danych) |
| Format | CSV, 2787 B, UTF-8 z BOM |
| Licencja | **CC0 1.0** |
| Układ współrzędnych | EPSG:4326, kolejność `lon, lat` |
| Aktualizacja | jednorazowe udostępnienie, plik z 2024-02-19, metadane zmienione 2024-03-19 |
| Instytucja | Urząd Miasta Krosna |

**Pola:** `Długość geograficzna`, `Szerokość geograficzna`, ` Nazwa`,
` Lokalizacja`, ` Adres`, ` Numer Id`. Trzy ostatnie nazwy mają spację wiodącą.

**Uwagi:** `Nazwa` to zawsze „Defibrylator”, a `Lokalizacja` to nazwa obiektu.
Brak operatora, dostępności, producenta i modelu. Adres jest jednym polem tekstowym,
np. `ul. Jasna, 38-400 Krosno`, więc wymaga rozbioru. `Numer Id` jest liczbą
całkowitą od 1 do 21.

### 2.2. Przemyśl

| Pole | Wartość |
|---|---|
| Strona zbioru | https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn |
| GeoJSON | https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson |
| GML | https://api.dane.gov.pl/media/resources/20241120/1730818801_b50R6UVxPgoVdBbq.gml |
| CSV | https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.csv |
| JSON | https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.json |
| Liczba punktów | **21** (21 obiektów `Feature` w GeoJSON) |
| Format | GML, GeoJSON, JSON, CSV |
| Licencja | **CC0 1.0** |
| Układ współrzędnych | EPSG:4326, GeoJSON `[lon, lat]` |
| Aktualizacja | codziennie, ostatnia zmiana 2024-11-06 |
| Instytucja | Gmina Miasto Przemyśl |

**Pola:** `id`, `name`, `description`, `category`, `city`, `street`,
`home_number`, `postcode`, `phone`, `email`, `www`, `youtube_url`,
`panorama_url`, `geometry`, `gallery`, `attachments`, `links`.

**Uwagi:** najlepszy schemat opisowy w województwie. Zawiera nazwę, adres,
współrzędne i kontakt. `description` to długi tekst edukacyjny o AED, a nie opis
lokalizacji. W CSV kolumna `geometry` jest tekstem
`{"type":"Point","coordinates":{"lat":"...","long":"..."}}`, czyli ma
niestandardową kolejność `lat, lon`. W GML `<gml:pos>` również zawiera `lat lon`
bez deklaracji `srsName`. Telefony, e-maile i strony www są często puste.

## 3. Źródła klasy B

### 3.1. Stalowa Wola - tylko link do mapy OpenAEDMap

- URL: https://www.stalowawola.pl/pl/514-aed.html
- HTTP: 200, 108203 B.
- Liczba punktów: **nieznana**, zależna od OpenAEDMap/OSM.
- Format: HTML, bez własnego pliku i bez tabeli.
- Licencja: brak na stronie miasta. Dane docelowe podlegają licencji OSM/ODbL.
- Pola: brak, strona zawiera wyłącznie zdanie „AED mapa AED:
  https://openaedmap.org/pdt/#map=12/50.57242/22.06398”.

**Uwagi:** to jedyna w województwie oficjalna strona miasta dedykowana AED.
Nie jest rejestrem miejskim, tylko przekierowaniem do mapy opartej na OSM.
Klasyfikuję jako B, bo oficjalna strona prowadzi do mapy wielu AED, ale nie
można z niej pobrać listy punktów ani podać ich liczby.

## 4. Źródła klasy C

| Jednostka | URL | Punkty | Co jest | Dlaczego C |
|---|---|---|---|---|
| powiat stalowowolski | https://stalowowolski.pl/asp/defibrylator-aed-w-sowiik-u,2,artykul,1,337 | 1 | AED na budynku SOWiIK | pojedyncze urządzenie, news |
| Grodzisko Dolne | https://samorzad.gov.pl/web/gmina-grodzisko-dolne/mamy-nowe-defibrylatory-na-terenie-gminy | ok. 11 | AED przy każdej remizie OSP w gminie, 11 zdjęć | brak listy adresów i mapy, tylko opis i galeria |
| Besko | https://www.besko.pl/asp/bezpieczne-besko-aed-dostepne-dla-kazdego,12,artykul,1,2453 | 1 | AED przy Urzędzie Gminy | pojedyncze urządzenie |
| Jasło | https://um.jaslo.pl/?s=defibrylator | min. 3 | defibrylatory dla OSP Żółków, Niegłowice i Hankówka | wyniki wyszukiwania, brak pełnej listy |
| Przecław | https://przeclaw.org/artykul/akcja-defibrylacja-uratuj-zycie | 1 | AED na Urzędzie Miejskim | pojedyncze urządzenie |
| Czermin | https://czermin.pl/2026/11/10/defibrylator-aed-dostepny-dla-wszystkich/ | 1 | AED dostępny dla mieszkańców | pojedyncze urządzenie |
| Trzebownisko | https://trzebownisko.pl/aktualnosci/defibrylatory-aed-trafia-do-szkol | 10 | AED i apteczki dla 10 szkół i przedszkoli | brak nazw placówek, adresów i mapy |
| Rzeszów | https://erzeszow.pl/pl/517-wyszukiwarka/7390-wyniki-wyszukiwania.html?srch-term=defibrylator | 0 | 5 artykułów, m.in. zakup sprzętu w 2019 r. | brak rejestru, listy lub mapy AED |
| urząd marszałkowski | https://www.podkarpackie.pl/index.php/zdrowie/aktualnosci/defibrylatory-dla-granicznych-punktow-medycznych | 3 | 3 defibrylatory LIFEPAK 15 dla stacji pogotowia | sprzęt dla karetek, nie publiczny rejestr AED |

**Grodzisko Dolne:** artykuł z 13.12.2024 mówi, że urządzenia znajdują się
„w każdej miejscowości, przy każdej remizie OSP”. Liczba ok. 11 wynika z liczby
zdjęć w galerii, a nie z wykazu. Brak adresów, współrzędnych i nazw miejscowości
w formie tabeli, dlatego C, a nie B.

**Rzeszów:** miasto ma portal `dane.erzeszow.pl`, ale to serwis raportów
i wskaźników, nie katalog zbiorów. Wyszukiwarka miejska i BIP zwracają wyłącznie
artykuły o zakupach sprzętu, przystanku z AED i imprezach. Brak zakładki AED
i brak pliku do pobrania.

## 5. Źródła klasy D

| Jednostka | Sprawdzony URL | Wynik |
|---|---|---|
| Ulanów | https://ulanow.iap.pl/wiadomosci/szukaj?q=defibrylator | 0 wyników, tylko nagłówek „Wiadomości związane z frazą” |
| Bobrowice | https://bobrowice.pl/?s=defibrylator | gmina Bobrowice w woj. lubuskim, powiat krośnieński, nie podkarpackie. Fałszywe przypisanie w pliku kandydatów |
| Jarosław (gmina wiejska) | https://jaroslaw.itl.pl/ | domena parkująca ITL.PL, 0 wyników. Prawdziwa strona to https://gminajaroslaw.pl/, gdzie wyszukiwarka `?s=defibrylator` również daje 0 wyników |

**Bobrowice:** adres `Bobrowice 131, 66-627 Bobrowice, woj. lubuskie`,
powiat krośnieński w województwie lubuskim. Rekord Q515216 został błędnie
przypisany do Podkarpacia.

**Jarosław:** kandydat miał `website = http://jaroslaw.itl.pl/`, czyli parking
domenowy. Oficjalna strona gminy wiejskiej Jarosław istnieje, ale nie zawiera
treści o AED.

## 6. Urząd marszałkowski i miasta

### 6.1. Urząd Marszałkowski Województwa Podkarpackiego

- Wyszukiwarka: https://www.podkarpackie.pl/index.php/component/search/?searchword=defibrylator
- HTTP: 200.
- Wynik: jeden artykuł „Defibrylatory dla granicznych punktów medycznych”
  z 24.05.2022 o trzech urządzeniach LIFEPAK 15 dla Wojewódzkiej Stacji Pogotowia
  Ratunkowego w Rzeszowie, w Przemyślu i Bieszczadzkiego Pogotowia w Sanoku.
- Klasa: **C**. Brak wykazu, mapy, CSV lub API. Urząd marszałkowski nie prowadzi
  publicznego rejestru AED.

### 6.2. Rzeszów

- Strona miasta: https://erzeszow.pl/
- Wyszukiwarka: https://erzeszow.pl/pl/517-wyszukiwarka/7390-wyniki-wyszukiwania.html?srch-term=defibrylator
- BIP: https://bip.erzeszow.pl/107-wyszukiwarka/2182-wyniki-wyszukiwania.html?srch-term=defibrylator
- Portal danych: https://dane.erzeszow.pl/
- Wynik: 5 artykułów, w tym zakup samochodów ratowniczo-gaśniczych i sprzętu
  w 2019 r., przystanek z AED oraz materiały edukacyjne. Brak listy lokalizacji.
- Klasa: **C**.

### 6.3. Przemyśl

- Zbiór A: https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn
- BIP: https://bip.przemysl.pl/15/wyniki-wyszukiwania.html?Key=defibrylator
- Wynik BIP: 0 trafień.
- Klasa: **A** dzięki zbiorowi miejskiemu. Miasto nie publikuje dodatkowej
  listy klasy B.

### 6.4. Krosno

- Zbiór A: https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno
- Strona miasta: https://www.krosno.pl/
- Wynik: brak dedykowanej strony AED. Wyszukiwarka miejska nie ma prostego
  endpointu, a strona główna nie linkuje do mapy AED.
- Klasa: **A** dzięki zbiorowi miejskiemu.

## 7. Wnioski i rekomendacje

1. **Przemyśl** jest najlepszym źródłem w województwie pod względem schematu.
   Do importu wybrać GeoJSON, bo ma poprawne `[lon, lat]` i pełny zestaw pól.
   Nie używać CSV bez konwersji, bo jego `geometry` ma odwróconą kolejność osi.
2. **Krosno** jest najprostsze do szybkiego importu, ale wymaga rozbioru pola
   `Adres` i nie wnosi informacji o operatorze ani dostępności. Liczyć się
   z tym, że dane są jednorazowe i mogą być nieaktualne.
3. **Stalowa Wola** nie jest samodzielnym rejestrem. Jeśli potrzebna jest mapa,
   lepiej pobrać dane bezpośrednio z OSM/OpenAEDMap, a stronę miasta traktować
   tylko jako dowód lokalnego użycia.
4. **Grodzisko Dolne** ma największą liczbę urządzeń w jednym komunikacie
   (ok. 11), ale bez adresów. Warto potwierdzić lokalizacje w OSM lub u gminy,
   zanim uzna się je za pokryte.
5. **Rzeszów** i **urząd marszałkowski** nie mają rejestru AED. Nie ma sensu
   budować dla nich adaptera.
6. Poza Krosnem i Przemyślem województwo nie ma maszynowego rejestru AED.
   Pokrycie A ogranicza się do dwóch miast i 42 punktów łącznie.

## 8. Powtórzenie badania

```bash
# kandydaci i priorytety
jq -r '.units[] | select(.score >= 5 or .registry_hint) | [.name,.score,.registry_hint,.website] | @tsv' \
  /home/zdziszkee/.jcode/scratch/candidates2_podkarpackie.json

# dane.gov.pl - wszystkie zbiory AED w kraju
curl -s 'https://api.dane.gov.pl/1.4/datasets?q=defibrylatory&per_page=100' \
  | jq -r '.data[] | [.id,.attributes.title,.attributes.license_name] | @tsv'

# Krosno - CSV, 21 rekordów
curl -sL 'https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv'

# Przemyśl - GeoJSON, 21 obiektów
curl -sL 'https://api.dane.gov.pl/media/resources/20241106/1730818801_b50R6UVxPgoVdBbq.geojson'

# Stalowa Wola - oficjalna strona AED
curl -sL 'https://www.stalowawola.pl/pl/514-aed.html'

# urząd marszałkowski
curl -sL 'https://www.podkarpackie.pl/index.php/component/search/?searchword=defibrylator'

# Rzeszów
curl -sL 'https://erzeszow.pl/pl/517-wyszukiwarka/7390-wyniki-wyszukiwania.html?srch-term=defibrylator'
```

## 9. Pliki

- `podkarpackie.csv` - tabela audytu źródeł i jednostek.
- `../gov-registers.md` - wcześniejsze badanie dane.gov.pl, w tym Krosna i Przemyśla.
- `../municipal-open-data.md` - kontekst miejskich portali otwartych danych.
