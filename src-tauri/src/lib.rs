// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

async fn start_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    let sidecar = app
        .shell()
        .sidecar("api")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;

    // Our Python API now listens on 0.0.0.0:8004 by default, so no need to specify port
    let (_rx, _child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Wait a moment for the sidecar to start up
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    Ok("Sidecar started successfully".to_string())
}

#[tauri::command]
async fn run_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    start_sidecar(app).await
}

use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match start_sidecar(app_handle).await {
                    Ok(msg) => println!("{}", msg),
                    Err(e) => eprintln!("Failed to start Python sidecar: {}", e),
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, run_sidecar])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
