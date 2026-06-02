use serde::Serialize;
use std::path::PathBuf;
use std::{env, fs};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRuntimeStatus {
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

fn build_desktop_runtime_status(
    app_data_dir: PathBuf,
    platform: String,
    sync_path: String,
) -> DesktopRuntimeStatus {
    let database_path = app_data_dir.join("ielts.db");

    DesktopRuntimeStatus {
        app_data_dir: app_data_dir.display().to_string(),
        audio_mode: "html-audio".to_string(),
        database_path: database_path.display().to_string(),
        file_picker_mode: "web-file-input".to_string(),
        is_desktop: true,
        pdf_mode: "webview-pdf".to_string(),
        platform,
        sync_path,
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

    Ok(build_desktop_runtime_status(
        app_data_dir,
        env::consts::OS.to_string(),
        default_sync_path(),
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_runtime_status])
        .run(tauri::generate_context!())
        .expect("error while running IELTS Local Practice");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_status_includes_packaged_modes() {
        let status = build_desktop_runtime_status(
            PathBuf::from("C:\\Users\\runner\\AppData\\Roaming\\local.ielts.practice"),
            "windows".to_string(),
            "C:\\Users\\runner\\BaiduSyncdisk\\IELTS-Sync".to_string(),
        );

        assert!(status.is_desktop);
        assert_eq!(status.platform, "windows");
        assert_eq!(status.file_picker_mode, "web-file-input");
        assert_eq!(status.audio_mode, "html-audio");
        assert_eq!(status.pdf_mode, "webview-pdf");
        assert!(status.app_data_dir.contains("local.ielts.practice"));
        assert!(status.database_path.ends_with("ielts.db"));
        assert!(status.sync_path.contains("IELTS-Sync"));
    }
}
