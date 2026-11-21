# Audyt źródeł AED - województwo łódzkie

**Data badania:** 2026-11-21, godz. 18:48-19:15 UTC (19:48-20:15 czasu lokalnego).
**Lane:** `audit-lodzkie`.
**Plik kandydatów:** `/home/zdziszkee/.jcode/scratch/candidates2_dzkie.json` (75 jednostek).
**Zakres:** wszystkie jednostki z `score >= 5` lub `registry_hint = true` (8), a także
urząd marszałkowski, Łódź oraz źródła ogólnopolskie (OSM/OpenAEDMap, dane.gov.pl).

**Metoda:** bezpośrednie zapytania HTTP (`curl`, `webfetch`) do stron gmin i wyszukiwarek
gminnych, eksport KML z osadzonych map Google My Maps, API `api.dane.gov.pl` 1.4,
wyszukiwarka `lodzkie.pl` (RSS) oraz odczyt pobranych plików. Kody HTTP, liczby punktów
i rozmiary plików z dnia badania.

## Legenda

- **A** - maszynowy zbiór lub API AED (CSV, JSON, XLSX, GeoJSON, KML).
- **B** - oficjalna strona lub PDF z listą albo mapą wielu AED, bez API.
- **C** - tylko wzmianka lub news, pojedyncze urządzenie bez pełnej listy.
- **D** - brak danych, brak wyników lub fałszywy alarm.

## 1. Podsumowanie

| Klasa | Liczba | Źródła |
|---|---|---|
| **A** | 2 | Łódź (KML, 136 punktów), Bełchatów (KML, 32 punkty) |
| **B** | 3 | Piątek (3), Rząśnia (3), Osjaków (2) |
| **C** | 3 | Kleszczów (1), Domaniewice (13 kupionych, bez lokalizacji), Wola Krzysztoporska (szkolenia) |
| **D** | 2 | Andrespol, Czarnożyły |

**Najlepsze rejestry:**

1. **Łódź** - osadzona na `lodz.pl` mapa Google My Maps, eksport KML daje **136 punktów**
   ze współrzędnymi i adresem w nazwie oraz opisem budynku/dostępu. Brak formalnej
   licencji i brak wersjonowanego API. Artykuł z 2023 r. mówi o 87 AED, więc mapa jest
   aktualizowana i liczniejsza niż opis.
2. **Bełchatów** - mapa Google My Maps na oficjalnej stronie, KML daje **32 punkty**
   (artykuł: "ponad 30 miejsc"). Nazwa zawiera obiekt i ulicę, współrzędne są poprawne.
   Brak adresu w osobnym polu i brak licencji.
3. **OpenAEDMap / OSM** (`aedmapa.pl`, dane OSM, **ODbL**) - jedyne w pełni otwarte,
   maszynowe źródło pokrywające całe województwo. Serwis deklaruje 17 720 punktów
   w Polsce. To rozwiązanie zastępcze, nie rejestr urzędowy.

Nie ma wojewódzkiego rejestru AED prowadzonego przez urząd marszałkowski ani miejskiego
portalu otwartych danych Łodzi z warstwą AED. W `api.dane.gov.pl` nie ma żadnego zbioru
dla województwa łódzkiego (4 zbiory w kraju: Krosno, Przemyśl, Marki, Warszawa).

## 2. Źródła klasy A

### 2.1. Łódź - 136 punktów

| Pole | Wartość |
|---|---|
| Strona źródłowa | https://www.lodz.pl/artykul/defibrylatory-na-ulicach-lodzi-jak-ich-uzywac-gdzie-je-znajdziesz-mapa-58563/ |
| Mapa (embed) | https://www.google.com/maps/d/embed?mid=1FMKFbebKJPYqD4C87pXWPqNjEHuEswE |
| Eksport KML | `https://www.google.com/maps/d/kml?mid=1FMKFbebKJPYqD4C87pXWPqNjEHuEswE&forcekml=1` |
| HTTP KML | **200**, 59 519 B, `text/xml` |
| Liczba punktów | **136** Placemarków w folderze `defibrylatory` |
| Format | KML (Google My Maps), geometria `Point` |
| Licencja | **brak** - treść serwisu "wszystkie prawa zastrzeżone"; KML podlega ToS Google |
| Układ współrzędnych | EPSG:4326, `lon,lat,0` |
| Aktualizacja | brak metadanych; artykuł z 2023 r. podaje 87 AED, mapa zawiera 136 |

**Pola:** `name` = `defibrylator - <adres>` (np. `defibrylator - ul. Złotnicza 10, 91-836 Łódź`),
`description` = opis budynku i dostępu (np. `Dom Pomocy Społecznej<br>wewnątrz`),
`coordinates`. Opisy wypełnione w 135/136 rekordach. Brak telefonu, modelu, godzin
dostępu, numeru seryjnego i statusu urządzenia.

**Uwagi:** mapa jest osadzona na oficjalnym portalu miasta, ale nie jest opublikowana
jako zbiór danych. Eksport KML jest nieudokumentowanym endpointem Google i może zniknąć.
Adres jest częścią `name`, więc wymaga parsowania. Mimo to to największy i najlepiej
zgeolokalizowany zbiór AED w województwie.

### 2.2. Bełchatów - 32 punkty

| Pole | Wartość |
|---|---|
| Strona źródłowa | https://belchatow.pl/mapa-defibrylatorow-aed/ |
| Mapa (embed) | https://www.google.com/maps/d/u/1/embed?mid=171VXaQTmWbIPbtUvHfuzwQredJE3krA |
| Eksport KML | `https://www.google.com/maps/d/kml?mid=171VXaQTmWbIPbtUvHfuzwQredJE3krA&forcekml=1` |
| HTTP KML | **200**, 22 746 B, `text/xml` |
| Liczba punktów | **32** (dokument: "Wykaz defibrylatorów AED na terenie Bełchatowa") |
| Format | KML (Google My Maps), geometria `Point` |
| Licencja | **brak** - stopka "Wszystkie prawa zastrzeżone - belchatow.pl 2026" |
| Układ współrzędnych | EPSG:4326, `lon,lat,0` |
| Aktualizacja | strona z 18 marca 2026; brak metadanych zbioru |

**Pola:** `name` = obiekt + ulica (np. `UM - ul. Kościuszki 1`,
`Szkoła Podstawowa nr 4 im. Stefana Żeromskiego – ul. Lipowa 11`), `coordinates`.
10 rekordów ma `ExtendedData` z linkiem do zdjęcia (`gx_media_links`). Brak osobnego
pola adresu, telefonu i godzin dostępu.

**Uwagi:** artykuł deklaruje "ponad 30 miejsc", KML ma 32. Współrzędne mieszczą się
w Bełchatowie. To ten sam wzorzec co Łódź: poprawna geometria, ubogi schemat opisowy,
brak licencji.

## 3. Źródła klasy B

### 3.1. Piątek - 3 punkty

- URL: https://www.gminapiatek.pl/ogolnodostepne-defibrylatory-aed-w-gminie-piatek/
- Liczba punktów: **3**.
- Format: HTML, artykuł z pełną listą lokalizacji.
- Licencja: brak jawnej licencji.
- Pola: nazwa obiektu, bez adresu i współrzędnych.
- Lokalizacje: Urząd Miejski w Piątku (ściana frontowa przy wejściu), Szkoła Podstawowa
  im. Marszałka Józefa Piłsudskiego w Piątku, Szkoła Podstawowa im. Orła Białego
  w Czernikowie.
- Kontekst: zakup w ramach Programu Ochrony Ludności i Obrony Cywilnej 2025-2026.

### 3.2. Rząśnia - 3 punkty

- URL: https://rzasnia.pl/defibrylatory-aed-w-gminie-rzasnia/
- URL uzupełniający: https://rzasnia.pl/defibrylator-aed-w-rzasni/
- Liczba punktów: **3** (2 gminne + 1 InPost/Helpbox 365).
- Format: HTML, dwa artykuły.
- Licencja: brak jawnej licencji.
- Pola: nazwa obiektu i adres, bez współrzędnych.
- Lokalizacje: Gminna Biblioteka Publiczna w Rząśni, ul. Kościuszki 16;
  Szkoła Podstawowa w Białej, Biała 63; ul. 1 Maja 83 w Rząśni (obok stacji paliw,
  stacja Helpbox 365).
- Uwagi: artykuł z listopada 2025 r. informuje o dwóch nowych AED; trzeci punkt
  pochodzi z wcześniejszej akcji InPost.

### 3.3. Osjaków - 2 punkty

- URL: https://osjakow.pl/informacja-o-realizacji-zadania-bezpieczna-przestrzen-uzytecznosci-publicznej-w-osjakowie/
- Liczba punktów: **2**.
- Format: HTML, jawna tabela "Wykaz defibrylatorów w mieście Osjaków" (Lp., adres,
  w dyspozycji).
- Licencja: brak jawnej licencji.
- Pola: adres, podmiot dysponujący; bez współrzędnych.
- Lokalizacje: Osjaków, ul. Wieluńska 26 (Punkt Informacji Turystycznej / budynek GOK);
  Osjaków, ul. Targowa 23 (OSP Osjaków).
- Uwagi: najlepiej sformatowana lista w priorytecie, ale tylko 2 urządzenia i brak
  geometrii. Dokument z grudnia 2024 r.

## 4. Źródła klasy C

| Jednostka | URL | Co jest | Dlaczego C |
|---|---|---|---|
| Kleszczów | https://www.kleszczow.pl/kolejny-defibrylator-aed-zwieksza-bezpieczenstwo-mieszkancow-naszej-gminy/ | 1 nowy AED w Antoniówce, szkolenie | pojedyncze urządzenie, brak listy |
| Domaniewice | https://domaniewice.pl/program-ochrony-ludnosci-i-obrony-cywilnej-na-lata-2025-2026/ | zakup **13 kpl.** AED z kapsułami i alarmem | brak jakiejkolwiek lokalizacji, tylko opis programu i kwoty |
| Wola Krzysztoporska | https://www.wola-krzysztoporska.pl/?s=defibrylator | szkolenia pracowników i uczniów, defibrylatory w OSP | brak publicznej listy AED |

## 5. Źródła klasy D

| Jednostka | Sprawdzony URL | Wynik |
|---|---|---|
| Andrespol | https://www.bip.andrespol.pl/redir,szukaj?jezyk=1&szukaj=defibrylator | 0 trafień w BIP; strona wyszukiwania bez wyników |
| Czarnożyły | https://czarnozyly.pl/component/finder/search?q=defibrylator | 0 wyników ("Nie znaleziono żadnych wyników") |

## 6. Urząd marszałkowski

Sprawdzono wyszukiwarkę **lodzkie.pl** (Urząd Marszałkowski Województwa Łódzkiego),
zapytania `defibrylator` i `mapa defibrylatorów`:

- URL: https://www.lodzkie.pl/szukaj?q=defibrylator
- HTTP: 200; wyniki dostępne też jako RSS (`&format=feed&type=rss`).
- Charakter wyników: newsy o dofinansowaniu AED dla powiatu łódzkiego wschodniego
  (20 zestawów, docelowo 75), AED w pociągach ŁKA, sprzęcie dla OSP i szpitali.
- Brak wykazu lokalizacji, mapy, CSV, API.
- Klasa: **C**. Urząd marszałkowski nie prowadzi publicznego rejestru AED.

Najbardziej konkretny materiał: https://www.lodzkie.pl/strona-glowna/aktualnosci/defibrylatory-aed-dla-lodzkiego-wschodniego-powiat-staje-sie-najbardziej-bezpiecznym-w-kraju
(4 marca 2026). Padają liczby (20 dostarczonych, plan 75 w powiecie łódzkim wschodnim),
ale nie ma listy adresów. Starosta zapowiada aplikację z lokalizacjami - to potencjalne
przyszłe źródło A/B, obecnie nieistniejące.

## 7. Źródła ogólnopolskie i otwarte dane

| Źródło | Ocena | Uwagi |
|---|---|---|
| **OpenAEDMap / `aedmapa.pl`** | A | dane z OpenStreetMap, **ODbL**, 17 720 AED w Polsce, aplikacja offline; pokrywa całe województwo, brak podziału administracyjnego w UI |
| OSM Overpass (`emergency=defibrillator`) | A | pełny dostęp do tagów, licencja ODbL; zapytania w dniu badania były blokowane/timeout (HTTP 000), więc liczby dla łódzkiego nie zmierzono |
| `api.dane.gov.pl` | - | zapytanie `defibrylator`: 4 zbiory w kraju (Krosno, Przemyśl, Marki, Warszawa), **0 dla łódzkiego** |
| InterSIT (`nowa.mapa.lodz.pl`) | - | portal GIS miasta, brak warstwy AED w katalogu map tematycznych; WAF blokuje część zapytań |

## 8. Wnioski i rekomendacje

1. **Łódź i Bełchatów** to jedyne źródła z geometrią dla wielu punktów. Oba opierają się
   na Google My Maps i wymagają eksportu KML. Przed importem: sparsować adres z `name`,
   znormalizować ulice i uzupełnić brakujące opisy. Licencja jest nieuregulowana, więc
   dane nie nadają się do redystrybucji bez zgody urzędu.
2. **Piątek, Rząśnia, Osjaków** to listy klasy B - małe (2-3 punkty), bez współrzędnych.
   Warto przepisać do CSV i geokodować adresy, ale zysk jest niewielki.
3. **Domaniewice** kupiły 13 AED, ale nie opublikowały lokalizacji. To najlepszy
   kandydat do zapytania o wykaz (ustawa o dostępie do informacji publicznej).
4. **Urząd marszałkowski** nie jest źródłem rejestru. Użyteczny tylko jako źródło
   kontekstu i przyszłych zapowiedzi (aplikacja powiatu łódzkiego wschodniego).
5. **OSM/OpenAEDMap** należy traktować jako warstwę uzupełniającą i weryfikującą.
   Zasięg w łódzkiem jest nieznany z powodu blokady Overpass, ale to jedyne otwarte
   źródło pokrywające całe województwo.
6. W województwie łódzkim nie ma publicznego, kompletnego rejestru AED. Pokrycie
   maszynowe ogranicza się do dwóch miast i nie ma otwartej licencji.

## 9. Powtórzenie badania

```bash
# kandydaci i priorytety
jq -r '.units[] | select(.score >= 5 or .registry_hint) | [.name,.score,.registry_hint,.website] | @tsv' \
  /home/zdziszkee/.jcode/scratch/candidates2_dzkie.json

# Łódź - KML z osadzonej mapy
curl -sL 'https://www.google.com/maps/d/kml?mid=1FMKFbebKJPYqD4C87pXWPqNjEHuEswE&forcekml=1' -o lodz.kml
grep -c '<Placemark' lodz.kml

# Bełchatów - KML z osadzonej mapy
curl -sL 'https://www.google.com/maps/d/kml?mid=171VXaQTmWbIPbtUvHfuzwQredJE3krA&forcekml=1' -o belchatow.kml
grep -c '<Placemark' belchatow.kml

# dane.gov.pl - zbiory AED w kraju
curl -s 'https://api.dane.gov.pl/1.4/datasets?q=defibrylator&per_page=50' \
  | jq -r '.data[] | [.id,.attributes.title,.attributes.license_name] | @tsv'

# urząd marszałkowski
curl -sL 'https://www.lodzkie.pl/szukaj?q=defibrylator&format=feed&type=rss'
```

## 10. Pliki

- `dzkie.csv` - tabela audytu źródeł i jednostek.
- `../osm-ecosystem.md` - kontekst OSM/OpenAEDMap.
- `../gov-registers.md` - rejestry krajowe i kontekst dane.gov.pl.
