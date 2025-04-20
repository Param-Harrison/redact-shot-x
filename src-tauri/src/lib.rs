// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod redactor;

use redactor::{ImageRedactor, RedactionConfig, RedactionResponse};
use serde::{Deserialize, Serialize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Serialize, Deserialize)]
struct Base64Request {
    #[serde(rename = "imageData")]
    image_data: String,
    config: Option<RedactionConfig>,
}

#[tauri::command]
async fn health_check() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "ok",
        "message": "API is healthy"
    }))
}

#[tauri::command]
async fn redact_base64_image(request: Base64Request) -> Result<RedactionResponse, String> {
    let redactor = ImageRedactor::new();
    redactor.redact_image_base64(&request.image_data, request.config)
}

#[tauri::command]
async fn redact_image_file(
    file_path: String,
    config_json: Option<String>,
) -> Result<RedactionResponse, String> {
    let config: Option<RedactionConfig> = match config_json {
        Some(json) => match serde_json::from_str(&json) {
            Ok(config) => Some(config),
            Err(e) => return Err(format!("Failed to parse config JSON: {}", e)),
        },
        None => None,
    };

    let redactor = ImageRedactor::new();
    redactor.redact_image(&file_path, config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            health_check,
            redact_base64_image,
            redact_image_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
