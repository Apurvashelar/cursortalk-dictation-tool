# VoiceFlow Auth Service

Production-oriented auth backend for the VoiceFlow desktop client.

## Stack

- Rust
- Axum
- Postgres
- Argon2id password hashing
- Opaque bearer session tokens

## Endpoints

- `GET /health`
- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/me`
- `PATCH /auth/me`
- `DELETE /auth/me`

## Why this service shape

- Passwords are hashed server-side with Argon2id.
- Sessions use opaque random tokens rather than self-contained JWTs.
- The raw token is only returned to the client; the database stores only a SHA-256 hash.
- Postgres is used instead of local file storage so the service is suitable for real deployment.

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `AUTH_BIND_ADDR`
- `AUTH_TOKEN_TTL_HOURS`
- `CORS_ALLOWED_ORIGIN`

For staging, there is also:

- `.env.staging.example`

## Run locally

1. Start Postgres.
2. Create the target database from `DATABASE_URL`.
3. From this folder run:

```bash
cargo run
```

Migrations run automatically on startup.

## Run with Docker

The auth service now has first-pass Docker packaging.

### Files

- `Dockerfile`
- `.dockerignore`
- `.env.docker.example`

### Docker environment

Copy `.env.docker.example` to a local runtime file such as `.env.docker` and set:

- `DATABASE_URL`
- `AUTH_BIND_ADDR`
- `AUTH_TOKEN_TTL_HOURS`
- `CORS_ALLOWED_ORIGIN`
- `RUST_LOG`

Default container-safe bind:

- `AUTH_BIND_ADDR=0.0.0.0:4000`

### Build the image

From `voiceflow-auth-service/` run:

```bash
docker build -t cursortalk-auth:local .
```

This command:

1. builds the Rust binaries in a builder image
2. copies the release binaries into a slim runtime image
3. creates a local image named `cursortalk-auth:local`

### Run the auth service container

```bash
docker run --rm \
  --env-file .env.docker \
  -p 4000:4000 \
  --name cursortalk-auth \
  cursortalk-auth:local
```

This command:

1. loads runtime config from `.env.docker`
2. exposes container port `4000` on local port `4000`
3. starts the auth service container

Migrations still run automatically on startup, just like the non-Docker version.

### Run the seed command from the image

```bash
docker run --rm \
  --env-file .env.docker \
  --entrypoint /app/seed_demo_org \
  cursortalk-auth:local
```

This command:

1. starts the same image
2. overrides the default startup command
3. runs the demo-org seed binary instead of the auth server

### Quick health check

After the container is up:

```bash
curl http://127.0.0.1:4000/health
```

### Notes

- if Postgres is running on your host machine, `host.docker.internal` is the easiest hostname to use from Docker Desktop
- in ECS, the same image would run with environment variables and secrets injected by AWS instead of a local `.env.docker` file
- this first Docker version is only packaging; it does not change auth behavior

## Seed the demo organization

For staging and internal demos, seed the database with one internal organization and two demo users.

1. copy `.env.staging.example` into your runtime env file or export the variables
2. make sure `DATABASE_URL` points to the staging RDS instance
3. run:

```bash
cargo run --bin seed_demo_org
```

This command will:

1. create the `VoiceFlow Demo` organization if it does not exist
2. create or update the demo owner user
3. create or update the demo member user

The seed command does not create sessions. It only prepares the org and demo accounts so they can sign in normally through the desktop app or API.

## Quick manual test

### Sign up

```bash
curl -X POST http://127.0.0.1:4000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"supersecure123"}'
```

### Sign in

```bash
curl -X POST http://127.0.0.1:4000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"supersecure123"}'
```

Copy the returned `access_token`, then:

### Read profile

```bash
curl http://127.0.0.1:4000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update profile

```bash
curl -X PATCH http://127.0.0.1:4000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Apurva","last_name":"Patel"}'
```

### Sign out

```bash
curl -X POST http://127.0.0.1:4000/auth/sign-out \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" -i
```

### Delete account

```bash
curl -X DELETE http://127.0.0.1:4000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" -i
```
