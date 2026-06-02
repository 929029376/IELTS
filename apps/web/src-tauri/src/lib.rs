use serde::Serialize;
use std::{env, fs};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopRuntimeStatus {
    app_data_dir: String,
    audio_mode: String,
    database_path: String,
    file_picker_mode: String,
    is_desktop: bool,
    pdf_mode: String,
    platform: String,
    sync_path: String,
}

fn default_sync_path() -> String {
    if cfg!(target_os = "windows") {
        env::var("USERPROFILE")
            .map(|home| format!("{home}\\BaiduSyncdisk\\IELTS-Sync"))
            .unwrap_or_else(|_| "Select a Baidu Cloud sync folder".to_string())
    } else {
        env::var("HOME")
            .map(|home| format!("{home}/Desktop/同步空间/IELTS-Sync"))
            .unwrap_or_else(|_| "/Users/musheng/Desktop/同步空间/IELTS-Sync".to_string())
    }
}

#[tauri::command]
fn desktop_runtime_status(app: tauri::AppHandle) -> Result<DesktopRuntimeStatus, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    let database_path = app_data_dir.join("ielts.db");

    Ok(DesktopRuntimeStatus {
        app_data_dir: app_data_dir.display().to_string(),
        audio_mode: "html-audio".to_string(),
        database_path: database_path.display().to_string(),
        file_picker_mode: "web-file-input".to_string(),
        is_desktop: true,
        pdf_mode: "webview-pdf".to_string(),
        platform: env::consts::OS.to_string(),
        sync_path: default_sync_path(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_runtime_status])
        .run(tauri::generate_context!())
        .expect("error while running IELTS Local Practice");
}
