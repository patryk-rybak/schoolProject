# Running dane.gov.pl locally

Reproducible local setup for the published dane.gov.pl sources:

| Archive | Version | Source |
|---|---|---|
| `backend_2.63.0.zip` | 2.63.0 (2026-11-17) | https://dane.gov.pl/source-code/backend_2.63.0.zip |
| `frontend_3.6.1.zip` | 3.6.1 (2026-11-17) | https://dane.gov.pl/source-code/frontend_3.6.1.zip |

Checksums:

```text
85949002eaa9f96c4dc2207c9a62caa29e5eae55d5ea5e9bd78a179ce0c3f47a  backend_2.63.0.zip
83ede5fda64b3ea5e7972b69892483d21d9481d4ea565238205eddb68cfb203d  frontend_3.6.1.zip
```

## Requirements

- Docker with Compose v2 (`docker compose version`)
- Node.js >= 20 and npm >= 8
- ~15 GB free disk (Docker images + Elasticsearch)
- 8 GB RAM recommended (Elasticsearch alone uses ~1 GB)
- Ports 80, 443, 4200, 5432, 6379, 9200, 5672 free

## 1. Extract both archives

```bash
unzip backend_2.63.0.zip -d backend
unzip frontend_3.6.1.zip -d frontend
cd backend
```

## 2. Create the local configuration

```bash
cp env.sample .env
cp mcod/settings/local.py.sample mcod/settings/local.py
```

`env.sample` already contains a valid development `FIELD_ENCRYPTION_KEYS`.
To generate a fresh one instead:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Disable the forum to avoid a dependency on a private image:

```bash
sed -i 's/^DISCOURSE_FORUM_ENABLED=.*/DISCOURSE_FORUM_ENABLED=false/' .env
```

## 3. Map the local hostnames

The site is served by the `mcod-nginx` container, so the domains must resolve
to its address. Append to `/etc/hosts`:

```text
172.18.18.100  mcod.local api.mcod.local admin.mcod.local cms.mcod.local mail.mcod.local
```

On macOS use `127.0.0.1` instead of `172.18.18.100` (Docker Desktop does not
expose the container network to the host).

## 4. Build and start the containers

The full `docker compose up` also starts Discourse, whose image lives in the
**private** `registry.dane.gov.pl` registry (401 without credentials). Start
only the services needed for the portal:

```bash
docker compose -f docker-compose.local.yml up -d \
  mcod-db mcod-redis mcod-rabbitmq mcod-elasticsearch mcod-rdfdb mcod-smtp mcod-nginx \
  mcod-local-admin mcod-local-api mcod-local-cms
```

The first build takes a while (Python 3.8 image, Elasticsearch plugins,
Fuseki, nginx).

Check that nothing crashed:

```bash
docker compose -f docker-compose.local.yml ps --all
```

## 5. Load the initial data and search indexes

Before the first run, remove the invalid `"timeout": 1` entries that the
shipped `local.py.sample` puts into the Elasticsearch index settings (see
Troubleshooting):

```bash
sed -i '/"timeout": 1,/d' mcod/settings/local.py
```

`init_mcod_db` runs migrations, copies the sample media files and loads
`basic_data.json`:

```bash
docker compose -f docker-compose.local.yml run --rm mcod-local-run python manage.py init_mcod_db
docker compose -f docker-compose.local.yml run --rm mcod-local-run python manage.py search_index --rebuild -f
```

Each of these is a one-off; the data lives in Docker volumes.

## 6. Start the frontend (on the host)

```bash
cd ../frontend
npm install
npm run start:local -- --host 0.0.0.0
```

`--host 0.0.0.0` is required: nginx reaches the dev server through
`host.docker.internal:4200`, which does not work if Angular only listens on
`127.0.0.1`. The `local` configuration uses `proxy.local.conf.json`, which
proxies `/api` and `/cms` to `https://api.mcod.local` and
`https://cms.mcod.local` with self-signed certificates accepted.

## 7. Open the portal

| Service | URL | Credentials |
|---|---|---|
| Portal | https://mcod.local | – |
| Django admin | https://admin.mcod.local | `admin@mcod.local` / `testadmin123!` |
| Second admin account | https://admin.mcod.local | `pelnomocnik@mcod.local` / `User123!` |
| Wagtail CMS | https://cms.mcod.local/admin | same as above |
| API docs | https://api.mcod.local/doc | – |
| Mail catcher | https://mail.mcod.local | – |
| Frontend dev server | http://localhost:4200 | – |

The TLS certificates are self-signed, so the browser will warn once per
domain.

## Running the tests

```bash
docker compose -f docker-compose.local.yml run --rm mcod-local-tests \
  -n1 mcod/resources/tests/test_admin/test_file_validation.py
```

Drop the file argument to run the whole suite.

## Troubleshooting

- **`unknown setting [index.timeout]` while building indexes** –
  `mcod/settings/local.py.sample` ships `"timeout": 1` inside
  `ELASTICSEARCH_DSL_INDEX_SETTINGS` and `ELASTICSEARCH_HISTORIES_IDX_SETTINGS`.
  django-elasticsearch-dsl forwards it into the index body, and Elasticsearch
  6.8 rejects it. Remove the two lines from `mcod/settings/local.py`:

  ```bash
  sed -i '/"timeout": 1,/d' mcod/settings/local.py
  ```

  The `./mcod` directory is bind-mounted into the containers, so no rebuild is
  required; just re-run `search_index --rebuild -f`.
- **401 pulling `discourse` image** – keep the Discourse containers out of the
  `up` command, as shown above.
- **`mcod.local` returns 502** – the frontend dev server is not running on port
  4200, or it is not listening on `0.0.0.0`.
- **Elasticsearch exits immediately** – increase Docker memory (`bootstrap.memory_lock`
  and 1 GB heap are configured by default).
- **Port already in use** – stop the conflicting service, or the previous
  `dane.gov.pl` stack (`docker compose -f docker-compose.local.yml down`).
- **Stale state** – `docker compose -f docker-compose.local.yml down -v` wipes
  the database and search volumes; re-run step 5 afterwards.
