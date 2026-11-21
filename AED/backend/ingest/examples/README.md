# Przykładowe konfiguracje źródeł

Każdy plik to jedna konfiguracja źródła zgodna z
[`../source-config.schema.json`](../source-config.schema.json). Opis kontraktu,
DSL i dryfu znajduje się w
[`../../../docs/ingest-source-config.md`](../../../docs/ingest-source-config.md).

| Plik | Źródło | Rodzina | Uwagi |
| --- | --- | --- | --- |
| `openaedmap-pl.yaml` | OpenAEDMap PL | `file_static` / `geojson` | 18 298 punktów, ODbL |
| `przemysl-sod.yaml` | Przemyśl `/structured` | `http_json` / `json` | paginacja, CC BY 4.0 |
| `krosno-dane-gov-pl.yaml` | Krosno CSV | `file_static` / `csv` | BOM, spacje w nagłówkach, CC0 |
| `marki-dane-gov-pl.yaml` | Marki CSV | `file_static` / `csv` | podwójne cytowanie, zamienione osie |
| `warszawa-api.yaml` | Warszawa API | `http_json` / `json` | POST, token z env, `enabled=false` |

## Walidacja

```bash
cd AED/backend/ingest
python3 - <<'PY'
import json, glob, yaml, jsonschema
schema = json.load(open("source-config.schema.json"))
jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
for f in sorted(glob.glob("examples/*.yaml")):
    v.validate(yaml.safe_load(open(f)))
    print("OK", f)
PY
```

## Zasady

- Nie dodawaj tokenów ani sekretów. Wartości pochodzą z `fetch.auth.env`.
- Nie zmieniaj `records.path` bez testu na golden sample.
- Dla nowego źródła najpierw sprawdź format i pułapki w
  `docs/research/raw/`, potem dopiero pisz konfigurację.
- `enabled: false` oznacza szablon, który nie może wejść do produkcji.
