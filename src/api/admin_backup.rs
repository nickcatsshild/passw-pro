use std::io::Read;
use std::path::{Path, PathBuf};

use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use rocket::{
    Route,
    http::ContentType,
    response::content::RawHtml as Html,
    serde::json::Json,
};
use serde_json::Value;
use tar::{Archive as TarArchive, Builder as TarBuilder};

use crate::{
    CONFIG,
    api::ApiResult,
    auth::AdminToken,
    error::Error,
};

pub fn routes() -> Vec<Route> {
    routes![
        backup_page,
        create_backup,
        download_backup,
        delete_backup,
        restore_page,
        upload_restore,
    ]
}

fn backup_dir() -> PathBuf {
    Path::new(&CONFIG.data_folder()).join("backups")
}

#[derive(Serialize)]
struct AdminBackupTemplateData {
    page_content: String,
    page_data: Value,
    logged_in: bool,
    urlpath: String,
    sso_enabled: bool,
}

impl AdminBackupTemplateData {
    fn new(page_data: Value) -> Self {
        Self {
            page_content: "admin/backup".into(),
            page_data: Some(page_data),
            logged_in: true,
            urlpath: CONFIG.domain_path(),
            sso_enabled: CONFIG.sso_enabled(),
        }
    }

    fn render(self) -> Result<String, Error> {
        CONFIG.render_template("admin/base", &self)
    }
}

#[get("/backup")]
fn backup_page(_token: AdminToken) -> ApiResult<Html<String>> {
    let backup_dir = backup_dir();
    let mut backups: Vec<Value> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_tar_gz = path.extension().is_some_and(|e| e == "gz")
                && path.file_stem().and_then(|s| Path::new(s).extension()).is_some_and(|e| e == "tar");
            if is_tar_gz {
                if let Ok(meta) = path.metadata() {
                    let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                    let size = meta.len();
                    let modified = meta.modified().ok().map(|t| {
                        let dt: chrono::DateTime<chrono::Utc> = t.into();
                        dt.format("%Y-%m-%d %H:%M:%S").to_string()
                    }).unwrap_or_default();
                    backups.push(json!({
                        "name": name,
                        "size": size,
                        "size_formatted": format_size(size),
                        "modified": modified,
                    }));
                }
            }
        }
    }

    backups.sort_by(|a, b| b["modified"].as_str().cmp(&a["modified"].as_str()));

    let page_data = json!({
        "backups": backups,
        "backup_dir": backup_dir.to_string_lossy().to_string(),
    });

    let text = AdminBackupTemplateData::new(page_data).render()?;
    Ok(Html(text))
}

#[post("/backup/create", format = "application/json")]
async fn create_backup(_token: AdminToken) -> Json<Value> {
    match create_backup_archive().await {
        Ok(info) => Json(json!({
            "success": true,
            "filename": info.filename,
            "path": info.path,
            "size": info.size,
            "message": format!("Backup '{}' created successfully ({})", info.filename, format_size(info.size)),
        })),
        Err(e) => Json(json!({
            "success": false,
            "message": format!("Error creating backup: {e}"),
        })),
    }
}

struct BackupInfo {
    filename: String,
    path: String,
    size: u64,
}

async fn create_backup_archive() -> Result<BackupInfo, Error> {
    let backup_dir = backup_dir();
    tokio::fs::create_dir_all(&backup_dir).await.map_err(|e| {
        Error::from(format!("Failed to create backup directory: {e}"))
    })?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("passw-pro_backup_{timestamp}.tar.gz");
    let filepath = backup_dir.join(&filename);

    let data_folder = Path::new(&CONFIG.data_folder());
    let db_path = resolve_db_path();
    let config_path = data_folder.join("config.json");
    let rsa_key_path = Path::new(&CONFIG.rsa_key_filename());

    // Build tar.gz in memory
    let mut buf = Vec::new();
    let encoder = GzEncoder::new(&mut buf, Compression::best());
    let mut tar = TarBuilder::new(encoder);

    // Metadata
    let metadata = json!({
        "created_at": chrono::Utc::now().to_rfc3339(),
        "version": crate::VERSION.unwrap_or("unknown"),
        "tool": "passw-pro-backup",
    }).to_string();

    let mut header = tar::Header::new_gnu();
    header.set_path("metadata.json").ok();
    header.set_size(metadata.len() as u64);
    header.set_mode(0o644);
    header.set_cksum();
    tar.append(&header, std::io::Cursor::new(metadata.as_bytes())).ok();

    add_file_to_tar(&mut tar, "db.sqlite3", &db_path);
    add_file_to_tar(&mut tar, "config.json", &config_path);

    for ext in &["", ".pub"] {
        let key_path_str = format!("{}{}", rsa_key_path.display(), ext);
        let key_path = Path::new(&key_path_str);
        if key_path.exists() {
            add_file_to_tar(&mut tar, &format!("rsa_key{}", ext), key_path);
        }
    }

    add_dir_to_tar(&mut tar, "attachments", &data_folder.join("attachments"));
    add_dir_to_tar(&mut tar, "sends", &data_folder.join("sends"));
    add_dir_to_tar(&mut tar, "icon_cache", &data_folder.join("icon_cache"));

    let encoder = tar.into_inner().map_err(|e| {
        Error::from(format!("Failed to finalize tar: {e}"))
    })?;
    encoder.finish().map_err(|e| {
        Error::from(format!("Failed to finish gzip: {e}"))
    })?;
    let size = buf.len() as u64;

    // Write to disk
    tokio::fs::write(&filepath, &buf).await.map_err(|e| {
        Error::from(format!("Failed to write backup file: {e}"))
    })?;

    Ok(BackupInfo {
        filename,
        path: filepath.to_string_lossy().into_owned(),
        size,
    })
}

fn add_file_to_tar(tar: &mut TarBuilder<&mut Vec<u8>>, tar_path: &str, file_path: &Path) {
    if !file_path.exists() { return; }
    let mut file = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(_) => return,
    };
    let metadata = match file.metadata() {
        Ok(m) => m,
        Err(_) => return,
    };
    let mut header = tar::Header::new_gnu();
    header.set_path(tar_path).ok();
    header.set_size(metadata.len());
    header.set_mode(0o644);
    header.set_cksum();
    tar.append(&header, &mut file).ok();
}

fn add_dir_to_tar(tar: &mut TarBuilder<&mut Vec<u8>>, tar_prefix: &str, dir_path: &Path) {
    if !dir_path.exists() { return; }
    let Ok(entries) = std::fs::read_dir(dir_path) else { return };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let sub_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
            let sub_prefix = format!("{}/{}", tar_prefix, sub_name);
            add_dir_to_tar(tar, &sub_prefix, &path);
        } else if path.is_file() {
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
            let tar_name = format!("{}/{}", tar_prefix, file_name);
            add_file_to_tar(tar, &tar_name, &path);
        }
    }
}

fn resolve_db_path() -> PathBuf {
    let db_url = CONFIG.database_url();
    let db_path_str = db_url.strip_prefix("sqlite://").unwrap_or(&db_url);
    Path::new(db_path_str).to_path_buf()
}

fn format_size(size: u64) -> String {
    if size >= 1_000_000_000 {
        format!("{:.1} GB", size as f64 / 1_000_000_000.0)
    } else if size >= 1_000_000 {
        format!("{:.1} MB", size as f64 / 1_000_000.0)
    } else if size >= 1_000 {
        format!("{:.1} KB", size as f64 / 1_000.0)
    } else {
        format!("{size} B")
    }
}

#[get("/backup/download/<filename>")]
async fn download_backup(filename: String, _token: AdminToken) -> Result<(ContentType, Vec<u8>), Error> {
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        err!("Invalid filename");
    }

    let filepath = backup_dir().join(&filename);
    let data = tokio::fs::read(&filepath).await.map_err(|_| {
        Error::from(format!("Backup file not found: {filename}"))
    })?;

    Ok((ContentType::new("application", "gzip"), data))
}

#[delete("/backup/delete/<filename>")]
async fn delete_backup(filename: String, _token: AdminToken) -> Json<Value> {
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Json(json!({ "success": false, "message": "Invalid filename" }));
    }

    let filepath = backup_dir().join(&filename);
    match tokio::fs::remove_file(&filepath).await {
        Ok(_) => Json(json!({ "success": true, "message": format!("Backup deleted: {filename}") })),
        Err(e) => Json(json!({ "success": false, "message": format!("Failed to delete: {e}") })),
    }
}

#[get("/backup/restore")]
fn restore_page(_token: AdminToken) -> ApiResult<Html<String>> {
    let page_data = json!({});
    let text = AdminBackupTemplateData::new(page_data).render()?;
    Ok(Html(text))
}

#[post("/backup/restore", format = "multipart/form-data", data = "<form>")]
async fn upload_restore(
    _token: AdminToken,
    form: rocket::form::Form<rocket::form::Lenient<RestoreForm>>,
) -> Json<Value> {
    let form = form.into_inner().into_inner();
    match restore_from_backup(form.file.path()).await {
        Ok(details) => Json(json!({
            "success": true,
            "message": "Backup restored successfully. Restart the server for all changes to take effect.",
            "details": details,
        })),
        Err(e) => Json(json!({
            "success": false,
            "message": format!("Restore failed: {e}"),
            "details": [],
        })),
    }
}

#[derive(Debug, Deserialize)]
struct RestoreForm {
    file: rocket::fs::TempFile<'_>,
}

async fn restore_from_backup(backup_path: &Path) -> Result<Vec<String>, Error> {
    let data = tokio::fs::read(backup_path).await.map_err(|e| {
        Error::from(format!("Failed to read backup file: {e}"))
    })?;

    let mut details: Vec<String> = Vec::new();
    let data_folder = Path::new(&CONFIG.data_folder()).to_path_buf();
    let temp_dir = data_folder.join("restore_temp");
    let _ = tokio::fs::remove_dir_all(&temp_dir).await;
    tokio::fs::create_dir_all(&temp_dir).await.map_err(|e| {
        Error::from(format!("Failed to create temp restore dir: {e}"))
    })?;

    // Decompress gzip then extract tar
    let decoder = GzDecoder::new(std::io::Cursor::new(data));
    let mut archive = TarArchive::new(decoder);

    archive.entries().map_err(|e| {
        Error::from(format!("Invalid tar.gz file: {e}"))
    })?.filter_map(|e| e.ok()).for_each(|mut entry| {
        if let Ok(path) = entry.path() {
            let out_path = temp_dir.join(path);
            if let Some(parent) = out_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            if let Ok(size) = entry.size() {
                let mut data = Vec::new();
                if std::io::Read::read_to_end(&mut entry, &mut data).is_ok() {
                    if std::fs::write(&out_path, &data).is_ok() {
                        details.push(format!("Extracted: {} ({} bytes)", path.display(), size));
                    }
                }
            }
        }
    });

    let has_db = temp_dir.join("db.sqlite3").exists();
    if !has_db {
        let _ = std::fs::remove_dir_all(&temp_dir);
        err!("Backup does not contain a database file (db.sqlite3)");
    }

    // Apply restore
    let db_path = resolve_db_path();
    let config_path = data_folder.join("config.json");
    let attachments_path = data_folder.join("attachments");
    let sends_path = data_folder.join("sends");
    let icon_cache_path = data_folder.join("icon_cache");

    // Restore database
    let temp_db = temp_dir.join("db.sqlite3");
    if temp_db.exists() {
        tokio::fs::copy(&temp_db, &db_path).await.map_err(|e| {
            Error::from(format!("Failed to restore database: {e}"))
        })?;
        details.push("Restored: db.sqlite3".into());
    }

    // Restore config
    let temp_config = temp_dir.join("config.json");
    if temp_config.exists() {
        tokio::fs::copy(&temp_config, &config_path).await.map_err(|e| {
            Error::from(format!("Failed to restore config: {e}"))
        })?;
        details.push("Restored: config.json".into());
    }

    // Restore RSA keys
    for ext in &["", ".pub"] {
        let temp_key = temp_dir.join(format!("rsa_key{}", ext));
        if temp_key.exists() {
            let dest = format!("{}{}", CONFIG.rsa_key_filename(), ext);
            tokio::fs::copy(&temp_key, &dest).await.map_err(|e| {
                Error::from(format!("Failed to restore rsa_key{}: {}", ext, e))
            })?;
            details.push(format!("Restored: rsa_key{}", ext));
        }
    }

    // Restore attachments
    let temp_attachments = temp_dir.join("attachments");
    if temp_attachments.exists() {
        let _ = tokio::fs::remove_dir_all(&attachments_path).await;
        copy_dir_recursive(&temp_attachments, &attachments_path).await?;
        details.push("Restored: attachments/".into());
    }

    // Restore sends
    let temp_sends = temp_dir.join("sends");
    if temp_sends.exists() {
        let _ = tokio::fs::remove_dir_all(&sends_path).await;
        copy_dir_recursive(&temp_sends, &sends_path).await?;
        details.push("Restored: sends/".into());
    }

    // Restore icon cache
    let temp_icon = temp_dir.join("icon_cache");
    if temp_icon.exists() {
        let _ = tokio::fs::remove_dir_all(&icon_cache_path).await;
        let _ = copy_dir_recursive(&temp_icon, &icon_cache_path).await;
        details.push("Restored: icon_cache/".into());
    }

    // Cleanup
    let _ = tokio::fs::remove_dir_all(&temp_dir).await;

    Ok(details)
}

async fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), Error> {
    tokio::fs::create_dir_all(dst).await.map_err(|e| {
        Error::from(format!("Failed to create directory '{}': {e}", dst.display()))
    })?;

    let mut entries = tokio::fs::read_dir(src).await.map_err(|e| {
        Error::from(format!("Failed to read directory '{}': {e}", src.display()))
    })?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let file_type = entry.file_type().await.map_err(|e| {
            Error::from(format!("Failed to get file type: {e}"))
        })?;

        let dst_path = dst.join(entry.file_name());

        if file_type.is_dir() {
            Box::pin(copy_dir_recursive(&entry.path(), &dst_path)).await?;
        } else {
            tokio::fs::copy(&entry.path(), &dst_path).await.map_err(|e| {
                Error::from(format!("Failed to copy '{}': {e}", entry.path().display()))
            })?;
        }
    }

    Ok(())
}
