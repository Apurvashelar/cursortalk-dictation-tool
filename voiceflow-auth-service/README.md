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
