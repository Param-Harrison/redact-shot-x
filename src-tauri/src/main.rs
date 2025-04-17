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
    // First, check if API is already responding on the expected port
    let api_responding = match reqwest::blocking::Client::new()
        .get("http://127.0.0.1:1426/health")
        .timeout(Duration::from_secs(1))
        .send() {
            Ok(response) => response.status().is_success(),
            Err(_) => false
        };
    
    if api_responding {
        println!("API server is already responding on port 1426, not starting a new one");
        return Ok(());
    }
    
    // If API is not responding, kill any existing API processes that might be running
    let existing_pids = find_and_kill_api_processes().map_err(|e| format!("Error cleaning up existing API processes: {}", e))?;
    
    // If we killed any processes, log it
    if !existing_pids.is_empty() {
        println!("Cleaned up {} existing API processes: {:?}", existing_pids.len(), existing_pids);
    }
    
    // Now check our stored API server handle
    let mut process_guard = API_SERVER_HANDLE.lock().unwrap();

    // If process is already registered, verify it's actually running
    if let Some(pid) = *process_guard {
        // Check if process is still running using OS-specific command
        let process_running = check_process_running(pid);
        
        if process_running {
            // Process is still running, log and return success
            println!("API server already running with PID: {}", pid);
            return Ok(());
        } else {
            // Process is no longer running, clear the handle
            println!("API server with PID {} is no longer running, will start a new one", pid);
            *process_guard = None;
        }
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
    let pid = child.pid();
    *process_guard = Some(pid);
    println!("API server started with PID: {}", pid);

    // Handle process events in a separate task
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(data) => {
                    println!("API server process terminated with code: {:?}", data.code);
                    let mut handle = API_SERVER_HANDLE.lock().unwrap();
                    if let Some(stored_pid) = *handle {
                        if stored_pid == pid {
                            *handle = None;
                        }
                    }
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

// Helper function to check if a process is running
fn check_process_running(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // On Windows, use tasklist to check if process exists
        match Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output() {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                // If the process ID is in the output, it's running
                output_str.contains(&pid.to_string())
            }
            Err(_) => false,
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        // On Unix systems, use kill -0 to check if process exists
        match Command::new("kill")
            .args(["-0", &pid.to_string()])
            .output() {
            Ok(output) => {
                // If exit code is 0, process exists
                output.status.success()
            }
            Err(_) => false,
        }
    }
}

// Function to find and kill any existing API processes
fn find_and_kill_api_processes() -> Result<Vec<u32>, String> {
    let mut killed_pids = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // On Windows, find all python processes that might be our API
        let output = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq python.exe", "/FO", "CSV"])
            .output()
            .map_err(|e| format!("Failed to run tasklist: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // Parse the CSV output to find Python processes
        for line in output_str.lines().skip(1) { // Skip header line
            if line.contains("python") {
                // Extract PID from CSV format
                if let Some(pid_str) = line.split(',').nth(1) {
                    if let Ok(pid) = pid_str.trim_matches('"').parse::<u32>() {
                        // Try to kill this process
                        if let Ok(_) = Command::new("taskkill")
                            .args(["/F", "/PID", &pid.to_string()])
                            .output() {
                            killed_pids.push(pid);
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        
        // On Unix systems, use ps and grep to find our API processes
        let output = Command::new("ps")
            .args(["-ef"])
            .output()
            .map_err(|e| format!("Failed to run ps: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // Check each process line
        for line in output_str.lines() {
            // Look for either dedicated "api" processes or python processes running api.py
            if (line.contains(" api ") || line.contains("/api ")) || 
               (line.contains("python") && line.contains("api.py")) {
                // Extract PID (usually the 2nd column in ps output)
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(pid) = parts[1].parse::<u32>() {
                        // Don't kill our own process
                        if pid != std::process::id() {
                            println!("Found API process to kill: {}", line);
                            // Try to kill this process
                            if let Ok(_) = Command::new("kill")
                                .arg(pid.to_string())
                                .output() {
                                killed_pids.push(pid);
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(killed_pids)
}

// Function to stop the API server
#[tauri::command]
fn stop_api_server() -> Result<(), String> {
    println!("Stopping API server...");
    
    // Clean up any lingering API processes
    let killed_pids = find_and_kill_api_processes().map_err(|e| format!("Error cleaning up API processes: {}", e))?;
    
    // Log processes killed
    if !killed_pids.is_empty() {
        println!("Killed {} API processes: {:?}", killed_pids.len(), killed_pids);
    }
    
    // Clear the stored handle
    let mut handle = API_SERVER_HANDLE.lock().unwrap();
    *handle = None;
    
    // Verify no process is still using port 1426
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        
        println!("Checking if port 1426 is still in use...");
        
        // Try to find processes using port 1426
        let output = Command::new("lsof")
            .args(["-i", ":1426"])
            .output();
            
        if let Ok(output) = output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            
            // If we found processes still using the port
            if !output_str.is_empty() {
                println!("Found processes still using port 1426:\n{}", output_str);
                
                // Extract PIDs from lsof output (usually in second column)
                for line in output_str.lines().skip(1) { // Skip header
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(pid) = parts[1].parse::<u32>() {
                            println!("Force killing process {} using port 1426", pid);
                            
                            // Force kill with SIGKILL
                            let _ = Command::new("kill")
                                .args(["-9", &pid.to_string()])
                                .output();
                        }
                    }
                }
            } else {
                println!("No processes found using port 1426");
            }
        }
    }
    
    // Final health check to verify API is really stopped
    match reqwest::blocking::Client::new()
        .get("http://127.0.0.1:1426/health")
        .timeout(Duration::from_secs(1))
        .send() {
            Ok(_) => {
                return Err("API server is still responding after shutdown attempt".to_string());
            },
            Err(_) => {
                println!("API server stopped successfully - port 1426 is no longer responding");
            }
        }
    
    Ok(())
}

#[tauri::command]
fn redact_base64_image(image_data: String, config: String) -> Result<String, String> {
    // Submit the redaction request to the API server
    let client = reqwest::blocking::Client::new();
    
    // Create the request body without holding the full image_data string in memory twice
    let request_body = format!(
        "{{\"imageData\": \"{}\", \"config\": {}}}",
        image_data, config
    );
    
    // Clear the large strings to prevent multiple copies in memory
    let image_data_len = image_data.len();
    drop(image_data); // Explicitly drop large string to free memory
    drop(config);     // Explicitly drop config string
    
    // Log the size of processed data
    println!("Processing image data of size: {}KB", image_data_len / 1024);
    
    // Send the request
    let response = client
        .post("http://127.0.0.1:1426/redact/base64")
        .header("Content-Type", "application/json")
        .body(request_body) // Use the formatted body directly
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
    // First check if we already have a running process
    let process_guard = API_SERVER_HANDLE.lock().unwrap();
    
    if process_guard.is_some() {
        // We have a PID, so check if the process is still running
        let pid = process_guard.unwrap();
        
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            // On Windows, use tasklist to check if process exists
            match Command::new("tasklist")
                .args(["/FI", &format!("PID eq {}", pid)])
                .output() {
                Ok(output) => {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    // If the process ID is in the output, it's running
                    return Ok(output_str.contains(&pid.to_string()));
                }
                Err(_) => return Ok(false),
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command;
            // On Unix systems, use kill -0 to check if process exists
            match Command::new("kill")
                .args(["-0", &pid.to_string()])
                .output() {
                Ok(output) => {
                    // If exit code is 0, process exists
                    return Ok(output.status.success());
                }
                Err(_) => return Ok(false),
            }
        }
    }
    
    // We don't have a running process, OR process check failed
    // Fall back to HTTP check, but don't make the request if we just checked the PID
    match reqwest::blocking::Client::new()
        .get("http://127.0.0.1:1426/health")
        .timeout(Duration::from_secs(1))
        .send() {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false)
        }
}

fn main() {
    // Set up a cleanup handler for unexpected termination
    let orig_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        // Call the original hook
        orig_hook(panic_info);
        
        // Force cleanup in case of panic
        println!("Application panicking, attempting to clean up API processes...");
        let _ = find_and_kill_api_processes();
    }));
    
    // Register a CTRL+C handler for terminal signals
    ctrlc::set_handler(|| {
        println!("Received termination signal, cleaning up before exit");
        let _ = stop_api_server();
        std::process::exit(0);
    }).unwrap_or_else(|e| eprintln!("Error setting Ctrl-C handler: {}", e));
    
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Avoid multiple close attempts
                let mut is_closing = IS_CLOSING.lock().unwrap();
                if *is_closing {
                    return;
                }
                *is_closing = true;
                
                println!("Window close requested, stopping API server...");
                
                // Get a handle to the app
                let app_handle = window.app_handle();
                
                // Spawn a new task to handle shutdown
                tauri::async_runtime::spawn(async move {
                    // Clean up API server before closing
                    let attempts = 3;
                    for i in 1..=attempts {
                        println!("Stopping API server (attempt {}/{})", i, attempts);
                        match stop_api_server() {
                            Ok(_) => {
                                println!("API server stopped successfully");
                                break;
                            },
                            Err(e) => {
                                eprintln!("Failed to stop API server: {}", e);
                                if i == attempts {
                                    eprintln!("Maximum stop attempts reached, forcing exit");
                                } else {
                                    // Wait a moment before retrying
                                    std::thread::sleep(Duration::from_millis(500));
                                }
                            }
                        }
                    }
                    
                    // Force kill any remaining processes one last time
                    let _ = find_and_kill_api_processes();
                    println!("All cleanup completed, exiting application");
                });
                
                // Don't call window.close() here, as it would trigger another close event
                // Just let the window close naturally by returning
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
