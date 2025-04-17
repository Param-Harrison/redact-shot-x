// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

// Store the sidecar process to manage its lifecycle
static API_SERVER_PROCESS: once_cell::sync::Lazy<Arc<Mutex<Option<Child>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Simple function to get the API binary name
fn get_api_binary_name() -> String {
    // We use a simple name since we've created a symbolic link
    // from 'api' to the platform-specific binary
    String::from("api")
}

#[tauri::command]
fn start_api_server() -> Result<(), String> {
    let current_dir = env::current_dir().expect("Failed to get current directory");
    println!("Current directory: {:?}", current_dir);

    let binary_name = get_api_binary_name();
    let binary_path: PathBuf;

    // Check if we're running in development or production
    #[cfg(debug_assertions)]
    {
        // In development, use the binary directly from the bin/api directory
        binary_path = current_dir.join("bin").join("api").join(binary_name);
    }
    #[cfg(not(debug_assertions))]
    {
        // In production, use the bundle path approach
        let context = tauri::generate_context!();
        let config = context.config();
        let app_dir = tauri::Bundle::path::app_dir(&config).expect("Failed to get app directory");

        binary_path = app_dir
            .join("Resources") // macOS puts resources in this directory
            .join("bin")
            .join("api")
            .join(binary_name);
    }

    println!("Binary path: {:?}", binary_path);

    let mut process_guard = API_SERVER_PROCESS.lock().unwrap();

    // If process is already running, return success
    if process_guard.is_some() {
        return Ok(());
    }

    if !binary_path.exists() {
        return Err(format!("API binary not found at: {:?}", binary_path));
    }

    // Start the process
    let child = Command::new(binary_path)
        .args(["--host", "127.0.0.1", "--port", "1426"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start API server: {}", e))?;

    // Store the child process
    *process_guard = Some(child);

    // Give the server a moment to start up
    thread::sleep(Duration::from_millis(1000));

    Ok(())
}

#[tauri::command]
fn redact_base64_image(image_data: String, config: String) -> Result<String, String> {
    // Ensure API server is running
    let _ = start_api_server();

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

fn stop_api_server() {
    let mut process_guard = API_SERVER_PROCESS.lock().unwrap();

    if let Some(mut child) = process_guard.take() {
        println!("Stopping API server...");

        // First try to gracefully terminate
        #[cfg(unix)]
        {
            let _ = Command::new("kill").arg(child.id().to_string()).spawn();
        }

        #[cfg(windows)]
        {
            let _ = Command::new("taskkill")
                .args(&["/PID", &child.id().to_string(), "/F"])
                .spawn();
        }

        // Give it a moment to shut down
        thread::sleep(Duration::from_millis(200));

        // Force kill if still running
        let _ = child.kill();
        let _ = child.wait();

        println!("API server stopped");
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            start_api_server,
            redact_base64_image
        ])
        .setup(|_app| {
            // Start API server at app startup for better UX
            if let Err(e) = start_api_server() {
                eprintln!("Failed to start API server: {}", e);
            } else {
                println!("API server started successfully!");
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("Window close requested, stopping API server...");
                stop_api_server();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
