# Konfiguracje źródeł B+ (HTML/PDF)

Pięć źródeł klasy B+ z audytu JST. Opis inspekcji, kontraktu parserów i decyzji
dla PDF: [`../../../docs/ingest-html-pdf-sources.md`](../../../docs/ingest-html-pdf-sources.md).

| Plik | Źródło | Rodzina / parser | Rekordy | Uwagi |
| --- | --- | --- | ---: | --- |
| `slawa-html-table.json` | Sława | `html_table` / `html_table` | 13 | tabela 7 kolumn, `lat, lon`, część AED tylko dla OSP/WOPR/RWS |
| `manowo-html-list.json` | Manowo | `html_list` / `html_list` | 8 | lista `<li>`, współrzędne `(lat, lon)` dzielone między spany |
| `tarnow-opolski-html-list.json` | Tarnów Opolski | `html_list` / `html_list` | 10 | bloki `div.et_pb_text_inner`, 10 urządzeń w 9 lokalizacjach |
| `suszec-html-table.json` | Suszec | `html_table` / `html_table` | 5 | tabele key-value, `require_keys` odrzuca tabele kontaktowe |
| `czarne-pdf-table.json` | Czarne | `pdf_table` / `pdf_table` | 20 | PDF z warstwą tekstową; `enabled=false` do wdrożenia parsera |

## Walidacja

```bash
cd AED/backend/ingest
python3 - <<'PY'
import json, glob, jsonschema
schema = json.load(open("source-config.schema.json"))
jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
for f in sorted(glob.glob("examples/html-pdf/*.json")):
    v.validate(json.load(open(f)))
    print("OK", f)
PY
```

## Zasady

- Wszystkie źródła mają `license.id = NOASSERTION` i `publish.enabled = false`.
  Ingest lokalny nie jest zgodą na redystrybucję.
- Nie zmieniaj `columns`, `row_anchor` ani `item_text_separator` bez golden
  sample. Te trzy pola decydują o poprawności współrzędnych.
- `enabled=false` oznacza szablon. Czarne nie może wejść do produkcji przed
  wdrożeniem `pdf_table` i testem 20/20 wierszy.
- Dla HTML wymagany jest wpis w rejestrze zgód wydawcy. Nie omijamy robots.txt
  ani blokad.
