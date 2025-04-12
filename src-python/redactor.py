#!/usr/bin/env python3
"""
RedactShotX - Image PII Redaction Module
This module handles OCR and PII detection/redaction using Microsoft Presidio.
"""

import os
import sys
import json
import argparse
from typing import Dict, List, Any, Optional, Tuple
import base64
from io import BytesIO
import logging

# Image processing
from PIL import Image

# Microsoft Presidio for PII detection
try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_image_redactor import ImageRedactorEngine
    from presidio_image_redactor.image_analyzer_engine import ImageAnalyzerEngine
except ImportError:
    print("Microsoft Presidio not found. Installing required packages...")
    import subprocess

    subprocess.check_call(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "presidio-analyzer",
            "presidio-image-redactor",
            "spacy",
        ]
    )
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_lg"])

    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_image_redactor import ImageRedactorEngine
    from presidio_image_redactor.image_analyzer_engine import ImageAnalyzerEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("redactor")


class ImageRedactor:
    """Main class for image redaction operations"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the redactor with configuration options."""
        self.config = config or {}

        # Set up NLP engine (spaCy) for text analysis
        provider = NlpEngineProvider(nlp_configuration={"lang_code": "en"})
        nlp_engine = provider.create_engine()

        # Create analyzer for PII detection
        self.analyzer = AnalyzerEngine(nlp_engine=nlp_engine)

        # Create image analyzer that combines OCR and PII detection
        self.image_analyzer = ImageAnalyzerEngine(self.analyzer)

        # Create image redactor
        self.image_redactor = ImageRedactorEngine()

        logger.info("ImageRedactor initialized successfully")

    def _get_enabled_entities(self) -> List[str]:
        """Get list of enabled entity types from config."""
        enabled_types = self.config.get("enabledTypes", {})
        return [entity for entity, enabled in enabled_types.items() if enabled]

    def _process_allow_deny_lists(self) -> Tuple[List[str], List[str]]:
        """Extract allow and deny lists from config."""
        allow_list = self.config.get("allowListTags", [])
        deny_list = self.config.get("denyListTags", [])
        return allow_list, deny_list

    def _get_redaction_method(self) -> str:
        """Get the redaction method (blur or box) from config."""
        return self.config.get("redactionMethod", "blur")

    def redact_image(self, image_path: str) -> str:
        """
        Process an image to detect and redact PII.

        Args:
            image_path: Path to the input image

        Returns:
            Path to the redacted image
        """
        try:
            logger.info(f"Processing image: {image_path}")

            # Load image
            image = Image.open(image_path)

            # Get enabled entities
            entities = self._get_enabled_entities()
            logger.info(f"Enabled entity types: {entities}")

            # Get allow/deny lists
            allow_list, deny_list = self._process_allow_deny_lists()

            # Get redaction method
            redaction_method = self._get_redaction_method()

            # Analyze image to find PII
            results = self.image_analyzer.analyze(
                image=image,
                entities=entities,
                allow_list=allow_list,
                deny_list=deny_list,
            )

            # Count detected items
            redaction_count = len(results)
            logger.info(f"Detected {redaction_count} PII items")

            # Redact the image
            if redaction_method == "blur":
                redacted_image = self.image_redactor.redact(
                    image=image,
                    results=results,
                    fill=None,  # None means use blur
                    opacity=0.5,
                )
            else:  # box method
                redacted_image = self.image_redactor.redact(
                    image=image,
                    results=results,
                    fill=(0, 0, 0),  # Black boxes
                    opacity=1.0,
                )

            # Generate output filename
            filename, ext = os.path.splitext(image_path)
            output_path = f"{filename}-redacted{ext}"

            # Save redacted image
            redacted_image.save(output_path)
            logger.info(f"Redacted image saved to: {output_path}")

            return json.dumps(
                {
                    "success": True,
                    "outputPath": output_path,
                    "redactionCount": redaction_count,
                }
            )

        except Exception as e:
            logger.error(f"Error redacting image: {str(e)}")
            return json.dumps({"success": False, "error": str(e)})

    def redact_image_base64(self, base64_image: str) -> str:
        """
        Process a base64-encoded image to detect and redact PII.

        Args:
            base64_image: Base64-encoded image data

        Returns:
            JSON string with base64-encoded redacted image
        """
        try:
            logger.info("Processing base64 image")

            # Decode base64 image
            image_data = base64.b64decode(
                base64_image.split(",")[1] if "," in base64_image else base64_image
            )
            image = Image.open(BytesIO(image_data))

            # Get enabled entities
            entities = self._get_enabled_entities()

            # Get allow/deny lists
            allow_list, deny_list = self._process_allow_deny_lists()

            # Get redaction method
            redaction_method = self._get_redaction_method()

            # Analyze image to find PII
            results = self.image_analyzer.analyze(
                image=image,
                entities=entities,
                allow_list=allow_list,
                deny_list=deny_list,
            )

            # Count detected items
            redaction_count = len(results)
            logger.info(f"Detected {redaction_count} PII items")

            # Redact the image
            if redaction_method == "blur":
                redacted_image = self.image_redactor.redact(
                    image=image,
                    results=results,
                    fill=None,  # None means use blur
                    opacity=0.5,
                )
            else:  # box method
                redacted_image = self.image_redactor.redact(
                    image=image,
                    results=results,
                    fill=(0, 0, 0),  # Black boxes
                    opacity=1.0,
                )

            # Convert back to base64
            buffered = BytesIO()
            redacted_image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return json.dumps(
                {
                    "success": True,
                    "redactedImage": f"data:image/png;base64,{img_str}",
                    "redactionCount": redaction_count,
                }
            )

        except Exception as e:
            logger.error(f"Error redacting base64 image: {str(e)}")
            return json.dumps({"success": False, "error": str(e)})


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="RedactShotX Image Redaction")
    parser.add_argument("--image", type=str, help="Path to image file")
    parser.add_argument("--config", type=str, help="JSON configuration string")
    parser.add_argument(
        "--base64", action="store_true", help="Input is base64-encoded image"
    )

    return parser.parse_args()


def main():
    """Main entry point for CLI usage."""
    args = parse_arguments()

    try:
        # Parse configuration
        config = json.loads(args.config) if args.config else {}

        # Initialize redactor
        redactor = ImageRedactor(config)

        # Process image based on input type
        if args.base64:
            with open(args.image, "r") as f:
                base64_data = f.read()
            result = redactor.redact_image_base64(base64_data)
        else:
            result = redactor.redact_image(args.image)

        # Print result (will be captured by Tauri)
        print(result)

    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        print(json.dumps({"success": False, "error": str(e)}))
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
