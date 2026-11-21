# dane.gov.pl — local development environment

Run the dane.gov.pl portal (backend + frontend) on a laptop or workstation.

Sources are the official open-source releases published at
<https://dane.gov.pl/source-code/>:

| Archive | Version | SHA-256 |
|---|---|---|
| `backend_2.63.0.zip` | 2.63.0 (2026-11-17) | `85949002eaa9f96c4dc2207c9a62caa29e5eae55d5ea5e9bd78a179ce0c3f47a` |
| `frontend_3.6.1.zip` | 3.6.1 (2026-11-17) | `83ede5fda64b3ea5e7972b69892483d21d9481d4ea565238205eddb68cfb203d` |

Both archives are committed in this directory, so a plain `git clone` is
enough — no downloads needed.

## What you end up with

| Service | URL | Notes |
|---|---|---|
| Portal | <https://mcod.local> | through the nginx container |
| Portal (direct) | <http://localhost:4200> | Angular dev server, same app |
| Django admin | <https://admin.mcod.local> | `admin@mcod.local` / `testadmin123!` |
| Django admin (2nd account) | <https://admin.mcod.local> | `pelnomocnik@mcod.local` / `User123!` |
| Wagtail CMS | <https://cms.mcod.local/admin> | same accounts |
| API | <https://api.mcod.local/1.4/...> | Falcon, JSON:API |
| API docs (Swagger) | <https://api.mcod.local/doc> | |
| Mail catcher | <https://mail.mcod.local> | MailHog |
| Elasticsearch | <http://localhost:9200> | |

The TLS certificates are self-signed: the browser warns once per domain, and
the frontend proxy is configured to accept them (`"secure": false`).

## Prerequisites

- Linux (or macOS with Docker Desktop) and **Docker + Compose v2**
  - check: `docker compose version`
- **~15 GB free disk** (images, Elasticsearch, Postgres volumes)
- **8 GB RAM** recommended — Elasticsearch is configured with a 1 GB heap
- **Node.js >= 20** and npm >= 8 for the frontend
  - check: `node --version`
- Free ports: `80`, `443`, `4200`, `5432`, `6379`, `9200`, `5672`
- `unzip`, `curl`

> All commands below assume Docker runs through `sudo`. If your user is in the
> `docker` group, drop the `sudo`. **Do not mix the two**: containers started
> as root write root-owned files into the mounted volumes, and a later
> non-root run will fail with permission errors.

## 1. Get the sources and extract them

```bash
git clone git@github.com:patryk-rybak/schoolProject.git
cd schoolProject/dane.gov.pl

unzip -q backend_2.63.0.zip  -d backend
unzip -q frontend_3.6.1.zip -d frontend
```

Everything inside `dane.gov.pl/` except the archives and this guide is
git-ignored, so the extracted trees never show up in `git status`.

## 2. Create the local configuration

```bash
cd backend
cp env.sample .env
cp mcod/settings/local.py.sample mcod/settings/local.py
```

Remove two invalid Elasticsearch settings that the shipped sample contains
(they make index creation fail on Elasticsearch 6.8 — see
[Troubleshooting](#unknown-setting-indextimeout)):

```bash
sed -i '/"timeout": 1,/d' mcod/settings/local.py
```

Turn the forum off: its image lives in a private registry and cannot be pulled
without credentials.

```bash
sed -i 's/^DISCOURSE_FORUM_ENABLED=.*/DISCOURSE_FORUM_ENABLED=false/' .env
```

`env.sample` already contains a development `FIELD_ENCRYPTION_KEYS`. To
generate your own instead:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

and put the value in `.env` as `FIELD_ENCRYPTION_KEYS=<value>`.

## 3. Map the local hostnames

The portal is served by the `mcod-nginx` container, so these names must point
at its address on the Docker bridge:

```bash
echo '172.18.18.100  mcod.local api.mcod.local admin.mcod.local cms.mcod.local mail.mcod.local' \
  | sudo tee -a /etc/hosts
```

**macOS:** use `127.0.0.1` instead of `172.18.18.100` — Docker Desktop does not
expose the container network to the host.

## 4. Allow the container to reach the frontend (Linux + ufw only)

Skip this if `systemctl is-active ufw` does not print `active`.

nginx proxies `mcod.local` to the Angular dev server on the host
(`host.docker.internal:4200`). With ufw enabled that connection is dropped and
`https://mcod.local` hangs. Allow it once:

```bash
sudo ufw allow from 172.18.18.0/24 to any port 4200 proto tcp
```

## 5. Start the stack

Do **not** run a bare `docker compose -f docker-compose.local.yml up`: the base
compose file also starts Discourse, whose image is private (401). Start the
services actually needed:

```bash
sudo docker compose -f docker-compose.local.yml up -d --build \
  mcod-db mcod-redis mcod-rabbitmq mcod-elasticsearch mcod-rdfdb mcod-smtp mcod-nginx \
  mcod-local-admin mcod-local-api mcod-local-cms mcod-local-celery
```

The first build takes several minutes (Python 3.8 image, Elasticsearch plugins,
Fuseki, nginx) and looks frozen — let it finish.

`mcod-local-celery` is the worker that runs asynchronous tasks, including the
harvester XML validation in the admin panel and scheduled imports. Start it
whenever you test the dane.gov.pl integration (see
`AED/backend/gov-api/README.md`).

Check that nothing died:

```bash
sudo docker compose -f docker-compose.local.yml ps --all
```

## 6. Seed the database and the search indexes

Wait until Elasticsearch answers, then load the demo data:

```bash
until curl -sf http://localhost:9200 >/dev/null; do sleep 2; done

sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py init_mcod_db
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py search_index --rebuild -f
```

`init_mcod_db` runs migrations, copies the sample media files and loads
`basic_data.json` (organisations, datasets, resources, the two admin accounts).
Both commands are one-off; the data lives in Docker volumes.

If Compose complains that the service is in a profile, add `--profile manual`.

## 7. Start the frontend

In a **second terminal**:

```bash
cd schoolProject/dane.gov.pl/frontend
npm ci          # or `npm install` if the lockfile ever fails
npm run start:local -- --host 0.0.0.0
```

`--host 0.0.0.0` is required: nginx reaches the dev server at
`172.17.0.1:4200`, which is unreachable if Angular only listens on `127.0.0.1`.
This command runs in the foreground — keep the terminal open.

Wait for `Application bundle generation complete`, then open
**<https://mcod.local>** (or <http://localhost:4200>).

## Verifying everything works

```bash
# portal (through nginx)
curl -sk -o /dev/null -w 'portal : %{http_code}\n' https://mcod.local/

# portal (dev server)
curl -s  -o /dev/null -w 'dev    : %{http_code}\n' http://localhost:4200/

# API returns JSON:API data
curl -sk https://api.mcod.local/1.4/datasets | head -c 200; echo

# admin/CMS should redirect to their login pages
curl -sk -o /dev/null -w 'admin  : %{http_code}\n' https://admin.mcod.local/
curl -sk -o /dev/null -w 'cms    : %{http_code}\n' https://cms.mcod.local/admin/

# search indexes, all health = green
curl -s 'http://localhost:9200/_cat/indices?v&h=health,index,docs.count'
```

Expected: `200` for the portal and API, `302` for admin/CMS, and indexes such as
`datasets`, `resources`, `institutions` with a non-zero document count.

## Everyday commands

```bash
cd schoolProject/dane.gov.pl/backend
COMPOSE="sudo docker compose -f docker-compose.local.yml"

$COMPOSE ps                       # status of all services
$COMPOSE logs -f mcod-local-api   # follow API logs
$COMPOSE logs -f mcod-local-admin # follow Django logs
$COMPOSE stop                     # stop everything, keep data
$COMPOSE down                     # remove containers, keep volumes
$COMPOSE down -v                  # remove containers AND data (full reset)
```

After `down -v`, repeat step 6 to reseed.

Open a Django shell or run a management command:

```bash
$COMPOSE run --rm mcod-local-run python manage.py shell
```

Run tests:

```bash
$COMPOSE run --rm mcod-local-tests -n1 mcod/resources/tests/test_admin/test_file_validation.py
```

Omit the file path to run the whole suite.

## Troubleshooting

### `429 Too Many Requests` while pulling `python:3.8.20-bullseye`

Docker Hub's anonymous limit is 100 pulls / hour per IP. Log in (free account,
200 pulls / 6 h) and retry:

```bash
sudo docker login
```

No account? Use AWS's public mirror of Docker Hub instead:

```bash
sed -i 's#^FROM python:3.8.20-bullseye#FROM public.ecr.aws/docker/library/python:3.8.20-bullseye#' \
  docker/app/Dockerfile docker/tests/Dockerfile
```

### `401 Unauthorized` pulling the `discourse` image

That image is in the private `registry.dane.gov.pl`. Keep the Discourse
containers out of the `up` command (step 5) and leave
`DISCOURSE_FORUM_ENABLED=false` in `.env`.

### unknown setting [index.timeout]

`mcod/settings/local.py.sample` ships `"timeout": 1` inside
`ELASTICSEARCH_DSL_INDEX_SETTINGS` and `ELASTICSEARCH_HISTORIES_IDX_SETTINGS`.
`django-elasticsearch-dsl` forwards those keys into the index body and
Elasticsearch 6.8 rejects `index.timeout`:

```
elasticsearch.exceptions.RequestError: RequestError(400, 'illegal_argument_exception',
  'unknown setting [index.timeout]')
```

Remove the two lines and rebuild:

```bash
sed -i '/"timeout": 1,/d' mcod/settings/local.py
sudo docker compose -f docker-compose.local.yml run --rm mcod-local-run \
  python manage.py search_index --rebuild -f
```

`./mcod` is bind-mounted into the containers, so no rebuild is required for
this to take effect.

### `https://mcod.local` hangs or returns 502

- 502 / hang: the frontend is not running, or not listening on `0.0.0.0`
  (step 7). Check with `ss -ltn | grep 4200`.
- Hang with ufw active: apply the firewall rule from step 4.
- Meanwhile the app is always available at <http://localhost:4200>.

### Elasticsearch exits immediately

It needs memory. Lower the heap in `docker-compose.yml`
(`ES_JAVA_OPTS=-Xms1024m -Xmx1024m` → e.g. `512m`) or give Docker more RAM.

### `port is already allocated`

Something else owns 80/443/4200/5432/6379/9200. Stop it, or tear down a
previous run: `sudo docker compose -f docker-compose.local.yml down`.

### `curl: Could not resolve host: mcod.local` (but the browser works)

An HTTP proxy is configured in your environment and curl sends the request
through it, where the `/etc/hosts` entries do not exist. Add `--noproxy '*'`
to curl commands:

```bash
curl -sk --noproxy '*' https://api.mcod.local/1.4/datasets
```

### `sed: … mcod/settings/local.py: No such file`

You are not in `dane.gov.pl/backend`, or step 2 was skipped.

### Permission errors inside containers

You mixed `sudo docker` and plain `docker`. Pick one; with mixed use, recreate
the containers and fix ownership of the mounted directories
(`sudo chown -R "$USER" backend`).

## Known limitations

- The demo data is small (a few dozen datasets from `basic_data.json`), not a
  copy of the production portal. The production database dump is not published.
- Discourse (forum) is disabled: the image is private.
- Only the `local` setup is covered here; the published archives also contain
  `docker-compose.addons.yml` (Jupyter, Kibana, Flower) which is not needed for
  the portal.
- The backend is a long-lived Django 2.2 / Python 3.8 codebase on
  Elasticsearch 6.8 and Wagtail 2.13; the frontend is Angular 18 on Node 20+.
  Expect an older toolchain on the Python side.
