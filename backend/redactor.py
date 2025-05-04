# redactor.py
import json
import logging
import re
from PIL import Image, ImageFilter
import os
import sys

from presidio_analyzer import (
    AnalyzerEngine,
    PatternRecognizer,
    Pattern,
    RecognizerRegistry,
)
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_analyzer.context_aware_enhancers import LemmaContextAwareEnhancer
from presidio_image_redactor import ImageAnalyzerEngine

logger = logging.getLogger("redactor")
logging.basicConfig(level=logging.INFO)


class ImageRedactor:
    def __init__(self):
        logger.info("🔍 Initializing ImageRedactor with comprehensive PII detection")

        # Get the base path for the application
        if getattr(sys, "frozen", False):
            # Running in a bundle (PyInstaller)
            base_path = sys._MEIPASS
            model_path = os.path.join(base_path, "en_core_web_trf")
            logger.info(f"Running in bundle, using model path: {model_path}")
        else:
            # Running in normal Python environment
            base_path = os.path.dirname(os.path.abspath(__file__))
            model_path = "en_core_web_trf"
            logger.info(
                f"Running in normal environment, using model path: {model_path}"
            )

        # Set up the NLP engine with spaCy using a larger model for better accuracy
        provider = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": model_path}],
            }
        )
        nlp_engine = provider.create_engine()

        # Create custom recognizers for enhanced PII detection
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers()

        # Add custom recognizers for various PII types
        self._add_custom_recognizers(registry)

        # Create a more sensitive context enhancer
        context_enhancer = LemmaContextAwareEnhancer(
            context_similarity_factor=0.65,  # Higher similarity factor (default is 0.35)
            min_score_with_context_similarity=0.4,
        )

        # Initialize the analyzer with our custom configuration
        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            registry=registry,
            context_aware_enhancer=context_enhancer,
            supported_languages=["en"],
        )

        # Get all supported entities for logging
        self.supported_entities = self.analyzer.get_supported_entities(language="en")
        logger.info(
            f"Supported entities for redaction: {', '.join(self.supported_entities)}"
        )

        # Initialize the image analyzer with our analyzer engine
        self.image_analyzer = ImageAnalyzerEngine(analyzer_engine=self.analyzer)

    def _add_custom_recognizers(self, registry):
        """Add custom recognizers to improve PII detection."""

        # 1. Better generic ID pattern (alphanumeric sequences that look like IDs)
        generic_id_pattern = Pattern(
            name="generic_id_pattern",
            regex=r"\b([A-Z0-9]{2,}[-\s]?[0-9]{4,})\b",
            score=0.65,
        )

        # 2. App-specific IDs (like slack message IDs, JIRA tickets, etc.)
        app_id_pattern = Pattern(
            name="app_id_pattern",
            regex=r"\b([A-Z]+-[0-9]+|[A-Z]{2,}[0-9]{3,})\b",
            score=0.6,
        )

        # 3. API keys and tokens (often appear in debug screenshots)
        api_key_pattern = Pattern(
            name="api_key_pattern", regex=r"\b([a-zA-Z0-9_\-\.]{20,})\b", score=0.7
        )

        # 4. Database connection strings
        db_conn_pattern = Pattern(
            name="db_connection_pattern",
            regex=r"(?i)(mongodb|mysql|postgres|jdbc):[\/\\]{2}[^\s]+",
            score=0.8,
        )

        # Add ID recognizers
        id_recognizer = PatternRecognizer(
            supported_entity="ID_NUMBER",
            patterns=[generic_id_pattern, app_id_pattern],
            context=[
                "id",
                "number",
                "code",
                "identification",
                "identity",
                "account",
                "user",
            ],
        )
        registry.add_recognizer(id_recognizer)

        # Add API key recognizer
        api_recognizer = PatternRecognizer(
            supported_entity="API_KEY",
            patterns=[api_key_pattern],
            context=["api", "key", "token", "secret", "auth"],
        )
        registry.add_recognizer(api_recognizer)

        # Add connection string recognizer
        conn_recognizer = PatternRecognizer(
            supported_entity="CONNECTION_STRING",
            patterns=[db_conn_pattern],
            context=["connection", "database", "db", "connect"],
        )
        registry.add_recognizer(conn_recognizer)

        # Add name recognizer with titles
        name_titles = [
            "Mr",
            "Mr.",
            "Mrs",
            "Mrs.",
            "Ms",
            "Ms.",
            "Dr",
            "Dr.",
            "Prof",
            "Prof.",
        ]
        name_title_recognizer = PatternRecognizer(
            supported_entity="PERSON",  # Use standard PERSON entity
            deny_list=name_titles,
            supported_language="en",
            context=["name", "person"],
        )
        registry.add_recognizer(name_title_recognizer)

        # Add username/handle recognizer (common in screenshots)
        username_pattern = Pattern(
            name="username_pattern", regex=r"@[a-zA-Z0-9_\-.]+", score=0.65
        )
        username_recognizer = PatternRecognizer(
            supported_entity="USERNAME",
            patterns=[username_pattern],
            context=["user", "username", "handle"],
        )
        registry.add_recognizer(username_recognizer)

        # ADDITIONAL DOCUMENT AND AUTHENTICATION RECOGNIZERS

        # 5. Passport number patterns (various formats)
        passport_patterns = [
            Pattern(
                name="us_passport", regex=r"\b[0-9]{9}\b", score=0.6  # US passport
            ),
            Pattern(
                name="general_passport",
                regex=r"\b[A-Z]{1,2}[0-9]{6,9}\b",  # Common format for many countries
                score=0.6,
            ),
        ]
        passport_recognizer = PatternRecognizer(
            supported_entity="PASSPORT",
            patterns=passport_patterns,
            context=["passport", "travel", "document", "pass", "citizenship"],
        )
        registry.add_recognizer(passport_recognizer)

        # 6. Birth certificate information
        birth_cert_patterns = [
            Pattern(
                name="birth_cert_number",
                regex=r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b",  # Common birth cert number format
                score=0.6,
            ),
            Pattern(
                name="birth_date_format",
                regex=r"\b(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\d{4}\b",  # MM/DD/YYYY
                score=0.5,
            ),
        ]
        birth_cert_recognizer = PatternRecognizer(
            supported_entity="BIRTH_CERTIFICATE",
            patterns=birth_cert_patterns,
            context=["birth", "certificate", "born", "birth date", "registry", "vital"],
        )
        registry.add_recognizer(birth_cert_recognizer)

        # 7. License card numbers
        license_patterns = [
            Pattern(
                name="driver_license",
                regex=r"\b[A-Z][0-9]{3,7}\b|\b[A-Z][0-9]{5,7}\b|\b[A-Z]{1,2}[0-9]{4,8}\b",
                score=0.6,
            ),
            Pattern(
                name="license_with_dashes",
                regex=r"\b[A-Z0-9]{1,3}[-][0-9]{3,7}[-][0-9]{3,7}\b",
                score=0.65,
            ),
        ]
        license_recognizer = PatternRecognizer(
            supported_entity="DRIVER_LICENSE",
            patterns=license_patterns,
            context=[
                "license",
                "driver",
                "driving",
                "operator",
                "permit",
                "identification",
            ],
        )
        registry.add_recognizer(license_recognizer)

        # 8. Bank/credit card numbers
        card_patterns = [
            Pattern(
                name="card_number",
                regex=r"\b(?:\d[ -]*?){13,16}\b",  # Credit card numbers with optional spaces/dashes
                score=0.6,
            ),
            Pattern(
                name="amex_card",
                regex=r"\b3[47][0-9]{2}[ -]*?[0-9]{6}[ -]*?[0-9]{5}\b",  # AMEX format
                score=0.7,
            ),
            Pattern(
                name="masked_card",
                regex=r"\b(?:\*{4}[ -]*?){3}[0-9]{4}\b",  # Masked card format
                score=0.7,
            ),
        ]
        card_recognizer = PatternRecognizer(
            supported_entity="CREDIT_CARD",
            patterns=card_patterns,
            context=[
                "card",
                "credit",
                "debit",
                "payment",
                "visa",
                "mastercard",
                "amex",
                "discover",
            ],
        )
        registry.add_recognizer(card_recognizer)

        # 9. Visa/immigration document numbers
        visa_patterns = [
            Pattern(
                name="visa_number",
                regex=r"\b[A-Z0-9]{8,13}\b",  # Common visa number format
                score=0.55,
            ),
            Pattern(
                name="alien_registration",
                regex=r"\b[A-Z][-]?[0-9]{8,10}\b",  # Alien registration number format
                score=0.6,
            ),
        ]
        visa_recognizer = PatternRecognizer(
            supported_entity="VISA_DOCUMENT",
            patterns=visa_patterns,
            context=["visa", "immigration", "alien", "foreign", "residence", "travel"],
        )
        registry.add_recognizer(visa_recognizer)

        # 10. Web app names/URLs (beyond standard URL detection)
        web_app_patterns = [
            Pattern(
                name="web_subdomain",
                regex=r"(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[a-zA-Z0-9()@:%_\+.~#?&\/=]*)?",
                score=0.7,
            ),
            Pattern(
                name="app_domains",
                regex=r"\b(?:slack|teams|github|jira|confluence|azure|aws)\.(?:com|net|org|io)\b",
                score=0.8,
            ),
        ]
        web_app_recognizer = PatternRecognizer(
            supported_entity="WEB_APP",
            patterns=web_app_patterns,
            context=["website", "app", "web", "site", "portal", "dashboard"],
        )
        registry.add_recognizer(web_app_recognizer)

        # 11. Authentication information (passwords, secrets, etc.)
        auth_patterns = [
            Pattern(
                name="password_field",
                regex=r"(?i)(?:password|passwd|pwd)[\s:].*",  # Password field with content
                score=0.85,
            ),
            Pattern(
                name="secret_field",
                regex=r"(?i)(?:secret|key|token)[\s:].*",  # Secret field with content
                score=0.85,
            ),
            Pattern(
                name="authentication_header",
                regex=r"(?i)authorization:\s*bearer\s+[a-zA-Z0-9_\-.]+",  # Auth headers
                score=0.85,
            ),
        ]
        auth_recognizer = PatternRecognizer(
            supported_entity="AUTHENTICATION",
            patterns=auth_patterns,
            context=[
                "login",
                "auth",
                "password",
                "credential",
                "key",
                "secret",
                "access",
            ],
        )
        registry.add_recognizer(auth_recognizer)

        # 12. ID card specific formats
        id_card_patterns = [
            Pattern(
                name="national_id",
                regex=r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b",  # SSN-like format
                score=0.6,
            ),
            Pattern(
                name="alphanum_id_card",
                regex=r"\b[A-Z]{1,3}[0-9]{5,9}\b",  # Common alphanumeric ID format
                score=0.6,
            ),
        ]
        id_card_recognizer = PatternRecognizer(
            supported_entity="ID_CARD",
            patterns=id_card_patterns,
            context=["identification", "identity", "card", "id card", "national"],
        )
        registry.add_recognizer(id_card_recognizer)

    def _sanitize_regex_pattern(self, pattern):
        """Sanitize regex pattern by removing strict anchors and making it more flexible for image text."""
        try:
            # Check if the pattern already has regex special characters
            has_regex_special_chars = any(c in pattern for c in r".*+?()[]{}|^$\\")

            if has_regex_special_chars:
                # It's already a regex pattern, just remove beginning and end anchors
                pattern = pattern.replace("^", "")
                pattern = pattern.replace("$", "")

                # Remove word boundaries if already present (we'll add our own)
                pattern = pattern.replace("\\b", "")

                # Add word boundary if not already present
                pattern = "\\b" + pattern + "\\b"
            else:
                # It's a simple string, treat it as a partial match pattern
                # Escape special regex characters
                pattern = re.escape(pattern)

                # Don't add word boundaries to allow partial matches
                # This is the key change for partial matching

            # Special case for purely numeric patterns (like 1050)
            if re.match(r"^\\b\d+\\b$", pattern):
                pattern = pattern.replace("\\b", "", 1)

            return pattern
        except Exception as e:
            logger.error(f"Error sanitizing pattern '{pattern}': {str(e)}")
            return pattern

    def _create_custom_recognizers_from_config(self, config):
        """Create custom recognizers based on configuration from frontend"""
        ad_hoc_recognizers = []

        # Only process if config is provided
        if not config:
            return ad_hoc_recognizers

        # Check if custom regex is enabled and patterns are provided
        if config.get("enabledTypes", {}).get("CUSTOM_REGEX") and config.get(
            "customRegexes"
        ):
            regex_patterns = config["customRegexes"]
            logger.info(f"Processing {len(regex_patterns)} custom regex patterns")

            # Bundle all patterns into a single recognizer to improve performance
            patterns = []
            for i, regex_pattern in enumerate(regex_patterns):
                try:
                    # Sanitize the pattern to make it more suitable for image text matching
                    sanitized_pattern = self._sanitize_regex_pattern(regex_pattern)

                    # Create a pattern with the custom regex
                    pattern = Pattern(
                        name=f"custom_pattern_{i}", regex=sanitized_pattern, score=0.75
                    )
                    patterns.append(pattern)
                except Exception as e:
                    logger.error(
                        f"Error adding custom regex pattern '{regex_pattern}': {str(e)}"
                    )

            if patterns:
                # Create a single recognizer with all patterns
                custom_recognizer = PatternRecognizer(
                    supported_entity="CUSTOM_REGEX", patterns=patterns
                )
                ad_hoc_recognizers.append(custom_recognizer)

        # Check if deny list is enabled
        if config.get("enabledTypes", {}).get("DENY_LIST") and config.get(
            "denyListTags"
        ):
            try:
                # Create a deny list recognizer
                deny_list_recognizer = PatternRecognizer(
                    supported_entity="DENY_LIST",
                    deny_list=config["denyListTags"],
                    supported_language="en",
                )

                ad_hoc_recognizers.append(deny_list_recognizer)
                logger.info(f"Added deny list with {len(config['denyListTags'])} items")
            except Exception as e:
                logger.error(f"Error adding deny list: {str(e)}")

        # Return the list of ad hoc recognizers
        return ad_hoc_recognizers

    def redact_image(self, image_path: str, config: dict = None) -> str:
        logger.info(f"🖼️ Redacting image from file: {image_path}")
        image = Image.open(image_path)
        original_format = image.format  # Save the original image format

        # Process configuration if provided
        allow_list = []
        custom_regexes = []

        if (
            config
            and config.get("enabledTypes", {}).get("ALLOW_LIST")
            and config.get("allowListTags")
        ):
            allow_list = config["allowListTags"]
            logger.info(f"Using allow list with {len(allow_list)} items")

        if (
            config
            and config.get("enabledTypes", {}).get("CUSTOM_REGEX")
            and config.get("customRegexes")
        ):
            custom_regexes = config["customRegexes"]

        # Create custom recognizers from config
        ad_hoc_recognizers = []
        if config:
            ad_hoc_recognizers = self._create_custom_recognizers_from_config(config)

        redacted_image, results = self._blur_redact(
            image, ad_hoc_recognizers, allow_list, custom_regexes, config
        )

        # Generate output filename with proper handling to avoid double -redacted suffix
        def generate_redacted_filename(path):
            # Split the path into directory, name, and extension
            dirname, filename = os.path.split(path)
            name, ext = os.path.splitext(filename)

            # Remove any existing -redacted suffix
            if name.endswith("-redacted"):
                name = name[:-9]  # remove the '-redacted' part

            # Create the new path
            new_filename = f"{name}-redacted{ext}"
            return os.path.join(dirname, new_filename)

        output_path = generate_redacted_filename(image_path)

        # Save with the original format if possible, fallback to PNG
        try:
            redacted_image.save(output_path, format=original_format)
        except Exception as e:
            logger.warning(
                f"Could not save in original format {original_format}: {e}. Falling back to PNG."
            )
            # If original format saving fails, try PNG as fallback
            output_path = output_path.rsplit(".", 1)[0] + ".png"
            redacted_image.save(output_path, format="PNG")

        logger.info(
            f"✅ Redacted {len(results)} elements from image: {', '.join(set(r.entity_type for r in results))}"
        )
        return json.dumps(
            {
                "success": True,
                "outputPath": output_path,
                "redactionCount": len(results),
            }
        )

    def redact_image_base64(self, base64_data: str, config: dict = None) -> str:
        """
        Redact PII from a base64 encoded image

        Args:
            base64_data: Base64 encoded image data
            config: Optional configuration for redaction

        Returns:
            JSON string with redacted image in base64 and metadata
        """
        try:
            import base64
            import io
            import gc

            # Log the size of the incoming data
            data_size_kb = len(base64_data) / 1024
            logger.info(f"Processing base64 image of size: {data_size_kb:.2f}KB")

            # Find the header and extract the data
            if "," in base64_data:
                header, encoded = base64_data.split(",", 1)
            else:
                header = "data:image/jpeg;base64"
                encoded = base64_data

            # Convert to bytes
            image_bytes = base64.b64decode(encoded)

            # Clear large string to help garbage collection
            encoded = None

            # Open image from bytes
            image = Image.open(io.BytesIO(image_bytes))

            # Clear bytes to help garbage collection
            image_bytes = None
            gc.collect()

            # Handle RGBA to RGB conversion if needed (for JPEG output)
            if image.mode == "RGBA":
                # Create a white background
                background = Image.new("RGB", image.size, (255, 255, 255))
                # Paste the image using the alpha channel as mask
                background.paste(image, mask=image.split()[3])
                image = background

            # Process image with redaction
            redaction_method = "blur"
            if config and "redactionMethod" in config:
                redaction_method = config["redactionMethod"]

            # Get custom recognizers from config
            ad_hoc_recognizers = None
            if config and "enabledTypes" in config:
                ad_hoc_recognizers = self._create_custom_recognizers_from_config(config)

            # Allow list processing
            allow_list = None
            if config and "allowListTags" in config:
                allow_list = config["allowListTags"]

            # Custom regex support
            custom_regexes = None
            if config and "customRegexes" in config:
                # Only use if enabled in config
                if config.get("enabledTypes", {}).get("CUSTOM_REGEX", False):
                    custom_regexes = config["customRegexes"]

            # Redact the image based on method
            if redaction_method == "box":
                redacted_img, redaction_results = self._box_redact(
                    image, ad_hoc_recognizers, allow_list, custom_regexes
                )
            else:  # Default to blur method
                redacted_img, redaction_results = self._blur_redact(
                    image, ad_hoc_recognizers, allow_list, custom_regexes, config
                )

            # Count redactions applied
            redaction_count = len(redaction_results)

            # Save redacted image to bytes
            output_buffer = io.BytesIO()
            redacted_img.save(output_buffer, format="JPEG", quality=95)
            redacted_base64 = base64.b64encode(output_buffer.getvalue()).decode("utf-8")

            # Clear the original image and redacted image
            image = None
            redacted_img = None
            output_buffer = None
            gc.collect()

            # Create JSON result with metadata
            result = {
                "success": True,
                "redactedImage": f"data:image/jpeg;base64,{redacted_base64}",
                "redactionCount": redaction_count,
            }

            # Clear the base64 result
            redacted_base64 = None
            gc.collect()

            return json.dumps(result)
        except Exception as e:
            logger.exception(f"Error redacting base64 image: {str(e)}")
            return json.dumps({"success": False, "error": str(e)})
        finally:
            # Ensure all large objects are cleared
            if "image" in locals() and image is not None:
                image = None
            if "redacted_img" in locals() and redacted_img is not None:
                redacted_img = None
            if "output_buffer" in locals() and output_buffer is not None:
                output_buffer = None
            if "redacted_base64" in locals() and redacted_base64 is not None:
                redacted_base64 = None
            gc.collect()

    def _is_match(self, text, pattern, partial_match=True):
        """Helper method for consistent matching between allow and deny lists.

        Args:
            text: The text to check for matches
            pattern: The pattern to match against
            partial_match: Whether to allow partial matching (substring) or require exact matching

        Returns:
            bool: True if there's a match, False otherwise
        """
        if not text or not pattern:
            return False

        text = text.lower().strip()
        pattern = pattern.lower().strip()

        if partial_match:
            # Substring matching - pattern is anywhere in the text
            return pattern in text
        else:
            # Exact matching - pattern equals the entire text
            return pattern == text

    def _blur_redact(
        self,
        image: Image.Image,
        ad_hoc_recognizers=None,
        allow_list=None,
        custom_regexes=None,
        config=None,
    ):
        # Default to partial matching if not specified in config
        partial_match = True
        if config and "partialMatch" in config:
            partial_match = config.get("partialMatch", True)
            logger.info(
                f"Using {'partial' if partial_match else 'exact'} matching mode"
            )

        # First, let's extract text from the image for allow list and custom regex handling
        extracted_text_dict = None
        has_pytesseract = False

        # Get deny list from ad_hoc_recognizers if available
        deny_list = []
        for recognizer in ad_hoc_recognizers or []:
            if (
                hasattr(recognizer, "supported_entity")
                and recognizer.supported_entity == "DENY_LIST"
            ):
                if hasattr(recognizer, "deny_list"):
                    deny_list = recognizer.deny_list
                    logger.info(
                        f"Using deny list with {len(deny_list)} items for custom matching"
                    )

        # Store matched deny list text blocks
        deny_list_matches = []

        try:
            import pytesseract

            has_pytesseract = True
            extracted_text_dict = pytesseract.image_to_data(
                image, output_type=pytesseract.Output.DICT
            )
            logger.info(
                f"Extracted {len(extracted_text_dict['text'])} text blocks from image"
            )

            # Apply deny list with partial matching support if we have text extraction
            if deny_list and len(deny_list) > 0:
                for i, text in enumerate(extracted_text_dict["text"]):
                    text = text.strip()
                    if not text:
                        continue

                    # Extract text block information
                    left = extracted_text_dict["left"][i]
                    top = extracted_text_dict["top"][i]
                    width = extracted_text_dict["width"][i]
                    height = extracted_text_dict["height"][i]

                    # Check if this text matches any deny list entry
                    for denied in deny_list:
                        if self._is_match(text, denied, partial_match=partial_match):
                            logger.info(
                                f"Deny list match: '{denied}' matched in '{text}'"
                            )

                            # Create a result object for redaction
                            class DenyListRedactionResult:
                                def __init__(self, left, top, width, height):
                                    self.left = left
                                    self.top = top
                                    self.width = width
                                    self.height = height
                                    self.entity_type = "DENY_LIST"

                            result = DenyListRedactionResult(left, top, width, height)
                            deny_list_matches.append(result)
                            break  # Move to next text block after finding a match

        except (ImportError, Exception) as e:
            logger.warning(f"Could not use pytesseract for text extraction: {str(e)}")

        # Process custom redactions from regex patterns
        custom_redactions = []

        # If we have custom regexes and text extraction worked, find matches directly
        if (
            has_pytesseract
            and extracted_text_dict
            and custom_regexes
            and len(custom_regexes) > 0
        ):
            for i, text in enumerate(extracted_text_dict["text"]):
                text = text.strip()
                if not text:
                    continue

                # Extract text block information
                left = extracted_text_dict["left"][i]
                top = extracted_text_dict["top"][i]
                width = extracted_text_dict["width"][i]
                height = extracted_text_dict["height"][i]

                # Check each regex pattern against this text
                for regex_pattern in custom_regexes:
                    try:
                        # Remove strict anchors for more flexible matching
                        sanitized_pattern = self._sanitize_regex_pattern(regex_pattern)

                        # Create regex pattern
                        pattern = re.compile(sanitized_pattern, re.IGNORECASE)

                        # Check for match
                        match = pattern.search(text)
                        if match:
                            logger.info(
                                f"Custom regex match: '{regex_pattern}' matched '{text}'"
                            )

                            # Create a result object for redaction
                            class CustomRedactionResult:
                                def __init__(self, left, top, width, height):
                                    self.left = left
                                    self.top = top
                                    self.width = width
                                    self.height = height
                                    self.entity_type = "CUSTOM_REGEX"

                            result = CustomRedactionResult(left, top, width, height)
                            custom_redactions.append(result)
                            break  # Move to next text block after finding a match
                    except Exception as e:
                        logger.error(
                            f"Error matching pattern '{regex_pattern}': {str(e)}"
                        )

        # Analyze the image for PII entities
        try:
            # Analyze using image_analyzer's analyze method with appropriate parameters
            results = self.image_analyzer.analyze(
                image=image,
                ad_hoc_recognizers=ad_hoc_recognizers or [],
            )

            logger.info(f"Found {len(results)} entities via analyzer")
        except Exception as e:
            logger.error(f"Error during image analysis: {str(e)}")
            # Fallback to a simpler analyze call if the above fails
            results = self.image_analyzer.analyze(image=image)
            logger.info(f"Fallback analysis found {len(results)} entities")

        # Create a copy of the image to redact
        redacted_image = image.copy()

        # If no results found and no custom redactions, return original image
        if not results and not custom_redactions:
            logger.info("No PII entities detected in image")
            return redacted_image, []

        # Apply allow list filtering
        filtered_results = []
        allow_list_ignored = 0

        for res in results:
            should_redact = True

            # Get the coordinates of this entity
            left = int(res.left)
            top = int(res.top)
            width = int(res.width)
            height = int(res.height)
            right = left + width
            bottom = top + height

            # Enhanced allow list processing using the text in this bounding box
            if allow_list and len(allow_list) > 0:
                # First check if we have pytesseract results to use
                if has_pytesseract and extracted_text_dict:
                    # Check all text blocks that might overlap with this entity
                    for i in range(len(extracted_text_dict["text"])):
                        text = extracted_text_dict["text"][i].strip()
                        if not text:
                            continue

                        # Get text block coordinates
                        t_left = extracted_text_dict["left"][i]
                        t_top = extracted_text_dict["top"][i]
                        t_width = extracted_text_dict["width"][i]
                        t_height = extracted_text_dict["height"][i]
                        t_right = t_left + t_width
                        t_bottom = t_top + t_height

                        # Check for overlap between entity and text block
                        if (
                            left < t_right
                            and right > t_left
                            and top < t_bottom
                            and bottom > t_top
                        ):
                            # Check if this text matches any allow list entry
                            for allowed in allow_list:
                                if self._is_match(
                                    text, allowed, partial_match=partial_match
                                ):
                                    should_redact = False
                                    allow_list_ignored += 1
                                    break
                # Fallback to simpler checking if extract_text is not available
                elif hasattr(res, "text") and res.text:
                    for allowed in allow_list:
                        if self._is_match(
                            res.text, allowed, partial_match=partial_match
                        ):
                            should_redact = False
                            allow_list_ignored += 1
                            break

            if should_redact:
                filtered_results.append(res)

        if allow_list_ignored > 0:
            logger.info(f"Filtered {allow_list_ignored} items based on allow list")

        # Combine filtered results with custom redactions
        all_results = filtered_results + custom_redactions + deny_list_matches

        # Process and apply redactions
        for res in all_results:
            try:
                # Extract bounding box with careful attribute access
                left = int(getattr(res, "left", 0))
                top = int(getattr(res, "top", 0))
                width = int(getattr(res, "width", 0))
                height = int(getattr(res, "height", 0))
                right = left + width
                bottom = top + height

                # Ensure the coordinates are within image bounds
                img_width, img_height = redacted_image.size
                left = max(0, left)
                top = max(0, top)
                right = min(img_width, right)
                bottom = min(img_height, bottom)

                # Skip if coordinates are invalid
                if left >= right or top >= bottom:
                    continue

                # Crop the region to blur
                region = redacted_image.crop((left, top, right, bottom))

                # Apply strong blur to the cropped region
                blurred_region = region.filter(ImageFilter.GaussianBlur(radius=15))

                # Paste blurred region back to the image
                redacted_image.paste(blurred_region, (left, top))
            except Exception as e:
                logger.error(f"Error applying redaction: {str(e)}")

        return redacted_image, all_results
