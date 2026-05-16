# syntax=docker/dockerfile:1.7

FROM rust:1.94-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src

RUN cargo build --release --locked --bin cursortalk-auth-service --bin seed_demo_org

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/cursortalk-auth-service /app/cursortalk-auth-service
COPY --from=builder /app/target/release/seed_demo_org /app/seed_demo_org

ENV AUTH_BIND_ADDR=0.0.0.0:4000
EXPOSE 4000

CMD ["/app/cursortalk-auth-service"]
