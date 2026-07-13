use chrono::Utc;
use rocket::{Route, serde::json::Json};
use serde_json::Value;

use crate::{
    auth::Headers,
    db::{
        DbConn,
        models::{Cipher, Folder},
    },
    api::JsonResult,
};

pub fn routes() -> Vec<Route> {
    routes![vault_stats]
}

#[get("/health/vault-stats")]
async fn vault_stats(headers: Headers, conn: DbConn) -> JsonResult {
    let user = &headers.user;
    let ciphers = Cipher::find_by_user_visible(&user.uuid, &conn).await;
    let folders = Folder::find_by_user(&user.uuid, &conn).await;

    let total = ciphers.len();
    let mut by_type = std::collections::HashMap::new();
    let mut reprompt_count = 0u64;
    let mut deleted_count = 0u64;
    let mut last_7d = 0u64;
    let mut last_30d = 0u64;
    let mut last_90d = 0u64;
    let mut older_90d = 0u64;
    let mut orphan_count = 0u64;

    let now = Utc::now().naive_utc();

    for c in &ciphers {
        *by_type.entry(c.atype).or_insert(0u64) += 1;
        if c.reprompt == Some(1) { reprompt_count += 1; }
        if c.deleted_at.is_some() { deleted_count += 1; }

        let age_days = (now - c.created_at).num_days();
        if age_days <= 7 { last_7d += 1; }
        else if age_days <= 30 { last_30d += 1; }
        else if age_days <= 90 { last_90d += 1; }
        else { older_90d += 1; }
    }

    // Count orphans (ciphers not in any folder)
    // We count ciphers that have no folder_ciphers entry
    if !ciphers.is_empty() {
        use diesel::prelude::*;
        use crate::db::schema::{folders_ciphers, ciphers as c_table};
        let user_uuid = &user.uuid;
        orphan_count = conn.run(move |conn| {
            c_table::table
                .left_join(folders_ciphers::table.on(c_table::uuid.eq(folders_ciphers::cipher_uuid)))
                .filter(c_table::user_uuid.eq(user_uuid))
                .filter(folders_ciphers::cipher_uuid.is_null())
                .filter(c_table::deleted_at.is_null())
                .count()
                .first::<i64>(conn)
                .ok()
                .unwrap_or(0) as u64
        }).await;
    }

    let total_users = conn.run(|conn| {
        use crate::db::schema::users;
        users::table.count().first::<i64>(conn).ok().unwrap_or(0)
    }).await;

    let total_orgs = conn.run(|conn| {
        use crate::db::schema::organizations;
        organizations::table.count().first::<i64>(conn).ok().unwrap_or(0)
    }).await;

    let by_type_json: Value = by_type.iter().map(|(k, v)| {
        let name = match k {
            1 => "Login",
            2 => "SecureNote",
            3 => "Card",
            4 => "Identity",
            5 => "SshKey",
            _ => "Unknown",
        };
        (name, json!(v))
    }).collect();

    Ok(Json(json!({
        "object": "vaultStats",
        "total": total,
        "totalFolders": folders.len(),
        "totalUsers": total_users,
        "totalOrganizations": total_orgs,
        "orphanCount": orphan_count,
        "repromptCount": reprompt_count,
        "deletedCount": deleted_count,
        "byType": by_type_json,
        "byAge": {
            "last7Days": last_7d,
            "last30Days": last_30d,
            "last90Days": last_90d,
            "older": older_90d,
        }
    })))
}
