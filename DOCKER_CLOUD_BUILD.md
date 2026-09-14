# Building this project on Docker Build Cloud ("worehouse" builder)

Your Docker Cloud account (`elitedevltd`) already has a cloud builder called
**worehouse**, shown as *Enabled* on the Cloud Builders dashboard. This
document is the exact path to build and push this project's two images
(backend + frontend) through that builder.

## One-time setup (on your own machine, with Docker Desktop)

The cloud builder still needs to be driven from a machine that has Docker
Desktop (with the Build Cloud CLI plugin) and is logged in to the
`elitedevltd` Docker Hub account:

```bash
docker login
```

If the local pointer to the cloud builder doesn't exist yet, create it once
(this is exactly what the Docker dashboard's "VIEW CLI SETUP COMMANDS" panel
gives you):

```bash
docker buildx create --driver cloud elitedevltd/worehouse
```

## Build & push

From the project root (`warehouse-system/`), run the included script:

```bash
./docker-cloud-build.sh
```

This builds both images for `linux/amd64` and `linux/arm64` using the
`worehouse` cloud builder and pushes them to Docker Hub as:

- `elitedevltd/warehouse-backend:latest`
- `elitedevltd/warehouse-frontend:latest`

To just test that the build succeeds without pushing:

```bash
PUSH=0 ./docker-cloud-build.sh
```

To tag a release instead of `latest`:

```bash
TAG=v1.0.0 ./docker-cloud-build.sh
```

## Running the pushed images

`docker-compose.yml` in this repo builds the images locally from source. If
you'd rather pull the pre-built images from Docker Hub (e.g. on a server),
point the compose file at them instead of `build:`:

```yaml
services:
  backend:
    image: elitedevltd/warehouse-backend:latest
    # (remove the "build: ./backend" line)
  frontend:
    image: elitedevltd/warehouse-frontend:latest
    # (remove the "build: ./frontend" line)
```

## Option B: automatic builds via GitHub Actions CI

Instead of (or in addition to) running the script yourself, Docker's
"Integrations" page for the `worehouse` builder gave the exact recipe to
build automatically on every push, using GitHub's runners as a trigger while
the actual build executes on Docker's cloud infrastructure. It's already
added to this project at `.github/workflows/build.yml` (builds & pushes both
`elitedevltd/warehouse-backend` and `elitedevltd/warehouse-frontend`).

You'll need to do these steps yourself — they involve creating and pasting a
Docker Hub access token, which isn't something Claude does on your behalf:

1. **Push this project to a GitHub repository** (create one if it doesn't
   exist yet — the workflow only runs once the repo is on GitHub with this
   `.github/workflows/build.yml` file committed to it).
2. **Create a Docker Hub access token** with *Read & Write* access:
   https://app.docker.com/accounts/elitedevltd/settings/personal-access-tokens
   (Read & Write is needed because the workflow pushes the built images.)
3. In the GitHub repo, go to **Settings → Secrets and variables → Actions**
   and add:
   - a **secret** named `DOCKER_PAT` — value: the access token from step 2
   - a **variable** named `DOCKER_USER` — value: `elitedevltd`
4. Commit and push (already done if you added the workflow file from this
   project). From then on, every push to `main` builds and pushes both
   images through the `worehouse` cloud builder automatically — no manual
   build step needed.

## Why this can't be run from this chat session

Building and pushing needs a Docker daemon/CLI that is already authenticated
to your Docker Hub account. This session doesn't have your Docker Hub
credentials (and won't ask for them — entering passwords/tokens on your
behalf isn't something Claude does). If you link this session to your
computer (via the Claude desktop app), Claude can run `docker-cloud-build.sh`
directly on your machine using your already-configured Docker Desktop login;
otherwise, run the script yourself with the commands above.
