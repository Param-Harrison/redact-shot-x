# redactor.py
import json
import base64
import logging
from io import BytesIO
from PIL import Image, ImageFilter

from presidio_analyzer import (
    AnalyzerEngine,
    PatternRecognizer,
    Pattern,
    RecognizerRegistry,
)
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_analyzer.context_aware_enhancers import LemmaContextAwareEnhancer
from presidio_image_redactor.image_analyzer_engine import ImageAnalyzerEngine

logger = logging.getLogger("redactor")
logging.basicConfig(level=logging.INFO)


class ImageRedactor:
    def __init__(self):
        logger.info("🔍 Initializing ImageRedactor with comprehensive PII detection")

        # Set up the NLP engine with spaCy using a larger model for better accuracy
        provider = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": "en_core_web_trf"}],
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
            for i, regex_pattern in enumerate(config["customRegexes"]):
                try:
                    # Create a pattern with the custom regex
                    pattern = Pattern(
                        name=f"custom_pattern_{i}", regex=regex_pattern, score=0.75
                    )

                    # Create a recognizer for this pattern
                    custom_recognizer = PatternRecognizer(
                        supported_entity=f"CUSTOM_{i}", patterns=[pattern]
                    )

                    ad_hoc_recognizers.append(custom_recognizer)
                    logger.info(f"Added custom regex pattern: {regex_pattern}")
                except Exception as e:
                    logger.error(
                        f"Error adding custom regex pattern '{regex_pattern}': {str(e)}"
                    )

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

        # Process configuration if provided
        allow_list = []
        if (
            config
            and config.get("enabledTypes", {}).get("ALLOW_LIST")
            and config.get("allowListTags")
        ):
            allow_list = config["allowListTags"]
            logger.info(f"Using allow list with {len(allow_list)} items")

        # Create custom recognizers from config
        ad_hoc_recognizers = []
        if config:
            ad_hoc_recognizers = self._create_custom_recognizers_from_config(config)
            logger.info(
                f"Created {len(ad_hoc_recognizers)} custom recognizers from configuration"
            )

        redacted_image, results = self._blur_redact(
            image, ad_hoc_recognizers, allow_list
        )

        output_path = image_path.replace(".", "-redacted.")
        redacted_image.save(output_path)

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
        logger.info("🧠 Redacting image from base64 input")

        # Process configuration if provided
        allow_list = []
        if (
            config
            and config.get("enabledTypes", {}).get("ALLOW_LIST")
            and config.get("allowListTags")
        ):
            allow_list = config["allowListTags"]
            logger.info(f"Using allow list with {len(allow_list)} items")

        # Create custom recognizers from config
        ad_hoc_recognizers = []
        if config:
            ad_hoc_recognizers = self._create_custom_recognizers_from_config(config)
            logger.info(
                f"Created {len(ad_hoc_recognizers)} custom recognizers from configuration"
            )

        # Process the image data
        image_data = base64.b64decode(
            base64_data.split(",")[1] if "," in base64_data else base64_data
        )
        image = Image.open(BytesIO(image_data))
        redacted_image, results = self._blur_redact(
            image, ad_hoc_recognizers, allow_list
        )

        buffered = BytesIO()
        redacted_image.save(buffered, format="PNG")
        redacted_base64 = base64.b64encode(buffered.getvalue()).decode()

        logger.info(
            f"✅ Redacted {len(results)} elements from base64 image: {', '.join(set(r.entity_type for r in results))}"
        )
        return json.dumps(
            {
                "success": True,
                "redactedImage": f"data:image/png;base64,{redacted_base64}",
                "redactionCount": len(results),
            }
        )

    def _blur_redact(
        self, image: Image.Image, ad_hoc_recognizers=None, allow_list=None
    ):
        # Analyze the image for PII entities with higher sensitivity settings
        try:
            # Analyze using image_analyzer's analyze method with appropriate parameters
            results = self.image_analyzer.analyze(
                image=image,
                ad_hoc_recognizers=ad_hoc_recognizers or [],
            )

            logger.info(f"Found {len(results)} entities to redact")
        except Exception as e:
            logger.error(f"Error during image analysis: {str(e)}")
            # Fallback to a simpler analyze call if the above fails
            results = self.image_analyzer.analyze(image=image)
            logger.info(f"Fallback analysis found {len(results)} entities to redact")

        # Create a copy of the image to redact
        redacted_image = image.copy()

        # If no results found, return original image
        if not results:
            logger.info("No PII entities detected in image")
            return redacted_image, []

        # Filter results based on allow list if provided
        filtered_results = results
        if allow_list and len(allow_list) > 0:
            filtered_results = []
            for res in results:
                # Check if the text value is in the allow list
                if hasattr(res, "text") and res.text in allow_list:
                    logger.info(
                        f"Skipping redaction for text in allow list: {res.text}"
                    )
                    continue
                filtered_results.append(res)

            logger.info(
                f"Filtered {len(results) - len(filtered_results)} items from redaction (allow list)"
            )
            results = filtered_results

        # Process and apply redactions
        for res in results:
            # Extract bounding box
            left = int(res.left)
            top = int(res.top)
            width = int(res.width)
            height = int(res.height)
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

            # Apply stronger blur to the cropped region
            blurred_region = region.filter(ImageFilter.GaussianBlur(radius=15))

            # Paste blurred region back to the image
            redacted_image.paste(blurred_region, (left, top))

        return redacted_image, results
