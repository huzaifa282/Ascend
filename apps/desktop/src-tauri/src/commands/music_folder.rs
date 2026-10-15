//! Spec 11.1 — scans a music folder for tags/cover art via `lofty`. This
//! module never touches SQLite itself: it returns plain scan results, and
//! the JS side persists them through `@ascendant/db`'s musicTracks repo,
//! the same as every other table (see docs/decisions.md's db layer notes).
//! Re-scanning is manual for now (re-run the command) rather than a live
//! `notify` filesystem watcher — a deliberate scope cut, see decisions.md.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use lofty::file::AudioFile;
use lofty::prelude::*;
use lofty::probe::Probe;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "m4a", "aac", "flac", "ogg", "opus", "wav"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedTrack {
    pub path: String,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_s: f64,
    pub art_path: Option<String>,
    pub folder: String,
}

fn art_cache_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_cache_dir()
        .expect("resolve app cache dir")
        .join("art");
    let _ = fs::create_dir_all(&dir);
    dir
}

/// A filesystem-safe, stable filename for a track's cached cover art.
fn hash_path(path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.as_bytes());
    let digest = hasher.finalize();
    URL_SAFE_NO_PAD.encode(digest)
}

fn extract_art(art_dir: &PathBuf, path_str: &str, tag: Option<&lofty::tag::Tag>) -> Option<String> {
    let picture = tag?.pictures().first()?;
    let ext = match picture.mime_type() {
        Some(mime) if mime.as_str() == "image/png" => "png",
        _ => "jpg",
    };
    let out_path = art_dir.join(format!("{}.{ext}", hash_path(path_str)));
    if !out_path.exists() {
        fs::write(&out_path, picture.data()).ok()?;
    }
    Some(out_path.to_string_lossy().into_owned())
}

/// Spec 10.14's "folder missing" state: a plain, readable error, not a panic.
#[tauri::command]
pub fn scan_music_folder(app: AppHandle, folder: String) -> Result<Vec<ScannedTrack>, String> {
    let root = PathBuf::from(&folder);
    if !root.exists() {
        return Err(format!(
            "{folder} is not available. It may be on a drive that is unplugged."
        ));
    }

    let art_dir = art_cache_dir(&app);
    let mut tracks = Vec::new();

    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !AUDIO_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        let tagged_file = match Probe::open(path).and_then(|p| p.read()) {
            Ok(f) => f,
            Err(_) => continue, // unreadable/corrupt file — skip it, don't fail the whole scan
        };
        let duration_s = tagged_file.properties().duration().as_secs_f64();
        let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

        let path_str = path.to_string_lossy().into_owned();
        let title = tag
            .and_then(|t| t.title())
            .map(|s| s.into_owned())
            .unwrap_or_else(|| {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string()
            });
        let artist = tag.and_then(|t| t.artist()).map(|s| s.into_owned());
        let album = tag.and_then(|t| t.album()).map(|s| s.into_owned());
        let art_path = extract_art(&art_dir, &path_str, tag);

        tracks.push(ScannedTrack {
            path: path_str,
            title,
            artist,
            album,
            duration_s,
            art_path,
            folder: folder.clone(),
        });
    }

    Ok(tracks)
}
