# Źródła B+ z HTML/PDF: inspekcja, parser i konfiguracje

**Status:** projekt do review, brak kodu wykonawczego
**Data:** 2026-11-21
**Zakres:** pięć źródeł klasy B+ z audytu JST — Sława, Manowo, Tarnów Opolski,
Suszec, Czarne
**Powiązane dokumenty:**
[`ingest-source-config.md`](./ingest-source-config.md),
[`aed-data-sources-common-schema.md`](./aed-data-sources-common-schema.md),
[`research/raw/voivodeships/national-registries.md`](./research/raw/voivodeships/national-registries.md)

Konfiguracje: wpisy w [`../backend/ingest/datasources-config.json`](../backend/ingest/datasources-config.json).
Schemat: [`../backend/ingest/datasources-config.schema.json`](../backend/ingest/datasources-config.schema.json).

---

## 1. Co sprawdzono

Inspekcja objęła pobrane odpowiedzi z 2026-11-21, nie tylko opisy w raporcie
wojewódzkim. Dla HTML sprawdzono strukturę DOM i rzeczywisty tekst węzłów. Dla
PDF sprawdzono warstwę tekstową, pozycje słów i metadane dokumentu.

| Źródło | Format wejścia | Rekordy | Współrzędne | Data / licencja | Główne pułapki |
| --- | --- | ---: | --- | --- | --- |
| **Sława** | 1 tabela HTML, 7 kolumn | 13 | `lat, lon` | aktualizacja 2026-09-02; brak licencji | długie nagłówki z NBSP, niedomknięty nawias w nagłówku dostępności, część AED tylko dla OSP/WOPR/RWS |
| **Manowo** | lista `<li>`, jeden punkt na element | 8 | `(lat, lon)` | brak daty; „wszystkie prawa zastrzeżone” | współrzędne dzielone między węzły tekstowe, dwa różne separatory przed nazwą obiektu |
| **Tarnów Opolski** | bloki `div.et_pb_text_inner` | 10 urządzeń / 9 lokalizacji | `Pozycja GPS: (lat, lon)` | chronologia od 2024-02-01; brak licencji | brak tabeli i listy, tekst złożony z akapitów, numeracja powtarza się w każdej miejscowości |
| **Suszec** | 5 tabel key-value | 5 | `lat, lon` | artykuł 2022-02-10; brak licencji | tabele bez nagłówków, klucze w pierwszej kolumnie, opcjonalny wiersz godzin |
| **Czarne** | PDF 1.7, 1 strona, tabela | 20 | `lat, lon` | PDF 2026-02-19; brak licencji | komórki wielowierszowe, wiersze nie są wyrównane do jednej linii bazowej, współrzędne rozbite na dwie linie |

Wszystkie pięć źródeł ma `license.id = NOASSERTION` i `publish.enabled = false`.
Ingest lokalny nie oznacza prawa do redystrybucji.

---

## 2. Kontrakt parserów

### 2.1. `html_table`

Dla tabel z nagłówkiem (Sława) i tabel key-value (Suszec).

| Pole | Znaczenie |
| --- | --- |
| `select` | selektor CSS tabel, domyślnie `table` |
| `table_index` | wybór jednej tabeli po filtrach; brak = wszystkie pasujące tabele jako rekordy |
| `require_headers` | zostaw tylko tabele, których nagłówek zawiera wszystkie etykiety |
| `require_keys` | dla `key_value`: zostaw tylko tabele zawierające wszystkie klucze |
| `orientation` | `rows` albo `key_value` |
| `columns` | nadpisuje nazwy kolumn odczytane z `header_row` |
| `header_row`, `data_start_row` | indeksy wierszy dla `rows` |
| `key_column`, `value_column` | indeksy kolumn dla `key_value` |
| `value_join` | `space` albo `newline` przy wielu węzłach tekstowych w komórce |
| `normalize_headers` | trim, zwijanie białych znaków i NBSP w nagłówkach |
| `trim`, `collapse_whitespace`, `empty_as_null`, `skip_empty_rows` | normalizacja tekstu |
| `min_records`, `max_records` | twarde widełki wolumenu; poza nimi drift |

Sława używa `columns` zamiast długich nagłówków źródłowych, bo nagłówek
dostępności ma niedomknięty nawias i NBSP. Suszec używa `key_value` i
`require_keys`, dzięki czemu tabele kontaktowe i godziny urzędu nie stają się
rekordami AED.

### 2.2. `html_list`

Dla list i bloków tekstowych (Manowo, Tarnów Opolski).

| Pole | Znaczenie |
| --- | --- |
| `select` | selektor CSS kandydatów na rekord, np. `li` lub `div.et_pb_text_inner` |
| `record_filter.regex` | zostaw tylko węzły, których tekst pasuje do wyrażenia |
| `fields` | mapa nazwa pola → reguła ekstrakcji |
| `item_text_separator` | tekst wstawiany między węzły tekstowe; `""` skleja liczby rozbite na spanach |
| `trim`, `collapse_whitespace`, `empty_as_null` | normalizacja |
| `min_records`, `max_records` | widełki wolumenu |

Reguła pola (`htmlFieldExtract`):

| Pole | Znaczenie |
| --- | --- |
| `source` | `text`, `html` albo `attr`; domyślnie `text` |
| `attr` | nazwa atrybutu, gdy `source=attr` |
| `regex`, `group`, `flags` | ekstrakcja z wybranego źródła |
| `null_values` | wartości traktowane jak `null`, np. `brak danych` |
| `default` | wartość przy braku dopasowania |

Każdy rekord zawsze dostaje pole `text` z pełnym tekstem węzła. Dzięki temu
`map.note` może zachować oryginał, a `fields` służą tylko do pól strukturalnych.

Manowo wymaga `item_text_separator: ""`, bo współrzędna `16.252821` jest w
źródle rozbita na `16.2528` i `21)` w dwóch spanach. Wstawienie spacji dałoby
`16.2528 21` i zepsuty `coord`.

Tarnów Opolski wymaga separatora `" "`, ale wyrażenia muszą tolerować brak
spacji między akapitami (`Adres: ...7.Pozycja GPS`). Dlatego w regexach jest
`\s*` zamiast `\s+`.

### 2.3. `pdf_table`

Dla urodzonych cyfrowo PDF-ów z warstwą tekstową (Czarne).

| Pole | Znaczenie |
| --- | --- |
| `pages` | zakres stron, np. `[1]` |
| `require_text_layer` | odrzuć PDF bez tekstu; nie uruchamiaj OCR po cichu |
| `min_text_chars` | minimalna liczba znaków warstwy tekstowej |
| `expected_page_count` | oczekiwana liczba stron; zmiana to drift |
| `strategy` | na razie tylko `word_positions` |
| `columns` | lista `{key, x_min, x_max}`; przypisanie słowa do kolumny po `x` |
| `row_anchor` | kolumna i regex rozpoczynający wiersz, np. `lp` i `^\d+\.$` |
| `row_tolerance` | tolerancja grupowania `y` |
| `multi_line` | `join_space`, `join_newline` albo `first` |
| `min_records`, `max_records` | widełki wolumenu |

#### Decyzja dla PDF

**Wariant wybrany:** parser `pdf_table` oparty o warstwę tekstową i pozycje
słów, bez OCR.

Powody:

1. PDF Czarnego jest urodzony cyfrowo (Word 2016), ma poprawną warstwę tekstową
   i 20 wierszy. OCR byłby niepotrzebnym źródłem błędów.
2. Tabela nie ma linii siatki ani jednej linii bazowej na wiersz. Kolumny są
   wielowierszowe, a wiersz 1 ma komórki powyżej i poniżej kotwicy `lp`.
   Dlatego rekonstrukcja musi być dwuetapowa:
   - najpierw znaleźć wszystkie kotwice `lp` i ich `y`,
   - wyznaczyć granice wierszy jako środki między sąsiednimi kotwicami,
   - przypisać każde słowo do kolumny po `x` i do wiersza po `y`.
3. Pojedyncza kolumna `x` nie wystarcza, bo PDF dzieli wyrazy na osobne runy
   (np. `Dostęp` + `ność`). Parser powinien sklejać runy w kolejności `x` z
   regułą odstępu, a nie zawsze wstawiać spację.
4. Biblioteka: `pdfjs-dist` (legacy build) albo cienki wrapper `unpdf`.
   `pdfjs-dist` daje `getTextContent()` z `str`, `transform` i `width`, czyli
   dokładnie to, czego potrzebuje `word_positions`.
5. Brak warstwy tekstowej, zmiana liczby stron albo mniej niż `min_records`
   kończy się `fail`/`disable`, nie cichym pustym zbiorem.
6. Fallback operacyjny: transkrypcja ręczna do CSV z `source.kind='manual'`,
   ale tylko jako osobny, jawnie oznaczony snapshot. Nie mieszamy jej z
   automatycznym parserem.

**Czarne pozostaje `enabled: false`** do czasu wdrożenia parsera i golden
sample. To jest świadome: config jest kontraktem, nie deklaracją, że parser
już działa.

---

## 3. Konfiguracje

| `source.id` | Źródło | Rodzina / parser | Rekordy | `enabled` |
| --- | --- | --- | ---: | --- |
| `slawa` | Sława | `html_table` / `html_table` | 13 | tak |
| `manowo` | Manowo | `html_list` / `html_list` | 8 | tak |
| `tarnow-opolski` | Tarnów Opolski | `html_list` / `html_list` | 10 | tak |
| `suszec` | Suszec | `html_table` / `html_table` | 5 | tak |
| `czarne` | Czarne | `pdf_table` / `pdf_table` | 20 | nie |

Wszystkie konfiguracje przechodzą walidację JSON Schema 2020-12. Sprawdzenie:

```bash
cd AED/backend/ingest
python3 - <<'PY'
import json, jsonschema
schema = json.load(open("datasources-config.schema.json"))
jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
v.validate(json.load(open("datasources-config.json")))
print("OK datasources-config.json")
PY
```

Dodatkowo reguły pól sprawdzono na rzeczywistych odpowiedziach:

- Sława: 13/13 wierszy, współrzędne w kolejności `lat, lon`.
- Manowo: 8/8 elementów, `coords` sklejone poprawnie mimo podziału na spany.
- Tarnów Opolski: 9 bloków znalezionych przez filtr; docelowo 10 rekordów, bo
  jeden blok jest zagnieżdżony i wymaga poprawnego parsera DOM, nie regexu.
- Suszec: 5/5 tabel key-value po filtrze `require_keys`.
- Czarne: 20/20 wierszy po rekonstrukcji dwuetapowej; `coords` w kolejności
  `lat, lon`.

---

## 4. Ograniczenia i dalsze kroki

1. **Licencje.** Wszystkie pięć źródeł ma `NOASSERTION`. Przed publikacją
   potrzebna jest zgoda wydawcy. `publish.enabled=false` jest celowe.
2. **Tarnów Opolski.** Jeden blok jest zagnieżdżony w innym `div`. Parser DOM
   musi wybierać właściwe `div.et_pb_text_inner`, a nie tylko pierwszy pasujący
   tekst. Regex pól jest gotowy, ale selektor wymaga testu na pełnym DOM.
3. **Czarne.** Config jest wyłączony do wdrożenia `pdf_table`. Parser musi
   obsłużyć sklejanie runów w komórce (`Dostęp` + `ność`) i dwuetapowe granice
   wierszy. Bez tego wychodzi 20 wierszy, ale z przesuniętymi kolumnami.
4. **Manowo.** `item_text_separator` musi być pusty dla inline spanów.
   `collapse_whitespace` nie naprawi spacji w środku liczby.
5. **Suszec.** Źródło ma `ul. Pszczyńska 24`, a raport wojewódzki mówi
   `Pszczyńska 2`. Config parsuje źródło; rozbieżność wymaga potwierdzenia u
   wydawcy, nie korekty w locie.
6. **Golden sample.** Dla każdego źródła trzeba zapisać 5–20 rekordów i
   porównywać pełny zestaw pól, nie tylko liczbę wierszy. To jedyny sposób
   wychwycenia przesunięcia kolumn w PDF i zmiany kolejności osi w HTML.
