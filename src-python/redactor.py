# redactor.py
import json
import base64
import logging
from io import BytesIO
from PIL import Image, ImageFilter

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_image_redactor.image_analyzer_engine import ImageAnalyzerEngine

logger = logging.getLogger("redactor")
logging.basicConfig(level=logging.INFO)


class ImageRedactor:
    def __init__(self):
        logger.info("🔍 Initializing ImageRedactor with full entity support")

        # Set up the NLP engine with spaCy
        provider = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
            }
        )
        nlp_engine = provider.create_engine()

        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine, supported_languages=["en"]
        )
        self.supported_entities = self.analyzer.get_supported_entities(language="en")
        self.image_analyzer = ImageAnalyzerEngine(analyzer_engine=self.analyzer)

    def redact_image(self, image_path: str) -> str:
        logger.info(f"🖼️ Redacting image from file: {image_path}")
        image = Image.open(image_path)
        redacted_image, results = self._blur_redact(image)

        output_path = image_path.replace(".", "-redacted.")
        redacted_image.save(output_path)

        return json.dumps(
            {
                "success": True,
                "outputPath": output_path,
                "redactionCount": len(results),
            }
        )

    def redact_image_base64(self, base64_data: str) -> str:
        logger.info("🧠 Redacting image from base64 input")
        image_data = base64.b64decode(
            base64_data.split(",")[1] if "," in base64_data else base64_data
        )
        image = Image.open(BytesIO(image_data))
        redacted_image, results = self._blur_redact(image)

        buffered = BytesIO()
        redacted_image.save(buffered, format="PNG")
        redacted_base64 = base64.b64encode(buffered.getvalue()).decode()

        return json.dumps(
            {
                "success": True,
                "redactedImage": f"data:image/png;base64,{redacted_base64}",
                "redactionCount": len(results),
            }
        )

    def _blur_redact(self, image: Image.Image):
        # Analyze the image for PII entities
        results = self.image_analyzer.analyze(image=image)

        # Create a copy of the image to redact
        redacted_image = image.copy()

        for res in results:
            # Extract bounding box
            left = int(res.left)
            top = int(res.top)
            width = int(res.width)
            height = int(res.height)
            right = left + width
            bottom = top + height

            # Crop the region to blur
            region = redacted_image.crop((left, top, right, bottom))

            # Apply blur to the cropped region
            blurred_region = region.filter(ImageFilter.GaussianBlur(radius=10))

            # Paste blurred region back to the image
            redacted_image.paste(blurred_region, (left, top))

        return redacted_image, results
