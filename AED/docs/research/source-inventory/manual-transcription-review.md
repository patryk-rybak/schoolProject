# Przegląd źródeł manualnych: live check i klasyfikacja formatu

**Data:** 2026-11-21
**Status:** artefakt lane'u `manual-configs` (przegląd + live check)
**Zakres:** 20 pozycji z inwentarza oznaczonych pierwotnie jako `manual` / `none`
(19 konfiguracji `manual` oraz Czarne, po przeglądzie skonfigurowane jako
`pdf_table`).
**Metoda:** żądania GET z UA przeglądarki, bez omijania `robots.txt`, CAPTCHA
ani blokad. Po HTTP 429 powtórka po odczekaniu. Dla artefaktów sprawdzono
sygnaturę pliku i warstwę tekstową, jeśli format na to pozwalał.

## 1. Wnioski w skrócie

| Wniosek | Szczegóły |
| --- | --- |
| Wszystkie 20 pozycji są osiągalne | Po powtórkach i korekcie domeny wszystkie 20 pozycji odpowiada 200. Trzy domeny zwróciły 429 przy serii żądań, a Lublin raz zwrócił 503 na PDF; kolejne próby były udane. |
| Dziewięć źródeł ma artefakt, nie stronę HTML | PDF: Lublin, Nieporęt, Czarne. DOCX: powiat szamotulski. ODT: Imielin. Obraz: Dopiewo, Nowa Wieś Lęborska, Świdnica (gmina), Szemud. |
| Cztery źródła to tylko wyniki wyszukiwania | Budzów, Dziadowa Kłoda, Jordanów, Wierzchosławice. Lista jest rozproszona w artykułach, więc wpis `document_url` musi pozostać adresem wyszukiwania, a transkrypcja wymaga otwarcia każdego wyniku. |
| Siedem źródeł wymaga tylko HTML | Koźmin Wielkopolski, Nowa Sól, Rzekuń, UMWL, Żuromin, Kcynia, Koszęcin. |
| Znaleziono i poprawiono jeden istotny błąd | Imielin: artykuł linkuje ODT z 5 rekordami i pełnymi współrzędnymi WGS84. Poprzednia konfiguracja twierdziła `NO_COORDS`, `E_MAPA_JS` i wymagała geokodowania. |
| Czarne ma warstwę tekstową | PDF 1.7, 1 strona, 20 wierszy. Konfiguracja `pdf_table` jest poprawna, a `needs_ocr` z inwentarza jest nieaktualne. |
| Domena powiatu szamotulskiego była błędna | `powiat-szamotulski.pl` nie rozwiązuje się. Poprawny host to `powiat-szamotuly.pl`; wykaz to DOCX. |
| Luka kontraktu | Ówczesny ręcznie edytowany schemat nie miał wariantu `manual`, więc konfiguracje manualne (25 w chwili przeglądu) nie przechodziły walidacji tym schematem. Generowany schemat Zod przechodził dla wszystkich 25 manualnych i dla Czarnego `pdf_table`. Obecnie kontraktem jest `backend/ingest/datasources-config.schema.json` generowany z Zod. |

## 2. Klasy transkrypcji

Kody używane w tabeli:

| Kod | Znaczenie |
| --- | --- |
| `pdf_text` | Urodzony cyfrowo PDF z warstwą tekstową. Można przepisać lub użyć parsera `pdf_table`, jeśli układ jest regularny. |
| `pdf_layout` | PDF z warstwą tekstową, ale kolejność runów lub układ tabeli wymaga ręcznego składania. |
| `docx_text` | DOCX z tabelą lub listą. |
| `odt_text` | ODT (OpenDocument Text). W enum `format` brak `odt`, więc zapis `other`. |
| `image_table` | Tabela wyłącznie jako obraz. Wymaga ręcznego odczytu lub OCR z kontrolą człowieka. |
| `image_map` | Mapa z opisami wyłącznie jako obraz. |
| `html_list` | Lista lub numerowane akapity w HTML. |
| `html_article` | Artykuł z nazwami obiektów, często bez adresów. |
| `html_search` | Strona wyników wyszukiwania, nietrwała lista rozproszona w wielu artykułach. |
| `emapa_reference` | e-mapa jest tylko planem miasta, nie wykazem AED. Nie traktować jako źródła danych. |

## 3. Wyniki live check

Adresy sprawdzono 2026-11-21. `HTTP` i `Content-Type` dotyczą pierwszego
udanego żądania; `429/503` opisano w kolumnie uwag.

| Źródło | Sprawdzony URL | HTTP / typ | Artefakt lub dokument | `format` | Klasa | Uwagi |
| --- | --- | --- | --- | --- | --- | --- |
| Budzów | `https://budzow.pl?s=defibrylator` | 200 `text/html` | ta sama strona wyników | `html` | `html_search` | 8 pozycji; właściwy news o doposażeniu 5 OSP. Brak współrzędnych i TERYT. |
| Czarne | `https://czarne.pl/files/file_add/download/35_document.pdf` | 200 `application/download` | PDF 1.7, 1 strona, 123 875 B | `pdf` (`pdf_table`) | `pdf_text` | Warstwa tekstowa ok. 1 615 znaków, 20 wierszy. Nagłówek: lp., Nazwa obiektu, Adres, Współrzędne geograficzne, Umieszczenie AED, Uwagi. |
| Dopiewo | `https://dopiewo.pl/lokalizacje-defibrylatorow-aed` | 200 `text/html` | JPEG 1170x936, 65 058 B | `image` | `image_table` | Strona nie ma listy tekstowej. 11 lokalizacji tylko na obrazie. e-mapa to plan gminy. |
| Dziadowa Kłoda | `https://www.dziadowakloda.pl/main/szukaj?szukaj=defibrylator` | 200 `text/html` | ta sama strona wyników | `html` | `html_search` | 7 wyników; świetlice, OSP Gołębice, Radzowice. Lista częściowa, brak współrzędnych. |
| Imielin | `https://www.imielin.pl/pl/205/6222/do-ratowania-zycia-defibrylatory-w-imielinie-.html` | 200 `text/html` | ODT 127 330 B: `https://www.imielin.pl/files/files/defibrylatory.aktualizacja.2023.odt` | `other` (`odt`) | `odt_text` | 5 rekordów ze współrzędnymi WGS84, adresami, operatorem, telefonem, dostępem i godzinami. Poprawiono konfigurację. |
| Jordanów | `https://www.gmina-jordanow.pl/wyniki-wyszukiwania?search=defibrylator` | 200 `text/html` | ta sama strona wyników | `html` | `html_search` | 5 newsów o AED. Osobna strona `/banery/aed/` to ogólna informacja, nie wykaz. |
| Kcynia | `https://kcynia.pl/421-kropki-zycia-aed.html` | 429, potem 200 `text/html` | ta sama strona artykułu | `html` | `html_list` | 5 miejsc: Urząd Miejski, GCKiB, Bank Spółdzielczy, OSP Górki Zagajne, świetlica Turzyn. Host ogranicza serię żądań. |
| Koszęcin | `https://koszecin.pl/defibrylatory-aed-w-koszecinie.html` | 429, potem 200 `text/html` | ta sama strona artykułu | `html` | `html_list` | 2 urządzenia: dom kultury Sobieskiego 11b i Nadleśnictwo Sobieskiego 1. Host ogranicza serię żądań. |
| Koźmin Wielkopolski | `https://www.kozminwlkp.pl/index.php/defibrylatory` | 200 `text/html` | ta sama strona artykułu | `html` | `html_list` | Lista numerowana 1-3 w akapitach. Obraz `Defibrylatory.png` jest pomocniczy. e-mapa nie jest wykazem. |
| Lublin | `https://lublin.eu/mieszkancy/zdrowie/aktualnosci/aed-w-lublinie,748,1345,1.html` | 200 `text/html` | PDF 1.7, 2 strony, 47 632 B: `/download/gfx/lublin/userfiles/_public/mieszkancy/zdrowie/aktualnosci/2026/aed_lublin_stan_17.03.2026.pdf` | `pdf` | `pdf_text` | 48 rekordów / 46 unikalnych wg inwentarza, bez współrzędnych. Jedno późniejsze żądanie PDF zwróciło 503, więc możliwy przejściowy błąd hosta. |
| Nieporęt | `https://www.nieporet.pl/defibrylatory-aed` | 200 `text/html` | PDF 1.5, 1 strona, 240 655 B: `/sites/default/files/paragraph.attachments.field_attachments/2026-05/plakat_defiblyratory_aed_word-1.pdf` | `pdf` | `pdf_layout` | Plakat ma warstwę tekstową, ale kolejność runów jest zaburzona. 10 obiektów, bez współrzędnych. |
| Nowa Sól | `https://nowasol.pl/` | 200 `text/html` | Artykuł `https://nowasol.pl/aktualnosci/zdrowie/aed-w-nowej-soli/27-01-2022` | `html` | `html_article` | 6 nazw obiektów, bez adresów i współrzędnych. Strona główna nie jest wykazem. |
| Nowa Wieś Lęborska | `https://www.nwl.pl/dla-mieszkanca/bezpieczenstwo/automatyczne-defibrylatory/` | 200 `text/html` | PNG 666x714, 55 090 B: `/files/download/28830/Defibrylatory-NWL.png` | `image` | `image_table` | 10 lokalizacji tylko na obrazie, bez współrzędnych. |
| Powiat szamotulski | `https://powiat-szamotulski.pl/` (DNS fail) | 200 na `https://www.powiat-szamotuly.pl/` | DOCX 21 608 B: `/download/Wykaz-AED-w-Powiecie-Szamotulskim,626.docx` | `docx` | `docx_text` | Stary host nie istnieje. Artykuł `idn:2903` linkuje DOCX z 84 wierszami i 9 jednostkami JST, bez współrzędnych. |
| Rzekuń | `https://www.rzekun.pl/ug/aktualnosci/13-defibrylatorow-aed-na-terenie-gminy-rzekun` | 200 `text/html` | ta sama strona artykułu | `html` | `html_list` | Dwie listy `<ul>` po 6 pozycji, choć treść zapowiada 13 urządzeń. Rozbieżność do potwierdzenia u wydawcy. |
| Świdnica (gmina) | `https://swidnica.zgora.pl/PL/3605/Defibrylatory_w_Gminie_Swidnica/` | 200 `text/html` | JPEG 3508x2481, 565 443 B: `/system/pobierz.php?id=6236` (finalnie `/system/obj/6236_Zestawienie_defibrylatorow_w_Gminie_-_na_strone_01.jpg`) | `image` | `image_table` | 8 adresów w tabeli-obrazie. Strona podaje miniaturę 800x566, ale plik źródłowy ma 3508x2481. |
| Szemud | `https://szemud.pl/defibrylatory-aed.html` | 429, potem 200 `text/html` | JPEG 9920x7575, 7 282 187 B: `/files/image/defibrylatory.jpg` | `image` | `image_map` | 13 lokalizacji tylko na mapie-obrazie. Brak listy tekstowej i współrzędnych. |
| UMWL, instytucje kultury | `https://www.lubelskie.pl/aktualnosci/defibrylatory-w-instytucjach-kultury-samorzadu-wojewodztwa-lubelskiego/` | 200 `text/html` | ta sama strona artykułu | `html` | `html_article` | 10 instytucji kultury województwa, bez adresów i współrzędnych. Zakres częściowy. |
| Wierzchosławice | `https://wierzchoslawice.pl?s=defibrylator` | 200 `text/html` | ta sama strona wyników | `html` | `html_search` | 4 powiązane artykuły, 5 lokalizacji. Lista rozproszona w wynikach. |
| Żuromin | `https://zuromin.info/?p=36997` | 200 `text/html` | ta sama strona artykułu | `html` | `html_article` | 7 nazw obiektów, bez adresów i współrzędnych. |

## 4. Czarne: przegląd konfiguracji PDF

Wpis `czarne` w rejestrze `backend/ingest/datasources-config.json` jest po
przeglądzie wariantem `pdf_table`, a nie `manual`. Sprawdzenia:

| Element | Wynik |
| --- | --- |
| `fetch.url` | 200, `application/download`, sygnatura `%PDF-1.7`, 123 875 B. |
| Liczba stron | 1, zgodna z `expected_page_count: 1`. |
| Warstwa tekstowa | Obecna, ok. 1 615 znaków, powyżej `min_text_chars: 500`. |
| Wiersze | 20, zgodne z `min_records` i `max_records`. |
| Kotwica | `lp` z `^\d+\.$` występuje w każdym wierszu. |
| Szerokość strony | `MediaBox` 595.32 x 841.92; ostatnia kolumna `x_max: 596` mieści się w stronie. |
| Walidacja | Konfiguracja przechodzi generowany schemat Zod i schemat ręczny dla `pdf_table`. |
| Bramki | `source.enabled=false`, `publish.enabled=false`, `license_id=NOASSERTION`. Poprawnie. |

Rekomendacja: utrzymać `pdf_table` i `enabled=false` do czasu dodania golden
sample i testu rekonstrukcji wierszy. Wpis `needs_ocr` w inwentarzu należy
zmienić na `pdf_text_layer`, bo OCR nie jest potrzebny.

## 5. Poprawki wykonane w tej iteracji

1. **Imielin**: `parse.manual.document_url` wskazuje teraz ODT
   `.../defibrylatory.aktualizacja.2023.odt`, `format=other`. Dodano mapowanie
   `lat`/`lon`, `coord_precision_m=15`, `require_location=point` i wpisy
   `lat`/`lon` w `validate.required`. Wyłączono geokodowanie, bo źródło ma
   współrzędne. Zaktualizowano `notes` i `connector.notes`.
2. **Czarne**: konfiguracja źródłowa jest wariantem `pdf_table` i przechodzi
   walidację. Nie wymaga dalszych zmian poza golden sample.
3. **Powiat szamotulski**: domena i `document_url` wskazują na
   `powiat-szamotuly.pl` oraz DOCX. Poprzedni host nie rozwiązuje się.
4. Pozostałe 17 pozycji ma poprawny `document_url` i `format` zgodny z live
   check. Nie zmieniano ich, aby nie nadpisywać równoległych prac w tym samym
   katalogu.

## 6. Zalecenia

1. **Dodać `odt` do enum `format`** w `src/server/ingest/config/schema.ts` i w
   schemacie ręcznym. ODT jest realnym formatem źródłowym, a `other` traci
   informację potrzebną operatorowi.
2. **Utrzymać jeden kontrakt walidacyjny.** W chwili przeglądu `manual` i
   `pdf_table` nie istniały w ręcznym schemacie; dziś walidację wykonuje
   generowany `backend/ingest/datasources-config.schema.json`, który obejmuje
   oba warianty.
3. **Nie pobierać danych z e-mapy.** Dopiewo, Imielin, Koźmin i inne źródła
   linkują e-mapę jako plan miasta. To nie jest warstwa AED ani API.
4. **Golden sample dla Czarnego.** Rekonstrukcja `word_positions` musi zostać
   sprawdzona na 20 wierszach, w tym na komórkach wielowierszowych.
5. **Rozdzielić `document_url` od `fetch.url`.** Obecna konwencja jest spójna:
   `fetch.url`, `homepage_url` i `map.source_url` to strona człowieka,
   `parse.manual.document_url` to artefakt. Warto opisać tę regułę w
   `docs/ingest-source-config.md`.
6. **Rate limiting.** Kcynia, Koszęcin i Szemud zwracają 429 przy serii żądań.
   W `fetch.rate_limit` pozostawić niskie wartości, a w runbooku przewidzieć
   ponowienie po co najmniej 20-30 sekundach.
