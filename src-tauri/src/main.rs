// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use std::time::Duration;

// Store the sidecar process handle to manage its lifecycle
static API_SERVER_HANDLE: once_cell::sync::Lazy<Arc<Mutex<Option<u32>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Flag to track if window close is already in progress
static IS_CLOSING: once_cell::sync::Lazy<Arc<Mutex<bool>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(false)));

// Function to start the API server using Tauri's sidecar mechanism
#[tauri::command]
async fn start_api_server(app: tauri::AppHandle) -> Result<(), String> {
    let mut process_guard = API_SERVER_HANDLE.lock().unwrap();

    // If process is already running, return success
    if process_guard.is_some() {
        return Ok(());
    }

    // Log that we're starting the server
    println!("Starting API server...");
    
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
    println!("API server started with PID: {}", child.pid());

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
                CommandEvent::Stdout(line) => {
                    println!("API server: {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("API server error: {}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
    });

    // Wait briefly to give the API server time to start
    std::thread::sleep(Duration::from_millis(500));
    
    // Try basic health check (without all the fancy tokio stuff)
    match reqwest::blocking::Client::new()
        .get("http://127.0.0.1:1426/health")
        .timeout(Duration::from_secs(2))
        .send() {
        Ok(response) => {
            if response.status().is_success() {
                println!("API server is responding and healthy");
            } else {
                println!("API server is running but returned non-success status: {}", response.status());
            }
        }
        Err(e) => {
            println!("Warning: API server started but health check failed: {}", e);
        }
    }

    Ok(())
}

// Function to stop the API server
#[tauri::command]
fn stop_api_server() -> Result<(), String> {
    let mut process_guard = API_SERVER_HANDLE.lock().unwrap();
    
    if let Some(pid) = *process_guard {
        println!("Stopping API server with PID: {}", pid);
        
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command;
            Command::new("kill")
                .arg(pid.to_string())
                .output()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
        }
        
        *process_guard = None;
        println!("API server process terminated");
    } else {
        println!("No API server process to stop");
    }
    
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

// Function to check API server status
#[tauri::command]
fn check_api_status() -> Result<bool, String> {
    match reqwest::blocking::Client::new()
        .get("http://127.0.0.1:1426/health")
        .timeout(Duration::from_secs(2))
        .send() {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false)
        }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_api_server,
            stop_api_server,
            redact_base64_image,
            check_api_status
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
                // Avoid multiple close attempts
                let mut is_closing = IS_CLOSING.lock().unwrap();
                if *is_closing {
                    return;
                }
                *is_closing = true;
                
                println!("Window close requested, stopping API server...");
                
                // Clean up API server before closing
                if let Err(e) = stop_api_server() {
                    eprintln!("Failed to stop API server: {}", e);
                }
                
                // Don't call window.close() here, as it would trigger another close event
                // Just let the window close naturally by returning
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
