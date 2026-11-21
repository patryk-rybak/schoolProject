# Live smoke: konfiguracje HTML 26-37

**Data:** 2026-11-21
**Zakres:** 12 źródeł z inwentarza 69 pozycji, numery 26-37 (`lomza` ... `przemet`)
**Harness:** `bun scripts/smoke-source-configs.ts --source ... --no-write --ignore-robots`

## Wynik

| # | `source_id` | Parser | Live 2026-11-21 | Status | Uwagi |
| ---: | --- | --- | ---: | --- | --- |
| 26 | `lomza` | `html_table` | 0 | failed (blocked) | Strona główna bez wykazu AED; artykuł `index.php?wiad=14106` podaje 5 lokalizacji w jednym akapicie. Selektor celowo nie pasuje do kalendarza. |
| 27 | `gdansk` | `html_table` | 0 | failed (blocked) | 26 lokalizacji w jednym akapicie wewnątrz komórki tabeli, numerowanych inline. Brak powtarzalnych wierszy; selektor `table.aed-wykaz` celowo nie pasuje do tabeli układu strony. |
| 28 | `kosakowo` | `html_list` | 10 | ok | 10 leaf-divów z lokalizacjami; brak adresów i współrzędnych. |
| 29 | `nowa-wies-leborska` | `manual` | manual | manual | Wykaz to obraz PNG; 10 lokalizacji, bez współrzędnych. |
| 30 | `pruszcz-gdanski` | `html_list` | 15 | ok | 15 pozycji `<ol>`; adresy wyciągane z tekstu. |
| 31 | `szemud` | `manual` | manual | manual | Mapa JPG; 13 lokalizacji, bez listy tekstowej. |
| 32 | `slupsk` | `html_table` | 25 | ok | Tabela 5 kolumn i 25 wierszy danych. |
| 33 | `powiat-starogardzki` | `html_list` | 28 | ok | 28 pozycji z adresem i kodem `NN-NNN`. |
| 34 | `zukowo` | `manual` | manual | manual | 27 lokalizacji w jednym akapicie `<p>` rozdzielonym `<br>`. |
| 35 | `lwowek` | `html_list` | 10 | ok | Live 10 pozycji `<ol>`; inwentarz deklarował 14, ale 4 wcześniejsze punkty są tylko wzmianką w prozie. |
| 36 | `pila` | `html_list` | 15 | ok | Dwie listy `<ul>`, razem 15 lokalizacji. |
| 37 | `przemet` | `html_list` | 21 | ok | 21 pozycji `<ol>`, ok. 20 lokalizacji. |

## Wnioski techniczne

1. **Listy wymagają prostego selektora + filtra.** Smoke parser obsługuje selektory typu `li`, `div`, `table`, a nie łańcuchy typu `div.col ul li`. Dlatego konfiguracje list używają `select: "li"` (lub `div` dla Kosakowa) i `record_filter` odcinającego menu oraz treść opisową.
2. **Adresy bez współrzędnych.** Wszystkie źródła w tym zakresie mają `has_coords=no`; geometrię trzeba uzyskać przez GUGiK UUG albo pozostawić rekord address-only do czasu zgody wydawcy.
3. **Dwa źródła są realnie zablokowane.** Łomża i Gdańsk publikują lokalizacje w prozie/akapicie, nie w tabeli ani liście. Bez parsera dzielącego tekst po `<br>` lub numeracji inline nie da się wiarygodnie zwrócić 5/26 rekordów. Konfiguracje zostają `enabled: false`, a smoke pokazuje 0 rekordów.
4. **Rozbieżność Lwówka.** Artykuł mówi o 10 nowych AED; 4 wcześniejsze punkty są wspomniane w prozie. Baseline ustawiono na 10, nie na 14 z inwentarza.
5. **Poprawka harnessu.** W `src/server/ingest/smoke/parsers.ts` `parseHtmlRows` używał `cellPattern.matchAll(rowInner)` zamiast `rowInner.matchAll(cellPattern)`, co wywracało każdy `html_table`. Naprawione jednym wywołaniem; po poprawce Słupsk zwraca 25/25 wierszy.
