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

---

# Test end-to-end: nasza aplikacja → lokalny dane.gov.pl

Ta sekcja jest pełną instrukcją powtórzenia testu od zera. Po restarcie
komputera wystarczy przejść kroki 1–6.

## 0. Wymagania

- kod z tym modułem (`main` po scaleniu zmian; wcześniej gałąź
  `feat/dane-gov-harvester-feed`),
- zainstalowane zależności i dane w bazie,
- uruchomiony lokalny portal według `dane.gov.pl/RUNNING.md`,
- reguła `ufw` zezwalająca kontenerom na port 3443,
- worker Celery (`mcod-local-celery`) — potrzebny do walidacji XML w panelu
  admina i do zadań asynchronicznych harwestera.

```bash
cd ~/Documents/schoolProject/AED
bun install
bun run db:migrate
bun run db:seed              # kończy się "Total rows: 5"

sudo ufw allow from 172.18.18.0/24 to any port 3443 proto tcp
```

## 1. Uruchom portal

```bash
cd ~/Documents/schoolProject/dane.gov.pl/backend

sudo docker compose -f docker-compose.local.yml up -d \
  mcod-db mcod-redis mcod-rabbitmq mcod-elasticsearch mcod-rdfdb mcod-smtp mcod-nginx \
  mcod-local-admin mcod-local-api mcod-local-cms mcod-local-celery
```

Odczekaj ~30 s i sprawdź:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://admin.mcod.local/
# 302 = panel działa
```

## 2. Uruchom naszą aplikację i proxy HTTPS

**Terminal 1** — aplikacja z adresem, który widzi portal:

```bash
cd ~/Documents/schoolProject/AED
PUBLIC_BASE_URL=https://172.18.18.1:3443 bun run dev
```

**Terminal 2** — proxy TLS (self-signed):

```bash
cd ~/Documents/schoolProject/AED
bun run dev:tls
```

`PUBLIC_BASE_URL` jest czytany przy budowie feedu — po zmianie zrestartuj
aplikację. Wartość musi zaczynać się od `https://`.

Sprawdź feed z hosta:

```bash
curl -sk https://172.18.18.1:3443/harvester/feed.xml | grep '<url>'
# https://172.18.18.1:3443/data/aed.csv
# https://172.18.18.1:3443/data/aed.geojson

curl -sk https://172.18.18.1:3443/harvester/feed.xml | md5sum
curl -sk https://172.18.18.1:3443/harvester/feed.md5
# oba MD5 muszą być identyczne

xmllint --noout --schema \
  ~/Documents/schoolProject/AED/backend/gov-api/xsd/xml_import_otwarte_dane_1_13.xsd \
  <(curl -sk https://172.18.18.1:3443/harvester/feed.xml)
# "... validates"
```

## 3. Sprawdź połączenie z wnętrza portalu

To jest dokładnie to żądanie, które wykona harwester:

```bash
cd ~/Documents/schoolProject/dane.gov.pl/backend

sudo docker compose -f docker-compose.local.yml exec mcod-local-api \
  python -c "import requests; r=requests.get('https://172.18.18.1:3443/harvester/feed.xml', verify=False); print(r.status_code, r.headers.get('content-type'))"
```

Oczekiwane: `200 application/xml; charset=utf-8`.

Jeśli tu jest błąd, dalsze kroki nie zadziałają — patrz Rozwiązywanie problemów.

## 4. Zarejestruj DataSource

### Wariant A — przez shell (zalecany, działa z adresem IP)

Formularz admina ma walidację URL po stronie przeglądarki, która odrzuca adresy
IP (szczegóły w wariancie B), więc najszybsza i powtarzalna droga to utworzenie
źródła bezpośrednio w bazie:

```bash
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSource
from mcod.organizations.models import Organization
from mcod.users.models import User

org = Organization.objects.first()
admin = User.objects.get(email='admin@mcod.local')

ds, created = DataSource.objects.get_or_create(
    xml_url='https://172.18.18.1:3443/harvester/feed.xml',
    defaults=dict(
        name='AED Open Data (local test)',
        description='Lokalny test feedu AED',
        source_type='xml',
        organization=org,
        frequency_in_days=1,
        status='active',
        emails='test@example.com',
        institution_type='other',
        created_by=admin,
    ),
)
print('created:', created, 'id:', ds.pk)
"
```

### Wariant B — przez panel admina (np. do zrzutów ekranu)

Przycisk **ZAPISZ** jest zablokowany, dopóki nie przejdzie walidacja XML
(przycisk **„Check correctness of file”**). Ten przycisk z kolei odblokowuje
się tylko dla adresów przechodzących regex portalu:

```
^(http|https|ftp):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,13}(:[0-9]{1,5})?(\/.*)?$
```

Adres IP (`172.18.18.1`) i `localhost` **nie przechodzą** — potrzebna jest
nazwa z literowym TLD. Najprościej użyć `sslip.io`, które rozwiązuje
`172.18.18.1.sslip.io` na `172.18.18.1` (działa też w kontenerach):

```bash
# zrestartuj aplikację z nowym adresem
PUBLIC_BASE_URL=https://172.18.18.1.sslip.io:3443 bun run dev
```

Następnie w panelu (`https://admin.mcod.local` → Data sources → Add):

- source type: `XML`
- xml url: `https://172.18.18.1.sslip.io:3443/harvester/feed.xml`
- institution: dowolna (wymagane)
- frequency: `every day`, status: `aktywny`, e-mail: dowolny

Po wpisaniu adresu naciśnij `End`, potem spację i backspace — regex nasłuchuje
zdarzenia `keyup`, a samo wklejenie może go nie wywołać. Przycisk
„Check correctness of file” stanie się aktywny. Kliknij, poczekaj na
**„XML Validation successful!”**, a `ZAPISZ` się odblokuje.

## 5. Wymuś import

Niezależnie od wariantu źródło znajdziemy po URL, bez wpisywania `<id>`:

```bash
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSource
from mcod.harvester.tasks import import_data_task

url = 'https://172.18.18.1:3443/harvester/feed.xml'
ds = DataSource.objects.get(xml_url=url)
print('datasource id:', ds.pk)
print(import_data_task(ds.pk, force=True))
"
```

`DataSource.DoesNotExist` oznacza, że krok 4 się nie udał.
`{}` na końcu to normalny wynik zadania.

## 6. Sprawdź wynik

```bash
# status importu i liczniki (najczytelniejszy dowód)
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py shell -c "
from mcod.harvester.models import DataSourceImport
for i in DataSourceImport.objects.order_by('-id')[:3]:
    print(i.datasource.name, '|', i.status, '| ds:', i.datasets_count, '| res:', i.resources_count, '|', i.error_desc[:200])
"

# zbiór widoczny w API
curl -sk "https://api.mcod.local/1.4/datasets?q=defibrylator" | head -c 400
```

Oczekiwane:

```
AED Open Data (local test) | ok | ds: 1 | res: 2 |
```

oraz zbiór `Ogólnopolski rejestr defibrylatorów AED` w API.

Sprawdź, że portal skopiował pliki (`availability=local`):

```bash
curl -sk "https://api.mcod.local/1.4/datasets/<ID_ZBIORU>/resources" | head -c 800
```

`file_url` musi wskazywać `https://api.mcod.local/media/resources/...`.
To jest dowód, że portal pobrał i przechowuje dane u siebie.

## 7. Powtórzenie później

Po restarcie nie twórz źródła ponownie:

1. Uruchom portal (krok 1) i aplikację + proxy (krok 2).
2. Sprawdź połączenie (krok 3).
3. Wymuś import (krok 5) — `get_or_create` w kroku 4 i tak nic nie zepsuje.
4. Sprawdź wynik (krok 6).

Docelowo portal sam pobiera feed codziennie o 03:00, jeśli DataSource jest
`active` i minął `frequency_in_days`.

---

# Rozwiązywanie problemów

| Objaw | Przyczyna / rozwiązanie |
| --- | --- |
| `admin.mcod.local` = **502** | kontener admina jeszcze wstaje (~30 s) albo padł. `sudo docker compose ... ps --all`, `sudo docker logs mcod-admin --tail 80` |
| Przycisk „Check correctness…” nieaktywny | adres IP/`localhost` nie przechodzi regexu z wariantu B. Użyj `*.sslip.io` albo wariantu A |
| `ZAPISZ` nieaktywny po walidacji | walidacja nie wystartowała — brak workera: `up -d mcod-local-celery`; sprawdź `docker logs mcod-celery --tail 50` |
| Modal walidacji wisi | jw. — zadanie czeka w kolejce `harvester` na workera |
| Krok 3: `SSLError` / connection refused | brak reguły `ufw` na 3443 albo proxy nie działa (`ss -ltn \| grep 3443`) |
| Krok 3: `404` | zły URL (musi kończyć się `/harvester/feed.xml`) lub aplikacja bez tej gałęzi |
| `PUBLIC_BASE_URL must start with https://` | literówka w zmiennej; zrestartuj aplikację |
| W feedzie zasoby wskazują `localhost:3443` | aplikacja uruchomiona bez `PUBLIC_BASE_URL`; zrestartuj i ponów import |
| `DataSource.DoesNotExist` | źródło nie zostało utworzone — powtórz krok 4 |
| `XMLMD5DoesNoMatch` | feed zmienił się między żądaniami; zrestartuj aplikację i ponów import |
| `XML Validation error` | uruchom `xmllint` z kroku 2 — komunikat wskaże błędny element |
| `no such service` / profile | dodaj `--profile manual` po `-f docker-compose.local.yml` |

---

## Testy jednostkowe i CI

```bash
cd AED
bun test                    # kontrakt feedu, CSV, GeoJSON, MD5
bun run typecheck
bun run check
```

Test XSD wymaga `xmllint` (pakiet `libxml2-utils`); bez niego test wypisuje
ostrzeżenie i jest pomijany. W CI `xmllint` jest instalowany, więc walidacja
zawsze się wykonuje.

Ręczny test kontraktu bez portalu:

```bash
curl -sI http://localhost:3000/harvester/feed.xml | grep -i content-type
curl -s http://localhost:3000/harvester/feed.xml | md5sum
curl -s http://localhost:3000/harvester/feed.md5
```

## Licencja

Obecnie deklarujemy `CC0 1.0` — taką licencję mają zbadane miejskie zbiory AED.

**TODO:** przed publikacją prawdziwych danych sprawdź licencję każdego źródła.
Jeśli którekolwiek wymaga atrybucji (np. CC BY 4.0), zmień `LICENCE`
w `feed.ts` i dopisz atrybucję do opisu zbioru.

## Ograniczenia

- dane w bazie są tymczasowe (dev), bez TERYT i bez pól producenta/modelu,
- brak DCAT-AP i brak osobnych zbiorów per region,
- certyfikat `dev:tls` jest self-signed i służy wyłącznie do testów lokalnych,
- adres `*.sslip.io` zależy od publicznego DNS i jest tylko obejściem
  walidacji formularza w panelu.
