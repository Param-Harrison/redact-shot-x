// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

// Store the sidecar process handle to manage its lifecycle
static API_SERVER_HANDLE: once_cell::sync::Lazy<Arc<Mutex<Option<u32>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Function to start the API server using Tauri's sidecar mechanism
#[tauri::command]
async fn start_api_server(app: tauri::AppHandle) -> Result<(), String> {
    let mut process_guard = API_SERVER_HANDLE.lock().unwrap();

    // If process is already running, return success
    if process_guard.is_some() {
        return Ok(());
    }

    // Get the sidecar command
    let sidecar = app
        .shell()
        .sidecar("api")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;

    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn API sidecar: {}", e))?;

    // Store the process ID
    *process_guard = Some(child.pid());

    // Handle process events in a separate task
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(data) => {
                    println!("API server process terminated with code: {:?}", data.code);
                    let mut handle = API_SERVER_HANDLE.lock().unwrap();
                    *handle = None;
                }
                CommandEvent::Error(err) => {
                    eprintln!("API server process error: {}", err);
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn redact_base64_image(image_data: String, config: String) -> Result<String, String> {
    // Submit the redaction request to the API server
    let client = reqwest::blocking::Client::new();
    let response = client
        .post("http://127.0.0.1:1426/redact/base64")
        .header("Content-Type", "application/json")
        .body(format!(
            "{{\"imageData\": \"{}\", \"config\": {}}}",
            image_data, config
        ))
        .send()
        .map_err(|e| format!("Failed to connect to API server: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API server returned error: {}", response.status()));
    }

    let result = response
        .text()
        .map_err(|e| format!("Failed to read API response: {}", e))?;

    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_api_server,
            redact_base64_image
        ])
        .setup(|app| {
            // Start API server at app startup for better UX
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_api_server(app_handle.clone()).await {
                    eprintln!("Failed to start API server: {}", e);
                } else {
                    println!("API server started successfully!");
                }
            });

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("Window close requested");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
