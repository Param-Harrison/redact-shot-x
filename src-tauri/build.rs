fn main() {
    // Automatically include all capabilities' permissions
    // This is required for the tauri::generate_context!() macro to work
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}
