# Audyt źródeł AED: województwo zachodniopomorskie

Data audytu: 2026-11-21
Plik kandydatów: `/home/zdziszkee/.jcode/scratch/candidates2_zachodniopomorskie.json` (59 jednostek)
Zakres: gminy i powiaty z `score >= 5` lub `registry_hint = true`, dodatkowo Urząd Marszałkowski Województwa Zachodniopomorskiego i miasto Szczecin.
Metoda: pobranie stron HTTP, analiza treści, linków do map/PDF oraz odpowiedzi API. Liczby punktów oznaczają opublikowane lokalizacje AED, nie liczbę wzmianek w wyszukiwarce. HTTP sprawdzono z tego środowiska 2026-11-21 około 18:50-19:10 UTC.

## 1. Wnioski

1. **Brak miejskiego lub wojewódzkiego rejestru AED w formacie A.** Ani Urząd Marszałkowski, ani Szczecin nie publikują maszynowego zbioru ani publicznego API z lokalizacjami AED.
2. **Najlepszy rejestr regionalny to OpenStreetMap / OpenAEDMap** (`https://openaedmap.org/api/v1/countries/PL.geojson`). Eksport z 2026-11-21 zawiera **1 010 punktów** `emergency=defibrillator` w granicach województwa, w tym **167 w Szczecinie**. Licencja ODbL-1.0, format GeoJSON. To klasa **A**.
3. **Sześć gmin publikuje oficjalne listy lub mapy wielu AED (klasa B):**
   - Kołbaskowo: 15 punktów, adresy i miejsce montażu,
   - Czaplinek: 11 punktów, lista HTML i plansza JPG,
   - Manowo: 8 punktów z współrzędnymi,
   - Połczyn-Zdrój: 8 punktów, adresy i zdjęcie mapy,
   - Barlinek: 8 punktów, adresy i mapa e-mapa,
   - Świdwin: 5 punktów, adresy i godziny dostępu.
4. **Goleniów ma formularz rejestracyjny, ale nie publikuje wykazu punktów.** Link „mapa defibrylatorów” prowadzi do wyszukiwania Google Maps, nie do danych gminnych. Klasa C.
5. **Największe sieci opisane tylko w newsach:** Stargard (23 AED w sieci publicznej i autobusach MPK, brak wykazu) oraz projekty „Zdrowe serce pogranicza” (20 AED w 12 gminach nadmorskich, brak listy lokalizacji). Klasa C.
6. **Plik kandydatów zawiera jednostki spoza województwa**: Choroszcz, Dobrzyniewo Duże, Bodzechów, Busko-Zdrój, Czarna Białostocka, Dąbrowa Białostocka, Działoszyce, Drohiczyn, Dubicze Cerkiewne. Nie należy ich wliczać do pokrycia zachodniopomorskiego.

## 2. Klasyfikacja

| Klasa | Znaczenie | Wynik |
| --- | --- | --- |
| A | maszynowy zbiór lub API AED | 1 źródło regionalne (OSM/OpenAEDMap), 0 źródeł gminnych |
| B | oficjalna strona/PDF/mapa z listą wielu AED | 6 gmin |
| C | tylko wzmianka, news, formularz lub pojedyncze urządzenie | 19 jednostek |
| D | brak rejestru, fałszywy alarm lub jednostka poza województwem | pozostałe |

## 3. Źródła A i B

### A. OpenAEDMap / OpenStreetMap, eksport krajowy

- URL: `https://openaedmap.org/api/v1/countries/PL.geojson`
- Liczba punktów: 18 299 w Polsce; **1 010 w województwie zachodniopomorskim** (punkt w poligonie OSM relation 104401); 167 w Szczecinie.
- Pola: `@osm_id`, `@osm_type`, `@osm_version`, `emergency`, `access`, `indoor`, `defibrillator:location` (+ wersje `:pl`, `:en`), `opening_hours`, `operator`, `check_date`, `phone`, `level`, `image`, `image:license`, `addr:street`, `addr:housenumber`, `addr:city`, `addr:postcode`, `description`, `manufacturer`, `model`, `ref`, `wheelchair`, `website`, `email`.
- Licencja: **ODbL-1.0**, atrybucja „© OpenStreetMap contributors”.
- Format: GeoJSON (EPSG:4326), dodatkowo API węzła `https://openaedmap.org/api/v1/node/{id}` i kafle MVT.
- Uwaga: pokrycie jest nierównomierne i zależy od edycji OSM; brak gwarancji aktualności. To jednak jedyne źródło o otwartej licencji i zasięgu całego województwa.

### B. Kołbaskowo, gmina wiejska

- URL: `https://kolbaskowo.pl/gdzie-znalezc-aed-w-gminie-kolbaskowo.html`
- Liczba punktów: **15** (14 stacjonarnych + 1 mobilny OSP).
- Pola: miejscowość, adres, miejsce umieszczenia (np. „szafka zewnętrzna”, „recepcja”, „kapsuła na postumencie”), informacja o ograniczeniu dostępu (Pałac w Ostoi), jednostka mobilna.
- Licencja: brak wyraźnej licencji na tabelę; treść objęta prawem autorskim gminy. Mapa kieruje do OpenAEDMap, więc warstwa OSM jest ODbL.
- Format: HTML (tabela) + link do OpenAEDMap i aplikacji MieszkaniecINFO.
- Uwaga: gmina zapowiada rozbudowę do 19 urządzeń w 2027 r.

### B. Czaplinek, gmina miejsko-wiejska

- URL: `https://www.czaplinek.pl/wykaz-defibrylatorow`
- Liczba punktów: **11**.
- Pola: obiekt (szkoła, hala, stadion, urząd, OSP, sołectwo), adres lub miejscowość, miejsce montażu, typ „zewnętrzny/wewnętrzny”.
- Licencja: brak wyraźnej licencji; treść gminna.
- Format: HTML + plansza JPG `https://www.czaplinek.pl/sites/default/files/paragraph.attachments.field_attachments/2026-07/LOKALIZACJA%20DEFIBRYLATOR%C3%93W%20W%20GMINIE%20CZAPLINEK.jpg` + wersja do druku PDF (`/print/pdf/node/7609`).
- Uwaga: brak współrzędnych; plansza nie ma pełnych adresów dla części punktów.

### B. Manowo, gmina wiejska

- URL: `https://manowo.pl/strona/defibrylator-aed-na-terenie-gminy-manowo`
- Liczba punktów: **8**.
- Pola: identyfikator GM#1-GM#8, miejscowość, adres, obiekt, opis miejsca, **latitude/longitude**, dostęp 24/7.
- Licencja: brak wyraźnej licencji; treść gminna.
- Format: HTML (lista punktów).
- Uwaga: najlepsza kompletność pól wśród źródeł gminnych; punkty prawdopodobnie częściowo pokrywają się z OSM.

### B. Połczyn-Zdrój, gmina miejsko-wiejska

- URL: `https://www.polczyn-zdroj.pl/news/defibrylatory-dostepne-na-terenie-miasta-i-gminy-polczyn-zdroj-0` (publikacja 2026-08-04)
- Liczba punktów: **8**.
- Pola: obiekt, adres, opis miejsca (ściana zewnętrzna, portiernia), dostęp 24/7.
- Licencja: brak wyraźnej licencji; treść gminna.
- Format: HTML + statyczna mapa JPG (`/sites/default/files/pliki/mapka miasta.jpg`).
- Uwaga: mapa jest obrazem, bez współrzędnych i bez danych wektorowych.

### B. Barlinek, gmina miejsko-wiejska

- URL: `https://www.barlinek.pl/mapy-i-plany/mapa-defibrylatorow`
- Liczba punktów: **8**.
- Pola: obiekt, adres, godziny dostępu ( godziny sklepu/urzędu/przychodni lub 24/7).
- Licencja: brak wyraźnej licencji; treść gminna. Mapa e-mapa (`http://barlinek.e-mapa.net/`) to usługa komercyjna, bez otwartej licencji na dane.
- Format: HTML + interaktywna mapa e-mapa.
- Uwaga: brak współrzędnych w treści; część punktów to bankomaty i sklepy.

### B. Świdwin, gmina miejska

- URL: `https://www.swidwin.pl/asp/defibrylatory-w-swidwinie,380`
- Liczba punktów: **5**.
- Pola: obiekt (szkoły, Park Wodny), lokalizacja w budynku, godziny dostępu, dostęp 24/7, telefon po zamknięciu.
- Licencja: brak wyraźnej licencji; treść gminna.
- Format: HTML.
- Uwaga: brak współrzędnych; listy są opisowe.

## 4. Źródła C i D dla jednostek priorytetowych

| Jednostka | Klasa | Źródło i uzasadnienie |
| --- | --- | --- |
| Choroszcz | C | `https://choroszcz.pl/pl/aktualnoci/nowe-ogolnodostepne-defibrylatory-aed-ratuja-zycie-w-choroszczy.html` - news o 2 AED; jednostka jest w podlaskim, nie w zachodniopomorskim. |
| Goleniów | C | `https://uslugi.bip.goleniow.pl/defibrylatory/` - formularz zgłoszenia i link do wyszukiwania Google Maps; brak opublikowanego wykazu. |
| Kołobrzeg (gmina wiejska) | C | `https://gmina.kolobrzeg.pl/galerie-1123-nowe_defibrylatory_aed_na_terenie_gminy.html` - news z galerią, bez listy lokalizacji. |
| Ustronie Morskie | C | `https://www.ustronie-morskie.pl/7133/defibrylator-dla-gminy-ustronie-morskie` - 1 AED w Centrum Helios, opis projektu. |
| Pełczyce | C | `https://cuspelczyce.pl/.../sekundy-ktore-ratuja-zycie...` - 1 AED przy CUS, news. |
| Węgorzyno | C | `https://wegorzyno.pl/aktualnosci/defibrylator-aed-juz-w-pelni-dostepny-dla-mieszkancow-gminy-wegorzyno-.html` - 1 AED w kapsule, news. |
| powiat białogardzki | C | `https://powiat-bialogard.pl/14,0,wyszukiwarka&szukaj=defibrylator` - news z 2019 r. o 1 AED w starostwie. |
| Chociwel | C | `http://www.chociwel.pl/component/finder/search?Itemid=101&q=defibrylator` - komunikat o 1 AED w OSP, czasowo zdjętym do serwisu. |
| Rewal | C | `https://rewal.pl/?s=defibrylator` - news o 2 AED z projektu „Zdrowe serce pogranicza”. |
| Stargard | C | `https://stargard.eu/?s=defibrylator` - 23 AED w sieci publicznej i MPK, ale tylko artykuły, bez wykazu. |
| Sianów | C | `https://sianow.pl?s=defibrylator` - news/projekt o montażu AED. |
| Dobra | D | `https://www.dobraszczecinska.pl/` - tylko strona instruktażowa „Obsługa defibrylatora AED”; brak lokalizacji. |
| Dobrzyniewo Duże | D | Jednostka w podlaskim; wyszukiwarka bez rejestru. |
| Osina | D | `https://www.osina.pl/component/finder/search?q=defibrylator` - brak wyników, fałszywy alarm. |
| Recz | D | Brak strony gminnej; kandydat wskazuje wyłącznie OpenAEDMap. |

Pozostałe jednostki z niskim score mają wyłącznie wyniki wyszukiwania bez listy AED, negatywną frazę lub nie są w zachodniopomorskim. Pełny wykaz w pliku CSV.

## 5. Urząd Marszałkowski Województwa Zachodniopomorskiego

- `https://www.wzp.pl/?s=defibrylator` zwraca jedno trafienie: news „Defibrylator w Będargowie, warsztaty bezpieczeństwa i kino pod chmurką. Nowe inicjatywy Społeczników”. Brak rejestru.
- Strona projektu `https://wwt.wzp.pl/zdrowe-serce-pogranicza` obecnie przekierowuje na `https://wzp.pl/wp-signup.php?new=wwt` (302), czyli jest niedostępna.
- Wersja archiwalna (Wayback, 2024-06-13) opisuje zakup **20 AED** dla **12 gmin nadmorskich**: Wolin (1), Międzyzdroje (1), Dziwnów (3), Rewal (2), Trzebiatów (1), Miasto Kołobrzeg (2), Gmina Kołobrzeg (1), Ustronie Morskie (1), Mielno (3), Miasto Darłowo (1), Gmina Darłowo (1), Świnoujście (3). Brak listy adresów, współrzędnych i pliku do pobrania.
- Klasa: **C** (informacja projektowa), nie B. Rejestr wart odtworzenia przez kontakt z Wydziałem Współpracy Terytorialnej i Turystyki UMWZP.

## 6. Miasto Szczecin

- `https://szczecin.eu` i `https://bip.um.szczecin.pl` - brak wykazu AED; sitemap nie zawiera strony o defibrylatorach, wyszukiwarka BIP nie udostępnia rejestru.
- `https://geoportal.szczecin.pl` i `https://mapa.szczecin.eu/gpt4/` - SIP miasta; w publicznym opisie i bundle aplikacji brak warstwy „defibrylatory”. Nie znaleziono publicznego API ani pliku z AED.
- Klasa oficjalna: **D** (brak rejestru). Dane zastępcze: **A** przez OSM/OpenAEDMap, **167 punktów** w granicach miasta.
- Wniosek: Szczecin nie jest źródłem rejestru, ale ma najlepsze pokrycie OSM w województwie.

## 7. Rekomendacje

1. Do zasilenia bazy użyć **OpenAEDMap PL.geojson** jako warstwy bazowej (ODbL), z filtrem po granicy województwa i oznaczeniem `source=openaedmap`.
2. Ręcznie zaimportować sześć źródeł B, zaczynając od **Manowo** (współrzędne) i **Kołbaskowo** (15 punktów, dobre opisy dostępu).
3. Dla **Czaplinka** i **Połczyna-Zdroju** przeprowadzić geokodowanie adresów; mapy są tylko obrazami.
4. Wystąpić do **UMWZP** o listę 20 lokalizacji z projektu „Zdrowe serce pogranicza” oraz do **Szczecina** o warstwę AED z SIP, jeśli istnieje wewnętrznie.
5. Oznaczyć jednostki spoza województwa w pliku kandydatów jako błąd danych; nie wliczać ich do pokrycia.

## 8. Pliki

- `AED/docs/research/raw/voivodeships/zachodniopomorskie.csv` - klasyfikacja wszystkich 59 jednostek i wiersz regionalny.
