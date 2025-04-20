use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::{imageops::blur, DynamicImage, GenericImage, GenericImageView, Rgba};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use tempfile::Builder;
use uuid::Uuid;

// Logging macro for consistent logging
macro_rules! log_info {
    ($($arg:tt)*) => {
        println!("[INFO] {}", format!($($arg)*));
    };
}

macro_rules! log_error {
    ($($arg:tt)*) => {
        eprintln!("[ERROR] {}", format!($($arg)*));
    };
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RedactionResult {
    pub left: u32,
    pub top: u32,
    pub width: u32,
    pub height: u32,
    pub entity_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RedactionConfig {
    pub redaction_method: Option<String>,
    #[serde(default)]
    pub enabled_types: std::collections::HashMap<String, bool>,
    #[serde(default)]
    pub custom_regexes: Vec<String>,
    #[serde(default)]
    pub deny_list_tags: Vec<String>,
    #[serde(default)]
    pub allow_list_tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Base64Request {
    pub image_data: String,
    pub config: Option<RedactionConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RedactionResponse {
    pub success: bool,
    pub redacted_image: Option<String>,
    pub error: Option<String>,
    pub output_path: Option<String>,
    pub redaction_count: usize,
}

pub struct ImageRedactor;

impl ImageRedactor {
    pub fn new() -> Self {
        log_info!("🔍 Initializing ImageRedactor");
        ImageRedactor
    }

    /// Basic redaction patterns for common PII
    #[allow(dead_code)]
    fn get_basic_patterns(&self) -> Vec<(String, Regex)> {
        vec![
            // Email pattern
            (
                "EMAIL".to_string(),
                Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b").unwrap(),
            ),
            // Phone number patterns (various formats)
            (
                "PHONE_NUMBER".to_string(),
                Regex::new(r"\b(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b").unwrap(),
            ),
            // Credit card pattern
            (
                "CREDIT_CARD".to_string(),
                Regex::new(r"\b(?:\d[ -]*?){13,16}\b").unwrap(),
            ),
            // IP address
            (
                "IP_ADDRESS".to_string(),
                Regex::new(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b").unwrap(),
            ),
            // SSN pattern
            (
                "US_SSN".to_string(),
                Regex::new(r"\b\d{3}[-]?\d{2}[-]?\d{4}\b").unwrap(),
            ),
        ]
    }

    /// Process custom regexes from configuration
    #[allow(dead_code)]
    fn process_custom_regex_patterns(&self, config: &RedactionConfig) -> Vec<(String, Regex)> {
        let mut custom_patterns = Vec::new();

        if let Some(true) = config.enabled_types.get("CUSTOM_REGEX") {
            for (i, pattern_str) in config.custom_regexes.iter().enumerate() {
                match Regex::new(pattern_str) {
                    Ok(regex) => {
                        custom_patterns.push((format!("CUSTOM_REGEX_{}", i), regex));
                    }
                    Err(e) => {
                        log_error!("Error creating regex from pattern '{}': {}", pattern_str, e);
                    }
                }
            }
        }

        custom_patterns
    }

    /// Filter redaction results against an allow list
    fn apply_allow_list(
        &self,
        results: Vec<RedactionResult>,
        allow_list: &[String],
    ) -> Vec<RedactionResult> {
        if allow_list.is_empty() {
            return results;
        }

        // Convert to lowercase and create a HashSet for efficient lookups
        let _allow_set: HashSet<String> = allow_list.iter().map(|s| s.to_lowercase()).collect();

        results
            .into_iter()
            .filter(|_res| {
                // In a real implementation, we would extract text from this region
                // and check if it's in the allow list. For now, we'll just pass through
                // all results since we don't have OCR capabilities yet.
                true
            })
            .collect()
    }

    /// Extract regions to redact (placeholder - would use OCR and PII detection in real implementation)
    fn detect_regions_to_redact(
        &self,
        image: &DynamicImage,
        config: &Option<RedactionConfig>,
    ) -> Vec<RedactionResult> {
        // In a full implementation, this would:
        // 1. Use OCR to extract text regions
        // 2. Check text against PII patterns
        // 3. Return regions to redact

        // For this simplified version, we'll return a dummy region
        // that's approximately 1/4 of the image in the center
        let (width, height) = image.dimensions();

        let mut results = Vec::new();

        // Add a dummy redaction in the center of the image
        results.push(RedactionResult {
            left: width / 4,
            top: height / 4,
            width: width / 2,
            height: height / 2,
            entity_type: "DEMO".to_string(),
        });

        // If we have a config with custom regexes, we should "detect" those too
        if let Some(config) = config {
            if let Some(true) = config.enabled_types.get("CUSTOM_REGEX") {
                // Real implementation would apply regexes to extracted text regions
                if !config.custom_regexes.is_empty() {
                    // Add a second dummy region for custom regexes
                    results.push(RedactionResult {
                        left: width / 3,
                        top: height / 3,
                        width: width / 4,
                        height: height / 4,
                        entity_type: "CUSTOM_REGEX".to_string(),
                    });
                }
            }
        }

        results
    }

    /// Apply redaction to the image
    fn apply_redaction(
        &self,
        image: &DynamicImage,
        regions: &[RedactionResult],
        method: &str,
    ) -> DynamicImage {
        let mut redacted_image = image.clone();
        let (img_width, img_height) = redacted_image.dimensions();

        for region in regions {
            let left = region.left;
            let top = region.top;
            let width = region.width;
            let height = region.height;

            // Ensure coordinates are within image bounds
            let left = left.min(img_width - 1);
            let top = top.min(img_height - 1);
            let width = width.min(img_width - left);
            let height = height.min(img_height - top);

            // Skip invalid regions
            if width == 0 || height == 0 {
                continue;
            }

            // For now, we implement blur and box redaction
            if method == "box" {
                // Apply black box redaction
                for y in top..top + height {
                    for x in left..left + width {
                        redacted_image.put_pixel(x, y, Rgba([0, 0, 0, 255]));
                    }
                }
            } else {
                // Apply blur redaction
                // For simplicity, we'll blur the entire region at once
                // Note: This is a simplified approach, a more sophisticated implementation
                // would crop the region, apply blur, and paste it back

                // Get the subimage as its own image buffer
                let sub_img = redacted_image.crop_imm(left, top, width, height);

                // Apply a strong blur
                let blurred = blur(&sub_img, 15.0);

                // Copy the blurred region back to the original image
                for (x, y, pixel) in blurred.enumerate_pixels() {
                    redacted_image.put_pixel(left + x, top + y, *pixel);
                }
            }
        }

        redacted_image
    }

    /// Redact an image from a file path
    pub fn redact_image(
        &self,
        image_path: &str,
        config: Option<RedactionConfig>,
    ) -> Result<RedactionResponse, String> {
        log_info!("🖼️ Redacting image from file: {}", image_path);

        // Load the image
        let image = match image::open(image_path) {
            Ok(img) => img,
            Err(e) => return Err(format!("Failed to load image: {}", e)),
        };

        // Get the redaction method from config or use default
        let method = config
            .as_ref()
            .and_then(|c| c.redaction_method.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("blur");

        // Detect regions to redact
        let regions = self.detect_regions_to_redact(&image, &config);

        // Filter regions if we have an allow list
        let regions = if let Some(config) = &config {
            self.apply_allow_list(regions, &config.allow_list_tags)
        } else {
            regions
        };

        // Apply redaction
        let redacted_image = self.apply_redaction(&image, &regions, method);

        // Generate output filename
        let output_path = self.generate_redacted_filename(image_path);

        // Save the redacted image
        match redacted_image.save(&output_path) {
            Ok(_) => {
                log_info!("✅ Redacted {} elements from image", regions.len());
                Ok(RedactionResponse {
                    success: true,
                    redacted_image: None,
                    error: None,
                    output_path: Some(output_path),
                    redaction_count: regions.len(),
                })
            }
            Err(e) => Err(format!("Failed to save redacted image: {}", e)),
        }
    }

    /// Redact an image from base64 data
    pub fn redact_image_base64(
        &self,
        base64_data: &str,
        config: Option<RedactionConfig>,
    ) -> Result<RedactionResponse, String> {
        log_info!("🖼️ Redacting image from base64 data");

        // Extract actual base64 data if it includes a header
        let base64_only = if base64_data.contains(",") {
            base64_data.split(",").nth(1).unwrap_or(base64_data)
        } else {
            base64_data
        };

        // Decode the base64 data
        let image_data = match BASE64.decode(base64_only) {
            Ok(data) => data,
            Err(e) => return Err(format!("Failed to decode base64 data: {}", e)),
        };

        // Create a temporary file to save the image
        let temp_dir = Builder::new()
            .prefix("redactor")
            .tempdir()
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        let temp_file_path = temp_dir.path().join(format!("temp_{}.png", Uuid::new_v4()));
        let _temp_file_path_str = temp_file_path
            .to_str()
            .ok_or_else(|| "Failed to convert temp path to string".to_string())?;

        // Write the decoded data to the temp file
        fs::write(&temp_file_path, &image_data)
            .map_err(|e| format!("Failed to write image data to temp file: {}", e))?;

        // Load the image from the temp file
        let image = match image::open(&temp_file_path) {
            Ok(img) => img,
            Err(e) => return Err(format!("Failed to load image from temp file: {}", e)),
        };

        // Get the redaction method from config or use default
        let method = config
            .as_ref()
            .and_then(|c| c.redaction_method.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("blur");

        // Detect regions to redact
        let regions = self.detect_regions_to_redact(&image, &config);

        // Filter regions if we have an allow list
        let regions = if let Some(config) = &config {
            self.apply_allow_list(regions, &config.allow_list_tags)
        } else {
            regions
        };

        // Apply redaction
        let redacted_image = self.apply_redaction(&image, &regions, method);

        // Create another temp file for the redacted image
        let redacted_temp_path = temp_dir
            .path()
            .join(format!("redacted_{}.jpg", Uuid::new_v4()));

        // Save the redacted image as JPEG
        match redacted_image.save(&redacted_temp_path) {
            Ok(_) => {
                // Read the redacted image file and encode to base64
                let redacted_bytes = fs::read(&redacted_temp_path)
                    .map_err(|e| format!("Failed to read redacted image: {}", e))?;

                let redacted_base64 = BASE64.encode(&redacted_bytes);

                // Construct the data URL
                let redacted_data_url = format!("data:image/jpeg;base64,{}", redacted_base64);

                log_info!("✅ Redacted {} elements from image", regions.len());
                Ok(RedactionResponse {
                    success: true,
                    redacted_image: Some(redacted_data_url),
                    error: None,
                    output_path: None,
                    redaction_count: regions.len(),
                })
            }
            Err(e) => Err(format!("Failed to save redacted image: {}", e)),
        }
    }

    /// Generate a filename for the redacted image
    fn generate_redacted_filename(&self, path: &str) -> String {
        let path = Path::new(path);

        // Get the directory and filename
        let dirname = path.parent().unwrap_or(Path::new("."));
        let filename = path.file_name().unwrap_or_default().to_string_lossy();

        // Split the filename into name and extension
        let parts: Vec<&str> = filename.split('.').collect();
        let (name, ext) = if parts.len() > 1 {
            let ext = parts.last().unwrap();
            let name = parts[0..parts.len() - 1].join(".");
            (name, ext.to_string())
        } else {
            (filename.to_string(), "png".to_string())
        };

        // Remove any existing -redacted suffix
        let name = if name.ends_with("-redacted") {
            name[0..name.len() - 9].to_string()
        } else {
            name.to_string()
        };

        // Create the new filename
        let new_filename = format!("{}-redacted.{}", name, ext);

        // Join with the directory
        dirname.join(new_filename).to_string_lossy().to_string()
    }
}
