# Backend · Integracja z dane.gov.pl

**Status:** działa (wersja deweloperska) · **Kod:** `backend/gov-api/`

Ten moduł publikuje dane AED w formacie, który portal dane.gov.pl pobiera
samodzielnie harwesterem. Nie ma tu żadnego „push API” — portal raz na dobę
wykonuje żądania HTTP do naszych endpointów.

## Endpointy

| Endpoint | Metody | Zawartość | Content-Type |
| --- | --- | --- | --- |
| `/harvester/feed.xml` | `GET`, `HEAD` | feed XML `urn:otwarte-dane:harvester:1.13` | `application/xml; charset=utf-8` |
| `/harvester/feed.md5` | `GET`, `HEAD` | MD5 dokładnie tych samych bajtów XML | `text/plain; charset=utf-8` |
| `/data/aed.csv` | `GET`, `HEAD` | rejestr AED, po jednym urządzeniu w wierszu | `text/csv; charset=utf-8` |
| `/data/aed.geojson` | `GET`, `HEAD` | rejestr AED jako `FeatureCollection` | `application/geo+json; charset=utf-8` |

## Jak portal to pobiera

Kolejność jest wymuszona przez kod harwestera (backend 2.63.0):

1. `HEAD /harvester/feed.xml` — musi zwrócić 200 i `Content-Type` zawierający
   `text/xml` lub `application/xml`.
2. `GET /harvester/feed.md5` — adres powstaje przez zamianę `.xml` na `.md5`
   (`/harvester/feed.md5`, **nie** `feed.xml.md5`).
3. `GET /harvester/feed.xml` — portal liczy MD5 pobranych bajtów i porównuje
   z punktem 2.
4. Walidacja XSD `urn:otwarte-dane:harvester:1.13`.
5. Import po `extIdent`: aktualizacja lub utworzenie, usunięcie rekordów
   nieobecnych w feedzie.
6. Zasoby z `availability=local` portal kopiuje do siebie i udostępnia dalej
   nawet wtedy, gdy nasza aplikacja nie działa.

Dlatego generator jest deterministyczny: `lastUpdateDate` bierze się
z `MAX(updated_at)` w bazie (nie z `Date.now()`), a artefakt jest cache'owany
per wersja danych. `feed.xml` i `feed.md5` zawsze zwracają ten sam zestaw
bajtów.

## Co publikujemy

Jeden zbiór danych i dwa zasoby — dokładnie tak, jak robią to miasta w
istniejących zbiorach AED na portalu:

| Element | `extIdent` | Uwagi |
| --- | --- | --- |
| zbiór | `aed-pl-open` | tytuł, opis, kategorie `HEAL`/`REGI`, tagi, CC0 1.0 |
| zasób CSV | `aed-pl-open-csv` | `availability=local` |
| zasób GeoJSON | `aed-pl-open-geojson` | `availability=local` |

Kolumny zasobów: `id, name, lat, lon, city, access, status`.
W GeoJSON `lat`/`lon` stają się geometrią `[lon, lat]` (kolejność RFC 7946).

`extIdent` jest kluczem idempotencji — **nigdy go nie zmieniaj**.

## Dlaczego to jest zgodne z dane.gov.pl

- format feedu to oficjalny XSD wersji 1.13 (skopiowany do
  `backend/gov-api/xsd/`),
- zasoby są w formatach odczytywalnych maszynowo (CSV, GeoJSON),
- linki do zasobów są wyłącznie `https://` (wymóg XSD),
- `updateFrequency=daily` odpowiada `frequency_in_days=1` w konfiguracji
  DataSource,
- `availability=local` sprawia, że portal przechowuje kopię danych,
- brak autoryzacji i publiczny dostęp są zgodne z tym, jak działa harwester.

## Uruchomienie lokalne

```bash
cd AED
bun run db:migrate
bun run db:seed

# terminal 1 — aplikacja
bun run dev

# terminal 2 — lokalny HTTPS (self-signed), bo zasoby muszą być https
bun run dev:tls
```

Domyślnie feed wskazuje na `https://localhost:3443`. Do testu z portalem
w Dockerze użyj adresu bramy sieci Docker:

```bash
PUBLIC_BASE_URL=https://172.18.18.1:3443 bun run dev
```

`PUBLIC_BASE_URL` jest czytany przy budowie artefaktu — po zmianie zrestartuj
serwer dev. Wartość musi zaczynać się od `https://`, inaczej aplikacja zgłosi
błąd (XSD i tak odrzuciłby taki feed).

Jeśli na hoście działa `ufw`, zezwól kontenerom na port proxy:

```bash
sudo ufw allow from 172.18.18.0/24 to any port 3443 proto tcp
```

## Test z lokalnym portalem

1. Uruchom portal według `dane.gov.pl/RUNNING.md`.
2. W panelu `https://admin.mcod.local` dodaj Data source:
   - `source_type = xml`
   - `xml_url = https://172.18.18.1:3443/harvester/feed.xml`
   - organizacja, e-mail, `frequency_in_days = 1`
3. Wymuś import:

```bash
cd dane.gov.pl/backend
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.tasks import import_data_task
print(import_data_task(<data_source_id>, force=True))
"
```

4. Sprawdź `DataSourceImport` w panelu, zbiór na
   `https://api.mcod.local/1.4/datasets` oraz skopiowane pliki w
   `/media/resources/…`.

## Testy

```bash
cd AED
bun test                    # kontrakt feedu, CSV, GeoJSON, MD5
bun run typecheck
bun run check
```

Test XSD wymaga `xmllint` (pakiet `libxml2-utils`); bez niego test wypisuje
ostrzeżenie i jest pomijany. W CI `xmllint` jest instalowany, więc walidacja
zawsze się wykonuje.

Ręczny test kontraktu:

```bash
curl -sI http://localhost:3000/harvester/feed.xml | grep -i content-type
curl -s http://localhost:3000/harvester/feed.xml | md5sum
curl -s http://localhost:3000/harvester/feed.md5
xmllint --noout --schema backend/gov-api/xsd/xml_import_otwarte_dane_1_13.xsd \
  <(curl -s http://localhost:3000/harvester/feed.xml)
```

## Licencja

Obecnie deklarujemy `CC0 1.0` — taką licencję mają zbadane miejskie zbiory AED.

**TODO:** przed publikacją prawdziwych danych sprawdź licencję każdego źródła.
Jeśli którekolwiek wymaga atrybucji (np. CC BY 4.0), zmień `LICENCE`
w `feed.ts` i dopisz atrybucję do opisu zbioru.

## Ograniczenia

- dane w bazie są tymczasowe (dev), bez TERYT i bez pól producenta/modelu,
- brak DCAT-AP i brak osobnych zbiorów per region,
- certyfikat `dev:tls` jest self-signed i służy wyłącznie do testów lokalnych.
