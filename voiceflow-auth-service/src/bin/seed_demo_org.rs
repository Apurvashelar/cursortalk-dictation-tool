use std::env;

use anyhow::{anyhow, Context, Result};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use rand::rngs::OsRng;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let database_url =
        env::var("DATABASE_URL").context("DATABASE_URL must be set for seed_demo_org")?;
    let org_name =
        env::var("VOICEFLOW_DEMO_ORG_NAME").unwrap_or_else(|_| "VoiceFlow Demo".to_string());

    let owner_email = env::var("VOICEFLOW_DEMO_OWNER_EMAIL")
        .unwrap_or_else(|_| "owner@voiceflow.demo".to_string());
    let owner_password = env::var("VOICEFLOW_DEMO_OWNER_PASSWORD")
        .context("VOICEFLOW_DEMO_OWNER_PASSWORD must be set")?;
    let owner_first_name =
        env::var("VOICEFLOW_DEMO_OWNER_FIRST_NAME").unwrap_or_else(|_| "Demo".to_string());
    let owner_last_name =
        env::var("VOICEFLOW_DEMO_OWNER_LAST_NAME").unwrap_or_else(|_| "Owner".to_string());

    let member_email = env::var("VOICEFLOW_DEMO_MEMBER_EMAIL")
        .unwrap_or_else(|_| "member@voiceflow.demo".to_string());
    let member_password = env::var("VOICEFLOW_DEMO_MEMBER_PASSWORD")
        .context("VOICEFLOW_DEMO_MEMBER_PASSWORD must be set")?;
    let member_first_name =
        env::var("VOICEFLOW_DEMO_MEMBER_FIRST_NAME").unwrap_or_else(|_| "Demo".to_string());
    let member_last_name =
        env::var("VOICEFLOW_DEMO_MEMBER_LAST_NAME").unwrap_or_else(|_| "Member".to_string());

    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .context("failed to connect to Postgres")?;

    let org_id = ensure_org(&db, &org_name).await?;

    ensure_user(
        &db,
        org_id,
        &owner_email,
        &owner_password,
        &owner_first_name,
        &owner_last_name,
    )
    .await?;

    ensure_user(
        &db,
        org_id,
        &member_email,
        &member_password,
        &member_first_name,
        &member_last_name,
    )
    .await?;

    println!("Seeded org `{org_name}` with demo users.");
    println!("Owner:  {owner_email}");
    println!("Member: {member_email}");

    Ok(())
}

async fn ensure_org(db: &PgPool, org_name: &str) -> Result<Uuid> {
    if let Some(existing) = sqlx::query("SELECT id FROM organizations WHERE name = $1 LIMIT 1")
        .bind(org_name)
        .fetch_optional(db)
        .await
        .context("failed to query organizations")?
    {
        return existing
            .try_get("id")
            .context("failed to read existing organization id");
    }

    let created = sqlx::query("INSERT INTO organizations (name) VALUES ($1) RETURNING id")
        .bind(org_name)
        .fetch_one(db)
        .await
        .context("failed to create demo organization")?;

    created
        .try_get("id")
        .context("failed to read created organization id")
}

async fn ensure_user(
    db: &PgPool,
    org_id: Uuid,
    email: &str,
    password: &str,
    first_name: &str,
    last_name: &str,
) -> Result<()> {
    let password_hash = hash_password(password)?;

    let existing = sqlx::query("SELECT id FROM users WHERE email = $1 LIMIT 1")
        .bind(email)
        .fetch_optional(db)
        .await
        .with_context(|| format!("failed to query user {email}"))?;

    if let Some(row) = existing {
        let user_id: Uuid = row
            .try_get("id")
            .with_context(|| format!("failed to read existing user id for {email}"))?;

        sqlx::query(
            "UPDATE users
             SET password_hash = $1,
                 first_name = $2,
                 last_name = $3,
                 organization_id = $4,
                 updated_at = NOW()
             WHERE id = $5",
        )
        .bind(&password_hash)
        .bind(first_name)
        .bind(last_name)
        .bind(org_id)
        .bind(user_id)
        .execute(db)
        .await
        .with_context(|| format!("failed to update existing user {email}"))?;

        return Ok(());
    }

    sqlx::query(
        "INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(email)
    .bind(password_hash)
    .bind(first_name)
    .bind(last_name)
    .bind(org_id)
    .execute(db)
    .await
    .with_context(|| format!("failed to insert user {email}"))?;

    Ok(())
}

fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|error| anyhow!("failed to hash seed user password: {error}"))?;
    Ok(hash.to_string())
}
